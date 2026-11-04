use std::borrow::Cow;
use std::sync::{Arc, Mutex};
use std::thread;

use tao::{
    dpi::{LogicalPosition, LogicalSize},
    event::{Event, WindowEvent},
    event_loop::{ControlFlow, EventLoop, EventLoopBuilder},
    window::WindowBuilder,
};
use wry::WebViewBuilder;

use crate::session::FarmSession;

const INDEX_HTML: &str = include_str!("../frontend/index.html");
const STYLE_CSS: &str = include_str!("../frontend/style.css");
const APP_JS: &str = include_str!("../frontend/app.js");
const I18N_JS: &str = include_str!("../frontend/i18n.js");
const ICON_PNG: &[u8] = include_bytes!("../frontend/assets/icon.png");
const ICON_ICO: &[u8] = include_bytes!("../frontend/assets/icon.ico");

const BRIDGE_JS: &str = r#"
(function() {
  window.__orbshacker_callbacks = new Map();
  window.__orbshacker_event_listeners = [];
  window.__orbshacker_update_listeners = [];
  window.__orbshacker_mini_listeners = [];
  let __req_id = 1;

  window.orbshacker = {
    call: (method, params = {}) => {
      return new Promise((resolve, reject) => {
        const id = __req_id++;
        window.__orbshacker_callbacks.set(id, { resolve, reject });
        window.ipc.postMessage(JSON.stringify({ type: 'rpc', id, method, params }));
      });
    },
    onEvent: (callback) => {
      window.__orbshacker_event_listeners.push(callback);
      return () => {
        const idx = window.__orbshacker_event_listeners.indexOf(callback);
        if (idx !== -1) window.__orbshacker_event_listeners.splice(idx, 1);
      };
    },
    openDiscordQuests: () => {
      window.ipc.postMessage(JSON.stringify({ type: 'open_external', url: 'discord:///quest-home' }));
    },
    getDiscordProfile: () => {
      return new Promise((resolve, reject) => {
        const id = __req_id++;
        window.__orbshacker_callbacks.set(id, { resolve, reject });
        window.ipc.postMessage(JSON.stringify({ type: 'get_live_profile', id }));
      });
    },
    minimize: () => window.ipc.postMessage(JSON.stringify({ type: 'window', action: 'minimize' })),
    maximize: () => window.ipc.postMessage(JSON.stringify({ type: 'window', action: 'maximize' })),
    close: () => window.ipc.postMessage(JSON.stringify({ type: 'window', action: 'close' })),
    checkForUpdates: () => {
      return new Promise((resolve, reject) => {
        const id = __req_id++;
        window.__orbshacker_callbacks.set(id, { resolve, reject });
        window.ipc.postMessage(JSON.stringify({ type: 'check_updates', id }));
      });
    },
    downloadUpdate: (params) => {
      return new Promise((resolve, reject) => {
        const id = __req_id++;
        window.__orbshacker_callbacks.set(id, { resolve, reject });
        window.ipc.postMessage(JSON.stringify({ type: 'download_update', id, params }));
      });
    },
    onUpdateProgress: (callback) => {
      window.__orbshacker_update_listeners.push(callback);
      return () => {
        const idx = window.__orbshacker_update_listeners.indexOf(callback);
        if (idx !== -1) window.__orbshacker_update_listeners.splice(idx, 1);
      };
    },
    openExternal: (url) => window.ipc.postMessage(JSON.stringify({ type: 'open_external', url })),
    toggleMiniMode: () => {
      return new Promise((resolve, reject) => {
        const id = __req_id++;
        window.__orbshacker_callbacks.set(id, { resolve, reject });
        window.ipc.postMessage(JSON.stringify({ type: 'toggle_mini_mode', id }));
      });
    },
    onMiniModeChange: (callback) => {
      window.__orbshacker_mini_listeners.push(callback);
      return () => {
        const idx = window.__orbshacker_mini_listeners.indexOf(callback);
        if (idx !== -1) window.__orbshacker_mini_listeners.splice(idx, 1);
      };
    },
    getAutoLaunch: () => {
      return new Promise((resolve, reject) => {
        const id = __req_id++;
        window.__orbshacker_callbacks.set(id, { resolve, reject });
        window.ipc.postMessage(JSON.stringify({ type: 'get_auto_launch', id }));
      });
    },
    setAutoLaunch: (enabled) => {
      return new Promise((resolve, reject) => {
        const id = __req_id++;
        window.__orbshacker_callbacks.set(id, { resolve, reject });
        window.ipc.postMessage(JSON.stringify({ type: 'set_auto_launch', id, enabled }));
      });
    },
    shutdownSystem: () => window.ipc.postMessage(JSON.stringify({ type: 'shutdown_system' })),
    copyToClipboard: (text) => {
      return new Promise((resolve, reject) => {
        const id = __req_id++;
        window.__orbshacker_callbacks.set(id, { resolve, reject });
        window.ipc.postMessage(JSON.stringify({ type: 'copy_clipboard', id, text }));
      });
    },
    setDiscordRpc: (data) => window.orbshacker.call('set_discord_rpc', data),
    stopDiscordRpc: () => window.orbshacker.call('stop_discord_rpc'),
    getDiscordRpcStatus: () => window.orbshacker.call('get_discord_rpc_status'),
  };

  window.__orbshacker_dispatch_response = (id, result, error) => {
    if (window.__orbshacker_callbacks.has(id)) {
      const { resolve, reject } = window.__orbshacker_callbacks.get(id);
      window.__orbshacker_callbacks.delete(id);
      if (error) reject(new Error(error));
      else resolve(result);
    }
  };

  window.__orbshacker_dispatch_event = (event, data) => {
    for (const cb of window.__orbshacker_event_listeners) {
      try { cb(event, data); } catch (e) { console.error(e); }
    }
  };

  window.__orbshacker_dispatch_mini = (isMini) => {
    for (const cb of window.__orbshacker_mini_listeners) {
      try { cb(isMini); } catch (e) { console.error(e); }
    }
  };

  window.__orbshacker_dispatch_update_progress = (progress) => {
    for (const cb of window.__orbshacker_update_listeners) {
      try { cb(progress); } catch (e) { console.error(e); }
    }
  };

  // Smooth dragging for borderless titlebar
  document.addEventListener('DOMContentLoaded', () => {
    const titlebar = document.querySelector('.titlebar');
    if (titlebar) {
      titlebar.addEventListener('mousedown', (e) => {
        if (e.target.closest('button') || e.target.closest('.dropdown') || e.target.closest('input') || e.target.closest('select')) {
          return;
        }
        if (e.button === 0) {
          window.ipc.postMessage(JSON.stringify({ type: 'window', action: 'drag' }));
        }
      });
    }
  });
})();
"#;

