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

#[cfg(unix)]
use std::os::unix::fs::PermissionsExt;

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

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
#[allow(dead_code)]
enum ArchiveKind {
    Zip,
    TarGz,
    AppImage,
}

fn get_app_dir(root_dir: &Path) -> PathBuf {
    root_dir.join("app")
}

fn find_installed_executable(root_dir: &Path) -> Option<PathBuf> {
    let app_dir = get_app_dir(root_dir);

    #[cfg(windows)]
    let candidates = [
        app_dir.join("win-unpacked").join("orbshacker.exe"),
        app_dir.join("orbshacker.exe"),
        root_dir.join("dist").join("win-unpacked").join("orbshacker.exe"),
        root_dir.join("dist").join("orbshacker-portable.exe"),
        root_dir.join("dist").join("orbshacker.exe"),
    ];

    #[cfg(target_os = "linux")]
    let candidates = [
        app_dir.join("orbshacker.AppImage"),
        app_dir.join("orbshacker"),
        app_dir.join("linux-unpacked").join("orbshacker"),
        root_dir.join("orbshacker.AppImage"),
        root_dir.join("dist").join("orbshacker.AppImage"),
        root_dir.join("dist").join("orbshacker"),
    ];

    #[cfg(target_os = "macos")]
    let candidates = [
        app_dir.join("Orbshacker.app"),
        app_dir.join("Orbshacker.app").join("Contents").join("MacOS").join("orbshacker"),
        root_dir.join("Orbshacker.app"),
        root_dir.join("dist").join("mac").join("Orbshacker.app"),
        root_dir.join("dist").join("mac-arm64").join("Orbshacker.app"),
    ];

    for c in &candidates {
        if c.exists() {
            return Some(c.clone());
        }
    }
    None
}

fn spawn_executable(exe: &Path, args: &[String]) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        if exe.to_string_lossy().ends_with(".app") || exe.is_dir() {
            let mut cmd = Command::new("open");
            cmd.arg(exe);
            if !args.is_empty() {
                cmd.arg("--args");
                cmd.args(args);
            }
            return cmd.spawn().map(|_| ()).map_err(|e| format!("Не удалось запустить через open: {}", e));
        }
    }

    #[cfg(unix)]
    {
        if let Ok(meta) = fs::metadata(exe) {
            let mut perms = meta.permissions();
            perms.set_mode(0o755);
            let _ = fs::set_permissions(exe, perms);
        }
    }

    let mut cmd = Command::new(exe);
    cmd.args(args);
    cmd.spawn().map(|_| ()).map_err(|e| format!("Не удалось запустить: {}", e))
}

// =========================================================
// DOWNLOAD & EXTRACT LOGIC
// =========================================================

