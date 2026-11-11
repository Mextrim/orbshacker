use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use crate::badges::{get_detectable_games_catalog, DetectableGame};
use crate::discord_rpc::{AppPresenceManager, CustomPresenceData, CustomRpcClient, DiscordRpcClient, PresenceMemeConfig, PresenceState};
use crate::launcher::GameProcessManager;
use crate::quests::{get_active_quests, QuestInfo};
use crate::steam::SteamHelper;

pub type EventCallback = Arc<dyn Fn(&str, serde_json::Value) + Send + Sync + 'static>;

#[derive(Clone, serde::Serialize)]
pub struct FarmStatus {
    pub is_farming: bool,
    pub elapsed_seconds: u64,
    pub total_seconds: u64,
    pub progress_percent: f64,
    pub active_quests: Vec<QuestInfo>,
    pub total_orbs: u32,
}

#[derive(Clone, serde::Serialize)]
pub struct BadgeFarmStatus {
    pub is_active: bool,
    pub mode: String, // "count" | "hours" | "custom"
    pub current_game: String,
    pub current_index: usize,
    pub total_games: usize,
    pub elapsed_seconds: u64,
    pub target_seconds: u64,
    pub progress_percent: f64,
    pub active_exes: Vec<String>,
}

pub struct FarmSession {
    // Quests farm state
    is_running: Arc<AtomicBool>,
    elapsed: Arc<AtomicU64>,
    total_seconds: Arc<AtomicU64>,
    active_quests: Arc<Mutex<Vec<QuestInfo>>>,
    rpc_clients: Arc<Mutex<Vec<DiscordRpcClient>>>,
    faker_mgr: Arc<Mutex<GameProcessManager>>,
    manifest_paths: Arc<Mutex<Vec<PathBuf>>>,
    ticker_handle: Option<thread::JoinHandle<()>>,

    // Badge / Hours / Custom farm state
    badge_is_active: Arc<AtomicBool>,
    badge_mode: Arc<Mutex<String>>,
    badge_current_game: Arc<Mutex<String>>,
    badge_current_index: Arc<AtomicU64>,
    badge_total_games: Arc<AtomicU64>,
    badge_elapsed: Arc<AtomicU64>,
    badge_target_seconds: Arc<AtomicU64>,
    badge_faker_mgr: Arc<Mutex<GameProcessManager>>,
    badge_rpc_clients: Arc<Mutex<Vec<DiscordRpcClient>>>,
    badge_ticker_handle: Option<thread::JoinHandle<()>>,

    // Custom Discord RPC state
    custom_rpc: Arc<Mutex<Option<CustomRpcClient>>>,

    // App Discord Rich Presence
    app_presence: Arc<AppPresenceManager>,
}

impl FarmSession {
    pub fn new() -> Self {
        Self {
            is_running: Arc::new(AtomicBool::new(false)),
            elapsed: Arc::new(AtomicU64::new(0)),
            total_seconds: Arc::new(AtomicU64::new(900)),
            active_quests: Arc::new(Mutex::new(Vec::new())),
            rpc_clients: Arc::new(Mutex::new(Vec::new())),
            faker_mgr: Arc::new(Mutex::new(GameProcessManager::new(None))),
            manifest_paths: Arc::new(Mutex::new(Vec::new())),
            ticker_handle: None,

            badge_is_active: Arc::new(AtomicBool::new(false)),
            badge_mode: Arc::new(Mutex::new("idle".to_string())),
            badge_current_game: Arc::new(Mutex::new(String::new())),
            badge_current_index: Arc::new(AtomicU64::new(0)),
            badge_total_games: Arc::new(AtomicU64::new(0)),
            badge_elapsed: Arc::new(AtomicU64::new(0)),
            badge_target_seconds: Arc::new(AtomicU64::new(0)),
            badge_faker_mgr: Arc::new(Mutex::new(GameProcessManager::new(None))),
            badge_rpc_clients: Arc::new(Mutex::new(Vec::new())),
            badge_ticker_handle: None,

            custom_rpc: Arc::new(Mutex::new(None)),
            app_presence: Arc::new(AppPresenceManager::new()),
        }
    }