#[derive(Debug)]
pub enum AppEvent {
    EvalScript(String),
    Minimize,
    Maximize,
    Close,
    Drag,
    ToggleMiniMode(u64),
}

#[cfg(windows)]
fn acquire_single_instance_lock() -> bool {
    use std::ffi::OsStr;
    use std::os::windows::ffi::OsStrExt;
    unsafe {
        #[link(name = "kernel32")]
        extern "system" {
            fn CreateMutexW(lpMutexAttributes: *mut std::ffi::c_void, bInitialOwner: i32, lpName: *const u16) -> *mut std::ffi::c_void;
            fn GetLastError() -> u32;
        }
        const ERROR_ALREADY_EXISTS: u32 = 183;
        let name: Vec<u16> = OsStr::new("Global\\OrbshackerSingleInstanceMutex").encode_wide().chain(Some(0)).collect();
        let handle = CreateMutexW(std::ptr::null_mut(), 1, name.as_ptr());
        if handle.is_null() || GetLastError() == ERROR_ALREADY_EXISTS {
            return false;
        }
        true
    }
}

#[cfg(windows)]
fn set_clipboard_text(text: &str) {
    use std::ffi::OsStr;
    use std::os::windows::ffi::OsStrExt;
    unsafe {
        #[link(name = "user32")]
        #[link(name = "kernel32")]
        extern "system" {
            fn OpenClipboard(hWndNewOwner: *mut std::ffi::c_void) -> i32;
            fn CloseClipboard() -> i32;
            fn EmptyClipboard() -> i32;
            fn SetClipboardData(uFormat: u32, hMem: *mut std::ffi::c_void) -> *mut std::ffi::c_void;
            fn GlobalAlloc(uFlags: u32, dwBytes: usize) -> *mut std::ffi::c_void;
            fn GlobalLock(hMem: *mut std::ffi::c_void) -> *mut std::ffi::c_void;
            fn GlobalUnlock(hMem: *mut std::ffi::c_void) -> i32;
        }
        const CF_UNICODETEXT: u32 = 13;
        const GMEM_MOVEABLE: u32 = 0x0002;

        let wide: Vec<u16> = OsStr::new(text).encode_wide().chain(Some(0)).collect();
        let size = wide.len() * 2;
        let h_mem = GlobalAlloc(GMEM_MOVEABLE, size);
        if !h_mem.is_null() {
            let ptr = GlobalLock(h_mem) as *mut u16;
            if !ptr.is_null() {
                std::ptr::copy_nonoverlapping(wide.as_ptr(), ptr, wide.len());
                GlobalUnlock(h_mem);
                if OpenClipboard(std::ptr::null_mut()) != 0 {
                    EmptyClipboard();
                    SetClipboardData(CF_UNICODETEXT, h_mem);
                    CloseClipboard();
                }
            }
        }
    }
}

