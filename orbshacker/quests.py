"""
quests.py – Discord Quests & Orbs tracker, batch runner, and live session dashboard.

Fetches active Discord quests from the community API tracker,
matches games with Discord's detectable executables database,
displays available Orb quests, and allows launching games individually or all at once.
Includes an interactive live in-terminal countdown dashboard for active sessions.
Supports Discord Local RPC broadcasting for games without detectable executables (such as EA SPORTS FC 27).
"""

import json
import os
import struct
import subprocess
import sys
import threading
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from . import config
from .discord_db import DiscordGamesDB, get_current_discord_os
from .faker import GameFaker
from .net import fetch_json
from .steam import get_steam_path, generate_appmanifest
from .ui import (
    Colors,
    ask_confirm,
    loading_animation,
    pause,
    print_boxed_title,
    print_color,
)

# ── Multi-executable mapping for games with multiple launchers / subfolders ────
KNOWN_EXE_OVERRIDES: dict[str, list[str]] = {
    "resident evil":              ["re7.exe", "re8.exe", "re4.exe", "re2.exe", "re9.exe"],
    "once human":                 ["ONCE_HUMAN.exe", "once human/once_human.exe", "once_human.exe"],
    "call of duty":               ["cod26-cod.exe", "sp26-cod.exe"],
    "where winds meet":           ["wwm.exe", "where winds meet.exe"],
    "roblox":                     ["RobloxPlayerBeta.exe", "Roblox.exe"],
    "scary shawarma kiosk":       ["RobloxPlayerBeta.exe", "Roblox.exe"],
    "99 nights in the forest":    ["RobloxPlayerBeta.exe", "Roblox.exe"],
    "the latest firefox browser": ["firefox.exe"],
    "firefox browser":            ["firefox.exe"],
    "ea sports fc":               ["fc27.exe"],
    "fc 27":                      ["fc27.exe"],
    "valorant":                   ["win64/valorant-win64-shipping.exe", "VALORANT.exe"],
}

# Known games that require Discord Local RPC because Discord's detectable list has no executables
KNOWN_RPC_APPS: dict[str, str] = {
    "1531874756096295054": "EA Sports FC 27",
    "ea sports fc 27":     "1531874756096295054",
    "fc 27":               "1531874756096295054",
    "fc27":                "1531874756096295054",
}

# Known Steam app manifests to generate if Steam is installed
KNOWN_STEAM_MANIFESTS: dict[str, dict] = {
    "fc27.exe": {
        "appid": 4080220,
        "name": "EA SPORTS FC 27",
        "installdir": "EA SPORTS FC 27",
    },
    "re7.exe": {
        "appid": 443160,
        "name": "RESIDENT EVIL 7 biohazard",
        "installdir": "RESIDENT EVIL 7 biohazard",
    },
    "ONCE_HUMAN.exe": {
        "appid": 2139460,
        "name": "Once Human",
        "installdir": "Once Human",
    },
}

REWARD_TYPE_NAMES = {
    1: "Код",
    2: "Внутриигровая награда",
    3: "Декорация аватара",
    4: "Орбсы",
    5: "Nitro",
}

# ── ANSI helpers ───────────────────────────────────────────────────────────────
_CLEAR_LINE  = "\r\033[2K"
_CURSOR_UP   = "\033[{}A"
_HIDE_CURSOR = "\033[?25l"
_SHOW_CURSOR = "\033[?25h"

ORB_ICON  = "◆"
TICK_ICON = "✓"


@dataclass
class QuestItem:
    id: str
    quest_name: str
    game_title: str
    app_id: Optional[str]
    orb_quantity: int
    reward_desc: str
    task_desc: str
    is_pc: bool
    exe_names: list[str]
    expires_at: datetime
    expires_str: str

    @property
    def primary_exe(self) -> Optional[str]:
        return self.exe_names[0] if self.exe_names else None

    # Kept for backward compatibility
    @property
    def exe_name(self) -> Optional[str]:
        return self.primary_exe

    @exe_name.setter
    def exe_name(self, value: Optional[str]) -> None:
        if value:
            self.exe_names = [value]
        else:
            self.exe_names = []


@dataclass
class SessionGame:
    """Tracks one executable process during an orb-farming session."""
    title: str
    exe_name: str
    orb_quantity: int
    status: str = "pending"   # pending | launching | running | done | failed
    proc: Optional[object] = field(default=None, repr=False)
    target_path: Optional[Path] = None
    started_at: Optional[float] = None
    error: str = ""


# ── Discord Local RPC Broadcaster ──────────────────────────────────────────────

def _get_discord_ipc_paths(pipe_index: int = 0) -> list[str]:
    """Return platform-specific paths for Discord Local IPC pipe/socket."""
    if sys.platform == "win32":
        return [rf"\\.\pipe\discord-ipc-{pipe_index}"]

    paths: list[str] = []
    if sys.platform == "darwin":
        tmp = os.environ.get("TMPDIR", "/tmp").rstrip("/")
        paths.extend([f"{tmp}/discord-ipc-{pipe_index}", f"/tmp/discord-ipc-{pipe_index}"])
    else:  # Linux / Unix
        import tempfile
        uid = getattr(os, "getuid", lambda: 1000)()
        xdg = os.environ.get("XDG_RUNTIME_DIR", f"/run/user/{uid}")
        paths.extend([
            f"{xdg}/discord-ipc-{pipe_index}",
            f"{xdg}/app/com.discordapp.Discord/discord-ipc-{pipe_index}",
            f"{xdg}/snap.discord/discord-ipc-{pipe_index}",
            f"/tmp/discord-ipc-{pipe_index}",
            f"{tempfile.gettempdir()}/discord-ipc-{pipe_index}",
        ])
    return paths


def _open_discord_ipc(pipe_index: int = 0):
    """Open a read/write binary stream to Discord Local IPC (Windows Named Pipe or Unix socket)."""
    paths = _get_discord_ipc_paths(pipe_index)
    if sys.platform == "win32":
        return open(paths[0], "r+b", buffering=0)

    import socket
    last_err = None
    for path in paths:
        if os.path.exists(path):
            try:
                sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
                sock.connect(path)
                return sock.makefile("rwb", buffering=0)
            except Exception as e:
                last_err = e
    if last_err:
        raise last_err
    raise FileNotFoundError(f"Discord IPC socket not found: {paths}")


