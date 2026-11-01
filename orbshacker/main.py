"""
main.py – Application entry point and main loop.
"""

import os
import subprocess
import sys
import time

from . import config
from .discord_db import DiscordGamesDB, database_mode
from .errors import DatabaseLoadError
from .faker import GameFaker, manual_mode
from .steam import steam_quest_mode
from .i18n import init_language_from_config, t
from .quests import quests_mode
from .ui import Colors, language_menu, print_banner, print_color, print_menu, show_credits
from .updater import auto_update


def main() -> None:
    """Main application loop."""
    try:
        auto_update()
    except Exception:
        pass

    config.ensure_user_settings()
    init_language_from_config(getattr(config, "LANGUAGE", "auto"))

    print_banner()
    print_color(t("init_app"), Colors.CYAN)
    print_color(t("connecting_discord"), Colors.GRAY)

    try:
        db = DiscordGamesDB()
    except DatabaseLoadError as e:
        print_color(f"[ERROR] {e}", Colors.RED, bold=True)
        sys.exit(1)

    faker = GameFaker()
    print_color(t("ready"), Colors.GREEN)
    time.sleep(0.5)

    try:
        while True:
            try:
                subprocess.run(
                    'cls' if os.name == 'nt' else 'clear',
                    shell=True,
                    check=False,
                )
                print_banner()

                if db.source:
                    print_color(f"   " + t("active_db", source=db.source, count=len(db.games)), Colors.GRAY)

                print_menu()
                choice = input(f"{Colors.BOLD}{t('select_option')}{Colors.RESET} [1-7]: ").strip().lower()

                if choice == '1':
                    database_mode(db, faker)
                elif choice == '2':
                    manual_mode(faker)
                elif choice == '3':
                    steam_quest_mode(faker)
                elif choice == '4':
                    quests_mode(db, faker)
                elif choice == '5':
                    show_credits()
                elif choice in ('6', 'l', 'lang'):
                    language_menu()
                elif choice in ('7', 'q', 'exit'):
                    print_color(f"\n[*] {t('thanks')}", Colors.CYAN, bold=True)
                    print_color(f"[*] {t('dev_label')} {config.DEVELOPER}", Colors.GRAY)
                    print_color(f"\n[*] {t('wish_orbs')}", Colors.MAGENTA)
                    break
                else:
                    print_color(f"\n[ERROR] {t('invalid_option', max_opt=7)}", Colors.RED)
                    time.sleep(config.SLEEP_SHORT)

            except (KeyboardInterrupt, EOFError):
                print_color(f"\n\n[!] {t('interrupted')}", Colors.YELLOW)
                print_color(f"[*] {t('thanks')}\n", Colors.CYAN)
                break
    finally:
        faker.cleanup()