    // ==========================================
    // 1. DISCORD QUESTS FARMING
    // ==========================================

    pub fn start_farm(
        &mut self,
        selected_ids: Vec<String>,
        duration_minutes: u32,
        event_callback: EventCallback,
    ) -> Result<usize, String> {
        self.stop_farm();

        let all_quests = get_active_quests();
        let target_quests: Vec<QuestInfo> = if selected_ids.is_empty() || selected_ids.contains(&"all".to_string()) {
            all_quests.to_vec()
        } else {
            all_quests
                .iter()
                .filter(|q| selected_ids.contains(&q.id))
                .cloned()
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
                if let Ok(manifest) = SteamHelper::register_steam_manifest(steam_id, &quest.game_title) {
                    manifest_list.push(manifest);
                    event_callback(
                        "log",
                        serde_json::json!({
                            "level": "info",
                            "message": format!("[Steam] Verified appmanifest_{}.acf for {}", steam_id, quest.game_title)
                        }),
                    );
                }
            }

            // 2. Local RPC Client
            if quest.needs_rpc {
                let mut client = DiscordRpcClient::new(&quest.application_id, &quest.game_title);
                if client.start().is_ok() {
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

            // 3. Stub process (spawn primary executable)
            if let Ok(path) = faker.launch_stub(&quest.exe_name, &quest.game_title, dur_secs, quest.steam_app_id) {
                count += 1;
                event_callback(
                    "log",
                    serde_json::json!({
                        "level": "info",
                        "message": format!("[Process] Spawned {}", path.display())
                    }),
                );
            }

            // For EA Sports FC 27, launch multiple common executable variants for maximum compatibility
            if quest.id == "fc27" {
                let _ = faker.launch_stub("FC27.exe", &quest.game_title, dur_secs, quest.steam_app_id);
                let _ = faker.launch_stub("ea sports fc 27/fc27.exe", &quest.game_title, dur_secs, quest.steam_app_id);
                let _ = faker.launch_stub("fc27_trial.exe", &quest.game_title, dur_secs, quest.steam_app_id);
            }

            // For MapleStory Classic World, launch all recognized paths for Discord detection
            if quest.id == "maplestory" {
                let _ = faker.launch_stub("mscw/maplestory.exe", &quest.game_title, dur_secs, quest.steam_app_id);
                let _ = faker.launch_stub("maplestorycw/appdata/maplestory.exe", &quest.game_title, dur_secs, quest.steam_app_id);
                let _ = faker.launch_stub("MapleStory.exe", &quest.game_title, dur_secs, quest.steam_app_id);
                let _ = faker.launch_stub("MSCW.exe", &quest.game_title, dur_secs, quest.steam_app_id);
            }

            // For World of Warcraft: Forever, launch common WoW client variants
            if quest.id == "wow_forever" {
                let _ = faker.launch_stub("_forever_/wow.exe", &quest.game_title, dur_secs, quest.steam_app_id);
                let _ = faker.launch_stub("wowb.exe", &quest.game_title, dur_secs, quest.steam_app_id);
                let _ = faker.launch_stub("Wow.exe", &quest.game_title, dur_secs, quest.steam_app_id);
                let _ = faker.launch_stub("WowClassic.exe", &quest.game_title, dur_secs, quest.steam_app_id);
            }

            // For Honkai: Star Rail, launch common launcher/game paths
            if quest.id == "honkai_star_rail" {
                let _ = faker.launch_stub("Games/StarRail.exe", &quest.game_title, dur_secs, quest.steam_app_id);
            }
        }

        *self.active_quests.lock().unwrap() = target_quests.clone();

        let total_orbs: u32 = target_quests.iter().map(|q| q.orbs_reward).sum();
        let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs();
        self.app_presence.set_state(PresenceState::FarmingQuests {
            quest_count: target_quests.len(),
            total_orbs,
            start_ts: now,
            end_ts: now + dur_secs,
        });

        // Background ticker
        let running_flag = self.is_running.clone();
        let elapsed_counter = self.elapsed.clone();
        let total_secs_val = dur_secs;
        let quests_for_tick = target_quests.clone();
        let cb = event_callback.clone();
        let presence_for_ticker = self.app_presence.clone();

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
                    presence_for_ticker.set_state(PresenceState::QuestsCompleted { total_orbs });
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
        self.app_presence.set_state(PresenceState::Idle);
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

    // ==========================================
    // 2. DISCORD BADGES: GAME COUNT BOOSTER (100+ Games)
    // ==========================================

    pub fn start_badge_count_farm(
        &mut self,
        target_count: usize,
        start_offset: usize,
        duration_per_game_secs: u64,
        event_callback: EventCallback,
    ) -> Result<usize, String> {
        self.stop_badge_farm();

        let catalog = get_detectable_games_catalog();
        let total_available = catalog.len();
        let offset = start_offset.min(total_available.saturating_sub(1));
        let games_to_run: Vec<DetectableGame> = catalog
            .iter()
            .skip(offset)
            .take(target_count.max(1))
            .cloned()
            .collect();
        let total_count = games_to_run.len();

        // Discord badge calculation requires at least 300 seconds (5 minutes) for the 5-min RunningGameHeartbeat to register the game into badge progress!
        let dur_per_game = duration_per_game_secs.max(300);
        let batch_size = 5usize;
        let batches: Vec<Vec<DetectableGame>> = games_to_run
            .chunks(batch_size)
            .map(|chunk| chunk.to_vec())
            .collect();
        let total_batches = batches.len();
        let total_expected_secs = (total_batches as u64) * dur_per_game;

        self.badge_is_active.store(true, Ordering::SeqCst);
        *self.badge_mode.lock().unwrap() = "count".to_string();
        self.badge_total_games.store(total_count as u64, Ordering::SeqCst);
        self.badge_current_index.store(0, Ordering::SeqCst);
        self.badge_elapsed.store(0, Ordering::SeqCst);
        self.badge_target_seconds.store(total_expected_secs, Ordering::SeqCst);

        let is_active_flag = self.badge_is_active.clone();
        let cur_index_atom = self.badge_current_index.clone();
        let elapsed_atom = self.badge_elapsed.clone();
        let cur_game_mutex = self.badge_current_game.clone();
        let faker_mgr_arc = self.badge_faker_mgr.clone();
        let cb = event_callback.clone();
        let presence_arc = self.app_presence.clone();

        let handle = thread::spawn(move || {
            let now_start = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs();
            presence_arc.set_state(PresenceState::FarmingBadges {
                game_name: "Подготовка...".to_string(),
                current_index: offset,
                total_games: total_count,
                start_ts: now_start,
            });

            cb(
                "log",
                serde_json::json!({
                    "level": "info",
                    "message": format!("🚀 Запуск параллельного бустера значка: {} игр ({} пакетов по до {} игр, по {}с на пакет)...", total_count, total_batches, batch_size, dur_per_game)
                }),
            );

            for (batch_idx, batch_games) in batches.iter().enumerate() {
                if !is_active_flag.load(Ordering::SeqCst) {
                    break;
                }

                let batch_num = batch_idx + 1;
                let batch_count = batch_games.len();
                let game_names: Vec<String> = batch_games.iter().map(|g| g.name.clone()).collect();
                let current_title = game_names.join(", ");
                *cur_game_mutex.lock().unwrap() = current_title.clone();
                let cur_idx_num = ((batch_idx * batch_size) + batch_count).min(total_count);
                cur_index_atom.store(cur_idx_num as u64, Ordering::SeqCst);

                let now_batch = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs();
                let display_game_name = if batch_games.len() == 1 {
                    batch_games[0].name.clone()
                } else {
                    format!("{} (+{})", batch_games[0].name, batch_games.len() - 1)
                };
                presence_arc.set_state(PresenceState::FarmingBadges {
                    game_name: display_game_name,
                    current_index: cur_idx_num,
                    total_games: total_count,
                    start_ts: now_batch,
                });

                // 1. Create Steam appmanifests for verified detection in Discord
                let mut manifests = Vec::new();
                for game in batch_games {
                    if let Some(steam_id) = game.steam_app_id {
                        if let Ok(m) = SteamHelper::register_steam_manifest(steam_id, &game.name) {
                            manifests.push(m);
                        }
                    }
                }

                // 2. Spawn batch of game stubs simultaneously
                {
                    let mut faker = faker_mgr_arc.lock().unwrap();
                    for game in batch_games {
                        let _ = faker.launch_stub(&game.exe_name, &game.name, dur_per_game + 10, game.steam_app_id);
                    }
                }

                cb(
                    "log",
                    serde_json::json!({
                        "level": "info",
                        "message": format!("[Пакет {}/{}] Запущено {} игр параллельно: {} (сессия {}с)...", batch_num, total_batches, batch_count, current_title, dur_per_game)
                    }),
                );

                // 3. Run for dur_per_game seconds
                for sec in 0..dur_per_game {
                    if !is_active_flag.load(Ordering::SeqCst) {
                        break;
                    }
                    thread::sleep(Duration::from_secs(1));
                    let cur_el = elapsed_atom.fetch_add(1, Ordering::SeqCst) + 1;
                    let pct = ((cur_el as f64) / (total_expected_secs as f64) * 100.0).min(100.0);
                    let _batch_rem = dur_per_game.saturating_sub(sec + 1);

                    cb(
                        "badge_tick",
                        serde_json::json!({
                            "mode": "count",
                            "current_game": current_title,
                            "current_index": ((batch_idx * batch_size) + batch_count).min(total_count),
                            "total_games": total_count,
                            "elapsed_seconds": cur_el,
                            "target_seconds": total_expected_secs,
                            "progress_percent": (pct * 10.0).round() / 10.0
                        }),
                    );
                }

                // 4. Terminate batch stubs so Discord emits closed: true with full duration
                {
                    let mut faker = faker_mgr_arc.lock().unwrap();
                    faker.stop_all();
                }
                for m in manifests {
                    let _ = std::fs::remove_file(m);
                }

                cb(
                    "log",
                    serde_json::json!({
                        "level": "success",
                        "message": format!("[Пакет {}/{}] Завершена сессия для {} игр! (+{} в копилку Discord)", batch_num, total_batches, batch_count, batch_count)
                    }),
                );

                // Small pause for Discord process scanner
                if is_active_flag.load(Ordering::SeqCst) && batch_num < total_batches {
                    thread::sleep(Duration::from_millis(2000));
                }
            }

            if is_active_flag.load(Ordering::SeqCst) {
                is_active_flag.store(false, Ordering::SeqCst);
                presence_arc.set_state(PresenceState::BadgesCompleted { total_games: total_count });
                cb(
                    "badge_completed",
                    serde_json::json!({
                        "mode": "count",
                        "completed_games": total_count,
                        "message": "Серия игр успешно завершена! Нажмите Ctrl+R в Discord (или переоткройте окно профиля), чтобы обновить значок!"
                    }),
                );
            }
        });

        self.badge_ticker_handle = Some(handle);
        Ok(total_count)
    }

    pub fn start_single_game_farm(
        &mut self,
        game_id_or_exe: &str,
        duration_secs: u64,
        event_callback: EventCallback,
    ) -> Result<String, String> {
        self.stop_badge_farm();

        let catalog = get_detectable_games_catalog();
        let game = catalog
            .iter()
            .find(|g| g.id == game_id_or_exe || g.exe_name.eq_ignore_ascii_case(game_id_or_exe))
            .ok_or_else(|| format!("Игра '{}' не найдена в каталоге", game_id_or_exe))?;

        let game_name = game.name.clone();
        let dur = duration_secs.max(300);

        self.badge_is_active.store(true, Ordering::SeqCst);
        *self.badge_mode.lock().unwrap() = "single".to_string();
        *self.badge_current_game.lock().unwrap() = game_name.clone();
        self.badge_total_games.store(1, Ordering::SeqCst);
        self.badge_current_index.store(1, Ordering::SeqCst);
        self.badge_elapsed.store(0, Ordering::SeqCst);
        self.badge_target_seconds.store(dur, Ordering::SeqCst);

        let is_active_flag = self.badge_is_active.clone();
        let elapsed_atom = self.badge_elapsed.clone();
        let faker_mgr_arc = self.badge_faker_mgr.clone();
        let cb = event_callback.clone();
        let presence_single = self.app_presence.clone();

        let now_single = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs();
        self.app_presence.set_state(PresenceState::CustomGame {
            game_name: game_name.clone(),
            exe_name: game.exe_name.clone(),
            start_ts: now_single,
        });

        // 1. Steam fake manifest
        let steam_manifest = if let Some(steam_id) = game.steam_app_id {
            SteamHelper::register_steam_manifest(steam_id, &game.name).ok()
        } else {
            None
        };

        // 2. Spawn stub
        {
            let mut faker = faker_mgr_arc.lock().unwrap();
            faker.launch_stub(&game.exe_name, &game.name, dur + 5, game.steam_app_id)?;
        }

        let g_name = game_name.clone();
        let handle = thread::spawn(move || {
            cb(
                "log",
                serde_json::json!({
                    "level": "success",
                    "message": format!("🎮 Запущена игра '{}' на {} сек. Discord отображает статус активности.", g_name, dur)
                }),
            );

            for _ in 0..dur {
                if !is_active_flag.load(Ordering::SeqCst) {
                    break;
                }
                thread::sleep(Duration::from_secs(1));
                let cur_el = elapsed_atom.fetch_add(1, Ordering::SeqCst) + 1;
                let pct = ((cur_el as f64) / (dur as f64) * 100.0).min(100.0);

                cb(
                    "badge_tick",
                    serde_json::json!({
                        "mode": "single",
                        "current_game": g_name,
                        "current_index": 1,
                        "total_games": 1,
                        "elapsed_seconds": cur_el,
                        "target_seconds": dur,
                        "progress_percent": (pct * 10.0).round() / 10.0
                    }),
                );
            }

            // Cleanly close the process so Discord sends closed: true with full duration
            {
                let mut faker = faker_mgr_arc.lock().unwrap();
                faker.stop_all();
            }
            if let Some(ref m) = steam_manifest {
                let _ = std::fs::remove_file(m);
            }

            if is_active_flag.load(Ordering::SeqCst) {
                is_active_flag.store(false, Ordering::SeqCst);
                presence_single.set_state(PresenceState::Idle);
                cb(
                    "log",
                    serde_json::json!({
                        "level": "success",
                        "message": format!("✅ Сессия '{}' завершена! Discord зафиксировал +1 игру. Переоткройте окно значков в Discord (или Ctrl+R).", g_name)
                    }),
                );
                cb(
                    "badge_completed",
                    serde_json::json!({
                        "mode": "single",
                        "completed_games": 1,
                        "game_name": g_name,
                        "message": format!("Сессия '{}' завершена (+1 к значку)! Переоткройте профиль в Discord для обновления счётчика.", g_name)
                    }),
                );
            }
        });

        self.badge_ticker_handle = Some(handle);
        Ok(game_name)
    }

    // ==========================================
    // 3. DISCORD BADGES: PLAYTIME HOURS BOOSTER & CUSTOM GAMES
    // ==========================================

    pub fn start_hours_farm(
        &mut self,
        game_id_or_exe: &str,
        game_name_override: Option<&str>,
        target_hours: u32,
        is_infinite: bool,
        event_callback: EventCallback,
    ) -> Result<String, String> {
        self.stop_badge_farm();

        // Find game from catalog or create custom
        let catalog = get_detectable_games_catalog();
        let (name, exe, steam_id) = if let Some(g) = catalog.iter().find(|g| g.id == game_id_or_exe || g.exe_name.eq_ignore_ascii_case(game_id_or_exe)) {
            (g.name.clone(), g.exe_name.clone(), g.steam_app_id)
        } else {
            let n = game_name_override.unwrap_or(game_id_or_exe).to_string();
            let mut e = game_id_or_exe.to_string();
            if !e.ends_with(".exe") {
                e.push_str(".exe");
            }
            (n, e, None)
        };

        let target_secs = if is_infinite {
            u64::MAX
        } else {
            (target_hours as u64) * 3600
        };

        self.badge_is_active.store(true, Ordering::SeqCst);
        *self.badge_mode.lock().unwrap() = "hours".to_string();
        *self.badge_current_game.lock().unwrap() = name.clone();
        self.badge_elapsed.store(0, Ordering::SeqCst);
        self.badge_target_seconds.store(target_secs, Ordering::SeqCst);

        let now_hours = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs();
        self.app_presence.set_state(PresenceState::FarmingHours {
            game_name: name.clone(),
            target_hours,
            is_infinite,
            start_ts: now_hours,
        });

        // Spawn game stub
        {
            let mut faker = self.badge_faker_mgr.lock().unwrap();
            let run_dur = if is_infinite { 86400 * 30 } else { target_secs + 60 };
            let _ = faker.launch_stub(&exe, &name, run_dur, steam_id)?;
        }

        let is_active_flag = self.badge_is_active.clone();
        let elapsed_atom = self.badge_elapsed.clone();
        let game_title_clone = name.clone();
        let cb = event_callback.clone();

        let handle = thread::spawn(move || {
            cb(
                "log",
                serde_json::json!({
                    "level": "success",
                    "message": format!("⚡ Started Playtime Hours farm for '{}' (Target: {} hours, AFK Mode: {})...", game_title_clone, target_hours, is_infinite)
                }),
            );

            while is_active_flag.load(Ordering::SeqCst) {
                thread::sleep(Duration::from_secs(1));
                if !is_active_flag.load(Ordering::SeqCst) {
                    break;
                }

                let cur_el = elapsed_atom.fetch_add(1, Ordering::SeqCst) + 1;
                let pct = if target_secs > 0 && target_secs != u64::MAX {
                    ((cur_el as f64) / (target_secs as f64) * 100.0).min(100.0)
                } else {
                    0.0
                };

                cb(
                    "badge_tick",
                    serde_json::json!({
                        "mode": "hours",
                        "current_game": game_title_clone,
                        "elapsed_seconds": cur_el,
                        "target_seconds": if target_secs == u64::MAX { 0 } else { target_secs },
                        "progress_percent": (pct * 10.0).round() / 10.0,
                        "is_infinite": is_infinite
                    }),
                );

                if !is_infinite && cur_el >= target_secs {
                    is_active_flag.store(false, Ordering::SeqCst);
                    cb(
                        "badge_completed",
                        serde_json::json!({
                            "mode": "hours",
                            "game": game_title_clone,
                            "hours_farmed": target_hours,
                            "message": format!("Hours goal reached for {}! Check your badge tier.", game_title_clone)
                        }),
                    );
                    break;
                }
            }
        });

        self.badge_ticker_handle = Some(handle);
        Ok(name)
    }

    pub fn stop_badge_farm(&mut self) {
        self.badge_is_active.store(false, Ordering::SeqCst);
        self.app_presence.set_state(PresenceState::Idle);
        if let Some(h) = self.badge_ticker_handle.take() {
            let _ = h.join();
        }

        {
            let mut faker = self.badge_faker_mgr.lock().unwrap();
            faker.stop_all();
        }

        {
            let mut list = self.badge_rpc_clients.lock().unwrap();
            for mut c in list.drain(..) {
                c.stop();
            }
        }

        *self.badge_mode.lock().unwrap() = "idle".to_string();
        *self.badge_current_game.lock().unwrap() = String::new();
        self.badge_elapsed.store(0, Ordering::SeqCst);
    }

    pub fn get_badge_status(&self) -> BadgeFarmStatus {
        let is_active = self.badge_is_active.load(Ordering::SeqCst);
        let mode = self.badge_mode.lock().unwrap().clone();
        let cur_game = self.badge_current_game.lock().unwrap().clone();
        let cur_idx = self.badge_current_index.load(Ordering::SeqCst) as usize;
        let total_games = self.badge_total_games.load(Ordering::SeqCst) as usize;
        let elapsed = self.badge_elapsed.load(Ordering::SeqCst);
        let target = self.badge_target_seconds.load(Ordering::SeqCst);
        let pct = if target > 0 && target != u64::MAX {
            ((elapsed as f64) / (target as f64) * 100.0).min(100.0)
        } else {
            0.0
        };

        BadgeFarmStatus {
            is_active,
            mode,
            current_game: cur_game,
            current_index: cur_idx,
            total_games,
            elapsed_seconds: elapsed,
            target_seconds: if target == u64::MAX { 0 } else { target },
            progress_percent: (pct * 10.0).round() / 10.0,
            active_exes: Vec::new(),
        }
    }

    // ==========================================
    // 4. CUSTOM DISCORD RICH PRESENCE (RPC)
    // ==========================================

    pub fn set_custom_rpc(&mut self, data: CustomPresenceData) -> Result<bool, String> {
        let mut rpc_guard = self.custom_rpc.lock().unwrap();
        if let Some(ref mut client) = *rpc_guard {
            if client.is_running() {
                client.update(data);
                return Ok(true);
            }
        }
        let mut new_client = CustomRpcClient::new(data);
        new_client.start()?;
        *rpc_guard = Some(new_client);
        Ok(true)
    }

    pub fn stop_custom_rpc(&mut self) -> Result<bool, String> {
        let mut rpc_guard = self.custom_rpc.lock().unwrap();
        if let Some(mut client) = rpc_guard.take() {
            client.stop();
        }
        Ok(true)
    }

    pub fn get_custom_rpc_status(&self) -> serde_json::Value {
        let rpc_guard = self.custom_rpc.lock().unwrap();
        if let Some(ref client) = *rpc_guard {
            serde_json::json!({
                "is_active": client.is_running(),
                "data": client.get_data()
            })
        } else {
            serde_json::json!({
                "is_active": false,
                "data": CustomPresenceData::default()
            })
        }
    }

    // ==========================================
    // 5. APP DISCORD RICH PRESENCE
    // ==========================================

    pub fn set_presence_enabled(&self, enabled: bool) {
        self.app_presence.set_enabled(enabled);
    }

    pub fn get_presence_status(&self) -> serde_json::Value {
        serde_json::json!({
            "enabled": self.app_presence.is_enabled(),
            "connected": self.app_presence.is_connected()
        })
    }

    pub fn set_presence_meme_config(&self, config: PresenceMemeConfig) {
        self.app_presence.set_meme_config(config);
    }

    pub fn get_presence_meme_config(&self) -> PresenceMemeConfig {
        self.app_presence.get_meme_config()
    }
}

impl Default for FarmSession {
    fn default() -> Self {
        Self::new()
    }
}

impl Drop for FarmSession {
    fn drop(&mut self) {
        self.stop_farm();
        self.stop_badge_farm();
        let _ = self.stop_custom_rpc();
    }
}
