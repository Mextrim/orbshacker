fn main() {
    #[cfg(windows)]
    {
        let mut res = winres::WindowsResource::new();
        res.set_icon("frontend/assets/icon.ico");
        res.set("ProductName", "ORBSHACKER");
        res.set("FileDescription", "ORBSHACKER - Discord Quests & Badges Spoofer");
        res.set("ProductVersion", "3.0.0");
        res.set("FileVersion", "3.0.0");
        res.set("LegalCopyright", "Copyright (C) 2026 Mextrim");
        let _ = res.compile();
    }
}