fn get_download_url_and_kind() -> (String, String, ArchiveKind) {
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
                    #[cfg(windows)]
                    {
                        for asset in assets {
                            if let Some(name) = asset["name"].as_str() {
                                if name.ends_with(".zip") && name.contains("win") {
                                    if let Some(download_url) = asset["browser_download_url"].as_str() {
                                        return (download_url.to_string(), tag, ArchiveKind::Zip);
                                    }
                                }
                            }
                        }
                    }

                    #[cfg(target_os = "linux")]
                    {
                        // Prefer AppImage or tar.gz for Linux
                        for asset in assets {
                            if let Some(name) = asset["name"].as_str() {
                                if name.ends_with(".AppImage") {
                                    if let Some(download_url) = asset["browser_download_url"].as_str() {
                                        return (download_url.to_string(), tag, ArchiveKind::AppImage);
                                    }
                                }
                            }
                        }
                        for asset in assets {
                            if let Some(name) = asset["name"].as_str() {
                                if (name.ends_with(".tar.gz") || name.ends_with(".tgz")) && name.contains("linux") {
                                    if let Some(download_url) = asset["browser_download_url"].as_str() {
                                        return (download_url.to_string(), tag, ArchiveKind::TarGz);
                                    }
                                }
                            }
                        }
                    }

                    #[cfg(target_os = "macos")]
                    {
                        for asset in assets {
                            if let Some(name) = asset["name"].as_str() {
                                if name.ends_with(".zip") && (name.contains("mac") || name.contains("darwin")) {
                                    if let Some(download_url) = asset["browser_download_url"].as_str() {
                                        return (download_url.to_string(), tag, ArchiveKind::Zip);
                                    }
                                }
                            }
                        }
                    }
                }

                // Fallbacks per OS
                #[cfg(windows)]
                {
                    let fallback = format!(
                        "https://github.com/{}/releases/download/{}/orbshacker-{}-win-x64.zip",
                        GITHUB_REPO, tag, tag
                    );
                    return (fallback, tag, ArchiveKind::Zip);
                }

                #[cfg(target_os = "linux")]
                {
                    let fallback = format!(
                        "https://github.com/{}/releases/download/{}/orbshacker-{}-linux-x64.tar.gz",
                        GITHUB_REPO, tag, tag
                    );
                    return (fallback, tag, ArchiveKind::TarGz);
                }

                #[cfg(target_os = "macos")]
                {
                    let fallback = format!(
                        "https://github.com/{}/releases/download/{}/orbshacker-{}-mac-universal.zip",
                        GITHUB_REPO, tag, tag
                    );
                    return (fallback, tag, ArchiveKind::Zip);
                }
            }
        }
    }

    #[cfg(windows)]
    {
        let fallback = format!(
            "https://github.com/{}/releases/download/{}/orbshacker-{}-win-x64.zip",
            GITHUB_REPO, DEFAULT_VERSION, DEFAULT_VERSION
        );
        (fallback, DEFAULT_VERSION.to_string(), ArchiveKind::Zip)
    }

    #[cfg(target_os = "linux")]
    {
        let fallback = format!(
            "https://github.com/{}/releases/download/{}/orbshacker-{}-linux-x64.tar.gz",
            GITHUB_REPO, DEFAULT_VERSION, DEFAULT_VERSION
        );
        (fallback, DEFAULT_VERSION.to_string(), ArchiveKind::TarGz)
    }

    #[cfg(target_os = "macos")]
    {
        let fallback = format!(
            "https://github.com/{}/releases/download/{}/orbshacker-{}-mac-universal.zip",
            GITHUB_REPO, DEFAULT_VERSION, DEFAULT_VERSION
        );
        (fallback, DEFAULT_VERSION.to_string(), ArchiveKind::Zip)
    }
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

            #[cfg(unix)]
            {
                if let Some(mode) = entry.unix_mode() {
                    let _ = fs::set_permissions(&outpath, fs::Permissions::from_mode(mode));
                } else if outpath.file_name().map_or(false, |n| n == "orbshacker" || n == "orbshacker-core") {
                    let _ = fs::set_permissions(&outpath, fs::Permissions::from_mode(0o755));
                }
            }
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