#[cfg(windows)]
fn open_external_url(url: &str) {
    if !url.starts_with("https://") && !url.starts_with("http://") && !url.starts_with("discord://") {
        return;
    }
    // Security check: block control characters, newlines, null bytes
    if url.chars().any(|c| c.is_control() || c == '\0') {
        return;
    }

    use std::ffi::OsStr;
    use std::os::windows::ffi::OsStrExt;
    unsafe {
        #[link(name = "shell32")]
        extern "system" {
            fn ShellExecuteW(
                hwnd: *mut std::ffi::c_void,
                lpOperation: *const u16,
                lpFile: *const u16,
                lpParameters: *const u16,
                lpDirectory: *const u16,
                nShowCmd: i32,
            ) -> *mut std::ffi::c_void;
        }

        let op: Vec<u16> = OsStr::new("open").encode_wide().chain(Some(0)).collect();
        let target: Vec<u16> = OsStr::new(url).encode_wide().chain(Some(0)).collect();
        ShellExecuteW(
            std::ptr::null_mut(),
            op.as_ptr(),
            target.as_ptr(),
            std::ptr::null(),
            std::ptr::null(),
            1, // SW_SHOWNORMAL
        );
    }
}

#[cfg(not(windows))]
fn open_external_url(url: &str) {
    if !url.starts_with("https://") && !url.starts_with("http://") && !url.starts_with("discord://") {
        return;
    }
    if url.chars().any(|c| c.is_control() || c == '\0' || c == '"' || c == '\'') {
        return;
    }
    let _ = std::process::Command::new("xdg-open").arg(url).spawn();
}

