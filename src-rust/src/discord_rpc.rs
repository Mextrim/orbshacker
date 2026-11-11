use std::fs::OpenOptions;
use std::io::{Read, Write};
#[cfg(unix)]
use std::os::unix::net::UnixStream;
#[cfg(unix)]
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct PresenceButton {
    pub label: String,
    pub url: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CustomPresenceData {
    pub application_id: String,
    pub app_key: Option<String>,
    pub state: Option<String>,
    pub state_url: Option<String>,
    pub details: Option<String>,
    pub details_url: Option<String>,
    pub start_timestamp: Option<u64>,
    pub end_timestamp: Option<u64>,
    pub large_image_key: Option<String>,
    pub large_image_text: Option<String>,
    pub large_url: Option<String>,
    pub small_image_key: Option<String>,
    pub small_image_text: Option<String>,
    pub small_url: Option<String>,
    pub party_id: Option<String>,
    pub party_size: Option<u32>,
    pub party_max: Option<u32>,
    pub join_secret: Option<String>,
    #[serde(default)]
    pub buttons: Option<Vec<PresenceButton>>,
}

pub const ORBSHACKER_GITHUB_URL: &str = "https://github.com/Mextrim/orbshacker";
pub const ORBSHACKER_RELEASES_URL: &str = "https://github.com/Mextrim/orbshacker/releases";
pub const ORBSHACKER_ICON_URL: &str = "https://raw.githubusercontent.com/Mextrim/orbshacker/main/src-gui/assets/icon.png";

pub fn default_github_buttons() -> Option<Vec<PresenceButton>> {
    Some(vec![
        PresenceButton {
            label: "GitHub Репозиторий".to_string(),
            url: ORBSHACKER_GITHUB_URL.to_string(),
        },
        PresenceButton {
            label: "Скачать Orbshacker".to_string(),
            url: ORBSHACKER_RELEASES_URL.to_string(),
        },
    ])
}

impl Default for CustomPresenceData {
    fn default() -> Self {
        Self {
            application_id: "1567134974031962272".to_string(),
            app_key: Some("79fdb6cf84fe50d2093ec1f9d57f3801ed461096e74216ef34113ddbbe6e67c9".to_string()),
            state: Some("Playing Solo".to_string()),
            state_url: Some(ORBSHACKER_GITHUB_URL.to_string()),
            details: Some("Competitive".to_string()),
            details_url: Some(ORBSHACKER_GITHUB_URL.to_string()),
            start_timestamp: Some(1507665886),
            end_timestamp: Some(1507665886),
            large_image_key: Some(ORBSHACKER_ICON_URL.to_string()),
            large_image_text: Some("Orbshacker • Перейти на GitHub".to_string()),
            large_url: Some(ORBSHACKER_GITHUB_URL.to_string()),
            small_image_key: Some("rogue".to_string()),
            small_image_text: Some("Rogue - Level 100".to_string()),
            small_url: Some(ORBSHACKER_GITHUB_URL.to_string()),
            party_id: Some("ae488379-351d-4a4f-ad32-2b9b01c91657".to_string()),
            party_size: Some(1),
            party_max: Some(5),
            join_secret: None,
            buttons: default_github_buttons(),
        }
    }
}

pub struct CustomRpcClient {
    data: Arc<Mutex<CustomPresenceData>>,
    stop_signal: Arc<AtomicBool>,
    dirty_signal: Arc<AtomicBool>,
    handle: Option<thread::JoinHandle<()>>,
}

impl CustomRpcClient {
    pub fn new(data: CustomPresenceData) -> Self {
        Self {
            data: Arc::new(Mutex::new(data)),
            stop_signal: Arc::new(AtomicBool::new(false)),
            dirty_signal: Arc::new(AtomicBool::new(true)),
            handle: None,
        }
    }

    pub fn start(&mut self) -> Result<(), String> {
        self.stop();
        self.stop_signal.store(false, Ordering::SeqCst);
        self.dirty_signal.store(true, Ordering::SeqCst);
        let data_arc = self.data.clone();
        let stop_arc = self.stop_signal.clone();
        let dirty_arc = self.dirty_signal.clone();

        let handle = thread::spawn(move || {
            custom_rpc_worker_loop(data_arc, stop_arc, dirty_arc);
        });

        self.handle = Some(handle);
        Ok(())
    }

    pub fn update(&self, new_data: CustomPresenceData) {
        if let Ok(mut d) = self.data.lock() {
            *d = new_data;
            self.dirty_signal.store(true, Ordering::SeqCst);
        }
    }

    pub fn stop(&mut self) {
        self.stop_signal.store(true, Ordering::SeqCst);
        if let Some(h) = self.handle.take() {
            let _ = h.join();
        }
    }

    pub fn is_running(&self) -> bool {
        self.handle.is_some() && !self.stop_signal.load(Ordering::SeqCst)
    }

    pub fn get_data(&self) -> CustomPresenceData {
        if let Ok(d) = self.data.lock() {
            d.clone()
        } else {
            CustomPresenceData::default()
        }
    }
}

impl Drop for CustomRpcClient {
    fn drop(&mut self) {
        self.stop();
    }
}

pub const ORBSHACKER_APP_ID: &str = "1567134974031962272";
pub const ORBSHACKER_APP_KEY: &str = "79fdb6cf84fe50d2093ec1f9d57f3801ed461096e74216ef34113ddbbe6e67c9";

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct PresenceMemeConfig {
    pub enabled: bool,
    pub apply_mode: String, // "idle_only" or "always"
    pub details: Option<String>,
    pub state: Option<String>,
}

impl Default for PresenceMemeConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            apply_mode: "idle_only".to_string(),
            details: None,
            state: None,
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum PresenceState {
    Idle,
    FarmingQuests {
        quest_count: usize,
        total_orbs: u32,
        start_ts: u64,
        end_ts: u64,
    },
    QuestsCompleted {
        total_orbs: u32,
    },
    FarmingBadges {
        game_name: String,
        current_index: usize,
        total_games: usize,
        start_ts: u64,
    },
    BadgesCompleted {
        total_games: usize,
    },
    FarmingHours {
        game_name: String,
        target_hours: u32,
        is_infinite: bool,
        start_ts: u64,
    },
    CustomGame {
        game_name: String,
        exe_name: String,
        start_ts: u64,
    },
    Disabled,
}

impl PresenceState {
    #[allow(dead_code)]
    pub fn to_presence_data(&self) -> Option<CustomPresenceData> {
        self.to_presence_data_with_meme(&PresenceMemeConfig::default())
    }

    pub fn to_presence_data_with_meme(&self, meme: &PresenceMemeConfig) -> Option<CustomPresenceData> {
        let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs();
        match self {
            PresenceState::Idle => {
                let default_details = "В главном меню".to_string();
                let default_state = "Готов к запуску (+5,600 Orbs)".to_string();

                let (details_text, state_text) = if meme.enabled {
                    let d = meme.details.as_ref()
                        .map(|s| s.trim())
                        .filter(|s| !s.is_empty())
                        .map(|s| s.to_string())
                        .unwrap_or(default_details);
                    let s = meme.state.as_ref()
                        .map(|s| s.trim())
                        .filter(|s| !s.is_empty())
                        .map(|s| s.to_string())
                        .unwrap_or(default_state);
                    (d, s)
                } else {
                    (default_details, default_state)
                };

                Some(CustomPresenceData {
                    application_id: ORBSHACKER_APP_ID.to_string(),
                    app_key: Some(ORBSHACKER_APP_KEY.to_string()),
                    details: Some(details_text),
                    details_url: Some(ORBSHACKER_GITHUB_URL.to_string()),
                    state: Some(state_text),
                    state_url: Some(ORBSHACKER_GITHUB_URL.to_string()),
                    start_timestamp: Some(now),
                    end_timestamp: None,
                    large_image_key: Some(ORBSHACKER_ICON_URL.to_string()),
                    large_image_text: Some(format!("Orbshacker v{} • Перейти на GitHub", env!("CARGO_PKG_VERSION"))),
                    large_url: Some(ORBSHACKER_GITHUB_URL.to_string()),
                    small_image_key: None,
                    small_image_text: None,
                    small_url: None,
                    party_id: None,
                    party_size: None,
                    party_max: None,
                    join_secret: None,
                    buttons: default_github_buttons(),
                })
            }
            PresenceState::FarmingQuests { quest_count, total_orbs, start_ts, end_ts } => {
                let default_details = "Фарм заданий Discord (Orbs)".to_string();
                let details_text = if meme.enabled && meme.apply_mode == "always" {
                    meme.details.as_ref()
                        .map(|s| s.trim())
                        .filter(|s| !s.is_empty())
                        .map(|s| s.to_string())
                        .unwrap_or(default_details)
                } else {
                    default_details
                };

                Some(CustomPresenceData {
                    application_id: ORBSHACKER_APP_ID.to_string(),
                    app_key: Some(ORBSHACKER_APP_KEY.to_string()),
                    details: Some(details_text),
                    details_url: Some(ORBSHACKER_GITHUB_URL.to_string()),
                    state: Some(format!("Квестов: {} (+{} Orbs)", quest_count, total_orbs)),
                    state_url: Some(ORBSHACKER_GITHUB_URL.to_string()),
                    start_timestamp: Some(*start_ts),
                    end_timestamp: if *end_ts > *start_ts { Some(*end_ts) } else { None },
                    large_image_key: Some(ORBSHACKER_ICON_URL.to_string()),
                    large_image_text: Some("Orbshacker • Фарминг Discord Quests".to_string()),
                    large_url: Some(ORBSHACKER_GITHUB_URL.to_string()),
                    small_image_key: None,
                    small_image_text: None,
                    small_url: None,
                    party_id: Some("orbshacker_quests_party".to_string()),
                    party_size: Some(*quest_count as u32),
                    party_max: Some(*quest_count as u32),
                    join_secret: None,
                    buttons: default_github_buttons(),
                })
            }
            PresenceState::QuestsCompleted { total_orbs } => {
                let default_details = "Задания Discord выполнены!".to_string();
                let details_text = if meme.enabled && meme.apply_mode == "always" {
                    meme.details.as_ref()
                        .map(|s| s.trim())
                        .filter(|s| !s.is_empty())
                        .map(|s| s.to_string())
                        .unwrap_or(default_details)
                } else {
                    default_details
                };

                Some(CustomPresenceData {
                    application_id: ORBSHACKER_APP_ID.to_string(),
                    app_key: Some(ORBSHACKER_APP_KEY.to_string()),
                    details: Some(details_text),
                    details_url: Some(ORBSHACKER_GITHUB_URL.to_string()),
                    state: Some(format!("Получено +{} Orbs • Orbshacker", total_orbs)),
                    state_url: Some(ORBSHACKER_GITHUB_URL.to_string()),
                    start_timestamp: Some(now),
                    end_timestamp: None,
                    large_image_key: Some(ORBSHACKER_ICON_URL.to_string()),
                    large_image_text: Some("Orbshacker • Все задания завершены!".to_string()),
                    large_url: Some(ORBSHACKER_GITHUB_URL.to_string()),
                    small_image_key: None,
                    small_image_text: None,
                    small_url: None,
                    party_id: None,
                    party_size: None,
                    party_max: None,
                    join_secret: None,
                    buttons: default_github_buttons(),
                })
            }
            PresenceState::FarmingBadges { game_name, current_index, total_games, start_ts } => {
                let default_details = "Фарм значков профиля (350+ игр)".to_string();
                let details_text = if meme.enabled && meme.apply_mode == "always" {
                    meme.details.as_ref()
                        .map(|s| s.trim())
                        .filter(|s| !s.is_empty())
                        .map(|s| s.to_string())
                        .unwrap_or(default_details)
                } else {
                    default_details
                };

                Some(CustomPresenceData {
                    application_id: ORBSHACKER_APP_ID.to_string(),
                    app_key: Some(ORBSHACKER_APP_KEY.to_string()),
                    details: Some(details_text),
                    details_url: Some(ORBSHACKER_GITHUB_URL.to_string()),
                    state: Some(format!("Игра: {}", game_name)),
                    state_url: Some(ORBSHACKER_GITHUB_URL.to_string()),
                    start_timestamp: Some(*start_ts),
                    end_timestamp: None,
                    large_image_key: Some(ORBSHACKER_ICON_URL.to_string()),
                    large_image_text: Some(format!("Orbshacker • Игра: {}", game_name)),
                    large_url: Some(ORBSHACKER_GITHUB_URL.to_string()),
                    small_image_key: None,
                    small_image_text: None,
                    small_url: None,
                    party_id: Some("orbshacker_badge_party".to_string()),
                    party_size: Some(*current_index as u32),
                    party_max: Some(*total_games as u32),
                    join_secret: None,
                    buttons: default_github_buttons(),
                })
            }
            PresenceState::BadgesCompleted { total_games } => {
                let default_details = "Значок профиля получен!".to_string();
                let details_text = if meme.enabled && meme.apply_mode == "always" {
                    meme.details.as_ref()
                        .map(|s| s.trim())
                        .filter(|s| !s.is_empty())
                        .map(|s| s.to_string())
                        .unwrap_or(default_details)
                } else {
                    default_details
                };

                Some(CustomPresenceData {
                    application_id: ORBSHACKER_APP_ID.to_string(),
                    app_key: Some(ORBSHACKER_APP_KEY.to_string()),
                    details: Some(details_text),
                    details_url: Some(ORBSHACKER_GITHUB_URL.to_string()),
                    state: Some(format!("Засчитано {} игр • Orbshacker", total_games)),
                    state_url: Some(ORBSHACKER_GITHUB_URL.to_string()),
                    start_timestamp: Some(now),
                    end_timestamp: None,
                    large_image_key: Some(ORBSHACKER_ICON_URL.to_string()),
                    large_image_text: Some("Orbshacker • Значок профиля обновлен".to_string()),
                    large_url: Some(ORBSHACKER_GITHUB_URL.to_string()),
                    small_image_key: None,
                    small_image_text: None,
                    small_url: None,
                    party_id: None,
                    party_size: None,
                    party_max: None,
                    join_secret: None,
                    buttons: default_github_buttons(),
                })
            }
            PresenceState::FarmingHours { game_name, target_hours, is_infinite, start_ts } => {
                let default_details = format!("Фармит часы: {}", game_name);
                let details_text = if meme.enabled && meme.apply_mode == "always" {
                    meme.details.as_ref()
                        .map(|s| s.trim())
                        .filter(|s| !s.is_empty())
                        .map(|s| s.to_string())
                        .unwrap_or(default_details)
                } else {
                    default_details
                };

                Some(CustomPresenceData {
                    application_id: ORBSHACKER_APP_ID.to_string(),
                    app_key: Some(ORBSHACKER_APP_KEY.to_string()),
                    details: Some(details_text),
                    details_url: Some(ORBSHACKER_GITHUB_URL.to_string()),
                    state: Some(if *is_infinite {
                        "Бесконечный AFK-фарм • Orbshacker".to_string()
                    } else {
                        format!("Цель: {} ч игрового времени", target_hours)
                    }),
                    state_url: Some(ORBSHACKER_GITHUB_URL.to_string()),
                    start_timestamp: Some(*start_ts),
                    end_timestamp: if !*is_infinite && *target_hours > 0 {
                        Some(*start_ts + (*target_hours as u64) * 3600)
                    } else {
                        None
                    },
                    large_image_key: Some(ORBSHACKER_ICON_URL.to_string()),
                    large_image_text: Some(format!("Orbshacker • Фарм часов: {}", game_name)),
                    large_url: Some(ORBSHACKER_GITHUB_URL.to_string()),
                    small_image_key: None,
                    small_image_text: None,
                    small_url: None,
                    party_id: None,
                    party_size: None,
                    party_max: None,
                    join_secret: None,
                    buttons: default_github_buttons(),
                })
            }
            PresenceState::CustomGame { game_name, exe_name, start_ts } => {
                let default_details = format!("Фармит: {}", game_name);
                let details_text = if meme.enabled && meme.apply_mode == "always" {
                    meme.details.as_ref()
                        .map(|s| s.trim())
                        .filter(|s| !s.is_empty())
                        .map(|s| s.to_string())
                        .unwrap_or(default_details)
                } else {
                    default_details
                };

                Some(CustomPresenceData {
                    application_id: ORBSHACKER_APP_ID.to_string(),
                    app_key: Some(ORBSHACKER_APP_KEY.to_string()),
                    details: Some(details_text),
                    details_url: Some(ORBSHACKER_GITHUB_URL.to_string()),
                    state: Some(format!("{} в онлайне • Orbshacker", exe_name)),
                    state_url: Some(ORBSHACKER_GITHUB_URL.to_string()),
                    start_timestamp: Some(*start_ts),
                    end_timestamp: None,
                    large_image_key: Some(ORBSHACKER_ICON_URL.to_string()),
                    large_image_text: Some(format!("Orbshacker • {}", game_name)),
                    large_url: Some(ORBSHACKER_GITHUB_URL.to_string()),
                    small_image_key: None,
                    small_image_text: None,
                    small_url: None,
                    party_id: None,
                    party_size: None,
                    party_max: None,
                    join_secret: None,
                    buttons: default_github_buttons(),
                })
            }
            PresenceState::Disabled => None,
        }
    }
}

pub struct AppPresenceManager {
    enabled: Arc<AtomicBool>,
    client: Arc<Mutex<Option<CustomRpcClient>>>,
    current_state: Arc<Mutex<PresenceState>>,
    meme_config: Arc<Mutex<PresenceMemeConfig>>,
}

impl AppPresenceManager {
    pub fn new() -> Self {
        let mgr = Self {
            enabled: Arc::new(AtomicBool::new(true)),
            client: Arc::new(Mutex::new(None)),
            current_state: Arc::new(Mutex::new(PresenceState::Idle)),
            meme_config: Arc::new(Mutex::new(PresenceMemeConfig::default())),
        };
        mgr.set_state(PresenceState::Idle);
        mgr
    }

    pub fn set_state(&self, state: PresenceState) {
        *self.current_state.lock().unwrap() = state.clone();
        if !self.enabled.load(Ordering::SeqCst) {
            self.clear_presence();
            return;
        }

        let meme = self.meme_config.lock().unwrap().clone();
        if let Some(presence_data) = state.to_presence_data_with_meme(&meme) {
            let mut client_guard = self.client.lock().unwrap();
            if let Some(ref mut c) = *client_guard {
                if c.is_running() {
                    c.update(presence_data);
                    return;
                }
            }
            let mut new_c = CustomRpcClient::new(presence_data);
            let _ = new_c.start();
            *client_guard = Some(new_c);
        } else {
            self.clear_presence();
        }
    }

    pub fn set_meme_config(&self, config: PresenceMemeConfig) {
        *self.meme_config.lock().unwrap() = config;
        let cur = self.current_state.lock().unwrap().clone();
        self.set_state(cur);
    }

    pub fn get_meme_config(&self) -> PresenceMemeConfig {
        self.meme_config.lock().unwrap().clone()
    }

    pub fn set_enabled(&self, enabled: bool) {
        self.enabled.store(enabled, Ordering::SeqCst);
        if enabled {
            let cur = self.current_state.lock().unwrap().clone();
            self.set_state(cur);
        } else {
            self.clear_presence();
        }
    }

    pub fn is_enabled(&self) -> bool {
        self.enabled.load(Ordering::SeqCst)
    }

    pub fn is_connected(&self) -> bool {
        let client_guard = self.client.lock().unwrap();
        if let Some(ref c) = *client_guard {
            c.is_running()
        } else {
            false
        }
    }

    pub fn clear_presence(&self) {
        let mut client_guard = self.client.lock().unwrap();
        if let Some(mut c) = client_guard.take() {
            c.stop();
        }
    }
}

impl Drop for AppPresenceManager {
    fn drop(&mut self) {
        self.clear_presence();
    }
}

pub struct DiscordRpcClient {
    application_id: String,
    game_title: String,
    stop_signal: Arc<AtomicBool>,
    handle: Option<thread::JoinHandle<()>>,
}

impl DiscordRpcClient {
    pub fn new(application_id: &str, game_title: &str) -> Self {
        Self {
            application_id: application_id.to_string(),
            game_title: game_title.to_string(),
            stop_signal: Arc::new(AtomicBool::new(false)),
            handle: None,
        }
    }

    pub fn start(&mut self) -> Result<(), String> {
        let app_id = self.application_id.clone();
        let title = self.game_title.clone();
        let stop = self.stop_signal.clone();

        stop.store(false, Ordering::SeqCst);

        let handle = thread::spawn(move || {
            rpc_worker_loop(&app_id, &title, stop);
        });

        self.handle = Some(handle);
        Ok(())
    }

    pub fn stop(&mut self) {
        self.stop_signal.store(true, Ordering::SeqCst);
        if let Some(h) = self.handle.take() {
            let _ = h.join();
        }
    }
}

impl Drop for DiscordRpcClient {
    fn drop(&mut self) {
        self.stop();
    }
}

pub fn is_discord_available() -> bool {
    PipeStream::connect().is_ok()
}

enum PipeStream {
    #[cfg(windows)]
    Windows(std::fs::File),
    #[cfg(unix)]
    Unix(UnixStream),
}

impl PipeStream {
    fn connect() -> Result<Self, String> {
        #[cfg(windows)]
        {
            for i in 0..10 {
                let path = format!(r"\\.\pipe\discord-ipc-{}", i);
                if let Ok(file) = OpenOptions::new().read(true).write(true).open(&path) {
                    return Ok(PipeStream::Windows(file));
                }
            }
            Err("Could not connect to any \\\\.\\pipe\\discord-ipc-* named pipe. Is Discord running?".to_string())
        }

        #[cfg(unix)]
        {
            let mut candidates = Vec::new();
            if let Ok(runtime_dir) = std::env::var("XDG_RUNTIME_DIR") {
                candidates.push(PathBuf::from(runtime_dir));
            }
            if let Ok(tmp_dir) = std::env::var("TMPDIR") {
                candidates.push(PathBuf::from(tmp_dir));
            }
            candidates.push(PathBuf::from("/tmp"));

            for base in candidates {
                for i in 0..10 {
                    let path = base.join(format!("discord-ipc-{}", i));
                    if let Ok(stream) = UnixStream::connect(&path) {
                        return Ok(PipeStream::Unix(stream));
                    }
                }
            }
            Err("Could not connect to unix domain socket discord-ipc-*. Is Discord running?".to_string())
        }
    }

    fn write_packet(&mut self, opcode: u32, payload: &str) -> Result<(), String> {
        let mut buf = Vec::new();
        buf.extend_from_slice(&opcode.to_le_bytes());
        buf.extend_from_slice(&(payload.len() as u32).to_le_bytes());
        buf.extend_from_slice(payload.as_bytes());

        match self {
            #[cfg(windows)]
            PipeStream::Windows(f) => {
                f.write_all(&buf).map_err(|e| e.to_string())?;
                f.flush().map_err(|e| e.to_string())?;
            }
            #[cfg(unix)]
            PipeStream::Unix(s) => {
                s.write_all(&buf).map_err(|e| e.to_string())?;
                s.flush().map_err(|e| e.to_string())?;
            }
        }
        Ok(())
    }

    fn read_packet(&mut self) -> Result<(u32, String), String> {
        let mut header = [0u8; 8];
        match self {
            #[cfg(windows)]
            PipeStream::Windows(f) => {
                f.read_exact(&mut header).map_err(|e| e.to_string())?;
            }
            #[cfg(unix)]
            PipeStream::Unix(s) => {
                s.read_exact(&mut header).map_err(|e| e.to_string())?;
            }
        }

        let opcode = u32::from_le_bytes(header[0..4].try_into().unwrap());
        let len = u32::from_le_bytes(header[4..8].try_into().unwrap()) as usize;
        if len > 10 * 1024 * 1024 {
            return Err("Packet payload too large".to_string());
        }

        let mut body = vec![0u8; len];
        match self {
            #[cfg(windows)]
            PipeStream::Windows(f) => {
                f.read_exact(&mut body).map_err(|e| e.to_string())?;
            }
            #[cfg(unix)]
            PipeStream::Unix(s) => {
                s.read_exact(&mut body).map_err(|e| e.to_string())?;
            }
        }

        let payload = String::from_utf8_lossy(&body).to_string();
        Ok((opcode, payload))
    }
}

fn rpc_worker_loop(application_id: &str, game_title: &str, stop: Arc<AtomicBool>) {
    let pid = std::process::id();
    let start_timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();

    while !stop.load(Ordering::SeqCst) {
        // Attempt connection (retry every 2 seconds if Discord not running yet)
        let mut stream = match PipeStream::connect() {
            Ok(s) => s,
            Err(_) => {
                for _ in 0..4 {
                    if stop.load(Ordering::SeqCst) {
                        return;
                    }
                    thread::sleep(Duration::from_millis(500));
                }
                continue;
            }
        };

        // 1. Handshake (opcode 0)
        let handshake_payload = format!(r#"{{"v":1,"client_id":"{}"}}"#, application_id);
        if stream.write_packet(0, &handshake_payload).is_err() {
            thread::sleep(Duration::from_secs(1));
            continue;
        }

        // Read handshake response
        if stream.read_packet().is_err() {
            thread::sleep(Duration::from_secs(1));
            continue;
        }

        let (details_str, state_str) = if game_title.contains("FC") {
            ("Playing Match", "Ultimate Team")
        } else {
            ("In Game", "Online")
        };

        // 2. Initial SET_ACTIVITY (opcode 1) with type 0 (Playing) and unix start timestamp
        let activity_json = serde_json::json!({
            "cmd": "SET_ACTIVITY",
            "args": {
                "pid": pid,
                "activity": {
                    "name": game_title,
                    "type": 0,
                    "application_id": application_id,
                    "details": details_str,
                    "state": state_str,
                    "timestamps": {
                        "start": start_timestamp
                    },
                    "instance": true
                }
            },
            "nonce": format!("act_{}", start_timestamp)
        });

        let activity_payload = activity_json.to_string();
        if stream.write_packet(1, &activity_payload).is_err() {
            continue;
        }
        let _ = stream.read_packet();

        // 3. Keep-alive heartbeat loop (every 15s)
        while !stop.load(Ordering::SeqCst) {
            for _ in 0..30 {
                if stop.load(Ordering::SeqCst) {
                    break;
                }
                thread::sleep(Duration::from_millis(500));
            }

            if stop.load(Ordering::SeqCst) {
                break;
            }

            // Keep-alive refresh
            let refresh_json = serde_json::json!({
                "cmd": "SET_ACTIVITY",
                "args": {
                    "pid": pid,
                    "activity": {
                        "name": game_title,
                        "type": 0,
                        "application_id": application_id,
                        "details": details_str,
                        "state": state_str,
                        "timestamps": {
                            "start": start_timestamp
                        },
                        "instance": true
                    }
                },
                "nonce": format!("act_{}", SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs())
            });

            if stream.write_packet(1, &refresh_json.to_string()).is_err() {
                break; // Broken pipe: break inner loop and reconnect in outer loop
            }
            let _ = stream.read_packet();
        }

        // 4. Clear activity on shutdown
        if stop.load(Ordering::SeqCst) {
            let clear_payload = format!(
                r#"{{"cmd":"SET_ACTIVITY","args":{{"pid":{},"activity":null}},"nonce":"clear"}}"#,
                pid
            );
            let _ = stream.write_packet(1, &clear_payload);
            break;
        }
    }
}

fn build_activity_payload(pid: u32, data: &CustomPresenceData) -> String {
    let mut activity = serde_json::Map::new();
    activity.insert("type".to_string(), serde_json::json!(0));
    activity.insert("application_id".to_string(), serde_json::json!(data.application_id));
    activity.insert("instance".to_string(), serde_json::json!(true));

    if let Some(ref st) = data.state {
        let trimmed = st.trim();
        if !trimmed.is_empty() {
            let truncated: String = trimmed.chars().take(128).collect();
            activity.insert("state".to_string(), serde_json::json!(truncated));
        }
    }
    if let Some(ref su) = data.state_url {
        if !su.trim().is_empty() {
            activity.insert("state_url".to_string(), serde_json::json!(su));
        }
    }
    if let Some(ref dt) = data.details {
        let trimmed = dt.trim();
        if !trimmed.is_empty() {
            let truncated: String = trimmed.chars().take(128).collect();
            activity.insert("details".to_string(), serde_json::json!(truncated));
        }
    }
    if let Some(ref du) = data.details_url {
        if !du.trim().is_empty() {
            activity.insert("details_url".to_string(), serde_json::json!(du));
        }
    }

    // Timestamps
    let mut timestamps = serde_json::Map::new();
    if let Some(start) = data.start_timestamp {
        if start > 0 {
            timestamps.insert("start".to_string(), serde_json::json!(start));
        }
    }
    if let Some(end) = data.end_timestamp {
        if end > 0 {
            timestamps.insert("end".to_string(), serde_json::json!(end));
        }
    }
    if !timestamps.is_empty() {
        activity.insert("timestamps".to_string(), serde_json::Value::Object(timestamps));
    }

    // Assets
    let mut assets = serde_json::Map::new();
    if let Some(ref lk) = data.large_image_key {
        if !lk.trim().is_empty() {
            assets.insert("large_image".to_string(), serde_json::json!(lk));
        }
    }
    if let Some(ref lt) = data.large_image_text {
        let trimmed = lt.trim();
        if !trimmed.is_empty() {
            let truncated: String = trimmed.chars().take(128).collect();
            assets.insert("large_text".to_string(), serde_json::json!(truncated));
        }
    }
    if let Some(ref lu) = data.large_url {
        if !lu.trim().is_empty() {
            assets.insert("large_url".to_string(), serde_json::json!(lu));
        }
    }
    if let Some(ref sk) = data.small_image_key {
        if !sk.trim().is_empty() {
            assets.insert("small_image".to_string(), serde_json::json!(sk));
        }
    }
    if let Some(ref st) = data.small_image_text {
        let trimmed = st.trim();
        if !trimmed.is_empty() {
            let truncated: String = trimmed.chars().take(128).collect();
            assets.insert("small_text".to_string(), serde_json::json!(truncated));
        }
    }
    if let Some(ref su) = data.small_url {
        if !su.trim().is_empty() {
            assets.insert("small_url".to_string(), serde_json::json!(su));
        }
    }
    if !assets.is_empty() {
        activity.insert("assets".to_string(), serde_json::Value::Object(assets));
    }

    // Buttons (Discord IPC allows up to 2 clickable URL buttons)
    if let Some(ref btns) = data.buttons {
        let valid_btns: Vec<serde_json::Value> = btns
            .iter()
            .take(2)
            .filter(|b| !b.label.trim().is_empty() && !b.url.trim().is_empty())
            .map(|b| {
                serde_json::json!({
                    "label": b.label.chars().take(32).collect::<String>(),
                    "url": b.url
                })
            })
            .collect();
        if !valid_btns.is_empty() {
            let button_urls: Vec<serde_json::Value> = btns
                .iter()
                .take(2)
                .filter(|b| !b.label.trim().is_empty() && !b.url.trim().is_empty())
                .map(|b| serde_json::json!(b.url))
                .collect();
            activity.insert("buttons".to_string(), serde_json::Value::Array(valid_btns));

            let mut metadata = serde_json::Map::new();
            metadata.insert("button_urls".to_string(), serde_json::Value::Array(button_urls));
            activity.insert("metadata".to_string(), serde_json::Value::Object(metadata));
        }
    }

    // Party
    if let (Some(size), Some(max)) = (data.party_size, data.party_max) {
        let mut party = serde_json::Map::new();
        if let Some(ref pid) = data.party_id {
            if !pid.trim().is_empty() {
                party.insert("id".to_string(), serde_json::json!(pid));
            }
        }
        party.insert("size".to_string(), serde_json::json!([size, max]));
        activity.insert("party".to_string(), serde_json::Value::Object(party));
    }

    // Secrets (only if no buttons are present, as Discord does not allow both simultaneously)
    if !activity.contains_key("buttons") {
        if let Some(ref join) = data.join_secret {
            if !join.trim().is_empty() {
                let mut secrets = serde_json::Map::new();
                secrets.insert("join".to_string(), serde_json::json!(join));
                activity.insert("secrets".to_string(), serde_json::Value::Object(secrets));
            }
        }
    }

    let activity_json = serde_json::json!({
        "cmd": "SET_ACTIVITY",
        "args": {
            "pid": pid,
            "activity": serde_json::Value::Object(activity)
        },
        "nonce": format!("act_{}", SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs())
    });

    activity_json.to_string()
}

fn custom_rpc_worker_loop(
    data_arc: Arc<Mutex<CustomPresenceData>>,
    stop: Arc<AtomicBool>,
    dirty: Arc<AtomicBool>,
) {
    let pid = std::process::id();

    while !stop.load(Ordering::SeqCst) {
        let mut stream = match PipeStream::connect() {
            Ok(s) => s,
            Err(_) => {
                for _ in 0..4 {
                    if stop.load(Ordering::SeqCst) {
                        return;
                    }
                    thread::sleep(Duration::from_millis(500));
                }
                continue;
            }
        };

        let initial_app_id = {
            let d = data_arc.lock().unwrap();
            d.application_id.clone()
        };

        // Handshake
        let handshake_payload = format!(r#"{{"v":1,"client_id":"{}"}}"#, initial_app_id);
        if stream.write_packet(0, &handshake_payload).is_err() {
            thread::sleep(Duration::from_secs(1));
            continue;
        }

        if stream.read_packet().is_err() {
            thread::sleep(Duration::from_secs(1));
            continue;
        }

        // Main activity broadcast loop
        while !stop.load(Ordering::SeqCst) {
            dirty.store(false, Ordering::SeqCst);
            let current_data = {
                let d = data_arc.lock().unwrap();
                d.clone()
            };

            // If application_id changed, reconnect with new client_id
            if current_data.application_id != initial_app_id {
                break;
            }

            let payload = build_activity_payload(pid, &current_data);
            if stream.write_packet(1, &payload).is_err() {
                break; // Broken pipe: reconnect
            }
            let _ = stream.read_packet();

            // Heartbeat refresh every 10 seconds or immediately when presence updates
            for _ in 0..20 {
                if stop.load(Ordering::SeqCst) || dirty.load(Ordering::SeqCst) {
                    break;
                }
                thread::sleep(Duration::from_millis(500));
            }
        }

        // Clear activity on shutdown
        if stop.load(Ordering::SeqCst) {
            let clear_payload = format!(
                r#"{{"cmd":"SET_ACTIVITY","args":{{"pid":{},"activity":null}},"nonce":"clear"}}"#,
                pid
            );
            let _ = stream.write_packet(1, &clear_payload);
            break;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_idle_presence_payload() {
        let presence = PresenceState::Idle.to_presence_data().expect("Idle presence data");
        let payload_str = build_activity_payload(1234, &presence);
        let parsed: serde_json::Value = serde_json::from_str(&payload_str).expect("Valid JSON");

        let activity = &parsed["args"]["activity"];
        assert_eq!(activity["application_id"], ORBSHACKER_APP_ID);
        assert_eq!(activity["details_url"], ORBSHACKER_GITHUB_URL);
        assert_eq!(activity["state_url"], ORBSHACKER_GITHUB_URL);
        assert_eq!(activity["assets"]["large_image"], ORBSHACKER_ICON_URL);
        assert_eq!(activity["assets"]["large_url"], ORBSHACKER_GITHUB_URL);

        let btns = activity["buttons"].as_array().expect("Buttons array");
        assert_eq!(btns.len(), 2);
        assert_eq!(btns[0]["url"], ORBSHACKER_GITHUB_URL);
        assert_eq!(btns[1]["url"], ORBSHACKER_RELEASES_URL);

        let urls = activity["metadata"]["button_urls"].as_array().expect("Metadata button_urls");
        assert_eq!(urls.len(), 2);
        assert_eq!(urls[0], ORBSHACKER_GITHUB_URL);
        assert_eq!(urls[1], ORBSHACKER_RELEASES_URL);

        assert!(activity.get("secrets").is_none());
    }

    #[test]
    fn test_farming_badges_presence_payload() {
        let state = PresenceState::FarmingBadges {
            game_name: "Counter-Strike 2 (+4)".to_string(),
            current_index: 5,
            total_games: 150,
            start_ts: 1700000000,
        };
        let presence = state.to_presence_data().expect("Badges presence data");
        let payload_str = build_activity_payload(1234, &presence);
        let parsed: serde_json::Value = serde_json::from_str(&payload_str).expect("Valid JSON");

        let activity = &parsed["args"]["activity"];
        assert_eq!(activity["details_url"], ORBSHACKER_GITHUB_URL);
        assert_eq!(activity["state_url"], ORBSHACKER_GITHUB_URL);
        assert_eq!(activity["state"], "Игра: Counter-Strike 2 (+4)");
        assert_eq!(activity["assets"]["large_image"], ORBSHACKER_ICON_URL);
        assert_eq!(activity["assets"]["large_url"], ORBSHACKER_GITHUB_URL);

        let party = &activity["party"];
        assert_eq!(party["id"], "orbshacker_badge_party");
        assert_eq!(party["size"][0], 5);
        assert_eq!(party["size"][1], 150);
    }

    #[test]
    fn test_meme_presence_furry_payload() {
        let meme = PresenceMemeConfig {
            enabled: true,
            apply_mode: "idle_only".to_string(),
            details: Some("Мастурбирует на фурри".to_string()),
            state: Some("Занят важным делом (99% прогресс)".to_string()),
        };
        let presence = PresenceState::Idle.to_presence_data_with_meme(&meme).expect("Meme presence");
        let payload_str = build_activity_payload(1234, &presence);
        let parsed: serde_json::Value = serde_json::from_str(&payload_str).expect("Valid JSON");

        let activity = &parsed["args"]["activity"];
        assert_eq!(activity["details"], "Мастурбирует на фурри");
        assert_eq!(activity["state"], "Занят важным делом (99% прогресс)");
        assert_eq!(activity["details_url"], ORBSHACKER_GITHUB_URL);
        assert_eq!(activity["state_url"], ORBSHACKER_GITHUB_URL);
        assert_eq!(activity["assets"]["large_image"], ORBSHACKER_ICON_URL);
    }
}
