#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::env;
use std::fs::{self, File};
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;

const GITHUB_REPO: &str = "Mextrim/orbshacker";
const DEFAULT_VERSION: &str = "v2.5.0";

#[derive(Clone, Default)]
struct ProgressState {
    status: String,
    detail: String,
    percent: u32,
    finished: bool,
    error: Option<String>,
}

fn get_app_dir(root_dir: &Path) -> PathBuf {
    root_dir.join("app")
}

fn find_installed_executable(root_dir: &Path) -> Option<PathBuf> {
    let app_dir = get_app_dir(root_dir);
    let candidates = [
        app_dir.join("win-unpacked").join("orbshacker.exe"),
        app_dir.join("orbshacker.exe"),
        root_dir.join("dist").join("win-unpacked").join("orbshacker.exe"),
        root_dir.join("dist").join("orbshacker-portable.exe"),
    ];

    for c in &candidates {
        if c.exists() {
            return Some(c.clone());
        }
    }
    None
}

// =========================================================
// DOWNLOAD & EXTRACT LOGIC
// =========================================================

fn get_download_url_and_version() -> (String, String) {
    let api_url = format!("https://api.github.com/repos/{}/releases/latest", GITHUB_REPO);
    let req = minreq::get(&api_url)
        .with_header("User-Agent", "Orbshacker-Launcher")
        .with_header("Accept", "application/vnd.github.v3+json")
        .with_timeout(8);

    if let Ok(resp) = req.send() {
        if resp.status_code >= 200 && resp.status_code < 300 {
            if let Ok(json) = serde_json::from_slice::<serde_json::Value>(resp.as_bytes()) {
                let tag = json["tag_name"].as_str().unwrap_or(DEFAULT_VERSION).to_string();
                if let Some(assets) = json["assets"].as_array() {
                    for asset in assets {
                        if let Some(name) = asset["name"].as_str() {
                            if name.ends_with(".zip") && name.contains("win") {
                                if let Some(download_url) = asset["browser_download_url"].as_str() {
                                    return (download_url.to_string(), tag);
                                }
                            }
                        }
                    }
                }
                let fallback = format!(
                    "https://github.com/{}/releases/download/{}/orbshacker-{}-win-x64.zip",
                    GITHUB_REPO, tag, tag
                );
                return (fallback, tag);
            }
        }
    }

    let fallback = format!(
        "https://github.com/{}/releases/download/{}/orbshacker-{}-win-x64.zip",
        GITHUB_REPO, DEFAULT_VERSION, DEFAULT_VERSION
    );
    (fallback, DEFAULT_VERSION.to_string())
}

fn download_file_with_progress(
    url: &str,
    dest_path: &Path,
    state: &Arc<Mutex<ProgressState>>,
    cancel_flag: &Arc<AtomicBool>,
) -> Result<(), String> {
    let mut current_url = url.to_string();

    // Follow redirects (GitHub download redirects to AWS S3 CDN)
    let mut response_lazy = None;
    for _ in 0..8 {
        if cancel_flag.load(Ordering::SeqCst) {
            return Err("Отменено пользователем".to_string());
        }

        let resp = minreq::get(&current_url)
            .with_header("User-Agent", "Orbshacker-Launcher")
            .with_timeout(30)
            .send_lazy()
            .map_err(|e| format!("Ошибка подключения: {}", e))?;

        if resp.status_code == 301 || resp.status_code == 302 || resp.status_code == 307 || resp.status_code == 308 {
            let redirect_loc = resp
                .headers
                .iter()
                .find(|(k, _)| k.eq_ignore_ascii_case("location"))
                .map(|(_, v)| v.clone());
            if let Some(loc) = redirect_loc {
                current_url = loc;
                continue;
            }
        }

        if resp.status_code >= 200 && resp.status_code < 300 {
            response_lazy = Some(resp);
            break;
        } else {
            return Err(format!("Сервер вернул код ошибки: {}", resp.status_code));
        }
    }

    let resp = response_lazy.ok_or_else(|| "Превышено количество перенаправлений".to_string())?;
    let content_len: u64 = resp
        .headers
        .iter()
        .find(|(k, _)| k.eq_ignore_ascii_case("content-length"))
        .and_then(|(_, v)| v.parse().ok())
        .unwrap_or(115_000_000);

    let mut dest_file = File::create(dest_path).map_err(|e| format!("Не удалось создать файл: {}", e))?;
    let mut reader = resp;
    let mut buffer = [0u8; 65536]; // 64 KB chunks
    let mut downloaded: u64 = 0;

    let start_time = std::time::Instant::now();
    let mut last_ui_update = std::time::Instant::now();

    loop {
        if cancel_flag.load(Ordering::SeqCst) {
            let _ = fs::remove_file(dest_path);
            return Err("Отменено пользователем".to_string());
        }

        let n = reader.read(&mut buffer).map_err(|e| format!("Ошибка при загрузке: {}", e))?;
        if n == 0 {
            break;
        }

        dest_file.write_all(&buffer[..n]).map_err(|e| format!("Ошибка записи: {}", e))?;
        downloaded += n as u64;

        if last_ui_update.elapsed() >= Duration::from_millis(100) {
            last_ui_update = std::time::Instant::now();
            let pct = if content_len > 0 {
                ((downloaded as f64 / content_len as f64) * 100.0).min(100.0) as u32
            } else {
                0
            };

            let elapsed_sec = start_time.elapsed().as_secs_f64().max(0.1);
            let speed_mb = (downloaded as f64 / 1_048_576.0) / elapsed_sec;
            let cur_mb = downloaded as f64 / 1_048_576.0;
            let total_mb = content_len as f64 / 1_048_576.0;

            if let Ok(mut st) = state.lock() {
                st.status = "Загрузка компонентов с GitHub Releases...".to_string();
                st.detail = format!("{:.1} МБ / {:.1} МБ ({}%) • {:.1} МБ/с", cur_mb, total_mb, pct, speed_mb);
                st.percent = pct;
            }
        }
    }

    Ok(())
}

