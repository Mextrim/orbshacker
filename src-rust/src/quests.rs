use std::sync::OnceLock;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuestInfo {
    pub id: String,
    pub title: String,
    pub game_title: String,
    pub publisher: String,
    pub application_id: String,
    pub exe_name: String,
    pub steam_app_id: Option<u64>,
    pub orbs_reward: u32,
    pub required_minutes: u32,
    pub icon_color: String,
    pub badge: String,
    pub needs_rpc: bool,
}

static ACTIVE_QUESTS: OnceLock<Vec<QuestInfo>> = OnceLock::new();

pub fn get_active_quests() -> &'static [QuestInfo] {
    ACTIVE_QUESTS.get_or_init(|| {
        vec![
        QuestInfo {
            id: "fc27".to_string(),
            title: "EA SPORTS FC™ 27".to_string(),
            game_title: "EA Sports FC 27".to_string(),
            publisher: "Electronic Arts".to_string(),
            application_id: "1531874756096295054".to_string(),
            exe_name: "fc27.exe".to_string(),
            steam_app_id: Some(4080220),
            orbs_reward: 700,
            required_minutes: 15,
            icon_color: "#22c55e".to_string(),
            badge: "Steam & Local RPC".to_string(),
            needs_rpc: true,
        },
        QuestInfo {
            id: "cod_mw4".to_string(),
            title: "Call of Duty: Modern Warfare 4".to_string(),
            game_title: "Call of Duty: Modern Warfare 4".to_string(),
            publisher: "Activision".to_string(),
            application_id: "1319762145893699705".to_string(),
            exe_name: "cod.exe".to_string(),
            steam_app_id: Some(1938090),
            orbs_reward: 700,
            required_minutes: 15,
            icon_color: "#3b82f6".to_string(),
            badge: "Steam Verified".to_string(),
            needs_rpc: false,
        },
        QuestInfo {
            id: "where_winds_meet".to_string(),
            title: "Where Winds Meet (Version 2.3)".to_string(),
            game_title: "Where Winds Meet".to_string(),
            publisher: "NetEase".to_string(),
            application_id: "1287955513811800174".to_string(),
            exe_name: "wherewindsmeet.exe".to_string(),
            steam_app_id: Some(2324650),
            orbs_reward: 700,
            required_minutes: 15,
            icon_color: "#eab308".to_string(),
            badge: "Steam Verified".to_string(),
            needs_rpc: false,
        },
        QuestInfo {
            id: "once_human".to_string(),
            title: "Once Human Free Expansion".to_string(),
            game_title: "Once Human".to_string(),
            publisher: "Starry Studio".to_string(),
            application_id: "1255734267426668584".to_string(),
            exe_name: "oncehuman.exe".to_string(),
            steam_app_id: Some(2139460),
            orbs_reward: 700,
            required_minutes: 15,
            icon_color: "#a855f7".to_string(),
            badge: "Steam Verified".to_string(),
            needs_rpc: false,
        },
        QuestInfo {
            id: "nights_in_forest".to_string(),
            title: "99 Nights in the Forest".to_string(),
            game_title: "99 Nights in the Forest".to_string(),
            publisher: "ROBLOX".to_string(),
            application_id: "1297593282218000000".to_string(),
            exe_name: "RobloxPlayerBeta.exe".to_string(),
            steam_app_id: None,
            orbs_reward: 700,
            required_minutes: 15,
            icon_color: "#ec4899".to_string(),
            badge: "Direct Process".to_string(),
            needs_rpc: false,
        },
        QuestInfo {
            id: "firefox".to_string(),
            title: "Firefox Browser Quest".to_string(),
            game_title: "Firefox".to_string(),
            publisher: "Mozilla".to_string(),
            application_id: "1298374281982736123".to_string(),
            exe_name: "firefox.exe".to_string(),
            steam_app_id: None,
            orbs_reward: 700,
            required_minutes: 15,
            icon_color: "#f97316".to_string(),
            badge: "Direct Process".to_string(),
            needs_rpc: false,
        },
        QuestInfo {
            id: "endfield".to_string(),
            title: "Arknights: Endfield (Now on Steam)".to_string(),
            game_title: "Arknights: Endfield".to_string(),
            publisher: "GRYPHLINE".to_string(),
            application_id: "1309871239871239812".to_string(),
            exe_name: "endfield.exe".to_string(),
            steam_app_id: Some(3100000),
            orbs_reward: 700,
            required_minutes: 15,
            icon_color: "#06b6d4".to_string(),
            badge: "Steam Verified".to_string(),
            needs_rpc: false,
        },
        QuestInfo {
            id: "monster_hunter".to_string(),
            title: "Monster Hunter Outlanders".to_string(),
            game_title: "Monster Hunter Outlanders".to_string(),
            publisher: "TiMi Studio Group".to_string(),
            application_id: "1310928301928301928".to_string(),
            exe_name: "monsterhunter.exe".to_string(),
            steam_app_id: Some(3200000),
            orbs_reward: 700,
            required_minutes: 15,
            icon_color: "#10b981".to_string(),
            badge: "Steam Verified".to_string(),
            needs_rpc: false,
        },
        QuestInfo {
            id: "maplestory".to_string(),
            title: "MapleStory".to_string(),
            game_title: "MapleStory".to_string(),
            publisher: "Nexon".to_string(),
            application_id: "359510095811444736".to_string(),
            exe_name: "MapleStory.exe".to_string(),
            steam_app_id: Some(216150),
            orbs_reward: 700,
            required_minutes: 15,
            icon_color: "#f97316".to_string(),
            badge: "Steam Verified".to_string(),
            needs_rpc: false,
        },
        QuestInfo {
            id: "wow_forever".to_string(),
            title: "World of Warcraft: Forever".to_string(),
            game_title: "World of Warcraft".to_string(),
            publisher: "Blizzard Entertainment".to_string(),
            application_id: "356875762940379136".to_string(),
            exe_name: "Wow.exe".to_string(),
            steam_app_id: None,
            orbs_reward: 700,
            required_minutes: 15,
            icon_color: "#eab308".to_string(),
            badge: "Direct Process".to_string(),
            needs_rpc: true,
        },
        QuestInfo {
            id: "honkai_star_rail".to_string(),
            title: "Honkai: Star Rail".to_string(),
            game_title: "Honkai: Star Rail".to_string(),
            publisher: "HoYoverse".to_string(),
            application_id: "1432798014786764871".to_string(),
            exe_name: "StarRail.exe".to_string(),
            steam_app_id: None,
            orbs_reward: 700,
            required_minutes: 15,
            icon_color: "#6366f1".to_string(),
            badge: "Direct Process".to_string(),
            needs_rpc: true,
        },
    ]
    })
}


