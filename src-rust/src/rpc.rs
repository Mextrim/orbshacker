use std::io::{self, BufRead, Write};
use std::process::Command;
use std::sync::{Arc, Mutex};

use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::quests::get_active_quests;
use crate::session::{EventCallback, FarmSession};

#[derive(Deserialize)]
struct RpcRequest {
    id: Option<u64>,
    method: String,
    #[serde(default)]
    params: Value,
}

#[derive(Serialize)]
struct RpcResponse {
    id: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    result: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
}

#[derive(Serialize)]
struct RpcEvent {
    event: String,
    data: Value,
}

pub fn run_json_rpc_service() {
    let session = Arc::new(Mutex::new(FarmSession::new()));
    let stdout = Arc::new(Mutex::new(io::stdout()));

    let emit_stdout = stdout.clone();
    let event_callback: EventCallback =
        Arc::new(move |event_name: &str, data: Value| {
            let evt = RpcEvent {
                event: event_name.to_string(),
                data,
            };
            if let Ok(json_str) = serde_json::to_string(&evt) {
                let mut out = emit_stdout.lock().unwrap();
                let _ = writeln!(out, "{}", json_str);
                let _ = out.flush();
            }
        });

    let stdin = io::stdin();
    for line in stdin.lock().lines() {
        let line = match line {
            Ok(l) => l,
            Err(_) => break,
        };

        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }

        let req: RpcRequest = match serde_json::from_str(trimmed) {
            Ok(r) => r,
            Err(e) => {
                let resp = RpcResponse {
                    id: None,
                    result: None,
                    error: Some(format!("Invalid JSON request: {}", e)),
                };
                let mut out = stdout.lock().unwrap();
                let _ = writeln!(out, "{}", serde_json::to_string(&resp).unwrap());
                let _ = out.flush();
                continue;
            }
        };

        let mut res: Option<Value> = None;
        let mut err: Option<String> = None;

        match req.method.as_str() {
            "ping" => {
                res = Some(serde_json::json!({ "pong": true }));
            }
            "check_discord_status" => {
                let connected = crate::discord_rpc::is_discord_available();
                res = Some(serde_json::json!({ "connected": connected }));
            }
            "get_quests" => {
                let quests = get_active_quests();
                res = Some(serde_json::to_value(quests).unwrap());
            }
            "start_farm" => {
                let quest_ids: Vec<String> = req
                    .params
                    .get("quests")
                    .and_then(|v| v.as_array())
                    .map(|arr| {
                        arr.iter()
                            .filter_map(|x| x.as_str().map(|s| s.to_string()))
                            .collect()
                    })
                    .unwrap_or_else(|| vec!["all".to_string()]);

                let minutes = req
                    .params
                    .get("minutes")
                    .and_then(|v| v.as_u64())
                    .unwrap_or(15) as u32;

                let mut s = session.lock().unwrap();
                match s.start_farm(quest_ids, minutes, event_callback.clone()) {
                    Ok(count) => {
                        res = Some(serde_json::json!({ "started": true, "launched_count": count }));
                    }
                    Err(e) => {
                        err = Some(e);
                    }
                }
            }
            "stop_farm" => {
                let mut s = session.lock().unwrap();
                s.stop_farm();
                res = Some(serde_json::json!({ "stopped": true }));
            }
            "get_status" => {
                let s = session.lock().unwrap();
                let st = s.get_status();
                res = Some(serde_json::json!({
                    "is_farming": st.is_farming,
                    "elapsed_seconds": st.elapsed_seconds,
                    "total_seconds": st.total_seconds,
                    "progress_percent": st.progress_percent,
                    "active_quests": st.active_quests,
                    "total_orbs": st.total_orbs
                }));
            }
            "open_discord_quests" => {
                #[cfg(windows)]
                {
                    let _ = Command::new("cmd")
                        .args(["/c", "start", "discord:///channels/@me"])
                        .spawn();
                }
                #[cfg(target_os = "macos")]
                {
                    let _ = Command::new("open")
                        .arg("discord:///channels/@me")
                        .spawn();
                }
                #[cfg(target_os = "linux")]
                {
                    let _ = Command::new("xdg-open")
                        .arg("discord:///channels/@me")
                        .spawn();
                }
                res = Some(serde_json::json!({ "opened": true }));
            }
            other => {
                err = Some(format!("Unknown method: {}", other));
            }
        }

        let resp = RpcResponse {
            id: req.id,
            result: res,
            error: err,
        };

        let mut out = stdout.lock().unwrap();
        let _ = writeln!(out, "{}", serde_json::to_string(&resp).unwrap());
        let _ = out.flush();
    }
}