fn extract_zip(
    zip_path: &Path,
    target_dir: &Path,
    state: &Arc<Mutex<ProgressState>>,
    cancel_flag: &Arc<AtomicBool>,
) -> Result<(), String> {
    if let Ok(mut st) = state.lock() {
        st.status = "Распаковка файлов программы...".to_string();
        st.detail = "Подготовка директории...".to_string();
        st.percent = 100;
    }

    let _ = fs::create_dir_all(target_dir);
    let file = File::open(zip_path).map_err(|e| format!("Не удалось открыть архив: {}", e))?;
    let mut archive = zip::ZipArchive::new(file).map_err(|e| format!("Повреждённый ZIP-архив: {}", e))?;
    let total_files = archive.len();

    for i in 0..total_files {
        if cancel_flag.load(Ordering::SeqCst) {
            return Err("Отменено пользователем".to_string());
        }

        let mut entry = archive.by_index(i).map_err(|e| format!("Ошибка чтения архива: {}", e))?;
        let outpath = match entry.enclosed_name() {
            Some(path) => target_dir.join(path),
            None => continue,
        };

        if entry.is_dir() {
            let _ = fs::create_dir_all(&outpath);
        } else {
            if let Some(p) = outpath.parent() {
                if !p.exists() {
                    let _ = fs::create_dir_all(p);
                }
            }
            let mut outfile = File::create(&outpath).map_err(|e| format!("Не удалось распаковать: {}", e))?;
            let _ = std::io::copy(&mut entry, &mut outfile);
        }

        if i % 10 == 0 || i == total_files - 1 {
            let pct = ((i + 1) as f64 / total_files as f64 * 100.0) as u32;
            if let Ok(mut st) = state.lock() {
                st.detail = format!("Распаковка: {} / {} файлов ({}%)", i + 1, total_files, pct);
            }
        }
    }

    Ok(())
}

// =========================================================
// WIN32 NATIVE GUI LAUNCHER WINDOW
// =========================================================

#[cfg(windows)]
mod win_gui {
    use super::*;
    use std::ffi::OsStr;
    use std::os::windows::ffi::OsStrExt;

