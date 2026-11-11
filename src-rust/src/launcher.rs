use std::fs;
use std::path::PathBuf;
use std::process::{Child, Command};

pub struct LaunchedProcess {
    #[allow(dead_code)]
    pub exe_path: PathBuf,
    pub child: Child,
}

pub struct GameProcessManager {
    target_dir: PathBuf,
    processes: Vec<LaunchedProcess>,
    created_files: Vec<PathBuf>,
}

impl GameProcessManager {
    pub fn new(target_dir: Option<PathBuf>) -> Self {
        let dir = target_dir.unwrap_or_else(|| {
            if let Ok(local) = std::env::var("LOCALAPPDATA") {
                PathBuf::from(local).join("Orbshacker").join("stubs")
            } else if let Ok(appdata) = std::env::var("APPDATA") {
                PathBuf::from(appdata).join("Orbshacker").join("stubs")
            } else if let Ok(home) = std::env::var("HOME") {
                PathBuf::from(home).join(".orbshacker").join("stubs")
            } else {
                std::env::temp_dir().join("orbshacker").join("stubs")
            }
        });

        let _ = fs::create_dir_all(&dir);

        // Clean up any legacy Desktop/Win64 folder from earlier builds
        if let Ok(userprofile) = std::env::var("USERPROFILE") {
            let legacy_dir = PathBuf::from(userprofile).join("Desktop").join("Win64");
            if legacy_dir.exists() {
                let _ = fs::remove_dir_all(&legacy_dir);
            }
        }

        Self {
            target_dir: dir,
            processes: Vec::new(),
            created_files: Vec::new(),
        }
    }

    pub fn launch_stub(
        &mut self,
        exe_name: &str,
        game_title: &str,
        duration_secs: u64,
        steam_app_id: Option<u64>,
    ) -> Result<PathBuf, String> {
        let current_exe = std::env::current_exe().map_err(|e| e.to_string())?;

        // Normalize path and safely preserve allowed subdirectories (e.g. mscw/maplestory.exe)
        // while strictly preventing path traversal ('..', drive letters, absolute paths)
        let normalized = exe_name.replace('\\', "/");
        let parts: Vec<&str> = normalized
            .split('/')
            .map(|p| p.trim())
            .filter(|p| !p.is_empty() && *p != "." && *p != "..")
            .collect();

        let mut target_exe = self.target_dir.clone();
        for (idx, part) in parts.iter().enumerate() {
            let mut safe_part = part.replace([':', '*', '?', '"', '<', '>', '|', '\0'], "");
            if idx == parts.len() - 1 {
                if !safe_part.to_lowercase().ends_with(".exe") {
                    safe_part.push_str(".exe");
                }
            }
            if !safe_part.is_empty() {
                target_exe.push(safe_part);
            }
        }

        if let Some(parent) = target_exe.parent() {
            let _ = fs::create_dir_all(parent);
            if let Some(appid) = steam_app_id {
                let appid_path = parent.join("steam_appid.txt");
                let _ = fs::write(&appid_path, appid.to_string());
                self.created_files.push(appid_path);
            }
        }

        if !target_exe.exists() {
            // Try hard link first (instant, 0 extra disk bytes, highly efficient)
            if std::fs::hard_link(&current_exe, &target_exe).is_err() {
                // Fallback to copy if cross-volume
                if let Err(e) = fs::copy(&current_exe, &target_exe) {
                    if !target_exe.exists() {
                        return Err(format!("Could not create helper file {}: {}", target_exe.display(), e));
                    }
                }
            }
        }
        self.created_files.push(target_exe.clone());

        // Spawn helper process with --stub mode in background
        let mut cmd = Command::new(&target_exe);
        cmd.arg("--stub")
            .arg("--title")
            .arg(game_title)
            .arg("--duration")
            .arg(duration_secs.to_string());

        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            const CREATE_NO_WINDOW: u32 = 0x08000000;
            cmd.creation_flags(CREATE_NO_WINDOW);
        }

        let child = cmd.spawn().map_err(|e| {
            format!("Failed to spawn helper process for {}: {}", exe_name, e)
        })?;

        self.processes.push(LaunchedProcess {
            exe_path: target_exe.clone(),
            child,
        });

        Ok(target_exe)
    }

    pub fn stop_all(&mut self) {
        for mut p in self.processes.drain(..) {
            let _ = p.child.kill();
            let _ = p.child.wait();
        }

        // Wait brief instant for OS handles to close before deleting files
        std::thread::sleep(std::time::Duration::from_millis(50));

        for file in self.created_files.drain(..) {
            if file.exists() {
                let _ = fs::remove_file(&file);
            }
        }
    }
}

impl Drop for GameProcessManager {
    fn drop(&mut self) {
        self.stop_all();
    }
}
