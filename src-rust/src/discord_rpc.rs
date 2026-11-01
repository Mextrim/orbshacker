use std::fs::OpenOptions;
use std::io::{Read, Write};
#[cfg(unix)]
use std::os::unix::net::UnixStream;
#[cfg(unix)]
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

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