fn check_github_updates(current_ver: &str) -> serde_json::Value {
    let api_url = "https://api.github.com/repos/Mextrim/orbshacker/releases/latest";
    let req = minreq::get(api_url)
        .with_header("User-Agent", "Orbshacker-App")
        .with_header("Accept", "application/vnd.github.v3+json")
        .with_timeout(6);

    if let Ok(resp) = req.send() {
        if resp.status_code >= 200 && resp.status_code < 300 {
            if let Ok(json) = serde_json::from_slice::<serde_json::Value>(resp.as_bytes()) {
                let latest_tag = json["tag_name"].as_str().unwrap_or("").trim_start_matches('v');
                let curr_clean = current_ver.trim_start_matches('v');
                let has_update = !latest_tag.is_empty() && latest_tag != curr_clean;
                let body = json["body"].as_str().unwrap_or("");
                let mut download_url = String::new();
                let mut asset_name = String::new();

                if let Some(assets) = json["assets"].as_array() {
                    for a in assets {
                        if let Some(name) = a["name"].as_str() {
                            if name.ends_with(".zip") || name == "orbshacker.exe" {
                                download_url = a["browser_download_url"].as_str().unwrap_or("").to_string();
                                asset_name = name.to_string();
                                break;
                            }
                        }
                    }
                }

                return serde_json::json!({
                    "hasUpdate": has_update,
                    "currentVersion": current_ver,
                    "latestVersion": format!("v{}", latest_tag),
                    "releaseNotes": body,
                    "downloadUrl": download_url,
                    "assetName": asset_name
                });
            }
        }
    }

    serde_json::json!({
        "hasUpdate": false,
        "currentVersion": current_ver,
        "latestVersion": current_ver
    })
}

