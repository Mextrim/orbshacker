"""
i18n.py – Internationalization and multilingual support for orbshacker.

Supported languages:
- en: English
- ru: Русский (Russian)
- es: Español (Spanish)
- pt: Português (Portuguese)
- de: Deutsch (German)
- fr: Français (French)
"""

import json
import locale
import os
import sys
from pathlib import Path
from typing import Any

LANGUAGES: dict[str, str] = {
    "en": "English",
    "ru": "Русский",
    "es": "Español",
    "pt": "Português",
    "de": "Deutsch",
    "fr": "Français",
}

DEFAULT_LANGUAGE = "en"
_current_language = DEFAULT_LANGUAGE

TRANSLATIONS: dict[str, dict[str, str]] = {
    "en": {
        # App banner & meta
        "dev_label": "Developers:",
        "ver_label": "Version:",
        "db_label": "Database:",
        "db_desc": "Discord Official API + GitHub Archive + Live Quests",
        "init_app": "Initializing orbshacker...",
        "connecting_discord": "[*] Connecting to Discord API...",
        "ready": "[OK] Ready to fake some games!",
        "active_db": "Active Database: {source} ({count} games)",
        "interrupted": "Interrupted by user",
        "thanks": "Thanks for using orbshacker!",
        "wish_orbs": "May your orbs be plentiful!",
        "invalid_option": "Invalid option - try 1 to {max_opt}",
        # Menu options
        "menu_title": "MAIN MENU",
        "opt_database": "Search Discord Database (Official API)",
        "opt_manual": "Manual Mode (specify process name)",
        "opt_steam": "Steam Quest Mode (for games requiring Steam)",
        "opt_quests": "Discord Quests & Orbs Collector [Collect ALL Orbs in 1 click!]",
        "opt_credits": "Info & About",
        "opt_language": "Language / Язык / Idioma",
        "opt_exit": "Exit",
        "select_option": "Select option",
        # Common prompts
        "confirm_prompt": "Create and launch?",
        "press_enter": "Press Enter to continue...",
        "press_enter_menu": "Press Enter to return to menu...",
        "operation_cancelled": "Operation cancelled.",
        "error_prefix": "[ERROR]",
        # Database mode
        "db_title": "DISCORD DATABASE SEARCH",
        "db_total_avail": "Total games available: {count}",
        "db_search_hint": "Search by name or abbreviation (PUBG, Fortnite, LoL, CSGO...)",
        "db_search_prompt": "Search (or 'back'): ",
        "db_no_games": "No games found for '{query}'",
        "db_try_diff": "Try a different search term or abbreviation",
        "db_found_games": "Found {count} game(s):",
        "db_select_num": "Select [1-{count}] (or 'back'): ",
        "db_valid_num": "Enter a valid number",
        "db_no_exe": "No {os_name} executable found for this game",
        "db_no_exe_data": "This game might not have a {os_name} version or executable data",
        "db_enter_manual": "Enter executable name manually?",
        "db_exe_name": "Executable name: ",
        # Manual mode
        "manual_title": "MANUAL MODE",
        "manual_desc": "Enter the exact process name Discord expects",
        "manual_examples": "Examples: TslGame.exe (PUBG), League of Legends.exe, Overwatch.exe",
        "manual_prompt": "Executable name (or 'back'): ",
        "manual_summary": "Summary:",
        "manual_setup_done": "Setup complete!",
        # Process launch
        "creating_fake": "Creating {name}",
        "created_fake": "Created: {path}",
        "launching_proc": "Launching process",
        "proc_launched_bg": "Process launched in background",
        "discord_will_detect": "Discord should now detect the game (if Discord is running)",
        "discord_must_run": "IMPORTANT: Discord MUST be running for spoofing to work",
        "discord_scan_wait": "Wait a few seconds for Discord to scan processes",
        "tip_multi": "TIP: Use the menu again to emulate multiple games at once!",
        "failed_create": "Failed to create executable: {err}",
        "check_perms": "Check file permissions or disk space",
        "failed_launch": "Failed to auto-launch: {err}",
        # Steam mode
        "steam_title": "STEAM QUEST MODE",
        "steam_desc": "For games that require an active Steam download/manifest",
        "steam_not_found": "Steam installation not found on your system",
        "steam_search_prompt": "Search Steam game (or 'back'): ",
        "steam_manifest_ok": "Manifest appmanifest_{appid}.acf created successfully!",
        # Quests & Orbs Collector
        "quests_title": "DISCORD QUESTS & ORBS COLLECTOR",
        "quests_fetching": "Fetching active Discord quests...",
        "quests_empty": "No active quests found at the moment.",
        "quests_discord_detected": "Running and detected",
        "quests_discord_not_running": "NOT running! (Start Discord before launching)",
        "quests_open_tab": "Opening Gift Inventory / Quests in Discord...",
        "quests_rpc_active": "Local Discord RPC active for EA SPORTS FC 27 (App ID: 1531874756096295054)",
        "quests_collect_all_title": "COLLECT ALL ORBS",
        "quests_count_label": "Quests to farm:",
        "quests_total_orbs": "Total Orbs:",
        "quests_procs_count": "Game processes:",
        "quests_session_time": "Session duration:",
        "quests_discord_status": "Discord status:",
        "quests_minutes": "{mins} minutes",
        "quests_parallel_note": "All processes run in parallel and are guaranteed to be detected by Discord!",
        "quests_accept_note": "Make sure you clicked 'Accept Quest' in Discord before farming.",
        "quests_confirm_all": "Launch all games and start farming Orbs?",
        "quests_launching_all": "Launching fake game processes in parallel...",
        "quests_success_count": "Successfully launched {ok}/{total} processes! Discord is scanning games...",
        "dash_title": "DISCORD ORBS FARMING SESSION",
        "dash_progress": "Progress:",
        "dash_elapsed": "Elapsed:",
        "dash_remaining": "Remaining:",
        "dash_running": "Running processes:",
        "dash_col_game": "Game",
        "dash_col_exe": "Executable",
        "dash_col_orbs": "Orbs",
        "dash_col_status": "Status",
        "dash_hotkeys": "[M] / [Enter] Minimize to background    [Q] Stop session    [O] Open Discord Quests",
        "dash_backgrounded": "Session continuing in background! Returning to menu...",
        "dash_stopped": "Session stopped by user.",
        "dash_completed": "Session complete! Claim your Orbs in Discord!",
        "dash_claim_button": "Open Discord and click 'Claim Reward' in the Gift Inventory!",
        # Language menu
        "lang_title": "LANGUAGE SELECTION / ВЫБОР ЯЗЫКА",
        "lang_current": "Current language: {lang}",
        "lang_select": "Choose a language [1-{count}] (or 'back'): ",
        "lang_changed": "Language changed to {lang}!",
        # Auto-delete
        "cleanup_notice": "AUTO_DELETE enabled. Cleaning up faked processes and files...",
        "cleanup_complete": "Cleanup complete!",
    },
    "ru": {
        # App banner & meta
        "dev_label": "Разработчики:",
        "ver_label": "Версия:",
        "db_label": "База данных:",
        "db_desc": "Discord Official API + GitHub Archive + Live Quests",
        "init_app": "Инициализация orbshacker...",
        "connecting_discord": "[*] Подключение к Discord API...",
        "ready": "[OK] Готов к спуфингу игр!",
        "active_db": "Активная база: {source} ({count} игр)",
        "interrupted": "Прервано пользователем",
        "thanks": "Спасибо за использование orbshacker!",
        "wish_orbs": "Пусть ваши Орбсы приумножаются!",
        "invalid_option": "Неверный пункт - выберите от 1 до {max_opt}",
        # Menu options
        "menu_title": "ГЛАВНОЕ МЕНЮ",
        "opt_database": "Поиск по базе Discord (Официальный API)",
        "opt_manual": "Ручной режим (указать имя процесса)",
        "opt_steam": "Steam Quest Mode (для игр требующих Steam)",
        "opt_quests": "Discord Quests & Orbs Collector [Забрать ВСЕ Орбсы в 1 клик!]",
        "opt_credits": "Информация & О программе",
        "opt_language": "Язык / Language / Idioma",
        "opt_exit": "Выход",
        "select_option": "Выберите действие",
        # Common prompts
        "confirm_prompt": "Создать и запустить?",
        "press_enter": "Нажмите Enter, чтобы продолжить...",
        "press_enter_menu": "Нажмите Enter, чтобы вернуться в меню...",
        "operation_cancelled": "Операция отменена.",
        "error_prefix": "[ОШИБКА]",
        # Database mode
        "db_title": "ПОИСК ПО БАЗЕ DISCORD",
        "db_total_avail": "Всего игр доступно: {count}",
        "db_search_hint": "Поиск по названию или аббревиатуре (PUBG, Fortnite, LoL, CSGO...)",
        "db_search_prompt": "Поиск (или 'back'): ",
        "db_no_games": "Игры по запросу '{query}' не найдены",
        "db_try_diff": "Попробуйте другое название или аббревиатуру",
        "db_found_games": "Найдено {count} игр:",
        "db_select_num": "Выберите [1-{count}] (или 'back'): ",
        "db_valid_num": "Введите корректное число",
        "db_no_exe": "Не найден исполняемый файл {os_name} для этой игры",
        "db_no_exe_data": "У этой игры может отсутствовать версия для {os_name}",
        "db_enter_manual": "Ввести имя исполняемого файла вручную?",
        "db_exe_name": "Имя файла: ",
        # Manual mode
        "manual_title": "РУЧНОЙ РЕЖИМ",
        "manual_desc": "Введите точное имя процесса, которое ожидает Discord",
        "manual_examples": "Примеры: TslGame.exe (PUBG), League of Legends.exe, Overwatch.exe",
        "manual_prompt": "Имя исполняемого файла (или 'back'): ",
        "manual_summary": "Сводка:",
        "manual_setup_done": "Настройка завершена!",
        # Process launch
        "creating_fake": "Создание {name}",
        "created_fake": "Создано: {path}",
        "launching_proc": "Запуск процесса",
        "proc_launched_bg": "Процесс запущен в фоновом режиме",
        "discord_will_detect": "Discord теперь видит игру (если Discord запущен)",
        "discord_must_run": "ВАЖНО: Discord ОБЯЗАТЕЛЬНО должен быть запущен для спуфинга",
        "discord_scan_wait": "Подождите несколько секунд, пока Discord просканирует процессы",
        "tip_multi": "СОВЕТ: Используйте меню повторно для эмуляции нескольких игр одновременно!",
        "failed_create": "Не удалось создать файл: {err}",
        "check_perms": "Проверьте права доступа или свободное место на диске",
        "failed_launch": "Ошибка автозапуска: {err}",
        # Steam mode
        "steam_title": "STEAM QUEST MODE",
        "steam_desc": "Для игр, требующих активного манифеста загрузки Steam",
        "steam_not_found": "Установка Steam не найдена в вашей системе",
        "steam_search_prompt": "Поиск игры в Steam (или 'back'): ",
        "steam_manifest_ok": "Манифест appmanifest_{appid}.acf успешно создан!",
        # Quests & Orbs Collector
        "quests_title": "DISCORD QUESTS & ORBS COLLECTOR",
        "quests_fetching": "Получение списка активных квестов Discord...",
        "quests_empty": "Нет доступных квестов на данный момент.",
        "quests_discord_detected": "Запущен и обнаружен",
        "quests_discord_not_running": "НЕ запущен! (Запустите Discord перед стартом)",
        "quests_open_tab": "Открываем вкладку квестов в Discord...",
        "quests_rpc_active": "Локальный Discord RPC активен для EA SPORTS FC 27 (App ID: 1531874756096295054)",
        "quests_collect_all_title": "ЗАБРАТЬ ВСЕ ОРБСЫ (COLLECT ALL ORBS)",
        "quests_count_label": "Квестов к фарму:",
        "quests_total_orbs": "Всего Орбсов:",
        "quests_procs_count": "Процессов игры:",
        "quests_session_time": "Время сессии:",
        "quests_minutes": "{mins} минут",
        "quests_parallel_note": "Все процессы запускаются параллельно и гарантированно определяются Discord!",
        "quests_accept_note": "Убедитесь, что вы нажали «Принять квест» (Accept Quest) в Discord.",
        "quests_confirm_all": "Запустить все игры и начать фарм Орбсов?",
        "quests_launching_all": "Запускаем фейковые процессы игр...",
        "quests_success_count": "Успешно запущено {ok}/{total} процессов! Discord сканирует игры...",
        "dash_title": "СЕССИЯ ФАРМА ОРБСОВ DISCORD",
        "dash_progress": "Прогресс:",
        "dash_elapsed": "Прошло:",
        "dash_remaining": "Осталось:",
        "dash_running": "Процессов в работе:",
        "dash_col_game": "Игра",
        "dash_col_exe": "Исполняемый файл",
        "dash_col_orbs": "Орбсы",
        "dash_col_status": "Статус",
        "dash_hotkeys": "[M] / [Enter] Свернуть в фон и вернуться в меню    [Q] Прервать сессию    [O] Открыть квесты",
        "dash_backgrounded": "Сессия продолжается в фоне! Возврат в меню...",
        "dash_stopped": "Сессия остановлена пользователем.",
        "dash_completed": "Фарм завершён! Заберите ваши Орбсы в Discord!",
        "dash_claim_button": "Откройте Discord и нажмите «Забрать награду» в Инвентаре подарков!",
        # Language menu
        "lang_title": "ВЫБОР ЯЗЫКА / LANGUAGE SELECTION",
        "lang_current": "Текущий язык: {lang}",
        "lang_select": "Выберите язык [1-{count}] (или 'back'): ",
        "lang_changed": "Язык успешно изменён на {lang}!",
        # Auto-delete
        "cleanup_notice": "AUTO_DELETE активен. Очистка созданных процессов и файлов...",
        "cleanup_complete": "Очистка завершена!",
    },
    "es": {
        # App banner & meta
        "dev_label": "Desarrolladores:",
        "ver_label": "Versión:",
        "db_label": "Base de datos:",
        "db_desc": "Discord Official API + GitHub Archive + Live Quests",
        "init_app": "Inicializando orbshacker...",
        "connecting_discord": "[*] Conectando a la API de Discord...",
        "ready": "[OK] ¡Listo para emular juegos!",
        "active_db": "Base de datos activa: {source} ({count} juegos)",
        "interrupted": "Interrumpido por el usuario",
        "thanks": "¡Gracias por usar orbshacker!",
        "wish_orbs": "¡Que tus Orbes se multipliquen!",
        "invalid_option": "Opción no válida - elija de 1 a {max_opt}",
        # Menu options
        "menu_title": "MENÚ PRINCIPAL",
        "opt_database": "Buscar en base de datos de Discord (API oficial)",
        "opt_manual": "Modo manual (especificar nombre de proceso)",
        "opt_steam": "Steam Quest Mode (para juegos que requieren Steam)",
        "opt_quests": "Discord Quests & Orbs Collector [¡Reclamar TODOS los Orbes en 1 clic!]",
        "opt_credits": "Información y créditos",
        "opt_language": "Idioma / Language / Язык",
        "opt_exit": "Salir",
        "select_option": "Seleccione una opción",
        # Common prompts
        "confirm_prompt": "¿Crear e iniciar?",
        "press_enter": "Presione Enter para continuar...",
        "press_enter_menu": "Presione Enter para volver al menú...",
        "operation_cancelled": "Operación cancelada.",
        "error_prefix": "[ERROR]",
        # Database mode
        "db_title": "BÚSQUEDA EN BASE DE DATOS DE DISCORD",
        "db_total_avail": "Total de juegos disponibles: {count}",
        "db_search_hint": "Buscar por nombre o abreviatura (PUBG, Fortnite, LoL, CSGO...)",
        "db_search_prompt": "Buscar (o 'back'): ",
        "db_no_games": "No se encontraron juegos para '{query}'",
        "db_try_diff": "Pruebe con otro término o abreviatura",
        "db_found_games": "Se encontraron {count} juego(s):",
        "db_select_num": "Seleccione [1-{count}] (o 'back'): ",
        "db_valid_num": "Ingrese un número válido",
        "db_no_exe": "No se encontró ejecutable {os_name} para este juego",
        "db_no_exe_data": "Este juego puede no tener versión para {os_name}",
        "db_enter_manual": "¿Ingresar el nombre del ejecutable manualmente?",
        "db_exe_name": "Nombre del archivo: ",
        # Manual mode
        "manual_title": "MODO MANUAL",
        "manual_desc": "Ingrese el nombre exacto del proceso que Discord espera",
        "manual_examples": "Ejemplos: TslGame.exe (PUBG), League of Legends.exe, Overwatch.exe",
        "manual_prompt": "Nombre del ejecutable (o 'back'): ",
        "manual_summary": "Resumen:",
        "manual_setup_done": "¡Configuración completa!",
        # Process launch
        "creating_fake": "Creando {name}",
        "created_fake": "Creado: {path}",
        "launching_proc": "Iniciando proceso",
        "proc_launched_bg": "Proceso iniciado en segundo plano",
        "discord_will_detect": "Discord debería detectar el juego (si Discord está abierto)",
        "discord_must_run": "IMPORTANTE: Discord DEBE estar en ejecución para emular",
        "discord_scan_wait": "Espere unos segundos mientras Discord escanea los procesos",
        "tip_multi": "CONSEJO: ¡Use el menú nuevamente para emular varios juegos a la vez!",
        "failed_create": "Error al crear ejecutable: {err}",
        "check_perms": "Verifique permisos de archivo o espacio en disco",
        "failed_launch": "Error al iniciar automáticamente: {err}",
        # Steam mode
        "steam_title": "STEAM QUEST MODE",
        "steam_desc": "Para juegos que requieren un manifiesto de descarga activo de Steam",
        "steam_not_found": "No se encontró instalación de Steam en su sistema",
        "steam_search_prompt": "Buscar juego de Steam (o 'back'): ",
        "steam_manifest_ok": "¡Manifiesto appmanifest_{appid}.acf creado con éxito!",
        # Quests & Orbs Collector
        "quests_title": "DISCORD QUESTS & ORBS COLLECTOR",
        "quests_fetching": "Obteniendo misiones activas de Discord...",
        "quests_empty": "No hay misiones activas en este momento.",
        "quests_discord_detected": "En ejecución y detectado",
        "quests_discord_not_running": "¡NO está en ejecución! (Inicie Discord antes de comenzar)",
        "quests_open_tab": "Abriendo pestaña de misiones en Discord...",
        "quests_rpc_active": "Discord RPC local activo para EA SPORTS FC 27 (App ID: 1531874756096295054)",
        "quests_collect_all_title": "RECLAMAR TODOS LOS ORBES (COLLECT ALL ORBS)",
        "quests_count_label": "Misiones a farmear:",
        "quests_total_orbs": "Total de Orbes:",
        "quests_procs_count": "Procesos de juego:",
        "quests_session_time": "Duración de sesión:",
        "quests_minutes": "{mins} minutos",
        "quests_parallel_note": "¡Todos los procesos se inician en paralelo y son detectados por Discord!",
        "quests_accept_note": "Asegúrese de haber hecho clic en 'Aceptar misión' en Discord.",
        "quests_confirm_all": "¿Iniciar todos los juegos y farmear Orbes?",
        "quests_launching_all": "Iniciando procesos de juegos en paralelo...",
        "quests_success_count": "¡Iniciados con éxito {ok}/{total} procesos! Discord está escaneando...",
        "dash_title": "SESIÓN DE FARME DE ORBES DISCORD",
        "dash_progress": "Progreso:",
        "dash_elapsed": "Transcurrido:",
        "dash_remaining": "Restante:",
        "dash_running": "Procesos en curso:",
        "dash_col_game": "Juego",
        "dash_col_exe": "Ejecutable",
        "dash_col_orbs": "Orbes",
        "dash_col_status": "Estado",
        "dash_hotkeys": "[M] / [Enter] Minimizar a segundo plano    [Q] Detener    [O] Abrir misiones",
        "dash_backgrounded": "¡Sesión continúa en segundo plano! Volviendo al menú...",
        "dash_stopped": "Sesión detenida por el usuario.",
        "dash_completed": "¡Farmeo completado! ¡Reclame sus Orbes en Discord!",
        "dash_claim_button": "¡Abra Discord y haga clic en 'Reclamar recompensa' en su inventario!",
        # Language menu
        "lang_title": "SELECCIÓN DE IDIOMA / LANGUAGE SELECTION",
        "lang_current": "Idioma actual: {lang}",
        "lang_select": "Seleccione un idioma [1-{count}] (o 'back'): ",
        "lang_changed": "¡Idioma cambiado a {lang} con éxito!",
        # Auto-delete
        "cleanup_notice": "AUTO_DELETE activo. Limpiando procesos y archivos temporales...",
        "cleanup_complete": "¡Limpieza completada!",
    },
    "pt": {
        # App banner & meta
        "dev_label": "Desenvolvedores:",
        "ver_label": "Versão:",
        "db_label": "Banco de dados:",
        "db_desc": "Discord Official API + GitHub Archive + Live Quests",
        "init_app": "Inicializando orbshacker...",
        "connecting_discord": "[*] Conectando à API do Discord...",
        "ready": "[OK] Pronto para emular jogos!",
        "active_db": "Banco ativo: {source} ({count} jogos)",
        "interrupted": "Interrompido pelo usuário",
        "thanks": "Obrigado por usar o orbshacker!",
        "wish_orbs": "Que seus Orbes se multipliquem!",
        "invalid_option": "Opção inválida - tente de 1 a {max_opt}",
        # Menu options
        "menu_title": "MENU PRINCIPAL",
        "opt_database": "Buscar no Banco do Discord (API Oficial)",
        "opt_manual": "Modo Manual (especificar nome do processo)",
        "opt_steam": "Steam Quest Mode (para jogos que exigem Steam)",
        "opt_quests": "Discord Quests & Orbs Collector [Coletar TODOS os Orbes em 1 clique!]",
        "opt_credits": "Informações & Sobre",
        "opt_language": "Idioma / Language / Язык",
        "opt_exit": "Sair",
        "select_option": "Selecione uma opção",
        # Common prompts
        "confirm_prompt": "Criar e iniciar?",
        "press_enter": "Pressione Enter para continuar...",
        "press_enter_menu": "Pressione Enter para voltar ao menu...",
        "operation_cancelled": "Operação cancelada.",
        "error_prefix": "[ERRO]",
        # Database mode
        "db_title": "BUSCA NO BANCO DO DISCORD",
        "db_total_avail": "Total de jogos disponíveis: {count}",
        "db_search_hint": "Busque por nome ou sigla (PUBG, Fortnite, LoL, CSGO...)",
        "db_search_prompt": "Buscar (ou 'back'): ",
        "db_no_games": "Nenhum jogo encontrado para '{query}'",
        "db_try_diff": "Tente outro termo ou abreviação",
        "db_found_games": "Encontrado(s) {count} jogo(s):",
        "db_select_num": "Selecione [1-{count}] (ou 'back'): ",
        "db_valid_num": "Digite um número válido",
        "db_no_exe": "Nenhum executável {os_name} encontrado para este jogo",
        "db_no_exe_data": "Este jogo pode não ter versão para {os_name}",
        "db_enter_manual": "Digitar nome do executável manualmente?",
        "db_exe_name": "Nome do arquivo: ",
        # Manual mode
        "manual_title": "MODO MANUAL",
        "manual_desc": "Digite o nome exato do processo que o Discord espera",
        "manual_examples": "Exemplos: TslGame.exe (PUBG), League of Legends.exe, Overwatch.exe",
        "manual_prompt": "Nome do executável (ou 'back'): ",
        "manual_summary": "Resumo:",
        "manual_setup_done": "Configuração concluída!",
        # Process launch
        "creating_fake": "Criando {name}",
        "created_fake": "Criado: {path}",
        "launching_proc": "Iniciando processo",
        "proc_launched_bg": "Processo iniciado em segundo plano",
        "discord_will_detect": "O Discord agora deve detectar o jogo (se o Discord estiver aberto)",
        "discord_must_run": "IMPORTANTE: O Discord DEVE estar rodando para a emulação funcionar",
        "discord_scan_wait": "Aguarde alguns segundos para o Discord escanear os processos",
        "tip_multi": "DICA: Use o menu novamente para emular vários jogos ao mesmo tempo!",
        "failed_create": "Falha ao criar executável: {err}",
        "check_perms": "Verifique permissões de arquivo ou espaço em disco",
        "failed_launch": "Falha ao iniciar automaticamente: {err}",
        # Steam mode
        "steam_title": "STEAM QUEST MODE",
        "steam_desc": "Para jogos que requerem manifesto de download ativo da Steam",
        "steam_not_found": "Instalação da Steam não encontrada no seu sistema",
        "steam_search_prompt": "Buscar jogo na Steam (ou 'back'): ",
        "steam_manifest_ok": "Manifesto appmanifest_{appid}.acf criado com sucesso!",
        # Quests & Orbs Collector
        "quests_title": "DISCORD QUESTS & ORBS COLLECTOR",
        "quests_fetching": "Buscando missões ativas no Discord...",
        "quests_empty": "Nenhuma missão ativa no momento.",
        "quests_discord_detected": "Em execução e detectado",
        "quests_discord_not_running": "NÃO está em execução! (Inicie o Discord antes)",
        "quests_open_tab": "Abrindo aba de missões no Discord...",
        "quests_rpc_active": "Discord RPC local ativo para EA SPORTS FC 27 (App ID: 1531874756096295054)",
        "quests_collect_all_title": "COLETAR TODOS OS ORBES (COLLECT ALL ORBS)",
        "quests_count_label": "Missões para farmar:",
        "quests_total_orbs": "Total de Orbes:",
        "quests_procs_count": "Processos de jogos:",
        "quests_session_time": "Duração da sessão:",
        "quests_minutes": "{mins} minutos",
        "quests_parallel_note": "Todos os processos rodam em paralelo e são detectados pelo Discord!",
        "quests_accept_note": "Certifique-se de clicar em 'Aceitar Missão' no Discord.",
        "quests_confirm_all": "Iniciar todos os jogos e começar a farmar Orbes?",
        "quests_launching_all": "Iniciando processos em paralelo...",
        "quests_success_count": "Iniciados com sucesso {ok}/{total} processos! O Discord está escaneando...",
        "dash_title": "SESSÃO DE FARM DE ORBES DISCORD",
        "dash_progress": "Progresso:",
        "dash_elapsed": "Decorrido:",
        "dash_remaining": "Restante:",
        "dash_running": "Processos ativos:",
        "dash_col_game": "Jogo",
        "dash_col_exe": "Executável",
        "dash_col_orbs": "Orbes",
        "dash_col_status": "Status",
        "dash_hotkeys": "[M] / [Enter] Minimizar para segundo plano    [Q] Parar    [O] Abrir missões",
        "dash_backgrounded": "Sessão continuando em segundo plano! Voltando ao menu...",
        "dash_stopped": "Sessão interrompida pelo usuário.",
        "dash_completed": "Farm concluído! Resgate seus Orbes no Discord!",
        "dash_claim_button": "Abra o Discord e clique em 'Reivindicar Recompensa' no Inventário de Presentes!",
        # Language menu
        "lang_title": "SELEÇÃO DE IDIOMA / LANGUAGE SELECTION",
        "lang_current": "Idioma atual: {lang}",
        "lang_select": "Escolha um idioma [1-{count}] (ou 'back'): ",
        "lang_changed": "Idioma alterado para {lang} com sucesso!",
        # Auto-delete
        "cleanup_notice": "AUTO_DELETE ativo. Limpando processos e arquivos criados...",
        "cleanup_complete": "Limpeza concluída!",
    },
    "de": {
        # App banner & meta
        "dev_label": "Entwickler:",
        "ver_label": "Version:",
        "db_label": "Datenbank:",
        "db_desc": "Discord Official API + GitHub Archive + Live Quests",
        "init_app": "Initialisiere orbshacker...",
        "connecting_discord": "[*] Verbinde zur Discord-API...",
        "ready": "[OK] Bereit zum Spoofen!",
        "active_db": "Aktive Datenbank: {source} ({count} Spiele)",
        "interrupted": "Vom Benutzer unterbrochen",
        "thanks": "Danke, dass Sie orbshacker nutzen!",
        "wish_orbs": "Mögen deine Orbs reichlich sein!",
        "invalid_option": "Ungültige Option - wähle 1 bis {max_opt}",
        # Menu options
        "menu_title": "HAUPTMENÜ",
        "opt_database": "Discord-Datenbank durchsuchen (Offizielle API)",
        "opt_manual": "Manueller Modus (Prozessnamen angeben)",
        "opt_steam": "Steam Quest Modus (für Spiele mit Steam-Download)",
        "opt_quests": "Discord Quests & Orbs Collector [ALLE Orbs mit 1 Klick sammeln!]",
        "opt_credits": "Info & Über",
        "opt_language": "Sprache / Language / Язык",
        "opt_exit": "Beenden",
        "select_option": "Option auswählen",
        # Common prompts
        "confirm_prompt": "Erstellen und starten?",
        "press_enter": "Drücken Sie die Eingabetaste zum Fortfahren...",
        "press_enter_menu": "Drücken Sie die Eingabetaste, um zum Menü zurückzukehren...",
        "operation_cancelled": "Vorgang abgebrochen.",
        "error_prefix": "[FEHLER]",
        # Database mode
        "db_title": "DISCORD-DATENBANK SUCHE",
        "db_total_avail": "Verfügbare Spiele gesamt: {count}",
        "db_search_hint": "Suche nach Name oder Abkürzung (PUBG, Fortnite, LoL, CSGO...)",
        "db_search_prompt": "Suchen (oder 'back'): ",
        "db_no_games": "Keine Spiele für '{query}' gefunden",
        "db_try_diff": "Versuchen Sie einen anderen Begriff",
        "db_found_games": "{count} Spiel(e) gefunden:",
        "db_select_num": "Auswählen [1-{count}] (oder 'back'): ",
        "db_valid_num": "Gültige Nummer eingeben",
        "db_no_exe": "Keine {os_name}-Ausführungsdatei für dieses Spiel gefunden",
        "db_no_exe_data": "Dieses Spiel hat möglicherweise keine {os_name}-Version",
        "db_enter_manual": "Dateinamen manuell eingeben?",
        "db_exe_name": "Dateiname: ",
        # Manual mode
        "manual_title": "MANUELLER MODUS",
        "manual_desc": "Geben Sie den genauen Prozessnamen ein, den Discord erwartet",
        "manual_examples": "Beispiele: TslGame.exe (PUBG), League of Legends.exe, Overwatch.exe",
        "manual_prompt": "Dateiname (oder 'back'): ",
        "manual_summary": "Zusammenfassung:",
        "manual_setup_done": "Einrichtung abgeschlossen!",
        # Process launch
        "creating_fake": "Erstelle {name}",
        "created_fake": "Erstellt: {path}",
        "launching_proc": "Starte Prozess",
        "proc_launched_bg": "Prozess im Hintergrund gestartet",
        "discord_will_detect": "Discord sollte das Spiel jetzt erkennen (wenn Discord läuft)",
        "discord_must_run": "WICHTIG: Discord MUSS laufen, damit das Spoofing funktioniert",
        "discord_scan_wait": "Warten Sie einige Sekunden, bis Discord die Prozesse scannt",
        "tip_multi": "TIPP: Nutze das Menü erneut, um mehrere Spiele gleichzeitig zu emulieren!",
        "failed_create": "Fehler beim Erstellen der Datei: {err}",
        "check_perms": "Prüfen Sie Dateiberechtigungen oder Speicherplatz",
        "failed_launch": "Automatischer Start fehlgeschlagen: {err}",
        # Steam mode
        "steam_title": "STEAM QUEST MODUS",
        "steam_desc": "Für Quests, die ein aktives Steam-Download-Manifest erfordern",
        "steam_not_found": "Steam-Installation auf Ihrem System nicht gefunden",
        "steam_search_prompt": "Steam-Spiel suchen (oder 'back'): ",
        "steam_manifest_ok": "Manifest appmanifest_{appid}.acf erfolgreich erstellt!",
        # Quests & Orbs Collector
        "quests_title": "DISCORD QUESTS & ORBS COLLECTOR",
        "quests_fetching": "Lade aktive Discord-Quests...",
        "quests_empty": "Derzeit keine aktiven Quests gefunden.",
        "quests_discord_detected": "Läuft und erkannt",
        "quests_discord_not_running": "Läuft NICHT! (Starten Sie Discord vorab)",
        "quests_open_tab": "Öffne Quests-Reiter in Discord...",
        "quests_rpc_active": "Lokales Discord-RPC aktiv für EA SPORTS FC 27 (App ID: 1531874756096295054)",
        "quests_collect_all_title": "ALLE ORBS SAMMELN (COLLECT ALL ORBS)",
        "quests_count_label": "Quests zum Farmen:",
        "quests_total_orbs": "Gesamte Orbs:",
        "quests_procs_count": "Spiel-Prozesse:",
        "quests_session_time": "Sitzungsdauer:",
        "quests_minutes": "{mins} Minuten",
        "quests_parallel_note": "Alle Prozesse laufen parallel und werden von Discord erkannt!",
        "quests_accept_note": "Stellen Sie sicher, dass Sie 'Quest annehmen' in Discord geklickt haben.",
        "quests_confirm_all": "Alle Spiele starten und Orbs farmen?",
        "quests_launching_all": "Starte gefälschte Spiele parallel...",
        "quests_success_count": "Erfolgreich {ok}/{total} Prozesse gestartet! Discord scannt Spiele...",
        "dash_title": "DISCORD ORBS FARMING-SITZUNG",
        "dash_progress": "Fortschritt:",
        "dash_elapsed": "Vergangen:",
        "dash_remaining": "Verbleibend:",
        "dash_running": "Laufende Prozesse:",
        "dash_col_game": "Spiel",
        "dash_col_exe": "Dateiname",
        "dash_col_orbs": "Orbs",
        "dash_col_status": "Status",
        "dash_hotkeys": "[M] / [Enter] Im Hintergrund ausführen    [Q] Beenden    [O] Quests öffnen",
        "dash_backgrounded": "Sitzung läuft im Hintergrund weiter! Rückkehr zum Menü...",
        "dash_stopped": "Sitzung vom Benutzer gestoppt.",
        "dash_completed": "Farmen abgeschlossen! Holen Sie sich Ihre Orbs in Discord!",
        "dash_claim_button": "Öffnen Sie Discord und klicken Sie im Geschenkinventar auf 'Belohnung einlösen'!",
        # Language menu
        "lang_title": "SPRACHAUSWAHL / LANGUAGE SELECTION",
        "lang_current": "Aktuelle Sprache: {lang}",
        "lang_select": "Sprache wählen [1-{count}] (oder 'back'): ",
        "lang_changed": "Sprache erfolgreich auf {lang} geändert!",
        # Auto-delete
        "cleanup_notice": "AUTO_DELETE aktiv. Lösche temporäre Prozesse und Dateien...",
        "cleanup_complete": "Bereinigung abgeschlossen!",
    },
    "fr": {
        # App banner & meta
        "dev_label": "Développeurs :",
        "ver_label": "Version :",
        "db_label": "Base de données :",
        "db_desc": "Discord Official API + GitHub Archive + Live Quests",
        "init_app": "Initialisation d'orbshacker...",
        "connecting_discord": "[*] Connexion à l'API Discord...",
        "ready": "[OK] Prêt à émuler des jeux !",
        "active_db": "Base de données active : {source} ({count} jeux)",
        "interrupted": "Interrompu par l'utilisateur",
        "thanks": "Merci d'utiliser orbshacker !",
        "wish_orbs": "Que vos Orbes soient abondants !",
        "invalid_option": "Option invalide - choisissez entre 1 et {max_opt}",
        # Menu options
        "menu_title": "MENU PRINCIPAL",
        "opt_database": "Recherche dans la base Discord (API Officielle)",
        "opt_manual": "Mode manuel (spécifier le nom du processus)",
        "opt_steam": "Steam Quest Mode (pour les jeux nécessitant Steam)",
        "opt_quests": "Discord Quests & Orbs Collector [Récupérer TOUS les Orbes en 1 clic !]",
        "opt_credits": "Info & À propos",
        "opt_language": "Langue / Language / Язык",
        "opt_exit": "Quitter",
        "select_option": "Sélectionnez une option",
        # Common prompts
        "confirm_prompt": "Créer et lancer ?",
        "press_enter": "Appuyez sur Entrée pour continuer...",
        "press_enter_menu": "Appuyez sur Entrée pour revenir au menu...",
        "operation_cancelled": "Opération annulée.",
        "error_prefix": "[ERREUR]",
        # Database mode
        "db_title": "RECHERCHE BASE DISCORD",
        "db_total_avail": "Total de jeux disponibles : {count}",
        "db_search_hint": "Recherche par nom ou abréviation (PUBG, Fortnite, LoL, CSGO...)",
        "db_search_prompt": "Rechercher (ou 'back') : ",
        "db_no_games": "Aucun jeu trouvé pour '{query}'",
        "db_try_diff": "Essayez un autre terme ou une abréviation",
        "db_found_games": "{count} jeu(x) trouvé(s) :",
        "db_select_num": "Sélectionnez [1-{count}] (ou 'back') : ",
        "db_valid_num": "Entrez un numéro valide",
        "db_no_exe": "Aucun exécutable {os_name} trouvé pour ce jeu",
        "db_no_exe_data": "Ce jeu n'a peut-être pas de version {os_name}",
        "db_enter_manual": "Entrer le nom de l'exécutable manuellement ?",
        "db_exe_name": "Nom du fichier : ",
        # Manual mode
        "manual_title": "MODE MANUEL",
        "manual_desc": "Entrez le nom exact du processus attendu par Discord",
        "manual_examples": "Exemples : TslGame.exe (PUBG), League of Legends.exe, Overwatch.exe",
        "manual_prompt": "Nom de l'exécutable (ou 'back') : ",
        "manual_summary": "Résumé :",
        "manual_setup_done": "Configuration terminée !",
        # Process launch
        "creating_fake": "Création de {name}",
        "created_fake": "Créé : {path}",
        "launching_proc": "Lancement du processus",
        "proc_launched_bg": "Processus lancé en arrière-plan",
        "discord_will_detect": "Discord devrait maintenant détecter le jeu (si Discord est lancé)",
        "discord_must_run": "IMPORTANT : Discord DOIT être en cours d'exécution",
        "discord_scan_wait": "Attendez quelques secondes que Discord analyse les processus",
        "tip_multi": "ASTUCE : Utilisez le menu à nouveau pour émuler plusieurs jeux en même temps !",
        "failed_create": "Échec de création du fichier : {err}",
        "check_perms": "Vérifiez les permissions de fichiers ou l'espace disque",
        "failed_launch": "Échec du lancement automatique : {err}",
        # Steam mode
        "steam_title": "STEAM QUEST MODE",
        "steam_desc": "Pour les jeux nécessitant un manifeste de téléchargement Steam actif",
        "steam_not_found": "Installation de Steam introuvable sur votre système",
        "steam_search_prompt": "Rechercher un jeu Steam (ou 'back') : ",
        "steam_manifest_ok": "Manifeste appmanifest_{appid}.acf créé avec succès !",
        # Quests & Orbs Collector
        "quests_title": "DISCORD QUESTS & ORBS COLLECTOR",
        "quests_fetching": "Récupération des quêtes Discord actives...",
        "quests_empty": "Aucune quête active pour le moment.",
        "quests_discord_detected": "Lancé et détecté",
        "quests_discord_not_running": "NON lancé ! (Lancez Discord avant de démarrer)",
        "quests_open_tab": "Ouverture de l'onglet quêtes dans Discord...",
        "quests_rpc_active": "Discord RPC local actif pour EA SPORTS FC 27 (App ID: 1531874756096295054)",
        "quests_collect_all_title": "RÉCUPÉRER TOUS LES ORBES (COLLECT ALL ORBS)",
        "quests_count_label": "Quêtes à farmer :",
        "quests_total_orbs": "Total d'Orbes :",
        "quests_procs_count": "Processus de jeux :",
        "quests_session_time": "Durée de session :",
        "quests_minutes": "{mins} minutes",
        "quests_parallel_note": "Tous les processus tournent en parallèle et sont détectés par Discord !",
        "quests_accept_note": "Assurez-vous d'avoir cliqué sur 'Accepter la quête' dans Discord.",
        "quests_confirm_all": "Lancer tous les jeux et farmer les Orbes ?",
        "quests_launching_all": "Lancement des processus de jeux en parallèle...",
        "quests_success_count": "{ok}/{total} processus lancés avec succès ! Discord analyse les jeux...",
        "dash_title": "SESSION DE FARM D'ORBES DISCORD",
        "dash_progress": "Progression :",
        "dash_elapsed": "Écoulé :",
        "dash_remaining": "Restant :",
        "dash_running": "Processus en cours :",
        "dash_col_game": "Jeu",
        "dash_col_exe": "Exécutable",
        "dash_col_orbs": "Orbes",
        "dash_col_status": "Statut",
        "dash_hotkeys": "[M] / [Enter] Réduire en arrière-plan    [Q] Arrêter    [O] Ouvrir quêtes",
        "dash_backgrounded": "La session continue en arrière-plan ! Retour au menu...",
        "dash_stopped": "Session interrompue par l'utilisateur.",
        "dash_completed": "Farm terminé ! Récupérez vos Orbes dans Discord !",
        "dash_claim_button": "Ouvrez Discord et cliquez sur 'Réclamer la récompense' dans l'Inventaire de cadeaux !",
        # Language menu
        "lang_title": "SÉLECTION DE LA LANGUE / LANGUAGE SELECTION",
        "lang_current": "Langue actuelle : {lang}",
        "lang_select": "Choisissez une langue [1-{count}] (ou 'back') : ",
        "lang_changed": "Langue modifiée avec succès vers {lang} !",
        # Auto-delete
        "cleanup_notice": "AUTO_DELETE actif. Nettoyage des processus et fichiers temporaires...",
        "cleanup_complete": "Nettoyage terminé !",
    },
}