    #[link(name = "comctl32")]
    #[link(name = "gdi32")]
    #[link(name = "user32")]
    extern "system" {
        fn GetModuleHandleW(lpModuleName: *const u16) -> *mut std::ffi::c_void;
        fn RegisterClassW(lpWndClass: *const WNDCLASSW) -> u16;
        fn DefWindowProcW(hWnd: *mut std::ffi::c_void, Msg: u32, wParam: usize, lParam: isize) -> isize;
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
        fn UpdateWindow(hWnd: *mut std::ffi::c_void) -> i32;
        fn SetWindowTextW(hWnd: *mut std::ffi::c_void, lpString: *const u16) -> i32;
        fn SendMessageW(hWnd: *mut std::ffi::c_void, Msg: u32, wParam: usize, lParam: isize) -> isize;
        fn PeekMessageW(lpMsg: *mut MSG, hWnd: *mut std::ffi::c_void, wMsgFilterMin: u32, wMsgFilterMax: u32, wRemoveMsg: u32) -> i32;
        fn TranslateMessage(lpMsg: *const MSG) -> i32;
        fn DispatchMessageW(lpMsg: *const MSG) -> isize;
        fn DestroyWindow(hWnd: *mut std::ffi::c_void) -> i32;
        fn PostQuitMessage(nExitCode: i32);
        fn CreateSolidBrush(color: u32) -> *mut std::ffi::c_void;
        fn SetBkMode(hdc: *mut std::ffi::c_void, mode: i32) -> i32;
        fn SetTextColor(hdc: *mut std::ffi::c_void, color: u32) -> u32;
        fn CreateFontW(
            cHeight: i32,
            cWidth: i32,
            cEscapement: i32,
            cOrientation: i32,
            cWeight: i32,
            bItalic: u32,
            bUnderline: u32,
            bStrikeOut: u32,
            iCharSet: u32,
            iOutPrecision: u32,
            iClipPrecision: u32,
            iQuality: u32,
            iPitchAndFamily: u32,
            pszFaceName: *const u16,
        ) -> *mut std::ffi::c_void;
        fn GetSystemMetrics(nIndex: i32) -> i32;
        fn InitCommonControlsEx(lpInitCtrls: *const INITCOMMONCONTROLSEX) -> i32;
    }

    #[repr(C)]
    #[allow(non_snake_case)]
    struct INITCOMMONCONTROLSEX {
        dwSize: u32,
        dwICC: u32,
    }

    #[repr(C)]
    #[allow(non_snake_case)]
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
    struct POINT {
        x: i32,
        y: i32,
    }

    #[repr(C)]
    #[allow(non_snake_case)]
    struct MSG {
        hwnd: *mut std::ffi::c_void,
        message: u32,
        wParam: usize,
        lParam: isize,
        time: u32,
        pt: POINT,
    }

    static mut BG_BRUSH: *mut std::ffi::c_void = std::ptr::null_mut();

    unsafe extern "system" fn wnd_proc(hwnd: *mut std::ffi::c_void, msg: u32, wparam: usize, lparam: isize) -> isize {
        match msg {
            0x0138 => {
                // WM_CTLCOLORSTATIC: Paint labels with dark background and neon text
                let hdc = wparam as *mut std::ffi::c_void;
                SetBkMode(hdc, 1); // TRANSPARENT
                SetTextColor(hdc, 0x00E2E8F0); // Light slate text
                return BG_BRUSH as isize;
            }
            0x0010 => {
                // WM_CLOSE
                DestroyWindow(hwnd);
                0
            }
            0x0002 => {
                // WM_DESTROY
                PostQuitMessage(0);
                0
            }
            _ => DefWindowProcW(hwnd, msg, wparam, lparam),
        }
    }

    fn to_wide(s: &str) -> Vec<u16> {
        OsStr::new(s).encode_wide().chain(Some(0)).collect()
    }

