#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::env;
use std::path::PathBuf;
use std::process::Command;

#[cfg(windows)]
fn attach_console() {
    unsafe {
        unsafe extern "system" {
            fn AttachConsole(dwProcessId: u32) -> i32;
        }
        AttachConsole(0xFFFFFFFF);
    }
}

fn main() {
    let args: Vec<String> = env::args().collect();
    let has_cli_flag = args.iter().any(|a| {
        a == "--cli" || a == "--farm-all" || a == "--help" || a == "-h" || a == "--version"
    });

    #[cfg(windows)]
    if has_cli_flag {
        attach_console();
    }

    let root_dir = env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|d| d.to_path_buf()))
        .unwrap_or_else(|| env::current_dir().unwrap_or_else(|_| PathBuf::from(".")));

    // 1. If CLI flags passed, delegate directly to Rust core
    if has_cli_flag {
        let core_candidates = [
            root_dir.join("src-gui").join("bin").join("orbshacker-core.exe"),
            root_dir.join("src-rust").join("target").join("release").join("orbshacker-core.exe"),
            root_dir.join("dist").join("orbshacker-core.exe"),
        ];

        for c in &core_candidates {
            if c.exists() {
                let status = Command::new(c).args(&args[1..]).status();
                if let Ok(st) = status {
                    std::process::exit(st.code().unwrap_or(0));
                }
            }
        }
    }

    // 2. Normal launch (GUI mode)
    // Priority 1: Unpacked Electron app (instant start, <0.1s)
    let unpacked_exe = root_dir.join("dist").join("win-unpacked").join("orbshacker.exe");
    if unpacked_exe.exists() {
        let _ = Command::new(&unpacked_exe).spawn();
        return;
    }

    let packager_exe = root_dir.join("dist").join("orbshacker-win32-x64").join("orbshacker.exe");
    if packager_exe.exists() {
        let _ = Command::new(&packager_exe).spawn();
        return;
    }

    // Priority 2: Standalone Portable single-file EXE
    let portable_candidates = [
        root_dir.join("dist").join("orbshacker-portable.exe"),
        root_dir.join("dist").join("orbshacker.exe"),
    ];
    for p in &portable_candidates {
        if p.exists() {
            let _ = Command::new(p).spawn();
            return;
        }
    }

    // Priority 3: Development / source mode via scripts/start.js
    let start_script = root_dir.join("scripts").join("start.js");
    if start_script.exists() {
        #[cfg(windows)]
        {
            let _ = Command::new("cmd")
                .args(["/c", "node", "scripts/start.js"])
                .current_dir(&root_dir)
                .spawn();
            return;
        }
        #[cfg(not(windows))]
        {
            let _ = Command::new("node")
                .arg("scripts/start.js")
                .current_dir(&root_dir)
                .spawn();
            return;
        }
    }

    // Fallback: Launch Rust core directly
    let core_exe = root_dir.join("src-gui").join("bin").join("orbshacker-core.exe");
    if core_exe.exists() {
        let _ = Command::new(&core_exe).args(["--farm-all"]).spawn();
    }
}