def detect_system_language() -> str:
    """Detect operating system language or fallback to default."""
    # 1. Environment variables (highest priority)
    for var in ("LANGUAGE", "LC_ALL", "LC_MESSAGES", "LANG"):
        val = os.environ.get(var)
        if val:
            code = val.split(".")[0].split("_")[0].lower()
            return code if code in LANGUAGES else DEFAULT_LANGUAGE

    # 2. Locale default
    try:
        loc = None
        try:
            loc = locale.getlocale()[0]
        except Exception:
            pass
        if not loc:
            loc = locale.getdefaultlocale()[0]
        if loc:
            code = loc.split(".")[0].split("_")[0].lower()
            return code if code in LANGUAGES else DEFAULT_LANGUAGE
    except Exception:
        pass

    return DEFAULT_LANGUAGE


def get_current_language() -> str:
    """Return currently active language code."""
    global _current_language
    return _current_language


def set_language(lang_code: str, save_to_settings: bool = True) -> bool:
    """Set the active language and optionally persist to settings.json."""
    global _current_language
    code = lang_code.lower().strip()
    if code == "auto":
        code = detect_system_language()

    if code not in LANGUAGES:
        return False

    _current_language = code

    if save_to_settings:
        _save_language_setting(code)
    return True


def _save_language_setting(lang_code: str) -> None:
    """Save selected language to settings.json so it persists."""
    try:
        if getattr(sys, "frozen", False):
            json_path = Path(sys.executable).parent / "settings.json"
        else:
            json_path = Path(__file__).resolve().parents[1] / "settings.json"

        data: dict[str, Any] = {}
        if json_path.exists():
            try:
                data = json.loads(json_path.read_text(encoding="utf-8"))
            except Exception:
                data = {}

        data["LANGUAGE"] = lang_code
        json_path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    except Exception:
        pass


def t(key: str, **kwargs) -> str:
    """Lookup translation for key in active language, fallback to English or raw key."""
    lang = get_current_language()
    val = TRANSLATIONS.get(lang, {}).get(key)
    if val is None:
        val = TRANSLATIONS.get(DEFAULT_LANGUAGE, {}).get(key, key)
    if kwargs:
        try:
            return val.format(**kwargs)
        except Exception:
            return val
    return val


def init_language_from_config(config_lang: str | None = None) -> str:
    """Initialize active language from config/settings or system locale."""
    if config_lang and config_lang.lower() in LANGUAGES:
        set_language(config_lang.lower(), save_to_settings=False)
    elif config_lang and config_lang.lower() == "auto":
        set_language(detect_system_language(), save_to_settings=False)
    else:
        # Check system language
        detected = detect_system_language()
        set_language(detected, save_to_settings=False)
    return get_current_language()