    pub fn run_launcher_gui(
        state: Arc<Mutex<ProgressState>>,
        cancel_flag: Arc<AtomicBool>,
    ) {
        unsafe {
            let icc = INITCOMMONCONTROLSEX {
                dwSize: std::mem::size_of::<INITCOMMONCONTROLSEX>() as u32,
                dwICC: 0x00000020, // ICC_PROGRESS_CLASS
            };
            InitCommonControlsEx(&icc);

            let h_inst = GetModuleHandleW(std::ptr::null());
            let class_name = to_wide("OrbshackerLauncherWnd");

            // Dark blue-gray theme background RGB(14, 18, 26)
            BG_BRUSH = CreateSolidBrush(0x001A120E);

            let wc = WNDCLASSW {
                style: 0x0002 | 0x0001,
                lpfnWndProc: wnd_proc,
                cbClsExtra: 0,
                cbWndExtra: 0,
                hInstance: h_inst,
                hIcon: std::ptr::null_mut(),
                hCursor: std::ptr::null_mut(),
                hbrBackground: BG_BRUSH,
                lpszMenuName: std::ptr::null(),
                lpszClassName: class_name.as_ptr(),
            };
            RegisterClassW(&wc);

            let w = 500;
            let h = 260;
            let screen_w = GetSystemMetrics(0);
            let screen_h = GetSystemMetrics(1);
            let x = (screen_w - w) / 2;
            let y = (screen_h - h) / 2;

            let wnd_title = to_wide("ORBSHACKER Launcher");
            let hwnd = CreateWindowExW(
                0x00000008, // WS_EX_TOPMOST
                class_name.as_ptr(),
                wnd_title.as_ptr(),
                0x00CF0000 & !0x00010000 & !0x00040000, // WS_OVERLAPPED | WS_CAPTION | WS_SYSMENU (fixed size)
                x, y, w, h,
                std::ptr::null_mut(),
                std::ptr::null_mut(),
                h_inst,
                std::ptr::null_mut(),
            );

            if hwnd.is_null() {
                return;
            }

            // Fonts
            let font_name = to_wide("Segoe UI");
            let title_font = CreateFontW(26, 0, 0, 0, 700, 0, 0, 0, 1, 0, 0, 4, 0, font_name.as_ptr());
            let main_font = CreateFontW(16, 0, 0, 0, 400, 0, 0, 0, 1, 0, 0, 4, 0, font_name.as_ptr());
            let bold_font = CreateFontW(16, 0, 0, 0, 600, 0, 0, 0, 1, 0, 0, 4, 0, font_name.as_ptr());

            // 1. Header Title: "⚡ ORBSHACKER"
            let static_class = to_wide("STATIC");
            let title_text = to_wide("⚡ ORBSHACKER");
            let h_title = CreateWindowExW(
                0, static_class.as_ptr(), title_text.as_ptr(),
                0x50000000, // WS_CHILD | WS_VISIBLE
                30, 20, 440, 32,
                hwnd, std::ptr::null_mut(), h_inst, std::ptr::null_mut()
            );
            SendMessageW(h_title, 0x0030, title_font as usize, 1);

            // 2. Subtitle: "Загрузчик компонентов программы"
            let sub_text = to_wide("Лаунчер автоматического обновления и загрузки с GitHub Releases");
            let h_sub = CreateWindowExW(
                0, static_class.as_ptr(), sub_text.as_ptr(),
                0x50000000,
                30, 56, 440, 20,
                hwnd, std::ptr::null_mut(), h_inst, std::ptr::null_mut()
            );
            SendMessageW(h_sub, 0x0030, main_font as usize, 1);

            // 3. Progress Bar
            let progress_class = to_wide("msctls_progress32");
            let h_prog = CreateWindowExW(
                0, progress_class.as_ptr(), std::ptr::null(),
                0x50000000 | 0x01, // WS_CHILD | WS_VISIBLE | PBS_SMOOTH
                30, 95, 424, 24,
                hwnd, std::ptr::null_mut(), h_inst, std::ptr::null_mut()
            );
            SendMessageW(h_prog, 0x0400 + 6, 0, 100); // PBM_SETRANGE32 (0..100)

            // 4. Status Text
            let status_init = to_wide("Подключение к GitHub Releases...");
            let h_status = CreateWindowExW(
                0, static_class.as_ptr(), status_init.as_ptr(),
                0x50000000,
                30, 130, 440, 22,
                hwnd, std::ptr::null_mut(), h_inst, std::ptr::null_mut()
            );
            SendMessageW(h_status, 0x0030, bold_font as usize, 1);

            // 5. Detail Text
            let detail_init = to_wide("Пожалуйста, подождите...");
            let h_detail = CreateWindowExW(
                0, static_class.as_ptr(), detail_init.as_ptr(),
                0x50000000,
                30, 155, 440, 22,
                hwnd, std::ptr::null_mut(), h_inst, std::ptr::null_mut()
            );
            SendMessageW(h_detail, 0x0030, main_font as usize, 1);

            ShowWindow(hwnd, 5); // SW_SHOW
            UpdateWindow(hwnd);

            // Responsive loop
            let mut last_percent = 0u32;
            let mut last_status = String::new();
            let mut last_detail = String::new();
            let mut msg: MSG = std::mem::zeroed();

            loop {
                while PeekMessageW(&mut msg, std::ptr::null_mut(), 0, 0, 1) != 0 {
                    if msg.message == 0x0012 { // WM_QUIT
                        cancel_flag.store(true, Ordering::SeqCst);
                        return;
                    }
                    TranslateMessage(&msg);
                    DispatchMessageW(&msg);
                }

                // Update UI from ProgressState
                if let Ok(st) = state.lock() {
                    if st.percent != last_percent {
                        last_percent = st.percent;
                        SendMessageW(h_prog, 0x0400 + 2, st.percent as usize, 0); // PBM_SETPOS
                    }
                    if st.status != last_status {
                        last_status = st.status.clone();
                        let wide = to_wide(&last_status);
                        SetWindowTextW(h_status, wide.as_ptr());
                    }
                    if st.detail != last_detail {
                        last_detail = st.detail.clone();
                        let wide = to_wide(&last_detail);
                        SetWindowTextW(h_detail, wide.as_ptr());
                    }
                    if st.finished {
                        thread::sleep(Duration::from_millis(500));
                        DestroyWindow(hwnd);
                        break;
                    }
                }

                thread::sleep(Duration::from_millis(30));
            }
        }
    }
}

