use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DetectableGame {
    pub id: String,
    pub name: String,
    pub exe_name: String,
    pub steam_app_id: Option<u64>,
    pub category: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BadgeTier {
    pub level: u32,
    pub title: String,
    pub threshold: u32,
}

pub fn get_game_count_badge_tiers() -> Vec<BadgeTier> {
    vec![
        BadgeTier { level: 1, title: "Пробующий".to_string(), threshold: 2 },
        BadgeTier { level: 2, title: "Интересующийся".to_string(), threshold: 5 },
        BadgeTier { level: 3, title: "Энтузиаст".to_string(), threshold: 10 },
        BadgeTier { level: 4, title: "Рейнджер".to_string(), threshold: 15 },
        BadgeTier { level: 5, title: "Исследователь".to_string(), threshold: 20 },
        BadgeTier { level: 6, title: "Искатель приключений".to_string(), threshold: 30 },
        BadgeTier { level: 7, title: "Открыватель".to_string(), threshold: 40 },
        BadgeTier { level: 8, title: "Свободный дух".to_string(), threshold: 60 },
        BadgeTier { level: 9, title: "Многосторонняя личность".to_string(), threshold: 80 },
        BadgeTier { level: 10, title: "Универсал".to_string(), threshold: 100 },
    ]
}

pub fn get_hours_badge_tiers() -> Vec<BadgeTier> {
    vec![
        BadgeTier { level: 1, title: "Любитель".to_string(), threshold: 1 },
        BadgeTier { level: 2, title: "Энтузиаст".to_string(), threshold: 5 },
        BadgeTier { level: 3, title: "Увлечённый игрок".to_string(), threshold: 20 },
        BadgeTier { level: 4, title: "Целеустремлённый игрок".to_string(), threshold: 75 },
        BadgeTier { level: 5, title: "Серьёзный игрок".to_string(), threshold: 150 },
        BadgeTier { level: 6, title: "Преданный игрок".to_string(), threshold: 300 },
        BadgeTier { level: 7, title: "Опытный игрок".to_string(), threshold: 500 },
        BadgeTier { level: 8, title: "Страстный игрок".to_string(), threshold: 1000 },
        BadgeTier { level: 9, title: "Неостановимый игрок".to_string(), threshold: 2000 },
        BadgeTier { level: 10, title: "Вечный игрок".to_string(), threshold: 5000 },
    ]
}

/// Catalog of 105 top detectable games verified in Discord's RunningGameStore
pub fn get_detectable_games_catalog() -> Vec<DetectableGame> {
    vec![
        // Popular Shooters & Action
        DetectableGame { id: "cs2".into(), name: "Counter-Strike 2".into(), exe_name: "cs2.exe".into(), steam_app_id: Some(730), category: "Shooter".into() },
        DetectableGame { id: "dota2".into(), name: "Dota 2".into(), exe_name: "dota2.exe".into(), steam_app_id: Some(570), category: "MOBA".into() },
        DetectableGame { id: "pubg".into(), name: "PUBG: BATTLEGROUNDS".into(), exe_name: "TslGame.exe".into(), steam_app_id: Some(578080), category: "Battle Royale".into() },
        DetectableGame { id: "apex".into(), name: "Apex Legends".into(), exe_name: "r5apex.exe".into(), steam_app_id: Some(1172470), category: "Battle Royale".into() },
        DetectableGame { id: "gta5".into(), name: "Grand Theft Auto V".into(), exe_name: "GTA5.exe".into(), steam_app_id: Some(271590), category: "Action".into() },
        DetectableGame { id: "cyberpunk".into(), name: "Cyberpunk 2077".into(), exe_name: "Cyberpunk2077.exe".into(), steam_app_id: Some(1091500), category: "RPG".into() },
        DetectableGame { id: "rust".into(), name: "Rust".into(), exe_name: "RustClient.exe".into(), steam_app_id: Some(252490), category: "Survival".into() },
        DetectableGame { id: "terraria".into(), name: "Terraria".into(), exe_name: "Terraria.exe".into(), steam_app_id: Some(105600), category: "Sandbox".into() },
        DetectableGame { id: "wallpaper".into(), name: "Wallpaper Engine".into(), exe_name: "wallpaper64.exe".into(), steam_app_id: Some(431960), category: "Utility".into() },
        DetectableGame { id: "witcher3".into(), name: "The Witcher 3: Wild Hunt".into(), exe_name: "witcher3.exe".into(), steam_app_id: Some(292030), category: "RPG".into() },

        DetectableGame { id: "tf2".into(), name: "Team Fortress 2".into(), exe_name: "tf_win64.exe".into(), steam_app_id: Some(440), category: "Shooter".into() },
        DetectableGame { id: "bg3".into(), name: "Baldur's Gate 3".into(), exe_name: "bg3.exe".into(), steam_app_id: Some(1086940), category: "RPG".into() },
        DetectableGame { id: "lethal".into(), name: "Lethal Company".into(), exe_name: "Lethal Company.exe".into(), steam_app_id: Some(1966720), category: "Co-op Horror".into() },
        DetectableGame { id: "palworld".into(), name: "Palworld".into(), exe_name: "Palworld-Win64-Shipping.exe".into(), steam_app_id: Some(1623730), category: "Survival".into() },
        DetectableGame { id: "helldivers2".into(), name: "HELLDIVERS™ 2".into(), exe_name: "helldivers2.exe".into(), steam_app_id: Some(553850), category: "Shooter".into() },
        DetectableGame { id: "amongus".into(), name: "Among Us".into(), exe_name: "Among Us.exe".into(), steam_app_id: Some(945360), category: "Party".into() },
        DetectableGame { id: "hl2".into(), name: "Half-Life 2".into(), exe_name: "hl2.exe".into(), steam_app_id: Some(220), category: "Shooter".into() },
        DetectableGame { id: "phasmo".into(), name: "Phasmophobia".into(), exe_name: "Phasmophobia.exe".into(), steam_app_id: Some(739630), category: "Horror".into() },
        DetectableGame { id: "r6s".into(), name: "Tom Clancy's Rainbow Six Siege".into(), exe_name: "RainbowSix.exe".into(), steam_app_id: Some(359550), category: "Tactical".into() },
        DetectableGame { id: "dbd".into(), name: "Dead by Daylight".into(), exe_name: "DeadByDaylight-Win64-Shipping.exe".into(), steam_app_id: Some(381210), category: "Horror".into() },

        DetectableGame { id: "rocket_league".into(), name: "Rocket League".into(), exe_name: "RocketLeague.exe".into(), steam_app_id: Some(252950), category: "Sports".into() },
        DetectableGame { id: "warthunder".into(), name: "War Thunder".into(), exe_name: "aces.exe".into(), steam_app_id: Some(236390), category: "Vehicle Combat".into() },
        DetectableGame { id: "destiny2".into(), name: "Destiny 2".into(), exe_name: "destiny2.exe".into(), steam_app_id: Some(1085660), category: "MMO Shooter".into() },
        DetectableGame { id: "l4d2".into(), name: "Left 4 Dead 2".into(), exe_name: "left4dead2.exe".into(), steam_app_id: Some(550), category: "Zombie Shooter".into() },
        DetectableGame { id: "gmod".into(), name: "Garry's Mod".into(), exe_name: "gmod.exe".into(), steam_app_id: Some(4000), category: "Sandbox".into() },
        DetectableGame { id: "ark".into(), name: "ARK: Survival Evolved".into(), exe_name: "ShooterGame.exe".into(), steam_app_id: Some(346110), category: "Survival".into() },
        DetectableGame { id: "poe".into(), name: "Path of Exile".into(), exe_name: "PathOfExile.exe".into(), steam_app_id: Some(238960), category: "ARPG".into() },
        DetectableGame { id: "ets2".into(), name: "Euro Truck Simulator 2".into(), exe_name: "eurotrucks2.exe".into(), steam_app_id: Some(227300), category: "Simulation".into() },
        DetectableGame { id: "fallout4".into(), name: "Fallout 4".into(), exe_name: "Fallout4.exe".into(), steam_app_id: Some(377160), category: "RPG".into() },
        DetectableGame { id: "skyrim".into(), name: "The Elder Scrolls V: Skyrim".into(), exe_name: "SkyrimSE.exe".into(), steam_app_id: Some(489830), category: "RPG".into() },

        DetectableGame { id: "mhw".into(), name: "Monster Hunter: World".into(), exe_name: "MonsterHunterWorld.exe".into(), steam_app_id: Some(582010), category: "Action RPG".into() },
        DetectableGame { id: "rdr2".into(), name: "Red Dead Redemption 2".into(), exe_name: "RDR2.exe".into(), steam_app_id: Some(1174180), category: "Open World".into() },
        DetectableGame { id: "eldenring".into(), name: "ELDEN RING".into(), exe_name: "eldenring.exe".into(), steam_app_id: Some(1245620), category: "Souls-like".into() },
        DetectableGame { id: "forza5".into(), name: "Forza Horizon 5".into(), exe_name: "ForzaHorizon5.exe".into(), steam_app_id: Some(1551360), category: "Racing".into() },
        DetectableGame { id: "stardew".into(), name: "Stardew Valley".into(), exe_name: "Stardew Valley.exe".into(), steam_app_id: Some(413150), category: "Simulation".into() },
        DetectableGame { id: "sot".into(), name: "Sea of Thieves".into(), exe_name: "SoTGame.exe".into(), steam_app_id: Some(1172620), category: "Adventure".into() },
        DetectableGame { id: "payday2".into(), name: "PAYDAY 2".into(), exe_name: "payday2_win32_release.exe".into(), steam_app_id: Some(218620), category: "Heist".into() },
        DetectableGame { id: "hoi4".into(), name: "Hearts of Iron IV".into(), exe_name: "hoi4.exe".into(), steam_app_id: Some(394360), category: "Grand Strategy".into() },
        DetectableGame { id: "civ6".into(), name: "Sid Meier's Civilization VI".into(), exe_name: "CivilizationVI.exe".into(), steam_app_id: Some(289070), category: "4X Strategy".into() },
        DetectableGame { id: "warframe".into(), name: "Warframe".into(), exe_name: "Warframe.x64.exe".into(), steam_app_id: Some(230410), category: "Action".into() },

        DetectableGame { id: "drg".into(), name: "Deep Rock Galactic".into(), exe_name: "FSD-Win64-Shipping.exe".into(), steam_app_id: Some(548430), category: "Co-op".into() },
        DetectableGame { id: "subnautica".into(), name: "Subnautica".into(), exe_name: "Subnautica.exe".into(), steam_app_id: Some(264710), category: "Survival".into() },
        DetectableGame { id: "valheim".into(), name: "Valheim".into(), exe_name: "valheim.exe".into(), steam_app_id: Some(892970), category: "Survival".into() },
        DetectableGame { id: "7dtd".into(), name: "7 Days to Die".into(), exe_name: "7DaysToDie.exe".into(), steam_app_id: Some(251570), category: "Survival".into() },
        DetectableGame { id: "zomboid".into(), name: "Project Zomboid".into(), exe_name: "ProjectZomboid64.exe".into(), steam_app_id: Some(108600), category: "Survival".into() },
        DetectableGame { id: "beamng".into(), name: "BeamNG.drive".into(), exe_name: "BeamNG.drive.x64.exe".into(), steam_app_id: Some(284160), category: "Simulation".into() },
        DetectableGame { id: "cities".into(), name: "Cities: Skylines".into(), exe_name: "Cities.exe".into(), steam_app_id: Some(255710), category: "City Builder".into() },
        DetectableGame { id: "unturned".into(), name: "Unturned".into(), exe_name: "Unturned.exe".into(), steam_app_id: Some(304930), category: "Survival".into() },
        DetectableGame { id: "dst".into(), name: "Don't Starve Together".into(), exe_name: "dontstarve_steam_x64.exe".into(), steam_app_id: Some(322330), category: "Survival".into() },
        DetectableGame { id: "slaythespire".into(), name: "Slay the Spire".into(), exe_name: "SlayTheSpire.exe".into(), steam_app_id: Some(646570), category: "Roguelike".into() },

        DetectableGame { id: "manorlords".into(), name: "Manor Lords".into(), exe_name: "ManorLords-Win64-Shipping.exe".into(), steam_app_id: Some(1363080), category: "Strategy".into() },
        DetectableGame { id: "satisfactory".into(), name: "Satisfactory".into(), exe_name: "FactoryGame-Win64-Shipping.exe".into(), steam_app_id: Some(526870), category: "Automation".into() },
        DetectableGame { id: "readyornot".into(), name: "Ready or Not".into(), exe_name: "ReadyOrNot-Win64-Shipping.exe".into(), steam_app_id: Some(1144200), category: "Tactical".into() },
        DetectableGame { id: "ror2".into(), name: "Risk of Rain 2".into(), exe_name: "Risk of Rain 2.exe".into(), steam_app_id: Some(632360), category: "Roguelike".into() },
        DetectableGame { id: "theforest".into(), name: "The Forest".into(), exe_name: "TheForest.exe".into(), steam_app_id: Some(242760), category: "Survival".into() },
        DetectableGame { id: "sonsoftheforest".into(), name: "Sons Of The Forest".into(), exe_name: "SonsOfTheForest.exe".into(), steam_app_id: Some(1326470), category: "Survival".into() },
        DetectableGame { id: "isaac".into(), name: "The Binding of Isaac: Rebirth".into(), exe_name: "isaac-ng.exe".into(), steam_app_id: Some(250900), category: "Roguelike".into() },
        DetectableGame { id: "deadlock".into(), name: "Deadlock".into(), exe_name: "deadlock.exe".into(), steam_app_id: Some(1422450), category: "Third-Person MOBA".into() },
        DetectableGame { id: "hogwarts".into(), name: "Hogwarts Legacy".into(), exe_name: "HogwartsLegacy.exe".into(), steam_app_id: Some(990080), category: "Action RPG".into() },
        DetectableGame { id: "armoredcore6".into(), name: "ARMORED CORE VI FIRES OF RUBICON".into(), exe_name: "armoredcore6.exe".into(), steam_app_id: Some(1884840), category: "Action".into() },

        DetectableGame { id: "wukong".into(), name: "Black Myth: Wukong".into(), exe_name: "b1-Win64-Shipping.exe".into(), steam_app_id: Some(2358720), category: "Action RPG".into() },
        DetectableGame { id: "stalker2".into(), name: "S.T.A.L.K.E.R. 2: Heart of Chornobyl".into(), exe_name: "Stalker2-Win64-Shipping.exe".into(), steam_app_id: Some(1643320), category: "Survival FPS".into() },
        DetectableGame { id: "starfield".into(), name: "Starfield".into(), exe_name: "Starfield.exe".into(), steam_app_id: Some(1716740), category: "RPG".into() },
        DetectableGame { id: "dyinglight".into(), name: "Dying Light".into(), exe_name: "DyingLightGame.exe".into(), steam_app_id: Some(239140), category: "Action".into() },
        DetectableGame { id: "dyinglight2".into(), name: "Dying Light 2 Stay Human".into(), exe_name: "DyingLightGame_x64_rwdi.exe".into(), steam_app_id: Some(534380), category: "Action".into() },
        DetectableGame { id: "squad".into(), name: "Squad".into(), exe_name: "SquadGame.exe".into(), steam_app_id: Some(393380), category: "Tactical".into() },
        DetectableGame { id: "arma3".into(), name: "Arma 3".into(), exe_name: "arma3_x64.exe".into(), steam_app_id: Some(107410), category: "Tactical".into() },
        DetectableGame { id: "factorio".into(), name: "Factorio".into(), exe_name: "factorio.exe".into(), steam_app_id: Some(427520), category: "Automation".into() },
        DetectableGame { id: "rimworld".into(), name: "RimWorld".into(), exe_name: "RimWorldWin64.exe".into(), steam_app_id: Some(294100), category: "Colony Sim".into() },
        DetectableGame { id: "dayz".into(), name: "DayZ".into(), exe_name: "DayZ_x64.exe".into(), steam_app_id: Some(221100), category: "Survival".into() },

        DetectableGame { id: "hunt1896".into(), name: "Hunt: Showdown 1896".into(), exe_name: "HuntGame.exe".into(), steam_app_id: Some(594650), category: "Shooter".into() },
        DetectableGame { id: "enlisted".into(), name: "Enlisted".into(), exe_name: "enlisted.exe".into(), steam_app_id: Some(2055430), category: "WWII Shooter".into() },
        DetectableGame { id: "bannerlord".into(), name: "Mount & Blade II: Bannerlord".into(), exe_name: "Bannerlord.Native.exe".into(), steam_app_id: Some(261550), category: "RPG".into() },
        DetectableGame { id: "nomansky".into(), name: "No Man's Sky".into(), exe_name: "NMS.exe".into(), steam_app_id: Some(275850), category: "Sci-Fi".into() },
        DetectableGame { id: "detroit".into(), name: "Detroit: Become Human".into(), exe_name: "DetroitBecomeHuman.exe".into(), steam_app_id: Some(1222140), category: "Adventure".into() },
        DetectableGame { id: "godofwar".into(), name: "God of War".into(), exe_name: "GoW.exe".into(), steam_app_id: Some(1593500), category: "Action".into() },
        DetectableGame { id: "spiderman".into(), name: "Marvel's Spider-Man Remastered".into(), exe_name: "Spider-Man.exe".into(), steam_app_id: Some(1817070), category: "Action".into() },
        DetectableGame { id: "hzd".into(), name: "Horizon Zero Dawn".into(), exe_name: "HorizonZeroDawn.exe".into(), steam_app_id: Some(1151640), category: "Action RPG".into() },
        DetectableGame { id: "fnv".into(), name: "Fallout: New Vegas".into(), exe_name: "FalloutNV.exe".into(), steam_app_id: Some(22380), category: "RPG".into() },
        DetectableGame { id: "portal2".into(), name: "Portal 2".into(), exe_name: "portal2.exe".into(), steam_app_id: Some(620), category: "Puzzle".into() },

        DetectableGame { id: "hades".into(), name: "Hades".into(), exe_name: "Hades.exe".into(), steam_app_id: Some(1145360), category: "Roguelike".into() },
        DetectableGame { id: "hades2".into(), name: "Hades II".into(), exe_name: "Hades2.exe".into(), steam_app_id: Some(1145350), category: "Roguelike".into() },
        DetectableGame { id: "hollowknight".into(), name: "Hollow Knight".into(), exe_name: "hollow_knight.exe".into(), steam_app_id: Some(367520), category: "Metroidvania".into() },
        DetectableGame { id: "celeste".into(), name: "Celeste".into(), exe_name: "Celeste.exe".into(), steam_app_id: Some(504230), category: "Platformer".into() },
        DetectableGame { id: "geometrydash".into(), name: "Geometry Dash".into(), exe_name: "GeometryDash.exe".into(), steam_app_id: Some(322170), category: "Rhythm".into() },
        DetectableGame { id: "cuphead".into(), name: "Cuphead".into(), exe_name: "Cuphead.exe".into(), steam_app_id: Some(268910), category: "Action".into() },
        DetectableGame { id: "davediver".into(), name: "Dave the Diver".into(), exe_name: "DaveTheDiver.exe".into(), steam_app_id: Some(1868140), category: "Adventure".into() },
        DetectableGame { id: "balatro".into(), name: "Balatro".into(), exe_name: "Balatro.exe".into(), steam_app_id: Some(2379780), category: "Card Roguelike".into() },
        DetectableGame { id: "contentwarning".into(), name: "Content Warning".into(), exe_name: "Content Warning.exe".into(), steam_app_id: Some(2881650), category: "Co-op".into() },
        DetectableGame { id: "oncehuman".into(), name: "Once Human".into(), exe_name: "ONCE_HUMAN.exe".into(), steam_app_id: Some(2139460), category: "Survival MMO".into() },

        // Popular Non-Steam & Launcher Titles
        DetectableGame { id: "roblox".into(), name: "Roblox".into(), exe_name: "RobloxPlayerBeta.exe".into(), steam_app_id: None, category: "Sandbox".into() },
        DetectableGame { id: "minecraft".into(), name: "Minecraft".into(), exe_name: "Minecraft.exe".into(), steam_app_id: None, category: "Sandbox".into() },
        DetectableGame { id: "lol".into(), name: "League of Legends".into(), exe_name: "LeagueClient.exe".into(), steam_app_id: None, category: "MOBA".into() },
        DetectableGame { id: "valorant".into(), name: "VALORANT".into(), exe_name: "VALORANT-Win64-Shipping.exe".into(), steam_app_id: None, category: "Tactical FPS".into() },
        DetectableGame { id: "overwatch2".into(), name: "Overwatch 2".into(), exe_name: "Overwatch.exe".into(), steam_app_id: Some(2357570), category: "Shooter".into() },
        DetectableGame { id: "fortnite".into(), name: "Fortnite".into(), exe_name: "FortniteClient-Win64-Shipping.exe".into(), steam_app_id: None, category: "Battle Royale".into() },
        DetectableGame { id: "genshin".into(), name: "Genshin Impact".into(), exe_name: "GenshinImpact.exe".into(), steam_app_id: None, category: "Action RPG".into() },
        DetectableGame { id: "honkai_star_rail".into(), name: "Honkai: Star Rail".into(), exe_name: "StarRail.exe".into(), steam_app_id: None, category: "Turn-based RPG".into() },
        DetectableGame { id: "zenless".into(), name: "Zenless Zone Zero".into(), exe_name: "ZenlessZoneZero.exe".into(), steam_app_id: None, category: "Action RPG".into() },
        DetectableGame { id: "ea_fc24".into(), name: "EA Sports FC 24".into(), exe_name: "fc24.exe".into(), steam_app_id: Some(2195250), category: "Sports".into() },
        DetectableGame { id: "ea_fc25".into(), name: "EA Sports FC 25".into(), exe_name: "fc25.exe".into(), steam_app_id: Some(2669320), category: "Sports".into() },
        DetectableGame { id: "ea_fc27".into(), name: "EA SPORTS FC™ 27".into(), exe_name: "fc27.exe".into(), steam_app_id: Some(4080220), category: "Sports".into() },
        DetectableGame { id: "cod_mw4".into(), name: "Call of Duty: Modern Warfare 4".into(), exe_name: "cod.exe".into(), steam_app_id: Some(1938090), category: "Shooter".into() },
        DetectableGame { id: "where_winds_meet".into(), name: "Where Winds Meet".into(), exe_name: "wherewindsmeet.exe".into(), steam_app_id: Some(2324650), category: "Action RPG".into() },
        DetectableGame { id: "endfield".into(), name: "Arknights: Endfield".into(), exe_name: "endfield.exe".into(), steam_app_id: Some(3443420), category: "3D RPG".into() },
    ]
}