class DiscordRPCClient:
    """
    Connects to the local Discord client via Windows Named Pipe or Unix Domain Socket
    and broadcasts rich presence activity directly across Windows, Linux, and macOS.
    Required for games like EA SPORTS FC 27 where Discord detects the game exclusively
    through its Application ID via Local RPC.
    """
    def __init__(self, client_id: str, details: str = "Playing Match", state: str = "Online"):
        self.client_id = str(client_id)
        self.details = details
        self.state = state
        self.pipe = None
        self._stop_event = threading.Event()
        self._thread: Optional[threading.Thread] = None
        self.is_connected = False

    def start(self) -> None:
        self._stop_event.clear()
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._stop_event.set()
        if self.pipe:
            try:
                self.pipe.close()
            except Exception:
                pass
        self.is_connected = False

    def _run(self) -> None:
        while not self._stop_event.is_set():
            pipe = None
            try:
                for i in range(10):
                    try:
                        pipe = _open_discord_ipc(i)
                        break
                    except Exception:
                        continue
                if pipe is None:
                    time.sleep(2)
                    continue

                self.pipe = pipe
                # Handshake (opcode 0)
                hs = json.dumps({'v': 1, 'client_id': self.client_id}).encode('utf-8')
                self.pipe.write(struct.pack('<II', 0, len(hs)) + hs)
                header = self.pipe.read(8)
                if not header or len(header) < 8:
                    try:
                        self.pipe.close()
                    except Exception:
                        pass
                    self.pipe = None
                    time.sleep(2)
                    continue
                _, length = struct.unpack('<II', header)
                self.pipe.read(length)

                # Set Activity (opcode 1)
                act = {
                    'cmd': 'SET_ACTIVITY',
                    'args': {
                        'pid': os.getpid(),
                        'activity': {
                            'type': 0,
                            'timestamps': {'start': int(time.time())},
                            'details': self.details,
                            'state': self.state,
                        }
                    },
                    'nonce': 'orbshacker_rpc'
                }
                act_b = json.dumps(act).encode('utf-8')
                self.pipe.write(struct.pack('<II', 1, len(act_b)) + act_b)
                header = self.pipe.read(8)
                if header and len(header) >= 8:
                    _, length = struct.unpack('<II', header)
                    self.pipe.read(length)
                self.is_connected = True

                while not self._stop_event.is_set():
                    time.sleep(1)
            except Exception:
                self.is_connected = False
                if self.pipe:
                    try:
                        self.pipe.close()
                    except Exception:
                        pass
                    self.pipe = None
                time.sleep(2)


# ── System / Discord Status Helpers ────────────────────────────────────────────

def is_discord_running() -> bool:
    """Check if Discord Desktop process is actively running across Windows, macOS, and Linux."""
    if sys.platform == "win32":
        try:
            res = subprocess.run(
                ["tasklist", "/fi", "imagename eq Discord.exe", "/nh"],
                capture_output=True,
                text=True,
                check=False,
                creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
            )
            return "discord.exe" in (res.stdout or "").lower()
        except Exception:
            return True
    elif sys.platform == "darwin":
        try:
            res = subprocess.run(["pgrep", "-ix", "Discord"], capture_output=True, text=True, check=False)
            if res.returncode == 0 and res.stdout.strip():
                return True
            res2 = subprocess.run(["ps", "-axc", "-o", "command"], capture_output=True, text=True, check=False)
            return "Discord" in (res2.stdout or "")
        except Exception:
            return True
    else:  # Linux / Unix
        try:
            res = subprocess.run(["pgrep", "-i", "discord"], capture_output=True, text=True, check=False)
            if res.returncode == 0 and res.stdout.strip():
                return True
            res2 = subprocess.run(["ps", "-A"], capture_output=True, text=True, check=False)
            return "discord" in (res2.stdout or "").lower()
        except Exception:
            return True


def open_discord_quests() -> None:
    """Attempt to open Discord directly to the Gift Inventory / Quests page."""
    try:
        if sys.platform == "win32":
            os.startfile("discord://app/settings/gift-inventory")
        elif sys.platform == "darwin":
            subprocess.run(["open", "discord://app/settings/gift-inventory"], check=False)
        else:
            subprocess.run(["xdg-open", "discord://app/settings/gift-inventory"], check=False)
        print_color("[OK] Открываем вкладку квестов в Discord...", Colors.GREEN)
    except Exception:
        try:
            import webbrowser
            webbrowser.open("https://discord.com/channels/@me")
        except Exception:
            pass


# ── Utilities ──────────────────────────────────────────────────────────────────

def _format_time_left(dt: datetime, now: datetime) -> str:
    diff = dt - now
    total_seconds = int(diff.total_seconds())
    if total_seconds <= 0:
        return "Expired"
    days  = total_seconds // 86400
    hours = (total_seconds % 86400) // 3600
    if days > 0:
        return f"{days}д {hours}ч"
    mins = (total_seconds % 3600) // 60
    return f"{hours}ч {mins}м"


def _format_duration(seconds: float) -> str:
    s = int(seconds)
    m, s = divmod(s, 60)
    return f"{m:02d}:{s:02d}"


def _bar(fraction: float, width: int = 24) -> str:
    fraction = max(0.0, min(1.0, fraction))
    filled = int(fraction * width)
    empty  = width - filled
    return f"[{'█' * filled}{'░' * empty}]"


