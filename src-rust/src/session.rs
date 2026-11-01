use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;

use crate::discord_rpc::DiscordRpcClient;
use crate::faker::FakerManager;
use crate::quests::{get_active_quests, QuestInfo};
use crate::steam::SteamHelper;

pub struct FarmStatus {
    pub is_farming: bool,
    pub elapsed_seconds: u64,
    pub total_seconds: u64,
    pub progress_percent: f64,
    pub active_quests: Vec<QuestInfo>,
    pub total_orbs: u32,
}

pub struct FarmSession {
    is_running: Arc<AtomicBool>,
    elapsed: Arc<AtomicU64>,
    total_seconds: Arc<AtomicU64>,
    active_quests: Arc<Mutex<Vec<QuestInfo>>>,
    rpc_clients: Arc<Mutex<Vec<DiscordRpcClient>>>,
    faker_mgr: Arc<Mutex<FakerManager>>,
    manifest_paths: Arc<Mutex<Vec<PathBuf>>>,
    ticker_handle: Option<thread::JoinHandle<()>>,
}

impl FarmSession {
    pub fn new() -> Self {
        Self {
            is_running: Arc::new(AtomicBool::new(false)),
            elapsed: Arc::new(AtomicU64::new(0)),
            total_seconds: Arc::new(AtomicU64::new(900)),
            active_quests: Arc::new(Mutex::new(Vec::new())),
            rpc_clients: Arc::new(Mutex::new(Vec::new())),
            faker_mgr: Arc::new(Mutex::new(FakerManager::new(None))),
            manifest_paths: Arc::new(Mutex::new(Vec::new())),
            ticker_handle: None,
        }
    }

    pub fn start_farm(
        &mut self,
        selected_ids: Vec<String>,
        duration_minutes: u32,
        event_callback: Arc<dyn Fn(&str, serde_json::Value) + Send + Sync + 'static>,
    ) -> Result<usize, String> {
        self.stop_farm();

        let all_quests = get_active_quests();
        let target_quests: Vec<QuestInfo> = if selected_ids.is_empty() || selected_ids.contains(&"all".to_string()) {
            all_quests
        } else {
            all_quests
                .into_iter()
                .filter(|q| selected_ids.contains(&q.id))
                .collect()
        };

        if target_quests.is_empty() {
            return Err("No matching quests selected".to_string());
        }

        let dur_secs = (duration_minutes as u64) * 60;
        self.total_seconds.store(dur_secs, Ordering::SeqCst);
        self.elapsed.store(0, Ordering::SeqCst);
        self.is_running.store(true, Ordering::SeqCst);

        let mut faker = self.faker_mgr.lock().unwrap();
        let mut rpc_list = self.rpc_clients.lock().unwrap();
        let mut manifest_list = self.manifest_paths.lock().unwrap();

        let mut count = 0;
        for quest in &target_quests {
            // 1. Steam manifest
            if let Some(steam_id) = quest.steam_app_id {
                if let Ok(manifest) = SteamHelper::create_fake_manifest(steam_id, &quest.game_title) {
                    manifest_list.push(manifest);
                    event_callback(
                        "log",
                        serde_json::json!({
                            "level": "info",
                            "message": format!("[Steam] Created appmanifest_{}.acf for {}", steam_id, quest.game_title)
                        }),
                    );
                }
            }

            // 2. Local RPC Client
            if quest.needs_rpc {
                let mut client = DiscordRpcClient::new(&quest.application_id, &quest.game_title);
                if let Ok(_) = client.start() {
                    rpc_list.push(client);
                    event_callback(
                        "log",
                        serde_json::json!({
                            "level": "success",
                            "message": format!("[RPC] Connected Discord Local RPC for {}", quest.game_title)
                        }),
                    );
                }
            }

            // 3. Stub process
            if let Ok(path) = faker.launch_stub(&quest.exe_name, &quest.game_title, dur_secs) {
                count += 1;
                event_callback(
                    "log",
                    serde_json::json!({
                        "level": "info",
                        "message": format!("[Process] Spawned {}", path.display())
                    }),
                );
            }
        }

        *self.active_quests.lock().unwrap() = target_quests.clone();

        // Start background ticker
        let running_flag = self.is_running.clone();
        let elapsed_counter = self.elapsed.clone();
        let total_secs_val = dur_secs;
        let quests_for_tick = target_quests.clone();
        let cb = event_callback.clone();

        let handle = thread::spawn(move || {
            while running_flag.load(Ordering::SeqCst) {
                thread::sleep(Duration::from_secs(1));
                if !running_flag.load(Ordering::SeqCst) {
                    break;
                }

                let cur_elapsed = elapsed_counter.fetch_add(1, Ordering::SeqCst) + 1;
                let percent = if total_secs_val > 0 {
                    ((cur_elapsed as f64) / (total_secs_val as f64) * 100.0).min(100.0)
                } else {
                    100.0
                };

                cb(
                    "tick",
                    serde_json::json!({
                        "elapsed_seconds": cur_elapsed,
                        "total_seconds": total_secs_val,
                        "progress_percent": (percent * 10.0).round() / 10.0,
                        "active_count": quests_for_tick.len()
                    }),
                );

                if cur_elapsed >= total_secs_val {
                    running_flag.store(false, Ordering::SeqCst);
                    let total_orbs: u32 = quests_for_tick.iter().map(|q| q.orbs_reward).sum();
                    cb(
                        "farm_completed",
                        serde_json::json!({
                            "total_orbs": total_orbs,
                            "completed_count": quests_for_tick.len()
                        }),
                    );
                    break;
                }
            }
        });

        self.ticker_handle = Some(handle);
        Ok(count)
    }

    pub fn stop_farm(&mut self) {
        self.is_running.store(false, Ordering::SeqCst);
        if let Some(h) = self.ticker_handle.take() {
            let _ = h.join();
        }

        // Stop RPC
        {
            let mut list = self.rpc_clients.lock().unwrap();
            for mut client in list.drain(..) {
                client.stop();
            }
        }

        // Stop processes and delete stub exes
        {
            let mut faker = self.faker_mgr.lock().unwrap();
            faker.stop_all();
        }

        // Clean up manifests
        {
            let mut manifests = self.manifest_paths.lock().unwrap();
            for p in manifests.drain(..) {
                let _ = SteamHelper::remove_manifest_if_ours(&p);
            }
        }

        self.active_quests.lock().unwrap().clear();
        self.elapsed.store(0, Ordering::SeqCst);
    }

    pub fn get_status(&self) -> FarmStatus {
        let is_running = self.is_running.load(Ordering::SeqCst);
        let elapsed = self.elapsed.load(Ordering::SeqCst);
        let total = self.total_seconds.load(Ordering::SeqCst);
        let quests = self.active_quests.lock().unwrap().clone();
        let percent = if total > 0 {
            ((elapsed as f64) / (total as f64) * 100.0).min(100.0)
        } else {
            0.0
        };
        let total_orbs: u32 = quests.iter().map(|q| q.orbs_reward).sum();

        FarmStatus {
            is_farming: is_running,
            elapsed_seconds: elapsed,
            total_seconds: total,
            progress_percent: (percent * 10.0).round() / 10.0,
            active_quests: quests,
            total_orbs,
        }
    }
}

impl Drop for FarmSession {
    fn drop(&mut self) {
        self.stop_farm();
    }
}
