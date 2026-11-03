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
pub struct CustomPresenceData {
    pub application_id: String,
    pub app_key: Option<String>,
    pub state: Option<String>,
    pub details: Option<String>,
    pub start_timestamp: Option<u64>,
    pub end_timestamp: Option<u64>,
    pub large_image_key: Option<String>,
    pub large_image_text: Option<String>,
    pub small_image_key: Option<String>,
    pub small_image_text: Option<String>,
    pub party_id: Option<String>,
    pub party_size: Option<u32>,
    pub party_max: Option<u32>,
    pub join_secret: Option<String>,
}

impl Default for CustomPresenceData {
    fn default() -> Self {
        Self {
            application_id: "1567134974031962272".to_string(),
            app_key: Some("79fdb6cf84fe50d2093ec1f9d57f3801ed461096e74216ef34113ddbbe6e67c9".to_string()),
            state: Some("Playing Solo".to_string()),
            details: Some("Competitive".to_string()),
            start_timestamp: Some(1507665886),
            end_timestamp: Some(1507665886),
            large_image_key: Some("numbani".to_string()),
            large_image_text: Some("Numbani".to_string()),
            small_image_key: Some("rogue".to_string()),
            small_image_text: Some("Rogue - Level 100".to_string()),
            party_id: Some("ae488379-351d-4a4f-ad32-2b9b01c91657".to_string()),
            party_size: Some(1),
            party_max: Some(5),
            join_secret: Some("MTI4NzM0OjFpMmhuZToxMjMxMjM= ".to_string()),
        }
    }
}

pub struct CustomRpcClient {
    data: Arc<Mutex<CustomPresenceData>>,
    stop_signal: Arc<AtomicBool>,
    handle: Option<thread::JoinHandle<()>>,
}

impl CustomRpcClient {
    pub fn new(data: CustomPresenceData) -> Self {
        Self {
            data: Arc::new(Mutex::new(data)),
            stop_signal: Arc::new(AtomicBool::new(false)),
            handle: None,
        }
    }

    pub fn start(&mut self) -> Result<(), String> {
        self.stop();
        self.stop_signal.store(false, Ordering::SeqCst);
        let data_arc = self.data.clone();
        let stop_arc = self.stop_signal.clone();

        let handle = thread::spawn(move || {
            custom_rpc_worker_loop(data_arc, stop_arc);
        });

        self.handle = Some(handle);
        Ok(())
    }

    pub fn update(&self, new_data: CustomPresenceData) {
        if let Ok(mut d) = self.data.lock() {
            *d = new_data;
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

        // 2. Initial SET_ACTIVITY (opcode 1) with type 0 (Playing) and unix start timestamp
        let activity_json = serde_json::json!({
            "cmd": "SET_ACTIVITY",
            "args": {
                "pid": pid,
                "activity": {
                    "name": game_title,
                    "type": 0,
                    "application_id": application_id,
                    "details": "Playing Match",
                    "state": "Ultimate Team",
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
                        "details": "Playing Match",
                        "state": "Ultimate Team",
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
        if !st.trim().is_empty() {
            activity.insert("state".to_string(), serde_json::json!(st));
        }
    }
    if let Some(ref dt) = data.details {
        if !dt.trim().is_empty() {
            activity.insert("details".to_string(), serde_json::json!(dt));
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
        if !lt.trim().is_empty() {
            assets.insert("large_text".to_string(), serde_json::json!(lt));
        }
    }
    if let Some(ref sk) = data.small_image_key {
        if !sk.trim().is_empty() {
            assets.insert("small_image".to_string(), serde_json::json!(sk));
        }
    }
    if let Some(ref st) = data.small_image_text {
        if !st.trim().is_empty() {
            assets.insert("small_text".to_string(), serde_json::json!(st));
        }
    }
    if !assets.is_empty() {
        activity.insert("assets".to_string(), serde_json::Value::Object(assets));
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

    // Secrets
    if let Some(ref join) = data.join_secret {
        if !join.trim().is_empty() {
            let mut secrets = serde_json::Map::new();
            secrets.insert("join".to_string(), serde_json::json!(join));
            activity.insert("secrets".to_string(), serde_json::Value::Object(secrets));
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

fn custom_rpc_worker_loop(data_arc: Arc<Mutex<CustomPresenceData>>, stop: Arc<AtomicBool>) {
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

            // Heartbeat refresh every 10 seconds
            for _ in 0..20 {
                if stop.load(Ordering::SeqCst) {
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