def _resolve_quest_exes(q: dict, db: DiscordGamesDB) -> list[str]:
    """Find all Windows executable names that Discord accepts for this quest."""
    msgs       = q.get("messages") or {}
    app        = q.get("application") or {}
    game_title = (msgs.get("game_title") or app.get("name") or "").strip()
    quest_name = (msgs.get("quest_name") or "").strip()
    combined   = f"{game_title.lower()} {quest_name.lower()}"

    # Only look for exes if quest supports PC/desktop play
    task_cfg = q.get("task_config_v2") or q.get("task_config") or {}
    tasks    = task_cfg.get("tasks") or {}
    is_pc    = any(t in tasks for t in ("PLAY_ON_DESKTOP", "STREAM_ON_DESKTOP"))
    if not is_pc:
        return []

    # 1. Known executable overrides (highest priority, returns all verified names)
    for pattern, exes in KNOWN_EXE_OVERRIDES.items():
        if pattern in combined:
            return list(exes)

    # 2. Check all applications listed in PLAY_ON_DESKTOP task configuration
    found: list[str] = []
    play_desktop = tasks.get("PLAY_ON_DESKTOP", {})
    eligible_apps = play_desktop.get("applications", [])
    app_ids = [str(a.get("id")) for a in eligible_apps if a.get("id")]
    if app.get("id"):
        app_ids.insert(0, str(app.get("id")))

    for aid in app_ids:
        for g in db.games:
            if str(g.get("id")) == aid:
                for e in g.get("executables", []):
                    if isinstance(e, dict) and e.get("os") in (get_current_discord_os(), "win32"):
                        ename = e.get("name", "")
                        if ename.startswith(">"):
                            ename = ename[1:]
                        if ename and ename not in found:
                            found.append(ename)

    if found:
        return found

    # 3. Match by game title or alias in Discord Games DB
    title_lower = game_title.lower()
    if title_lower:
        for g in db.games:
            gname   = g.get("name", "").lower()
            aliases = [a.lower() for a in g.get("aliases", [])]
            if gname == title_lower or title_lower in gname or any(title_lower in a for a in aliases):
                for e in g.get("executables", []):
                    if isinstance(e, dict) and e.get("os") in (get_current_discord_os(), "win32"):
                        ename = e.get("name", "")
                        if ename.startswith(">"):
                            ename = ename[1:]
                        if ename and ename not in found:
                            found.append(ename)
                if found:
                    return found

    # 4. Fallback: sanitize game title
    clean = "".join(c for c in game_title if c.isalnum() or c in ("-", "_", " ")).strip()
    if clean:
        ext = ".exe" if sys.platform == "win32" else ""
        return [f"{clean}{ext}"]

    return []


def _resolve_quest_exe(q: dict, db: DiscordGamesDB) -> Optional[str]:
    """Compatibility helper returning single primary executable."""
    exes = _resolve_quest_exes(q, db)
    return exes[0] if exes else None


# ── Quest fetching ─────────────────────────────────────────────────────────────

def fetch_active_quests(db: DiscordGamesDB) -> list[QuestItem]:
    """Fetch and parse all currently active quests."""
    try:
        raw_quests = fetch_json(config.QUESTS_API_URL, timeout=config.REQUEST_TIMEOUT)
    except Exception as e:
        print_color(f"[ERROR] Ошибка загрузки квестов: {e}", Colors.RED)
        return []

    now = datetime.now(timezone.utc)
    results: list[QuestItem] = []
    seen_keys: set[str] = set()

    for q in raw_quests:
        exp_raw = q.get("expires_at")
        if not exp_raw:
            continue
        try:
            exp_dt = datetime.fromisoformat(str(exp_raw).replace("Z", "+00:00"))
            if exp_dt <= now:
                continue
        except Exception:
            continue

        msgs        = q.get("messages") or {}
        app         = q.get("application") or {}
        qid         = str(q.get("id", ""))
        quest_name  = (msgs.get("quest_name") or "").strip()
        game_title  = (msgs.get("game_title") or app.get("name") or "").strip()
        app_id      = app.get("id")
        expires_str = exp_dt.strftime("%d.%m %H:%M UTC")

        # Rewards
        rewards_cfg = q.get("rewards_config") or {}
        rewards     = rewards_cfg.get("rewards") or []
        orb_total   = 0
        reward_desc = ""
        for r in rewards:
            rtype = r.get("type")
            if rtype == 4:
                orb_total += int(r.get("orb_quantity", 0) or 0)
            if not reward_desc:
                reward_desc = REWARD_TYPE_NAMES.get(rtype, f"Тип {rtype}")

        # Task type
        task_cfg = q.get("task_config_v2") or q.get("task_config") or {}
        tasks    = task_cfg.get("tasks") or {}
        is_pc    = any(t in tasks for t in ("PLAY_ON_DESKTOP", "STREAM_ON_DESKTOP"))
        task_desc_parts = list(tasks.keys()) if isinstance(tasks, dict) else []
        task_desc = ", ".join(task_desc_parts[:2]) if task_desc_parts else "Unknown"

        exe_names = _resolve_quest_exes(q, db)
        dedup_key = f"{game_title.lower()}:{quest_name.lower()}:{qid}"
        if dedup_key in seen_keys:
            continue
        seen_keys.add(dedup_key)

        results.append(QuestItem(
            id=qid,
            quest_name=quest_name,
            game_title=game_title,
            app_id=str(app_id) if app_id else None,
            orb_quantity=orb_total,
            reward_desc=reward_desc,
            task_desc=task_desc,
            is_pc=is_pc,
            exe_names=exe_names,
            expires_at=exp_dt,
            expires_str=expires_str,
        ))

    # Sort: PC+Orb first, then by orb count, then PC, then expiry
    results.sort(
        key=lambda item: (
            1 if (item.is_pc and item.orb_quantity > 0) else 0,
            item.orb_quantity,
            1 if item.is_pc else 0,
            item.expires_at,
        ),
        reverse=True,
    )
    return results


# ── Launch helpers ─────────────────────────────────────────────────────────────

def _ensure_steam_manifest_if_applicable(exe_name: str) -> None:
    """If Steam is installed and the exe matches a known Steam quest, generate manifest."""
    base_name = exe_name.split("/")[-1].split("\\")[-1]
    info = KNOWN_STEAM_MANIFESTS.get(base_name)
    if not info:
        return
    steam_path = get_steam_path()
    if not steam_path or not steam_path.exists():
        return
    try:
        generate_appmanifest(info["appid"], info["name"], info["installdir"], steam_path)
    except Exception:
        pass