// =========================================================
// MAIN ENTRY POINT
// =========================================================

fn main() {
    let args: Vec<String> = env::args().collect();
    let has_update_flag = args.iter().any(|a| a == "--update" || a == "-u" || a == "--reinstall");

    let root_dir = env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|d| d.to_path_buf()))
        .unwrap_or_else(|| env::current_dir().unwrap_or_else(|_| PathBuf::from(".")));

    // 1. If already installed and no --update flag passed, directly start the program!
    if !has_update_flag {
        if let Some(exe) = find_installed_executable(&root_dir) {
            let mut cmd = Command::new(&exe);
            cmd.args(&args[1..]);
            if let Ok(_) = cmd.spawn() {
                return;
            }
        }
    }

    // 2. Launch GUI downloader to fetch all files from GitHub
    let state = Arc::new(Mutex::new(ProgressState {
        status: "Подключение к GitHub...".to_string(),
        detail: "Получение информации о релизе...".to_string(),
        percent: 0,
        finished: false,
        error: None,
    }));
    let cancel_flag = Arc::new(AtomicBool::new(false));

    let state_worker = state.clone();
    let cancel_worker = cancel_flag.clone();
    let root_worker = root_dir.clone();

    // Background worker: download from GitHub & extract
    let _worker_thread = thread::spawn(move || {
        let (download_url, version) = get_download_url_and_version();
        let app_dir = get_app_dir(&root_worker);
        let temp_zip = root_worker.join("orbshacker_update.tmp");

        if let Ok(mut st) = state_worker.lock() {
            st.status = format!("Найдена версия {} на GitHub", version);
            st.detail = "Запуск загрузки дистрибутива...".to_string();
            st.percent = 5;
        }

        // Download
        if let Err(e) = download_file_with_progress(&download_url, &temp_zip, &state_worker, &cancel_worker) {
            if let Ok(mut st) = state_worker.lock() {
                st.status = "Ошибка загрузки".to_string();
                st.detail = e.clone();
                st.error = Some(e);
                st.finished = true;
            }
            return;
        }

        // Extract
        if let Err(e) = extract_zip(&temp_zip, &app_dir, &state_worker, &cancel_worker) {
            let _ = fs::remove_file(&temp_zip);
            if let Ok(mut st) = state_worker.lock() {
                st.status = "Ошибка распаковки".to_string();
                st.detail = e.clone();
                st.error = Some(e);
                st.finished = true;
            }
            return;
        }

        let _ = fs::remove_file(&temp_zip);
        let _ = fs::write(app_dir.join("version.txt"), &version);

        // Success - spawn the installed app
        if let Ok(mut st) = state_worker.lock() {
            st.status = "Установка завершена!".to_string();
            st.detail = "Запуск программы ORBSHACKER...".to_string();
            st.percent = 100;
        }

        thread::sleep(Duration::from_millis(600));

        if let Some(exe) = find_installed_executable(&root_worker) {
            let _ = Command::new(&exe).spawn();
        }

        if let Ok(mut st) = state_worker.lock() {
            st.finished = true;
        }
    });

    #[cfg(windows)]
    win_gui::run_launcher_gui(state, cancel_flag);

    #[cfg(not(windows))]
    {
        println!("🚀 ORBSHACKER Launcher: Downloading files from GitHub...");
        let _ = _worker_thread.join();
    }
}
