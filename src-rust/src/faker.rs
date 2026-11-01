use std::fs;
use std::path::PathBuf;
use std::process::{Child, Command};

pub struct FakerProcess {
    #[allow(dead_code)]
    pub exe_path: PathBuf,
    pub child: Child,
}

pub struct FakerManager {
    target_dir: PathBuf,
    processes: Vec<FakerProcess>,
    created_files: Vec<PathBuf>,
}

impl FakerManager {
    pub fn new(target_dir: Option<PathBuf>) -> Self {
        let dir = target_dir.unwrap_or_else(|| {
            if let Ok(userprofile) = std::env::var("USERPROFILE") {
                PathBuf::from(userprofile).join("Desktop").join("Win64")
            } else if let Ok(home) = std::env::var("HOME") {
                PathBuf::from(home).join(".orbshacker").join("bin")
            } else {
                std::env::temp_dir().join("orbshacker")
            }
        });

        let _ = fs::create_dir_all(&dir);

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
        let target_exe = self.target_dir.join(exe_name);

        if let Some(parent) = target_exe.parent() {
            let _ = fs::create_dir_all(parent);
            if let Some(appid) = steam_app_id {
                let appid_path = parent.join("steam_appid.txt");
                let _ = fs::write(&appid_path, appid.to_string());
                self.created_files.push(appid_path);
            }
        }

        if !target_exe.exists() {
            fs::copy(&current_exe, &target_exe).map_err(|e| e.to_string())?;
            self.created_files.push(target_exe.clone());
        }

        // Spawn child process with --stub mode
        let mut cmd = Command::new(&target_exe);
        cmd.arg("--stub")
            .arg("--title")
            .arg(game_title)
            .arg("--duration")
            .arg(duration_secs.to_string());

        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            // CREATE_NO_WINDOW = 0x08000000
            const CREATE_NO_WINDOW: u32 = 0x08000000;
            cmd.creation_flags(CREATE_NO_WINDOW);
        }

        let child = cmd.spawn().map_err(|e| {
            format!("Failed to spawn stub process for {}: {}", exe_name, e)
        })?;

        self.processes.push(FakerProcess {
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

        for file in self.created_files.drain(..) {
            if file.exists() {
                let _ = fs::remove_file(&file);
            }
        }
    }
}

impl Drop for FakerManager {
    fn drop(&mut self) {
        self.stop_all();
    }
}