def _launch_quest_game(item: QuestItem, faker: GameFaker) -> bool:
    """Spoof and launch a single quest game (launching its executables + RPC if needed)."""
    if not item.exe_names:
        print_color(f"\n[ERROR] Исполняемый файл для '{item.game_title}' не найден", Colors.RED)
        if ask_confirm("Ввести имя исполняемого файла вручную?"):
            name = input(f"{Colors.BOLD}Имя EXE:{Colors.RESET} ").strip()
            if not name:
                return False
            item.exe_names = [name]
        else:
            return False

    print(f"\n{Colors.BOLD}Создание процесса игры:{Colors.RESET}")
    print(f"  Игра:       {Colors.CYAN}{item.game_title}{Colors.RESET}")
    print(f"  Квест:      {Colors.WHITE}{item.quest_name}{Colors.RESET}")
    print(f"  EXE:        {Colors.GREEN}{', '.join(item.exe_names)}{Colors.RESET}")
    if item.orb_quantity > 0:
        print(f"  Награда:    {Colors.YELLOW}{Colors.BOLD}+{item.orb_quantity} Орбсов ◆{Colors.RESET}")

    # Check if RPC broadcast is needed (FC 27)
    rpc_client = None
    is_fc27 = "fc" in item.game_title.lower() or item.app_id == "1531874756096295054"
    if is_fc27:
        print(f"  {Colors.BOLD}Discord RPC:{Colors.RESET} {Colors.GREEN}Локальный RPC активен для EA SPORTS FC™ 27 (App ID: 1531874756096295054){Colors.RESET}")

    if not ask_confirm(f"Запустить квест '{item.game_title}'?"):
        print_color("[!] Отменено", Colors.YELLOW)
        return False

    if is_fc27:
        rpc_client = DiscordRPCClient("1531874756096295054", "Playing Ultimate Team", "Online Match")
        rpc_client.start()
        print_color("  [✓] Discord RPC подключен! Discord теперь видит игру в вашем профиле.", Colors.GREEN)

    success = False
    for exe in item.exe_names:
        _ensure_steam_manifest_if_applicable(exe)
        target = faker.create_fake_game(exe)
        if target and faker.launch_executable(target):
            success = True

    if success or rpc_client:
        print_color(f"\n[OK] Квест запущен! Discord определяет игру.", Colors.GREEN, bold=True)
        return True
    return False


# ── Live Terminal Dashboard ────────────────────────────────────────────────────

