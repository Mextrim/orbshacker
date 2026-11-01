"""Tests for quests.py."""

from datetime import datetime, timezone, timedelta
from unittest.mock import MagicMock, patch

from orbshacker.quests import (
    QuestItem,
    _format_time_left,
    _resolve_quest_exe,
    _resolve_quest_exes,
    fetch_active_quests,
    _launch_all_pc_games,
    _bar,
    _format_duration,
    is_discord_running,
)


def test_format_time_left():
    now = datetime.now(timezone.utc)
    future = now + timedelta(days=2, hours=3)
    past = now - timedelta(minutes=5)

    assert "2д 3ч" in _format_time_left(future, now)
    assert _format_time_left(past, now) == "Expired"


def test_bar_and_duration():
    assert _bar(0.0) == "[░░░░░░░░░░░░░░░░░░░░░░░░]"
    assert _bar(1.0) == "[████████████████████████]"
    assert _format_duration(65) == "01:05"
    assert _format_duration(900) == "15:00"


def test_resolve_quest_exe_override():
    db = MagicMock()
    db.games = []

    q = {
        "messages": {"game_title": "EA SPORTS FC™ 27"},
        "application": {"id": "123", "name": "EA SPORTS FC™ 27"},
        "task_config_v2": {"tasks": {"PLAY_ON_DESKTOP": {}}},
    }
    exes = _resolve_quest_exes(q, db)
    assert "fc27.exe" in exes


def test_resolve_quest_exe_db_match():
    db = MagicMock()
    db.games = [
        {
            "id": "999",
            "name": "Custom Game",
            "executables": [{"os": "win32", "name": "CustomGame.exe"}],
        }
    ]

    q = {
        "messages": {"game_title": "Custom Game"},
        "application": {"id": "999", "name": "Custom Game"},
        "task_config_v2": {"tasks": {"PLAY_ON_DESKTOP": {}}},
    }
    exes = _resolve_quest_exes(q, db)
    assert "CustomGame.exe" in exes


def test_fetch_active_quests_filtering():
    db = MagicMock()
    db.games = []
    db.get_win32_executable.return_value = None

    now = datetime.now(timezone.utc)
    future_iso = (now + timedelta(days=5)).isoformat()
    past_iso = (now - timedelta(days=1)).isoformat()

    mock_raw_quests = [
        {
            "id": "1",
            "expires_at": future_iso,
            "messages": {"quest_name": "Active Quest", "game_title": "Where Winds Meet"},
            "application": {"id": "100", "name": "Where Winds Meet"},
            "rewards_config": {
                "rewards": [{"type": 4, "orb_quantity": 700}]
            },
            "task_config_v2": {
                "tasks": {"PLAY_ON_DESKTOP": {"type": "PLAY_ON_DESKTOP"}}
            },
        },
        {
            "id": "2",
            "expires_at": past_iso,
            "messages": {"quest_name": "Expired Quest", "game_title": "Old Game"},
        },
    ]

    with patch("orbshacker.quests.fetch_json", return_value=mock_raw_quests):
        items = fetch_active_quests(db)

    assert len(items) == 1
    assert items[0].id == "1"
    assert items[0].orb_quantity == 700
    assert items[0].is_pc is True
    assert "wwm.exe" in items[0].exe_names


def test_launch_all_pc_games():
    faker = MagicMock()
    faker.create_fake_game.return_value = "C:/path/fake.exe"
    faker.launch_executable.return_value = True

    now = datetime.now(timezone.utc)
    items = [
        QuestItem(
            id="1",
            quest_name="Q1",
            game_title="Game 1",
            app_id="1",
            orb_quantity=700,
            reward_desc="700 Orbs",
            task_desc="PC",
            is_pc=True,
            exe_names=["game1.exe"],
            expires_at=now + timedelta(days=1),
            expires_str="tomorrow",
        ),
        QuestItem(
            id="2",
            quest_name="Q2",
            game_title="Video Quest",
            app_id="2",
            orb_quantity=200,
            reward_desc="200 Orbs",
            task_desc="Video",
            is_pc=False,
            exe_names=[],
            expires_at=now + timedelta(days=1),
            expires_str="tomorrow",
        ),
    ]

    with patch("orbshacker.quests.ask_confirm", return_value=True), \
         patch("orbshacker.quests.time.sleep", return_value=None):
        _launch_all_pc_games(items, faker)

    # Should only launch the PC game
    faker.create_fake_game.assert_called_once_with("game1.exe")
    faker.launch_executable.assert_called_once()


def test_cross_platform_ipc_paths(monkeypatch):
    from orbshacker.quests import _get_discord_ipc_paths

    monkeypatch.setattr("sys.platform", "linux")
    monkeypatch.setenv("XDG_RUNTIME_DIR", "/run/user/1000")
    linux_paths = _get_discord_ipc_paths(0)
    assert any("/run/user/1000/discord-ipc-0" in p for p in linux_paths)

    monkeypatch.setattr("sys.platform", "darwin")
    monkeypatch.setenv("TMPDIR", "/var/folders/test")
    mac_paths = _get_discord_ipc_paths(0)
    assert any("/var/folders/test/discord-ipc-0" in p for p in mac_paths)

    monkeypatch.setattr("sys.platform", "win32")
    win_paths = _get_discord_ipc_paths(0)
    assert win_paths == [r"\\.\pipe\discord-ipc-0"]


def test_cross_platform_is_discord_running(monkeypatch):
    from orbshacker.quests import is_discord_running
    import subprocess

    monkeypatch.setattr("sys.platform", "linux")
    with patch("subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=0, stdout="12345\n")
        assert is_discord_running() is True

    monkeypatch.setattr("sys.platform", "darwin")
    with patch("subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=0, stdout="12345\n")
        assert is_discord_running() is True