pub fn run_gui_app() {
    #[cfg(windows)]
    if !acquire_single_instance_lock() {
        eprintln!("Another instance of Orbshacker is already running.");
        return;
    }

    let event_loop: EventLoop<AppEvent> = EventLoopBuilder::<AppEvent>::with_user_event().build();
    let proxy = event_loop.create_proxy();

    let window = WindowBuilder::new()
        .with_title("ORBSHACKER")
        .with_decorations(false)
        .with_inner_size(LogicalSize::new(1080.0, 780.0))
        .with_min_inner_size(LogicalSize::new(920.0, 660.0))
        .build(&event_loop)
        .expect("Failed to create application window");

    let session = Arc::new(Mutex::new(FarmSession::new()));

    // Event callback connecting session background events into JS via EventLoopProxy
    let proxy_for_cb = proxy.clone();
    let event_cb = Arc::new(move |evt: &str, data: serde_json::Value| {
        let script = format!(
            "window.__orbshacker_dispatch_event({}, {});",
            serde_json::to_string(evt).unwrap_or_else(|_| "\"log\"".to_string()),
            data
        );
        let _ = proxy_for_cb.send_event(AppEvent::EvalScript(script));
    });

    let session_for_ipc = session.clone();
    let proxy_for_ipc = proxy.clone();
    let cb_for_ipc = event_cb.clone();

    let webview = WebViewBuilder::new()
        .with_custom_protocol("orbshacker".into(), move |_webview, req| {
            let path = req.uri().path();
            let clean_path = path.trim_start_matches('/');
            let (body, mime) = match clean_path {
                "" | "index.html" => (Cow::Borrowed(INDEX_HTML.as_bytes()), "text/html; charset=utf-8"),
                "style.css" => (Cow::Borrowed(STYLE_CSS.as_bytes()), "text/css; charset=utf-8"),
                "app.js" => (Cow::Borrowed(APP_JS.as_bytes()), "application/javascript; charset=utf-8"),
                "i18n.js" => (Cow::Borrowed(I18N_JS.as_bytes()), "application/javascript; charset=utf-8"),
                p if p.ends_with("icon.png") => (Cow::Borrowed(ICON_PNG), "image/png"),
                p if p.ends_with("icon.ico") => (Cow::Borrowed(ICON_ICO), "image/x-icon"),
                _ => (Cow::Borrowed("Not Found".as_bytes()), "text/plain"),
            };

            wry::http::Response::builder()
                .header("Content-Type", mime)
                .header("Access-Control-Allow-Origin", "*")
                .body(body)
                .unwrap()
        })
        .with_initialization_script(BRIDGE_JS)
        .with_ipc_handler(move |req: wry::http::Request<String>| {
            let body_str = req.body();
            let parsed: serde_json::Value = match serde_json::from_str(body_str) {
                Ok(v) => v,
                Err(_) => return,
            };

            let req_type = parsed.get("type").and_then(|v| v.as_str()).unwrap_or("");
            match req_type {
                "rpc" => {
                    let id = parsed.get("id").and_then(|v| v.as_u64()).unwrap_or(0);
                    let method = parsed.get("method").and_then(|v| v.as_str()).unwrap_or("");
                    let params = parsed.get("params").cloned().unwrap_or(serde_json::Value::Null);

                    let session_clone = session_for_ipc.clone();
                    let cb_clone = cb_for_ipc.clone();
                    let proxy_clone = proxy_for_ipc.clone();
                    let method_owned = method.to_string();

                    thread::spawn(move || {
                        let (res, err) = crate::rpc::dispatch_rpc_call(
                            &method_owned,
                            &params,
                            &session_clone,
                            cb_clone,
                        );

                        let script = match (res, err) {
                            (Some(r), _) => format!("window.__orbshacker_dispatch_response({}, {}, null);", id, r),
                            (None, Some(e)) => {
                                format!("window.__orbshacker_dispatch_response({}, null, {});", id, serde_json::to_string(&e).unwrap())
                            }
                            (None, None) => format!("window.__orbshacker_dispatch_response({}, null, null);", id),
                        };
                        let _ = proxy_clone.send_event(AppEvent::EvalScript(script));
                    });
                }
                "window" => {
                    let action = parsed.get("action").and_then(|v| v.as_str()).unwrap_or("");
                    match action {
                        "minimize" => { let _ = proxy_for_ipc.send_event(AppEvent::Minimize); }
                        "maximize" => { let _ = proxy_for_ipc.send_event(AppEvent::Maximize); }
                        "close" => { let _ = proxy_for_ipc.send_event(AppEvent::Close); }
                        "drag" => { let _ = proxy_for_ipc.send_event(AppEvent::Drag); }
                        _ => {}
                    }
                }
                "toggle_mini_mode" => {
                    let id = parsed.get("id").and_then(|v| v.as_u64()).unwrap_or(0);
                    let _ = proxy_for_ipc.send_event(AppEvent::ToggleMiniMode(id));
                }
                "open_external" => {
                    if let Some(url) = parsed.get("url").and_then(|v| v.as_str()) {
                        open_external_url(url);
                    }
                }
                "copy_clipboard" => {
                    let id = parsed.get("id").and_then(|v| v.as_u64()).unwrap_or(0);
                    let text = parsed.get("text").and_then(|v| v.as_str()).unwrap_or("");
                    #[cfg(windows)]
                    set_clipboard_text(text);
                    let script = format!("window.__orbshacker_dispatch_response({}, true, null);", id);
                    let _ = proxy_for_ipc.send_event(AppEvent::EvalScript(script));
                }
                "check_updates" => {
                    let id = parsed.get("id").and_then(|v| v.as_u64()).unwrap_or(0);
                    let current_ver = env!("CARGO_PKG_VERSION");
                    let proxy_clone = proxy_for_ipc.clone();

                    thread::spawn(move || {
                        let info = check_github_updates(current_ver);
                        let script = format!("window.__orbshacker_dispatch_response({}, {}, null);", id, info);
                        let _ = proxy_clone.send_event(AppEvent::EvalScript(script));
                    });
                }
                "download_update" => {
                    let id = parsed.get("id").and_then(|v| v.as_u64()).unwrap_or(0);
                    let download_url = parsed
                        .get("params")
                        .and_then(|p| p.get("downloadUrl"))
                        .and_then(|u| u.as_str())
                        .unwrap_or("https://github.com/Mextrim/orbshacker/releases/latest");

                    let safe_url = if download_url.starts_with("https://github.com/Mextrim/orbshacker/")
                        || download_url.starts_with("https://objects.githubusercontent.com/")
                    {
                        download_url
                    } else {
                        "https://github.com/Mextrim/orbshacker/releases/latest"
                    };

                    open_external_url(safe_url);
                    let script = format!("window.__orbshacker_dispatch_response({}, true, null);", id);
                    let _ = proxy_for_ipc.send_event(AppEvent::EvalScript(script));
                }
                "get_live_profile" => {
                    let id = parsed.get("id").and_then(|v| v.as_u64()).unwrap_or(0);
                    let connected = crate::discord_rpc::is_discord_available();
                    let info = serde_json::json!({
                        "connected": connected,
                        "user": {
                            "username": "Discord Client",
                            "discriminator": "0"
                        }
                    });
                    let script = format!("window.__orbshacker_dispatch_response({}, {}, null);", id, info);
                    let _ = proxy_for_ipc.send_event(AppEvent::EvalScript(script));
                }
                "get_auto_launch" => {
                    let id = parsed.get("id").and_then(|v| v.as_u64()).unwrap_or(0);
                    let script = format!("window.__orbshacker_dispatch_response({}, false, null);", id);
                    let _ = proxy_for_ipc.send_event(AppEvent::EvalScript(script));
                }
                "set_auto_launch" => {
                    let id = parsed.get("id").and_then(|v| v.as_u64()).unwrap_or(0);
                    let script = format!("window.__orbshacker_dispatch_response({}, true, null);", id);
                    let _ = proxy_for_ipc.send_event(AppEvent::EvalScript(script));
                }
                "shutdown_system" => {
                    let mut s = session_for_ipc.lock().unwrap();
                    s.stop_farm();
                    s.stop_badge_farm();
                    #[cfg(windows)]
                    let _ = std::process::Command::new("shutdown.exe")
                        .args(["/s", "/t", "0"])
                        .spawn();
                    std::process::exit(0);
                }
                _ => {}
            }
        })
        .with_url("orbshacker://localhost/index.html")
        .build(&window)
        .expect("Failed to initialize WebView2 control");

    let mut is_mini_mode = false;
    let mut saved_size = LogicalSize::new(1080.0, 780.0);
    let mut saved_pos = LogicalPosition::new(100.0, 100.0);

    event_loop.run(move |event, _, control_flow| {
        *control_flow = ControlFlow::Wait;

        match event {
            Event::UserEvent(app_evt) => match app_evt {
                AppEvent::EvalScript(script) => {
                    let _ = webview.evaluate_script(&script);
                }
                AppEvent::Minimize => {
                    window.set_minimized(true);
                }
                AppEvent::Maximize => {
                    window.set_maximized(!window.is_maximized());
                }
                AppEvent::Close => {
                    let mut s = session.lock().unwrap();
                    s.stop_farm();
                    s.stop_badge_farm();
                    *control_flow = ControlFlow::Exit;
                }
                AppEvent::Drag => {
                    let _ = window.drag_window();
                }
                AppEvent::ToggleMiniMode(id) => {
                    if !is_mini_mode {
                        let scale = window.scale_factor();
                        saved_size = window.inner_size().to_logical(scale);
                        if let Ok(pos) = window.outer_position() {
                            saved_pos = pos.to_logical(scale);
                        }

                        is_mini_mode = true;
                        window.set_always_on_top(true);
                        window.set_min_inner_size(Some(LogicalSize::new(340.0, 120.0)));
                        window.set_inner_size(LogicalSize::new(360.0, 130.0));
                    } else {
                        is_mini_mode = false;
                        window.set_always_on_top(false);
                        window.set_min_inner_size(Some(LogicalSize::new(920.0, 660.0)));
                        window.set_inner_size(saved_size);
                        window.set_outer_position(saved_pos);
                    }

                    let resp_script = format!("window.__orbshacker_dispatch_response({}, {{\"isMini\": {}}}, null);", id, is_mini_mode);
                    let _ = webview.evaluate_script(&resp_script);
                    let change_script = format!("window.__orbshacker_dispatch_mini({});", is_mini_mode);
                    let _ = webview.evaluate_script(&change_script);
                }
            },
            Event::WindowEvent { event: WindowEvent::CloseRequested, .. } => {
                let mut s = session.lock().unwrap();
                s.stop_farm();
                s.stop_badge_farm();
                *control_flow = ControlFlow::Exit;
            }
            _ => {}
        }
    });
}