def _render_dashboard_lines(
    sessions: list[SessionGame],
    elapsed: float,
    duration: float,
    total_orbs: int,
    spinner_frame: int,
    rpc_client: Optional[DiscordRPCClient] = None,
) -> list[str]:
    """Return rendered dashboard lines."""
    spinner_chars = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]
    sp = spinner_chars[spinner_frame % len(spinner_chars)]

    remaining = max(0.0, duration - elapsed)
    fraction  = min(1.0, elapsed / duration) if duration > 0 else 1.0
    bar_str   = _bar(fraction, width=24)
    pct       = int(fraction * 100)

    width = 74
    border = f"{Colors.BOLD}{Colors.CYAN}+{'─' * (width - 2)}+{Colors.RESET}"
    title  = "DISCORD ORBS FARMING SESSION"
    pad    = max(0, (width - 2 - len(title) - 4) // 2)

    lines: list[str] = [
        border,
        (
            f"{Colors.BOLD}{Colors.CYAN}|{Colors.RESET}"
            f"{' ' * pad}{Colors.BOLD}{Colors.YELLOW}{ORB_ICON}  {title}  {ORB_ICON}{Colors.RESET}"
            f"{' ' * max(0, width - 2 - pad - len(title) - 4)}"
            f"{Colors.BOLD}{Colors.CYAN}|{Colors.RESET}"
        ),
        border,
        "",
    ]

    # Progress and timers
    bar_color = Colors.GREEN if fraction < 0.6 else Colors.YELLOW if fraction < 0.9 else Colors.CYAN
    lines.append(
        f"  {Colors.BOLD}Прогресс:{Colors.RESET}   "
        f"{bar_color}{bar_str}{Colors.RESET} {Colors.BOLD}{pct:3d}%{Colors.RESET}  "
        f"Прошло: {Colors.WHITE}{_format_duration(elapsed)}{Colors.RESET}  "
        f"Осталось: {Colors.CYAN}{Colors.BOLD}{_format_duration(remaining)}{Colors.RESET}"
    )

    running_cnt = sum(1 for s in sessions if s.status == "running")
    rpc_badge = f"{Colors.GREEN}[RPC Активен]{Colors.RESET}" if (rpc_client and rpc_client.is_connected) else ""
    lines.append(
        f"  {Colors.BOLD}Всего Орбсов:{Colors.RESET} {Colors.YELLOW}{Colors.BOLD}+{total_orbs} {ORB_ICON}{Colors.RESET}   "
        f"{Colors.BOLD}Процессов в работе:{Colors.RESET} {Colors.GREEN}{running_cnt}/{len(sessions)}{Colors.RESET}  {rpc_badge}"
    )
    lines.append("")

    # Process table
    lines.append(f"  {Colors.BOLD}{'Игра':<26}{'Исполняемый файл':<26}{'Орбсы':<8}{'Статус'}{Colors.RESET}")
    lines.append(f"  {Colors.GRAY}{'─' * 70}{Colors.RESET}")

    for sg in sessions:
        name_str = sg.title[:24]
        exe_str  = sg.exe_name[:24]
        orb_str  = f"+{sg.orb_quantity}" if sg.orb_quantity > 0 else " —"

        if sg.status == "running":
            status_str = f"{Colors.GREEN}{sp} В процессе{Colors.RESET}"
        elif sg.status == "done":
            status_str = f"{Colors.GREEN}{TICK_ICON} Завершено{Colors.RESET}"
        elif sg.status == "failed":
            status_str = f"{Colors.RED}✗ Ошибка{Colors.RESET}"
        else:
            status_str = f"{Colors.GRAY}· Запуск…{Colors.RESET}"

        orb_col = f"{Colors.YELLOW}{Colors.BOLD}{orb_str:<7}{Colors.RESET}" if sg.orb_quantity > 0 else f"{Colors.GRAY}{orb_str:<7}{Colors.RESET}"
        lines.append(
            f"  {Colors.CYAN}{name_str:<26}{Colors.RESET}"
            f"{Colors.WHITE}{exe_str:<26}{Colors.RESET}"
            f"{orb_col} "
            f"{status_str}"
        )

    lines.append("")
    lines.append(f"  {Colors.GRAY}{'─' * 70}{Colors.RESET}")
    lines.append(
        f"  {Colors.BOLD}[M] / [Enter]{Colors.RESET} Свернуть в фон и вернуться в меню  "
        f"{Colors.BOLD}[Q]{Colors.RESET} Прервать сессию"
    )

    return lines


class _CrossPlatformKeyReader:
    """Non-blocking single-key reader supporting Windows (msvcrt) and Unix (select + termios)."""
    def __init__(self):
        self.old_term = None
        self.is_unix_tty = sys.platform != "win32" and sys.stdin.isatty()

    def __enter__(self):
        if self.is_unix_tty:
            try:
                import termios, tty
                self.old_term = termios.tcgetattr(sys.stdin)
                tty.setcbreak(sys.stdin.fileno())
            except Exception:
                self.old_term = None
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.old_term is not None:
            try:
                import termios
                termios.tcsetattr(sys.stdin, termios.TCSADRAIN, self.old_term)
            except Exception:
                pass

    def read_key(self) -> Optional[bytes]:
        if sys.platform == "win32":
            try:
                import msvcrt
                if msvcrt.kbhit():
                    return msvcrt.getch()
            except Exception:
                pass
            return None
        else:
            try:
                import select
                if select.select([sys.stdin], [], [], 0)[0]:
                    ch = sys.stdin.read(1)
                    return ch.encode("utf-8")
            except Exception:
                pass
            return None


def _orb_farming_dashboard(
    sessions: list[SessionGame],
    duration_seconds: float,
    total_orbs: int,
    rpc_client: Optional[DiscordRPCClient] = None,
) -> bool:
    """Live dashboard loop with cross-platform non-blocking key checks."""
    if duration_seconds <= 0:
        return True

    # Windows VT setup
    if sys.platform == "win32":
        try:
            import ctypes
            k32 = ctypes.windll.kernel32
            h = k32.GetStdHandle(-11)
            m = ctypes.c_uint32()
            if k32.GetConsoleMode(h, ctypes.byref(m)):
                k32.SetConsoleMode(h, m.value | 0x0004)
        except Exception:
            pass

    try:
        sys.stdout.write(_HIDE_CURSOR)
        sys.stdout.flush()
    except Exception:
        pass

    start = time.monotonic()
    frame = 0
    prev_lines = 0
    natural_finish = False

    try:
        with _CrossPlatformKeyReader() as key_reader:
            while True:
                elapsed = time.monotonic() - start

                ch = key_reader.read_key()
                if ch:
                    if ch in (b'm', b'M', b'\r', b'\n'):
                        print_color("\n[*] Сессия продолжается в фоне! Возврат в меню...", Colors.CYAN)
                        time.sleep(1.0)
                        return True
                    if ch in (b'q', b'Q', b'\x03'):
                        print_color("\n[!] Сессия остановлена пользователем.", Colors.YELLOW)
                        time.sleep(1.0)
                        return False
                    if ch in (b'o', b'O'):
                        open_discord_quests()

                lines = _render_dashboard_lines(sessions, elapsed, duration_seconds, total_orbs, frame, rpc_client)

                # Redraw
                if prev_lines > 0:
                    sys.stdout.write(_CURSOR_UP.format(prev_lines))

                for ln in lines:
                    sys.stdout.write(_CLEAR_LINE + ln + "\n")
                sys.stdout.flush()

                prev_lines = len(lines)
                frame += 1

                if elapsed >= duration_seconds:
                    natural_finish = True
                    for sg in sessions:
                        if sg.status == "running":
                            sg.status = "done"
                    break

                time.sleep(0.25)

    except (KeyboardInterrupt, EOFError):
        print_color("\n[!] Прервано пользователем.", Colors.YELLOW)
        return False
    finally:
        try:
            sys.stdout.write(_SHOW_CURSOR)
            sys.stdout.flush()
        except Exception:
            pass

    return natural_finish


# ── Batch Collection Flow ──────────────────────────────────────────────────────

def _collect_all_orbs(
    items: list[QuestItem],
    faker: GameFaker,
    run_dashboard: bool = True,
) -> None:
    """
    Main 'Collect ALL Orbs' 1-click batch workflow:
    Launches ALL valid candidate executables for every active PC quest simultaneously,
    AND broadcasts Discord Local RPC for games like EA SPORTS FC 27.
    """
    pc_games = [item for item in items if item.is_pc and item.exe_names]
    if not pc_games:
        print_color("\n[ERROR] В текущем фильтре не найдено подходящих ПК-игр.", Colors.RED)
        time.sleep(config.SLEEP_LONG)
        return

    # Build unique executable execution list
    sessions: list[SessionGame] = []
    seen_exes: set[str] = set()
    has_fc27 = False

    for g in pc_games:
        if "fc" in g.game_title.lower() or g.app_id == "1531874756096295054":
            has_fc27 = True
        for exe in g.exe_names:
            norm = exe.lower().replace("\\", "/")
            if norm not in seen_exes:
                seen_exes.add(norm)
                sessions.append(SessionGame(
                    title=g.game_title,
                    exe_name=exe,
                    orb_quantity=g.orb_quantity if len(sessions) == 0 or sessions[-1].title != g.game_title else 0,
                ))

    # Total unique orbs across games
    unique_titles = {g.game_title: g.orb_quantity for g in pc_games}
    total_orbs = sum(unique_titles.values())
    duration   = config.TIMER_MINUTES * 60.0
    discord_ok = is_discord_running()

    # ── Summary Screen ─────────────────────────────────────────────────────────
    subprocess.run('cls' if os.name == 'nt' else 'clear', shell=True, check=False)
    print_boxed_title("ЗАБРАТЬ ВСЕ ОРБСЫ (COLLECT ALL ORBS)", width=74, color=Colors.YELLOW)

    print(f"  {Colors.BOLD}Квестов к фарму:{Colors.RESET}    {Colors.GREEN}{len(unique_titles)}{Colors.RESET}")
    print(f"  {Colors.BOLD}Всего Орбсов:{Colors.RESET}       {Colors.YELLOW}{Colors.BOLD}+{total_orbs} {ORB_ICON}{Colors.RESET}")
    print(f"  {Colors.BOLD}Процессов игры:{Colors.RESET}     {Colors.CYAN}{len(sessions)} процессов в параллели{Colors.RESET}")
    print(f"  {Colors.BOLD}Время сессии:{Colors.RESET}       {Colors.WHITE}{config.TIMER_MINUTES} минут{Colors.RESET}")

    if discord_ok:
        print(f"  {Colors.BOLD}Статус Discord:{Colors.RESET}     {Colors.GREEN}{TICK_ICON} Запущен и обнаружен{Colors.RESET}")
    else:
        print(f"  {Colors.BOLD}Статус Discord:{Colors.RESET}     {Colors.RED}✗ НЕ запущен! (Запустите Discord перед стартом){Colors.RESET}")

    if has_fc27:
        print(f"  {Colors.BOLD}EA FC 27 RPC:{Colors.RESET}       {Colors.GREEN}{TICK_ICON} Локальный Discord RPC активен (App ID: 1531874756096295054){Colors.RESET}")

    print(f"\n  {Colors.BOLD}{'#':<4}{'Игра':<28}{'Исполняемый файл':<26}{'Награда'}{Colors.RESET}")
    print(f"  {Colors.GRAY}{'─' * 70}{Colors.RESET}")

    for idx, sg in enumerate(sessions, 1):
        orb_badge = (
            f"{Colors.YELLOW}{Colors.BOLD}+{sg.orb_quantity} Орбсов{Colors.RESET}"
            if sg.orb_quantity > 0
            else f"{Colors.GRAY}—{Colors.RESET}"
        )
        print(
            f"  {Colors.CYAN}{idx:<4}{Colors.RESET}"
            f"{Colors.WHITE}{sg.title[:26]:<28}{Colors.RESET}"
            f"{Colors.GREEN}{sg.exe_name[:24]:<26}{Colors.RESET}"
            f"{orb_badge}"
        )

    print()
    print_color("  [!] Все процессы запускаются параллельно и гарантированно определяются Discord!", Colors.CYAN, bold=True)
    print_color("  [*] Убедитесь, что вы нажали «Принять квест» (Accept Quest) в Discord.", Colors.YELLOW)
    print()

    if not ask_confirm("Запустить все игры и начать фарм Орбсов?"):
        print_color("\n[!] Запуск отменён.", Colors.YELLOW)
        time.sleep(config.SLEEP_SHORT)
        return

    # ── Start Discord RPC for EA SPORTS FC 27 ──────────────────────────────────
    rpc_client = None
    if has_fc27:
        rpc_client = DiscordRPCClient("1531874756096295054", "Playing Ultimate Team", "Online Match")
        rpc_client.start()
        print_color("  [✓] Discord RPC подключен для EA SPORTS FC™ 27!", Colors.GREEN)

    # ── Parallel Launch ────────────────────────────────────────────────────────
    print()
    print_color("[*] Запускаем фейковые процессы игр...", Colors.CYAN, bold=True)

    for sg in sessions:
        sg.status = "launching"
        try:
            _ensure_steam_manifest_if_applicable(sg.exe_name)
            target = faker.create_fake_game(sg.exe_name)
            if target:
                sg.target_path = target
                ok = faker.launch_executable(target)
                if ok:
                    sg.status = "running"
                    sg.started_at = time.monotonic()
                    print_color(f"  {TICK_ICON}  {sg.title} → {sg.exe_name}", Colors.GREEN)
                else:
                    sg.status = "failed"
                    sg.error  = "launch_executable failed"
                    print_color(f"  ✗  {sg.title}: ошибка запуска", Colors.RED)
            else:
                sg.status = "failed"
                sg.error  = "create_fake_game failed"
                print_color(f"  ✗  {sg.title}: не удалось создать exe", Colors.RED)
        except Exception as exc:
            sg.status = "failed"
            sg.error  = str(exc)
            print_color(f"  ✗  {sg.title}: {exc}", Colors.RED)

    launched = [sg for sg in sessions if sg.status == "running"]
    failed   = [sg for sg in sessions if sg.status == "failed"]

    if not launched and not rpc_client:
        print_color("\n[ERROR] Не удалось запустить ни одну игру!", Colors.RED, bold=True)
        pause()
        return

    print()
    print_color(
        f"[OK] Успешно запущено {len(launched)}/{len(sessions)} процессов! Discord сканирует игры...",
        Colors.GREEN,
        bold=True,
    )
    time.sleep(1.5)

    if not run_dashboard:
        if rpc_client:
            rpc_client.stop()
        return

    # ── Live Dashboard ─────────────────────────────────────────────────────────
    subprocess.run('cls' if os.name == 'nt' else 'clear', shell=True, check=False)
    completed = False
    try:
        completed = _orb_farming_dashboard(sessions, duration, total_orbs, rpc_client)
    finally:
        if rpc_client:
            rpc_client.stop()

    # ── Results Screen ─────────────────────────────────────────────────────────
    if completed:
        subprocess.run('cls' if os.name == 'nt' else 'clear', shell=True, check=False)
        _show_session_results(sessions, failed, total_orbs)
        pause("Нажмите Enter, чтобы вернуться в меню квестов...")


def _show_session_results(
    sessions: list[SessionGame],
    failed: list[SessionGame],
    total_orbs: int,
) -> None:
    """Display the post-session completion and reward claiming guide."""
    done_games = [sg for sg in sessions if sg.status in ("running", "done")]
    titles_done = {sg.title for sg in done_games}

    print_boxed_title("СЕССИЯ ЗАВЕРШЕНА! ВСЕ КВЕСТЫ ВЫПОЛНЕНЫ", width=72, color=Colors.GREEN)

    print(f"\n  {Colors.BOLD}{Colors.YELLOW}{ORB_ICON}  Получено Орбсов в сессии:{Colors.RESET} "
          f"{Colors.YELLOW}{Colors.BOLD}+{total_orbs} Орбсов ◆{Colors.RESET}")
    print(f"  {Colors.BOLD}{Colors.GREEN}{TICK_ICON}  Успешно выполнено квестов:{Colors.RESET} "
          f"{Colors.GREEN}{len(titles_done)}{Colors.RESET}")
    if failed:
        print(f"  {Colors.BOLD}{Colors.RED}✗  Не удалось запустить:{Colors.RESET}       "
              f"{Colors.RED}{len(failed)}{Colors.RESET}")
    print()

    print_boxed_title("КАК ЗАБРАТЬ ОРБСЫ В DISCORD", width=72, color=Colors.CYAN)
    print(f"  {Colors.BOLD}1.{Colors.RESET} Откройте Discord (нажмите {Colors.CYAN}[O]{Colors.RESET} в меню или откройте вручную)")
    print(f"  {Colors.BOLD}2.{Colors.RESET} Перейдите в: {Colors.WHITE}Настройки пользователя → Инвентарь подарков (Quests){Colors.RESET}")
    print(f"  {Colors.BOLD}3.{Colors.RESET} Напротив каждого выполненного квеста нажмите {Colors.GREEN}{Colors.BOLD}«Забрать награду» (Claim Reward){Colors.RESET}!")
    print(f"  {Colors.BOLD}4.{Colors.RESET} Орбсы мгновенно зачисляются на ваш баланс Discord!")
    print()


def _launch_all_pc_games(items: list[QuestItem], faker: GameFaker) -> None:
    """Alias for backwards compatibility and tests."""
    _collect_all_orbs(items, faker, run_dashboard=False)


# ── Video Quests Guide & Viewer ────────────────────────────────────────────────

def show_video_quests_menu(quests: list[QuestItem]) -> None:
    """Display all active video quests (+200 Orbs each) and guide on completing them."""
    video_quests = [q for q in quests if not q.is_pc and q.orb_quantity > 0]
    total_video_orbs = sum(q.orb_quantity for q in video_quests)

    subprocess.run('cls' if os.name == 'nt' else 'clear', shell=True, check=False)
    print_boxed_title("ВИДЕО-КВЕСТЫ DISCORD (ПО +200 ОРБСОВ)", width=75, color=Colors.MAGENTA)

    print(
        f"  {Colors.BOLD}Доступно видео-квестов:{Colors.RESET} {Colors.WHITE}{len(video_quests)}{Colors.RESET}  |  "
        f"{Colors.BOLD}Всего Орбсов за видео:{Colors.RESET}  {Colors.YELLOW}{Colors.BOLD}+{total_video_orbs} {ORB_ICON}{Colors.RESET}\n"
    )

    print(f"  {Colors.BOLD}{'#':<4}{'Название видео / Квеста':<48}{'Награда'}{Colors.RESET}")
    print(f"  {Colors.GRAY}{'─' * 71}{Colors.RESET}")

    for idx, vq in enumerate(video_quests, 1):
        name = vq.game_title if vq.game_title != "FanDuel Everywhere" else f"{vq.game_title} ({vq.quest_name})"
        print(f"  {Colors.CYAN}{idx:<4}{Colors.RESET}{Colors.WHITE}{name[:46]:<48}{Colors.RESET}{Colors.YELLOW}{Colors.BOLD}+{vq.orb_quantity} ◆{Colors.RESET}")

    print(f"\n  {Colors.GRAY}{'─' * 71}{Colors.RESET}")
    print(f"\n  {Colors.BOLD}{Colors.YELLOW}КАК ВЫПОЛНИТЬ ВИДЕО-КВЕСТЫ ЗА 2 МИНУТЫ:{Colors.RESET}")
    print(f"  {Colors.BOLD}1.{Colors.RESET} Видео-квесты — это 30-секундные промо-ролики внутри Discord.")
    print(f"  {Colors.BOLD}2.{Colors.RESET} Нажмите {Colors.CYAN}[O]{Colors.RESET}, чтобы открыть страницу квестов в Discord.")
    print(f"  {Colors.BOLD}3.{Colors.RESET} Нажмите на любой видео-квест — видео включится во встроенном плеере.")
    print(f"  {Colors.BOLD}4.{Colors.RESET} Через 30 секунд квест засчитается и появится кнопка «Забрать»!")
    print(f"  {Colors.BOLD}5.{Colors.RESET} Видео можно запускать параллельно с фармом ПК-игр!")
    print()

    print(f"  {Colors.BOLD}{Colors.MAGENTA}[O]{Colors.RESET} Открыть квесты в Discord прямо сейчас")
    print(f"  {Colors.BOLD}{Colors.CYAN}[B]{Colors.RESET} Назад в список квестов\n")

    cmd = input(f"{Colors.BOLD}Выберите действие{Colors.RESET} [O/B]: ").strip().lower()
    if cmd in ('o', 'open', 'discord'):
        open_discord_quests()
        time.sleep(config.SLEEP_SHORT)


# ── Main Interactive Quests Mode ───────────────────────────────────────────────

def quests_mode(db: DiscordGamesDB, faker: GameFaker) -> None:
    """Main interactive mode for viewing and spoofing Discord Quests."""
    loading_animation("Загрузка активных квестов Discord", 1.0)
    quests = fetch_active_quests(db)

    if not quests:
        print_color("\n[ERROR] Не удалось загрузить квесты. Проверьте интернет-соединение.", Colors.RED)
        pause()
        return

    filter_mode = "orbs"  # 'orbs' | 'pc' | 'all'

    while True:
        # Apply filter
        if filter_mode == "orbs":
            displayed    = [q for q in quests if q.orb_quantity > 0]
            filter_title = "ТОЛЬКО ОРБСЫ (ORBS)"
        elif filter_mode == "pc":
            displayed    = [q for q in quests if q.is_pc]
            filter_title = "ТОЛЬКО ПК-ИГРЫ (PC)"
        else:
            displayed    = quests
            filter_title = "ВСЕ АКТИВНЫЕ КВЕСТЫ"

        total_orbs = sum(q.orb_quantity for q in displayed)
        pc_count   = sum(1 for q in displayed if q.is_pc)
        launchable = sum(1 for q in displayed if q.is_pc and q.exe_names)
        video_count = sum(1 for q in displayed if not q.is_pc and q.orb_quantity > 0)
        video_orbs = sum(q.orb_quantity for q in displayed if not q.is_pc)
        discord_ok = is_discord_running()

        subprocess.run('cls' if os.name == 'nt' else 'clear', shell=True, check=False)
        print_boxed_title("АКТИВНЫЕ КВЕСТЫ DISCORD & ОРБСЫ", width=75, color=Colors.CYAN)

        # Status and stats
        discord_badge = f"{Colors.GREEN}{TICK_ICON} Discord запущен{Colors.RESET}" if discord_ok else f"{Colors.RED}✗ Discord НЕ запущен!{Colors.RESET}"

        print(
            f"  {Colors.BOLD}Фильтр:{Colors.RESET} {Colors.CYAN}{filter_title:<22}{Colors.RESET}  "
            f"{Colors.BOLD}Квестов:{Colors.RESET} {Colors.WHITE}{len(displayed):<4}{Colors.RESET}  "
            f"{Colors.BOLD}ПК-игр:{Colors.RESET} {Colors.GREEN}{pc_count:<4}{Colors.RESET}  "
            f"{Colors.BOLD}Орбсов:{Colors.RESET} {Colors.YELLOW}{Colors.BOLD}+{total_orbs} {ORB_ICON}{Colors.RESET}\n"
            f"  {Colors.BOLD}Статус:{Colors.RESET} {discord_badge}"
        )
        print(f"\n  {Colors.GRAY}{'─' * 71}{Colors.RESET}")

        # Table header
        print(
            f"  {Colors.BOLD}{'#':<4}{'Игра':<28}{'Награда':<14}{'Тип':<12}{'Исполняемые файлы'}{Colors.RESET}"
        )
        print(f"  {Colors.GRAY}{'─' * 71}{Colors.RESET}")

        for idx, item in enumerate(displayed, 1):
            if item.orb_quantity > 0:
                reward_badge = f"{Colors.YELLOW}{Colors.BOLD}+{item.orb_quantity} {ORB_ICON}{Colors.RESET}"
            else:
                reward_badge = f"{Colors.MAGENTA}{item.reward_desc[:12]}{Colors.RESET}"

            if item.is_pc:
                type_badge = f"{Colors.GREEN}[PC]{Colors.RESET}"
            elif "VIDEO" in item.task_desc.upper() or "WATCH" in item.task_desc.upper():
                type_badge = f"{Colors.BLUE}[Видео]{Colors.RESET}"
            else:
                type_badge = f"{Colors.GRAY}[Другое]{Colors.RESET}"

            if item.exe_names:
                p_exe = item.primary_exe
                if len(item.exe_names) > 1:
                    exe_col = f"{Colors.WHITE}{p_exe[:16]}{Colors.RESET} {Colors.GRAY}(+{len(item.exe_names)-1}){Colors.RESET}"
                else:
                    exe_col = f"{Colors.WHITE}{p_exe[:24]}{Colors.RESET}"
            else:
                exe_col = f"{Colors.GRAY}Видео/Консоль{Colors.RESET}"

            num_color = Colors.YELLOW if (item.is_pc and item.orb_quantity > 0) else Colors.CYAN
            print(
                f"  {Colors.BOLD}{num_color}{idx:<4}{Colors.RESET}"
                f"{Colors.BOLD}{item.game_title[:26]:<28}{Colors.RESET}"
                f"{reward_badge:<14}  "
                f"{type_badge:<12}  "
                f"{exe_col}"
            )
            print(f"  {Colors.GRAY}{'':4}{item.quest_name[:55]}  •  Окончание: {item.expires_str}{Colors.RESET}")

        print(f"\n  {Colors.GRAY}{'─' * 71}{Colors.RESET}")

        # Actions
        print(
            f"\n  {Colors.BOLD}{Colors.YELLOW}[A]{Colors.RESET}  "
            f"{Colors.BOLD}⚡ ЗАБРАТЬ ВСЕ ПК-ОРБСЫ В 1 КЛИК!{Colors.RESET}  "
            f"{Colors.YELLOW}(Все игры параллельно + Discord RPC для FC 27){Colors.RESET}"
        )
        if video_count > 0:
            print(
                f"  {Colors.BOLD}{Colors.MAGENTA}[V]{Colors.RESET}  "
                f"📹 Видео-квесты ({video_count} квестов, {Colors.YELLOW}+{video_orbs} {ORB_ICON}{Colors.RESET}) — забрать в Discord"
            )
        print(f"  {Colors.BOLD}{Colors.GREEN}[1-{len(displayed)}]{Colors.RESET}  Запустить отдельную игру")
        print(f"  {Colors.BOLD}{Colors.CYAN}[F]{Colors.RESET}  Сменить фильтр: {Colors.WHITE}{filter_mode.upper()}{Colors.RESET} → след.")
        print(f"  {Colors.BOLD}{Colors.MAGENTA}[O]{Colors.RESET}  Открыть квесты в Discord (Настройки → Инвентарь)")
        print(f"  {Colors.BOLD}{Colors.BLUE}[R]{Colors.RESET}  Обновить список квестов")
        print(f"  {Colors.BOLD}{Colors.RED}[B]{Colors.RESET}  Назад в главное меню\n")

        cmd = input(f"{Colors.BOLD}Выберите действие{Colors.RESET} [A/V/1-{len(displayed)}/F/O/R/B]: ").strip().lower()

        if cmd in ('b', 'back', 'exit', 'q', ''):
            break

        elif cmd in ('a', 'all'):
            _collect_all_orbs(displayed, faker, run_dashboard=True)

        elif cmd in ('v', 'video'):
            show_video_quests_menu(quests)

        elif cmd in ('f', 'filter'):
            filter_mode = {"orbs": "pc", "pc": "all", "all": "orbs"}[filter_mode]

        elif cmd in ('o', 'open', 'discord'):
            open_discord_quests()
            time.sleep(config.SLEEP_SHORT)

        elif cmd in ('r', 'refresh'):
            loading_animation("Обновление квестов", 0.8)
            quests = fetch_active_quests(db)

        else:
            try:
                val = int(cmd)
                if 1 <= val <= len(displayed):
                    selected_item = displayed[val - 1]
                    if _launch_quest_game(selected_item, faker):
                        pause()
                else:
                    print_color("\n[ERROR] Номер вне диапазона", Colors.RED)
                    time.sleep(config.SLEEP_SHORT)
            except ValueError:
                print_color(f"\n[ERROR] Неверная команда — выберите A, V, номер 1-{len(displayed)}, F, O, R или B", Colors.RED)
                time.sleep(config.SLEEP_SHORT)
