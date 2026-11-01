"""
ui.py – Terminal UI helpers: colors, banners, animations, menus, credits.
"""

import os
import sys
import time

from . import config

_vt_enabled = False


def enable_vt() -> None:
    """Enable ANSI/VT escape processing on legacy Windows consoles."""
    global _vt_enabled
    if _vt_enabled:
        return
    _vt_enabled = True
    if sys.platform == 'win32':
        try:
            import ctypes
            kernel32 = ctypes.windll.kernel32
            handle = kernel32.GetStdHandle(-11)
            mode = ctypes.c_uint32()
            if kernel32.GetConsoleMode(handle, ctypes.byref(mode)):
                kernel32.SetConsoleMode(handle, mode.value | 0x0004)
        except Exception:
            os.system("")


class Colors:
    RESET   = '\033[0m'
    BOLD    = '\033[1m'
    RED     = '\033[91m'
    GREEN   = '\033[92m'
    YELLOW  = '\033[93m'
    BLUE    = '\033[94m'
    MAGENTA = '\033[95m'
    CYAN    = '\033[96m'
    WHITE   = '\033[97m'
    GRAY    = '\033[90m'


def print_color(text: str, color: str = Colors.WHITE, bold: bool = False) -> None:
    """Print colored text."""
    enable_vt()
    style = Colors.BOLD if bold else ''
    print(f"{style}{color}{text}{Colors.RESET}")


def pause(prompt: str = "Нажмите Enter, чтобы продолжить...") -> None:
    """Wait for Enter; Ctrl+C/EOF return to the caller instead of killing the app."""
    try:
        input(f"\n{Colors.GRAY}{prompt}{Colors.RESET}")
    except (EOFError, KeyboardInterrupt):
        pass


def print_boxed_title(title: str, width: int = 50, color: str = Colors.CYAN) -> None:
    """Print a boxed title with ASCII borders."""
    enable_vt()
    inner = max(1, width - 2)
    title = title[: inner - 2]
    border = f"{Colors.BOLD}{color}{'+' + '-' * inner + '+'}{Colors.RESET}"
    title_padding = max(0, (width - len(title) - 4) // 2)
    extra_space = max(0, (width - len(title) - 4) % 2)
    title_line = (
        f"{Colors.BOLD}{color}|{Colors.RESET}"
        f"{' ' * title_padding}{Colors.BOLD}{title}{Colors.RESET}"
        f"{' ' * (title_padding + extra_space)}"
        f"{Colors.BOLD}{color}|{Colors.RESET}"
    )
    print(f"\n{border}")
    print(title_line)
    print(f"{border}\n")


def print_banner() -> None:
    """Display ASCII banner."""
    banner = f"""
{Colors.CYAN}{Colors.BOLD}
                                                                
 _____ _____ _____ _____    _____ _____ _____ _____ _____ _____ 
|     | __  | __  |   __|  |  |  |  _  |     |  |  |   __| __  |
|  |  |    -| __ -|__   |  |     |     |   --|    -|   __|    -|
|_____|__|__|_____|_____|  |__|__|__|__|_____|__|__|_____|__|__|
                                                                
{Colors.RESET}
    {Colors.GRAY}Разработчики:{Colors.RESET} {Colors.CYAN}{config.DEVELOPER}{Colors.RESET}
    {Colors.GRAY}Версия:{Colors.RESET}       {Colors.WHITE}v{config.VERSION}{Colors.RESET}
    {Colors.GRAY}База данных:{Colors.RESET}   {Colors.GREEN}Discord Official API + GitHub Archive + Live Quests{Colors.RESET}
"""
    print(banner)


def loading_animation(text: str, duration: float = 1.5) -> None:
    """Display loading animation."""
    frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]
    ascii_frames = ["|", "/", "-", "\\"]
    end_time = time.time() + duration
    i = 0
    while time.time() < end_time:
        try:
            sys.stdout.write(f"\r{Colors.CYAN}{frames[i % len(frames)]}{Colors.RESET} {text}...")
            sys.stdout.flush()
        except UnicodeEncodeError:
            try:
                sys.stdout.write(f"\r{Colors.CYAN}{ascii_frames[i % len(ascii_frames)]}{Colors.RESET} {text}...")
                sys.stdout.flush()
            except Exception:
                pass
        except Exception:
            pass
        time.sleep(0.1)
        i += 1
    try:
        sys.stdout.write("\r" + " " * (len(text) + 8) + "\r")
        sys.stdout.flush()
    except Exception:
        pass


