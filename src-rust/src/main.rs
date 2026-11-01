mod discord_rpc;
mod faker;
mod quests;
mod rpc;
mod session;
mod steam;

use std::env;
use std::thread;
use std::time::Duration;

fn main() {
    let args: Vec<String> = env::args().collect();

    // 1. Stub Mode: orbshacker-core --stub --title "Game Title" --duration 900
    if args.contains(&"--stub".to_string()) {
        let mut title = "Game Process".to_string();
        let mut duration_secs = 900u64;

        let mut i = 1;
        while i < args.len() {
            if args[i] == "--title" && i + 1 < args.len() {
                title = args[i + 1].clone();
                i += 2;
            } else if args[i] == "--duration" && i + 1 < args.len() {
                if let Ok(d) = args[i + 1].parse::<u64>() {
                    duration_secs = d;
                }
                i += 2;
            } else {
                i += 1;
            }
        }

        // Set console title & create window so Discord game/window scanner sees the title
        #[cfg(windows)]
        {
            use std::ffi::OsStr;
            use std::os::windows::ffi::OsStrExt;
            let wide_title: Vec<u16> = OsStr::new(&title).encode_wide().chain(Some(0)).collect();
            let class_name: Vec<u16> = OsStr::new("STATIC").encode_wide().chain(Some(0)).collect();
            unsafe {
                extern "system" {
                    fn SetConsoleTitleW(lpConsoleTitle: *const u16) -> i32;
                    fn CreateWindowExW(
                        dwExStyle: u32,
                        lpClassName: *const u16,
                        lpWindowName: *const u16,
                        dwStyle: u32,
                        X: i32,
                        Y: i32,
                        nWidth: i32,
                        nHeight: i32,
                        hWndParent: *mut std::ffi::c_void,
                        hMenu: *mut std::ffi::c_void,
                        hInstance: *mut std::ffi::c_void,
                        lpParam: *mut std::ffi::c_void,
                    ) -> *mut std::ffi::c_void;
                    fn ShowWindow(hWnd: *mut std::ffi::c_void, nCmdShow: i32) -> i32;
                }
                let _ = SetConsoleTitleW(wide_title.as_ptr());
                let hwnd = CreateWindowExW(
                    0,
                    class_name.as_ptr(),
                    wide_title.as_ptr(),
                    0x80000000 | 0x20000000, // WS_POPUP | WS_MINIMIZE
                    0,
                    0,
                    100,
                    100,
                    std::ptr::null_mut(),
                    std::ptr::null_mut(),
                    std::ptr::null_mut(),
                    std::ptr::null_mut(),
                );
                if !hwnd.is_null() {
                    ShowWindow(hwnd, 6); // SW_MINIMIZE
                }
            }
        }

        thread::sleep(Duration::from_secs(duration_secs));
        return;
    }

    // 2. Headless CLI Farm: orbshacker-core --farm-all
    if args.contains(&"--farm-all".to_string()) {
        println!("Starting headless 15-minute Discord Quests farm...");
        let mut session = session::FarmSession::new();
        let cb = std::sync::Arc::new(|evt: &str, data: serde_json::Value| {
            if evt == "tick" {
                if let Some(percent) = data.get("progress_percent").and_then(|v| v.as_f64()) {
                    print!("\r[Headless Farm] Progress: {:.1}% ", percent);
                    let _ = std::io::Write::flush(&mut std::io::stdout());
                }
            } else if evt == "farm_completed" {
                println!("\n[Headless Farm] Farm completed! Claim your orbs in Discord.");
            } else if evt == "log" {
                if let Some(msg) = data.get("message").and_then(|v| v.as_str()) {
                    println!("\n{}", msg);
                }
            }
        });

        match session.start_farm(vec!["all".to_string()], 15, cb) {
            Ok(count) => {
                println!("Launched {} quests. Waiting 15 minutes...", count);
                loop {
                    thread::sleep(Duration::from_secs(1));
                    if !session.get_status().is_farming {
                        break;
                    }
                }
            }
            Err(e) => {
                eprintln!("Error starting farm: {}", e);
            }
        }
        return;
    }

    // 3. Default: JSON-RPC Daemon for Electron
    rpc::run_json_rpc_service();
}