#[allow(dead_code)]
fn extract_tar_gz(
    archive_path: &Path,
    target_dir: &Path,
    state: &Arc<Mutex<ProgressState>>,
    _cancel_flag: &Arc<AtomicBool>,
) -> Result<(), String> {
    if let Ok(mut st) = state.lock() {
        st.status = "Распаковка компонентов Linux (.tar.gz)...".to_string();
        st.detail = "Извлечение файлов...".to_string();
        st.percent = 100;
    }

    let _ = fs::create_dir_all(target_dir);
    let tar_gz = File::open(archive_path).map_err(|e| format!("Не удалось открыть архив: {}", e))?;
    let tar = flate2::read::GzDecoder::new(tar_gz);
    let mut archive = tar::Archive::new(tar);

    archive.unpack(target_dir).map_err(|e| format!("Ошибка распаковки архива tar.gz: {}", e))?;

    #[cfg(unix)]
    {
        for entry in fs::read_dir(target_dir).into_iter().flatten().flatten() {
            let p = entry.path();
            if p.is_file() {
                if let Ok(meta) = p.metadata() {
                    let mut perms = meta.permissions();
                    perms.set_mode(0o755);
                    let _ = fs::set_permissions(&p, perms);
                }
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

    const WS_OVERLAPPED: u32 = 0x00000000;
    const WS_CAPTION: u32 = 0x00C00000;
    const WS_SYSMENU: u32 = 0x00080000;
    const WS_MINIMIZEBOX: u32 = 0x00020000;
    const WS_VISIBLE: u32 = 0x10000000;
    const WS_CHILD: u32 = 0x40000000;
    const WM_DESTROY: u32 = 0x0002;
    const WM_CTLCOLORSTATIC: u32 = 0x0138;
    const PM_REMOVE: u32 = 0x0001;
    const PBM_SETRANGE32: u32 = 0x0406;
    const PBM_SETPOS: u32 = 0x0402;
    const WM_SETFONT: u32 = 0x0030;
    const SM_CXSCREEN: i32 = 0;
    const SM_CYSCREEN: i32 = 1;

    static mut BG_BRUSH: *mut std::ffi::c_void = std::ptr::null_mut();

    unsafe extern "system" fn window_proc(
        hwnd: *mut std::ffi::c_void,
        msg: u32,
        wparam: usize,
        lparam: isize,
    ) -> isize {
        match msg {
            WM_CTLCOLORSTATIC => {
                let hdc = wparam as *mut std::ffi::c_void;
                SetBkMode(hdc, 1); // TRANSPARENT
                SetTextColor(hdc, 0x00F0F0F0); // White text
                BG_BRUSH as isize
            }
            WM_DESTROY => {
                PostQuitMessage(0);
                0
            }
            _ => DefWindowProcW(hwnd, msg, wparam, lparam),
        }
    }

    fn to_wstring(s: &str) -> Vec<u16> {
        OsStr::new(s).encode_wide().chain(std::iter::once(0)).collect()
    }

    pub fn run_launcher_gui(
        state: Arc<Mutex<ProgressState>>,
        cancel_flag: Arc<AtomicBool>,
    ) {
        unsafe {
            let iccex = INITCOMMONCONTROLSEX {
                dwSize: std::mem::size_of::<INITCOMMONCONTROLSEX>() as u32,
                dwICC: 0x00000020, // ICC_PROGRESS_CLASS
            };
            InitCommonControlsEx(&iccex);

            let h_instance = GetModuleHandleW(std::ptr::null());
            BG_BRUSH = CreateSolidBrush(0x001B120F); // #0f121b (Dark neon background)

            let class_name = to_wstring("OrbshackerLauncherWindow");
            let wnd_class = WNDCLASSW {
                style: 0,
                lpfnWndProc: window_proc,
                cbClsExtra: 0,
                cbWndExtra: 0,
                hInstance: h_instance,
                hIcon: std::ptr::null_mut(),
                hCursor: std::ptr::null_mut(),
                hbrBackground: BG_BRUSH,
                lpszMenuName: std::ptr::null(),
                lpszClassName: class_name.as_ptr(),
            };
            RegisterClassW(&wnd_class);

            let win_w = 480;
            let win_h = 240;
            let screen_w = GetSystemMetrics(SM_CXSCREEN);
            let screen_h = GetSystemMetrics(SM_CYSCREEN);
            let win_x = (screen_w - win_w) / 2;
            let win_y = (screen_h - win_h) / 2;

            let title = to_wstring(&format!("ORBSHACKER Launcher {}", DEFAULT_VERSION));
            let hwnd = CreateWindowExW(
                0,
                class_name.as_ptr(),
                title.as_ptr(),
                WS_OVERLAPPED | WS_CAPTION | WS_SYSMENU | WS_MINIMIZEBOX | WS_VISIBLE,
                win_x,
                win_y,
                win_w,
                win_h,
                std::ptr::null_mut(),
                std::ptr::null_mut(),
                h_instance,
                std::ptr::null_mut(),
            );

            let font_name = to_wstring("Segoe UI");
            let title_font = CreateFontW(
                22, 0, 0, 0, 700, 0, 0, 0, 1, 0, 0, 5, 0, font_name.as_ptr(),
            );
            let text_font = CreateFontW(
                16, 0, 0, 0, 400, 0, 0, 0, 1, 0, 0, 5, 0, font_name.as_ptr(),
            );
            let sub_font = CreateFontW(
                13, 0, 0, 0, 400, 0, 0, 0, 1, 0, 0, 5, 0, font_name.as_ptr(),
            );

            let static_class = to_wstring("STATIC");
            let progress_class = to_wstring("msctls_progress32");

            // Header Title
            let lbl_title = CreateWindowExW(
                0,
                static_class.as_ptr(),
                to_wstring("ORBSHACKER").as_ptr(),
                WS_CHILD | WS_VISIBLE,
                30,
                22,
                420,
                26,
                hwnd,
                std::ptr::null_mut(),
                h_instance,
                std::ptr::null_mut(),
            );
            SendMessageW(lbl_title, WM_SETFONT, title_font as usize, 1);

            // Status message
            let lbl_status = CreateWindowExW(
                0,
                static_class.as_ptr(),
                to_wstring("Подключение к GitHub...").as_ptr(),
                WS_CHILD | WS_VISIBLE,
                30,
                64,
                420,
                22,
                hwnd,
                std::ptr::null_mut(),
                h_instance,
                std::ptr::null_mut(),
            );
            SendMessageW(lbl_status, WM_SETFONT, text_font as usize, 1);

            // Progress Bar
            let pbar = CreateWindowExW(
                0,
                progress_class.as_ptr(),
                std::ptr::null(),
                WS_CHILD | WS_VISIBLE,
                30,
                96,
                420,
                22,
                hwnd,
                std::ptr::null_mut(),
                h_instance,
                std::ptr::null_mut(),
            );
            SendMessageW(pbar, PBM_SETRANGE32, 0, 100);
            SendMessageW(pbar, PBM_SETPOS, 0, 0);

            // Detail line
            let lbl_detail = CreateWindowExW(
                0,
                static_class.as_ptr(),
                to_wstring("Проверка файлов...").as_ptr(),
                WS_CHILD | WS_VISIBLE,
                30,
                130,
                420,
                20,
                hwnd,
                std::ptr::null_mut(),
                h_instance,
                std::ptr::null_mut(),
            );
            SendMessageW(lbl_detail, WM_SETFONT, sub_font as usize, 1);

            // Footer brand note
            let lbl_footer = CreateWindowExW(
                0,
                static_class.as_ptr(),
                to_wstring("Discord Quests & Profile Badges Spoofer • GitHub Releases").as_ptr(),
                WS_CHILD | WS_VISIBLE,
                30,
                168,
                420,
                18,
                hwnd,
                std::ptr::null_mut(),
                h_instance,
                std::ptr::null_mut(),
            );
            SendMessageW(lbl_footer, WM_SETFONT, sub_font as usize, 1);

            ShowWindow(hwnd, 5); // SW_SHOW
            UpdateWindow(hwnd);

            let mut msg: MSG = std::mem::zeroed();
            let mut last_percent = 999;
            let mut last_status = String::new();
            let mut last_detail = String::new();

            loop {
                while PeekMessageW(&mut msg, std::ptr::null_mut(), 0, 0, PM_REMOVE) != 0 {
                    if msg.message == 0x0012 { // WM_QUIT
                        cancel_flag.store(true, Ordering::SeqCst);
                        return;
                    }
                    TranslateMessage(&msg);
                    DispatchMessageW(&msg);
                }

                // Check worker state
                if let Ok(st) = state.lock() {
                    if st.percent != last_percent {
                        last_percent = st.percent;
                        SendMessageW(pbar, PBM_SETPOS, st.percent as usize, 0);
                    }

                    if st.status != last_status {
                        last_status = st.status.clone();
                        let ws = to_wstring(&last_status);
                        SetWindowTextW(lbl_status, ws.as_ptr());
                    }

                    if st.detail != last_detail {
                        last_detail = st.detail.clone();
                        let ws = to_wstring(&last_detail);
                        SetWindowTextW(lbl_detail, ws.as_ptr());
                    }

                    if st.finished {
                        thread::sleep(Duration::from_millis(800));
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
// NON-WINDOWS (LINUX & MACOS) TERMINAL RUNNER
// =========================================================

#[cfg(not(windows))]
fn run_launcher_terminal(
    state: Arc<Mutex<ProgressState>>,
    _cancel_flag: Arc<AtomicBool>,
) {
    println!("\x1b[1;36m========================================================\x1b[0m");
    println!("\x1b[1;35m           🚀 ORBSHACKER LAUNCHER v{}                 \x1b[0m", DEFAULT_VERSION);
    println!("\x1b[1;36m========================================================\x1b[0m");

    let mut last_percent = 999;
    let mut last_detail = String::new();

    loop {
        thread::sleep(Duration::from_millis(100));

        let (status, detail, percent, finished, error) = {
            if let Ok(st) = state.lock() {
                (st.status.clone(), st.detail.clone(), st.percent, st.finished, st.error.clone())
            } else {
                break;
            }
        };

        if percent != last_percent || detail != last_detail {
            last_percent = percent;
            last_detail = detail.clone();

            let bar_width = 30;
            let filled = (percent as usize * bar_width) / 100;
            let empty = bar_width.saturating_sub(filled);
            let bar: String = "█".repeat(filled) + &"░".repeat(empty);

            print!("\r\x1b[2K\x1b[1;33m[{}]\x1b[0m \x1b[1;32m{:3}%\x1b[0m │ \x1b[1;37m{}\x1b[0m", bar, percent, detail);
            let _ = std::io::stdout().flush();
        }

        if finished {
            println!();
            if let Some(err) = error {
                println!("\x1b[1;31m✖ Ошибка: {}\x1b[0m", err);
            } else {
                println!("\x1b[1;32m✔ {}\x1b[0m", status);
                println!("\x1b[1;34m✨ Запуск ORBSHACKER...\x1b[0m");

                #[cfg(target_os = "macos")]
                {
                    let _ = Command::new("osascript")
                        .args(["-e", "display notification \"Установка завершена! Запуск ORBSHACKER...\" with title \"ORBSHACKER\""])
                        .spawn();
                }

                #[cfg(target_os = "linux")]
                {
                    let _ = Command::new("notify-send")
                        .args(["ORBSHACKER", "Установка завершена! Запуск программы..."])
                        .spawn();
                }
            }
            break;
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
            if spawn_executable(&exe, &args[1..]).is_ok() {
                return;
            }
        }
    }

    // 2. Launch downloader to fetch all files from GitHub
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
        let (download_url, version, archive_kind) = get_download_url_and_kind();
        let app_dir = get_app_dir(&root_worker);
        let _ = fs::create_dir_all(&app_dir);

        let temp_file = match archive_kind {
            ArchiveKind::Zip => root_worker.join("orbshacker_update.tmp.zip"),
            ArchiveKind::TarGz => root_worker.join("orbshacker_update.tmp.tar.gz"),
            ArchiveKind::AppImage => app_dir.join("orbshacker.AppImage"),
        };

        if let Ok(mut st) = state_worker.lock() {
            st.status = format!("Найдена версия {} на GitHub", version);
            st.detail = "Запуск загрузки дистрибутива...".to_string();
            st.percent = 5;
        }

        // Download
        if let Err(e) = download_file_with_progress(&download_url, &temp_file, &state_worker, &cancel_worker) {
            if let Ok(mut st) = state_worker.lock() {
                st.status = "Ошибка загрузки".to_string();
                st.detail = e.clone();
                st.error = Some(e);
                st.finished = true;
            }
            return;
        }

        // Handle unpack / setup based on format
        match archive_kind {
            ArchiveKind::Zip => {
                if let Err(e) = extract_zip(&temp_file, &app_dir, &state_worker, &cancel_worker) {
                    let _ = fs::remove_file(&temp_file);
                    if let Ok(mut st) = state_worker.lock() {
                        st.status = "Ошибка распаковки".to_string();
                        st.detail = e.clone();
                        st.error = Some(e);
                        st.finished = true;
                    }
                    return;
                }
                let _ = fs::remove_file(&temp_file);
            }
            ArchiveKind::TarGz => {
                if let Err(e) = extract_tar_gz(&temp_file, &app_dir, &state_worker, &cancel_worker) {
                    let _ = fs::remove_file(&temp_file);
                    if let Ok(mut st) = state_worker.lock() {
                        st.status = "Ошибка распаковки".to_string();
                        st.detail = e.clone();
                        st.error = Some(e);
                        st.finished = true;
                    }
                    return;
                }
                let _ = fs::remove_file(&temp_file);
            }
            ArchiveKind::AppImage => {
                #[cfg(unix)]
                {
                    if let Ok(meta) = fs::metadata(&temp_file) {
                        let mut perms = meta.permissions();
                        perms.set_mode(0o755);
                        let _ = fs::set_permissions(&temp_file, perms);
                    }
                }
            }
        }

        let _ = fs::write(app_dir.join("version.txt"), &version);

        // Success - spawn the installed app
        if let Ok(mut st) = state_worker.lock() {
            st.status = "Установка завершена!".to_string();
            st.detail = "Запуск программы ORBSHACKER...".to_string();
            st.percent = 100;
        }

        thread::sleep(Duration::from_millis(600));

        if let Some(exe) = find_installed_executable(&root_worker) {
            let _ = spawn_executable(&exe, &[]);
        }

        if let Ok(mut st) = state_worker.lock() {
            st.finished = true;
        }
    });

    #[cfg(windows)]
    win_gui::run_launcher_gui(state, cancel_flag);

    #[cfg(not(windows))]
    {
        run_launcher_terminal(state, cancel_flag);
        let _ = _worker_thread.join();
    }
}