#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_wow_forever_quest_configured() {
        let quests = get_active_quests();
        let wow = quests.iter().find(|q| q.id == "wow_forever").expect("wow_forever quest missing");
        assert_eq!(wow.application_id, "356875762940379136");
        assert_eq!(wow.exe_name, "Wow.exe");
        assert_eq!(wow.orbs_reward, 700);
    }

    #[test]
    fn test_honkai_star_rail_quest_configured() {
        let quests = get_active_quests();
        let hsr = quests.iter().find(|q| q.id == "honkai_star_rail").expect("honkai_star_rail quest missing");
        assert_eq!(hsr.application_id, "1432798014786764871");
        assert_eq!(hsr.exe_name, "StarRail.exe");
        assert_eq!(hsr.orbs_reward, 700);
    }

    #[test]
    fn test_maplestory_quest_configured() {
        let quests = get_active_quests();
        let ms = quests.iter().find(|q| q.id == "maplestory").expect("maplestory quest missing");
        assert_eq!(ms.application_id, "359510095811444736");
        assert_eq!(ms.steam_app_id, Some(216150));
        assert_eq!(ms.exe_name, "MapleStory.exe");
        assert_eq!(ms.orbs_reward, 700);
    }

    #[test]
    fn test_fc27_quest_configured() {
        let quests = get_active_quests();
        let fc27 = quests.iter().find(|q| q.id == "fc27").expect("fc27 quest missing");
        assert_eq!(fc27.application_id, "1531874756096295054");
        assert_eq!(fc27.steam_app_id, Some(4080220));
        assert!(fc27.needs_rpc);
        assert_eq!(fc27.orbs_reward, 700);
    }

    #[test]
    fn test_all_quests_reward_orbs() {
        let quests = get_active_quests();
        assert!(quests.len() >= 6);
        for q in quests {
            assert_eq!(q.orbs_reward, 700);
            assert_eq!(q.required_minutes, 15);
        }
    }
}
