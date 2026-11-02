mod badges;
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

        // On Windows: Detach console immediately, create registered Win32 window with title,
        // and run responsive message pump with zero CPU usage.
        #[cfg(windows)]
        {
            unsafe {
                use std::ffi::OsStr;
                use std::os::windows::ffi::OsStrExt;

                #[link(name = "user32")]
                #[link(name = "kernel32")]
                extern "system" {
                    fn FreeConsole() -> i32;
                    fn GetModuleHandleW(lpModuleName: *const u16) -> *mut std::ffi::c_void;
                    fn RegisterClassW(lpWndClass: *const WNDCLASSW) -> u16;
                    fn DefWindowProcW(hWnd: *mut std::ffi::c_void, Msg: u32, wParam: usize, lParam: isize) -> isize;
                    fn CreateWindowExW(
                        dwExStyle: u32,
                        lpClassName: *const u16,
                        lpWindowName: *const u16,
                        dwStyle: u32,
                        X: i32, Y: i32, nWidth: i32, nHeight: i32,
                        hWndParent: *mut std::ffi::c_void,
                        hMenu: *mut std::ffi::c_void,
                        hInstance: *mut std::ffi::c_void,
                        lpParam: *mut std::ffi::c_void,
                    ) -> *mut std::ffi::c_void;
                    fn ShowWindow(hWnd: *mut std::ffi::c_void, nCmdShow: i32) -> i32;
                    fn PeekMessageW(lpMsg: *mut MSG, hWnd: *mut std::ffi::c_void, wMsgFilterMin: u32, wMsgFilterMax: u32, wRemoveMsg: u32) -> i32;
                    fn TranslateMessage(lpMsg: *const MSG) -> i32;
                    fn DispatchMessageW(lpMsg: *const MSG) -> isize;
                    fn DestroyWindow(hWnd: *mut std::ffi::c_void) -> i32;
                    fn SetConsoleTitleW(lpConsoleTitle: *const u16) -> i32;
                    fn SetWindowTextW(hWnd: *mut std::ffi::c_void, lpString: *const u16) -> i32;
                }

                #[repr(C)]
                #[allow(non_snake_case, clippy::upper_case_acronyms)]
                struct WNDCLASSW {
                    style: u32,
                    lpfnWndProc: unsafe extern "system" fn(*mut std::ffi::c_void, u32, usize, isize) -> isize,
                    cbClsExtra: i32,
                    cbWndExtra: i32,
                    hInstance: *mut std::ffi::c_void,
                    hIcon: *mut std::ffi::c_void,
                    hCursor: *mut std::ffi::c_void,
                    hbrBackground: *mut std::ffi::c_void,
                    lpszMenuName: *const u16,
                    lpszClassName: *const u16,
                }

                #[repr(C)]
                #[allow(clippy::upper_case_acronyms)]
                struct POINT {
                    x: i32,
                    y: i32,
                }

                #[repr(C)]
                #[allow(non_snake_case, clippy::upper_case_acronyms)]
                struct MSG {
                    hwnd: *mut std::ffi::c_void,
                    message: u32,
                    wParam: usize,
                    lParam: isize,
                    time: u32,
                    pt: POINT,
                }

                // Close black console window if spawned in console subsystem
                let _ = FreeConsole();

                let h_instance = GetModuleHandleW(std::ptr::null());
                let class_name: Vec<u16> = OsStr::new("OrbshackerGameWindow").encode_wide().chain(Some(0)).collect();
                let wide_title: Vec<u16> = OsStr::new(&title).encode_wide().chain(Some(0)).collect();
                let _ = SetConsoleTitleW(wide_title.as_ptr());

                let wc = WNDCLASSW {
                    style: 0,
                    lpfnWndProc: DefWindowProcW,
                    cbClsExtra: 0,
                    cbWndExtra: 0,
                    hInstance: h_instance,
                    hIcon: std::ptr::null_mut(),
                    hCursor: std::ptr::null_mut(),
                    hbrBackground: std::ptr::null_mut(),
                    lpszMenuName: std::ptr::null(),
                    lpszClassName: class_name.as_ptr(),
                };
                let _ = RegisterClassW(&wc);

                // WS_OVERLAPPEDWINDOW = 0x00CF0000, SW_SHOWMINNOACTIVE = 7
                let hwnd = CreateWindowExW(
                    0,
                    class_name.as_ptr(),
                    wide_title.as_ptr(),
                    0x00CF0000,
                    100, 100, 640, 480,
                    std::ptr::null_mut(),
                    std::ptr::null_mut(),
                    h_instance,
                    std::ptr::null_mut(),
                );
                if !hwnd.is_null() {
                    let _ = SetWindowTextW(hwnd, wide_title.as_ptr());
                    ShowWindow(hwnd, 7); // SW_SHOWMINNOACTIVE
                }

                let start = std::time::Instant::now();
                let mut msg: MSG = std::mem::zeroed();
                while start.elapsed().as_secs() < duration_secs {
                    while PeekMessageW(&mut msg, std::ptr::null_mut(), 0, 0, 1) != 0 {
                        TranslateMessage(&msg);
                        DispatchMessageW(&msg);
                    }
                    thread::sleep(Duration::from_millis(50));
                }

                if !hwnd.is_null() {
                    DestroyWindow(hwnd);
                }
                return;
            }
        }

        #[cfg(not(windows))]
        {
            thread::sleep(Duration::from_secs(duration_secs));
            return;
        }
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

        if let Ok(count) = session.start_farm(vec!["all".to_string()], 15, cb) {
            println!("Launched {} quests. Waiting 15 minutes...", count);
            thread::sleep(Duration::from_secs(905));
            session.stop_farm();
            println!("Finished!");
        }
        return;
    }

    // 3. Default: Run JSON-RPC IPC Server over stdin/stdout
    rpc::run_json_rpc_service();
}
