use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

pub struct SteamHelper;

impl SteamHelper {
    pub fn find_steam_path() -> Option<PathBuf> {
        #[cfg(windows)]
        {
            // 1. Try registry query
            let output = Command::new("reg")
                .args(["query", r"HKCU\Software\Valve\Steam", "/v", "SteamPath"])
                .output();

            if let Ok(out) = output {
                if out.status.success() {
                    let text = String::from_utf8_lossy(&out.stdout);
                    for line in text.lines() {
                        if line.contains("SteamPath") {
                            let parts: Vec<&str> = line.split("REG_SZ").collect();
                            if parts.len() > 1 {
                                let path_str = parts[1].trim().replace('/', "\\");
                                let p = PathBuf::from(path_str);
                                if p.exists() {
                                    return Some(p);
                                }
                            }
                        }
                    }
                }
            }

            // 2. Try default paths
            let candidates = [
                PathBuf::from(r"C:\Program Files (x86)\Steam"),
                PathBuf::from(r"C:\Program Files\Steam"),
                PathBuf::from(r"D:\Steam"),
                PathBuf::from(r"E:\Steam"),
                PathBuf::from(r"G:\st"),
            ];
            for c in candidates {
                if c.exists() {
                    return Some(c);
                }
            }
            None
        }

        #[cfg(target_os = "linux")]
        {
            if let Ok(home) = std::env::var("HOME") {
                let home_p = PathBuf::from(home);
                let candidates = [
                    home_p.join(".local/share/Steam"),
                    home_p.join(".steam/steam"),
                    home_p.join(".steam/root"),
                ];
                for c in candidates {
                    if c.exists() {
                        return Some(c);
                    }
                }
            }
            None
        }

        #[cfg(target_os = "macos")]
        {
            if let Ok(home) = std::env::var("HOME") {
                let p = PathBuf::from(home).join("Library/Application Support/Steam");
                if p.exists() {
                    return Some(p);
                }
            }
            None
        }

        #[cfg(not(any(windows, target_os = "linux", target_os = "macos")))]
        {
            None
        }
    }

    pub fn get_steamapps_dir() -> Option<PathBuf> {
        let steam = Self::find_steam_path()?;
        let steamapps = steam.join("steamapps");
        if steamapps.exists() {
            Some(steamapps)
        } else {
            let _ = fs::create_dir_all(&steamapps);
            if steamapps.exists() {
                Some(steamapps)
            } else {
                None
            }
        }
    }

    pub fn create_fake_manifest(app_id: u64, game_name: &str) -> Result<PathBuf, String> {
        let steamapps = Self::get_steamapps_dir()
            .ok_or_else(|| "Could not locate Steam installation or steamapps folder.".to_string())?;

        let manifest_path = steamapps.join(format!("appmanifest_{}.acf", app_id));
        if manifest_path.exists() {
            if let Ok(content) = fs::read_to_string(&manifest_path) {
                // If the game is already genuinely installed with StateFlags 4 and no errors, keep it
                if content.contains("\"StateFlags\"\t\t\"4\"")
                    && !content.contains("orbshacker")
                    && content.contains("\"UpdateResult\"\t\t\"0\"")
                {
                    return Ok(manifest_path);
                }
            }
        }

        let clean_name = game_name.replace('"', "");
        let acf_content = format!(
            r#""AppState"
{{
	"appid"		"{app_id}"
	"Universe"		"1"
	"name"		"{clean_name}"
	"StateFlags"		"4"
	"installdir"		"{clean_name}"
	"LastUpdated"		"1730460000"
	"SizeOnDisk"		"50000000000"
	"StagingSize"		"0"
	"buildid"		"15000000"
	"LastOwner"		"76561198000000000"
	"UpdateResult"		"0"
	"BytesToDownload"		"50000000000"
	"BytesDownloaded"		"50000000000"
	"AutoUpdateBehavior"		"0"
	"AllowOtherDownloadsWhileRunning"		"0"
	"ScheduledAutoUpdate"		"0"
	"UserConfig"
	{{
		"language"		"russian"
	}}
	"MountedDepots"
	{{
	}}
	"orbshacker"		"1"
}}
"#,
            app_id = app_id,
            clean_name = clean_name
        );

        fs::write(&manifest_path, acf_content).map_err(|e| e.to_string())?;

        // Also ensure common folder and steam_appid.txt exist
        let common_dir = steamapps.join("common").join(&clean_name);
        if fs::create_dir_all(&common_dir).is_ok() {
            let appid_file = common_dir.join("steam_appid.txt");
            let _ = fs::write(appid_file, app_id.to_string());
        }

        Ok(manifest_path)
    }

    pub fn remove_manifest_if_ours(path: &Path) -> Result<(), String> {
        if path.exists() {
            if let Ok(content) = fs::read_to_string(path) {
                if content.contains("\"orbshacker\"") {
                    let _ = fs::remove_file(path);
                }
            }
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_steam_acf_cleanup_logic() {
        let temp_dir = std::env::temp_dir().join("test_steam_acf");
        let _ = fs::create_dir_all(&temp_dir);
        let path = temp_dir.join("appmanifest_12345.acf");
        let clean_name = "Test Game";
        let acf_content = format!(
            "\"AppState\"\n{{\n\t\"appid\"\t\t\"12345\"\n\t\"name\"\t\t\"{}\"\n\t\"StateFlags\"\t\t\"4\"\n\t\"orbshacker\"\t\t\"1\"\n}}\n",
            clean_name
        );
        fs::write(&path, &acf_content).unwrap();
        assert!(path.exists());
        let _ = SteamHelper::remove_manifest_if_ours(&path);
        assert!(!path.exists());
    }
}