def ask_confirm(prompt: str = "Создать и запустить?") -> bool:
    """Ask a Y/n confirmation question. Returns True if user confirms."""
    answer = input(f"\n{Colors.BOLD}{prompt}{Colors.RESET} [Y/n]: ").strip().lower()
    return answer in ('', 'y', 'yes', 'д', 'да')


def print_menu() -> None:
    """Display main menu."""
    print_boxed_title("ГЛАВНОЕ МЕНЮ", width=62, color=Colors.CYAN)
    print(f"  {Colors.BOLD}{Colors.GREEN}1.{Colors.RESET} Поиск по базе Discord (Официальный API)")
    print(f"  {Colors.BOLD}{Colors.GREEN}2.{Colors.RESET} Ручной режим (указать имя EXE)")
    print(f"  {Colors.BOLD}{Colors.YELLOW}3.{Colors.RESET} Steam Quest Mode  {Colors.YELLOW}[для Marathon, Toxic Commando…]{Colors.RESET}")
    print(f"  {Colors.BOLD}{Colors.YELLOW}4.{Colors.RESET} {Colors.BOLD}Discord Quests & Orbs Collector{Colors.RESET}  {Colors.YELLOW}[HOT - Забрать ВСЕ Орбсы в 1 клик!]{Colors.RESET}")
    print(f"  {Colors.BOLD}{Colors.CYAN}5.{Colors.RESET} Информация & О программе")
    print(f"  {Colors.BOLD}{Colors.RED}6.{Colors.RESET} Выход\n")


def show_credits() -> None:
    """Display credits."""
    print_boxed_title("ИНФОРМАЦИЯ & О ПРОГРАММЕ", width=68, color=Colors.CYAN)
    credits_text = f"""
    {Colors.BOLD}Разработчики:{Colors.RESET} {Colors.CYAN}{config.DEVELOPER}{Colors.RESET}
    {Colors.BOLD}Версия:{Colors.RESET}       {Colors.WHITE}v{config.VERSION}{Colors.RESET}

    {Colors.BOLD}Принцип работы (Спуфинг игровых процессов):{Colors.RESET}
    1. Подключается к официальному API Discord и получает список игр
    2. Находит точное имя процесса (EXE), которое ожидает Discord
    3. Создаёт лёгкий процесс с нужным именем в папке Desktop/Win64/
    4. Discord сканирует запущенные процессы в Windows и видит игру
    5. Discord засчитывает время в квестах так, как будто игра реально идёт
    
    {Colors.BOLD}{Colors.YELLOW}⚡ Коллектор Орбсов Discord (Пункт 4):{Colors.RESET}
    • В реальном времени получает список всех действующих квестов
    • Показывает награды в Орбсах (Discord Orbs) и ПК-игры
    • Позволяет запустить ВСЕ игры одновременно в 1 клик ([A])!
    • Встроенный живой дашборд с таймером на 15 минут и прогресс-баром
    • После завершения таймера вы получаете все Орбсы в Discord!
    
    {Colors.BOLD}Steam Quest Mode (Пункт 3):{Colors.RESET}
    Некоторые квесты требуют наличия игры в Steam. Режим Steam Quest
    генерирует манифест appmanifest.acf в папке Steam и обходит проверку.
    
    {Colors.BOLD}Источники данных:{Colors.RESET}
    • Primary: Discord Official API
    • Backup:  GitHub Archive by Cynosphere
    • Quests:  Discord API Tracker (Live)
    
    {Colors.BOLD}Полезные советы:{Colors.RESET}
    • Discord обязательно должен быть запущен во время фарма!
    • В Discord не забудьте нажать «Принять квест» (Accept Quest)!
    • Все процессы автоматически завершаются через 15 минут.
    
    {Colors.BOLD}{Colors.RED}ВНИМАНИЕ:{Colors.RESET} Программа создана в образовательных целях.
    Используйте на свой страх и риск.
"""
    print(credits_text)
    pause("Нажмите Enter, чтобы вернуться в меню...")
