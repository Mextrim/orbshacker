<div align="center">
<img src="https://capsule-render.vercel.app/api?type=waving&color=0:0a0a0a,60:0d1f0d,100:1a4a1a&height=200&section=header&text=orbshacker&fontSize=70&fontColor=4ade80&fontAlignY=55&animation=fadeIn" width="100%"/>

<br/>

[![Version](https://img.shields.io/github/v/release/Mextrim/orbshacker?style=for-the-badge&logo=semanticrelease&color=4ade80&logoColor=white)](https://github.com/Mextrim/orbshacker/releases/latest)
[![Python](https://img.shields.io/badge/Python-3.10+-3572A5?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20Linux%20%7C%20macOS-informational?style=for-the-badge&logo=linux&logoColor=white)](https://github.com/Mextrim/orbshacker)
[![Languages](https://img.shields.io/badge/Languages-RU%20%7C%20EN%20%7C%20ES%20%7C%20PT%20%7C%20DE%20%7C%20FR-blueviolet?style=for-the-badge)](https://github.com/Mextrim/orbshacker)
[![Discord](https://img.shields.io/badge/Discord-Orbs%20%26%20Quests-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.com)
[![License](https://img.shields.io/badge/License-GPL%20v3-c0392b?style=for-the-badge&logo=opensourceinitiative&logoColor=white)](./LICENSE)
[![Tests](https://img.shields.io/badge/Tests-152%20passed-success?style=for-the-badge&logo=pytest&logoColor=white)](https://github.com/Mextrim/orbshacker)

<br/>

### ⬇️ **[Скачать orbshacker.exe (v2.3.1 для Windows)](https://github.com/Mextrim/orbshacker/releases/download/v2.3.1/orbshacker.exe)** &nbsp;|&nbsp; **[GitHub Releases](https://github.com/Mextrim/orbshacker/releases)**

<br/>

*Автоматический фарм квестов Discord и сбор Orbs без скачивания сотен гигабайт игр.*  
*Automated Discord Quests spoofer & Orbs collector without installing hundreds of gigabytes.*

<br/>

**🌐 Выберите язык / Select language:**  
[🇷🇺 **Русский**](#-русский-гайд-и-описание) &nbsp;•&nbsp; 
[🇬🇧 **English**](#-english-guide--documentation) &nbsp;•&nbsp; 
[🇪🇸 **Español**](#-español-guía-rápida) &nbsp;•&nbsp; 
[🇩🇪 **Deutsch**](#-deutsch-kurzanleitung) &nbsp;•&nbsp; 
[🇫🇷 **Français**](#-français-guide-rapide) &nbsp;•&nbsp; 
[🇵🇹 **Português**](#-português-guia-rápido)

</div>

<br/>

---

<br/>

# 🇷🇺 Русский (Гайд и описание)

## 📌 Что такое orbshacker?

**orbshacker** — это мощная и безопасная утилита для автоматического выполнения заданий **Discord Quests** и фарма **Discord Orbs** (а также любых наград в виде аватарок, значков и внутриигровых предметов) **без необходимости скачивать и устанавливать игры**.

Программа создаёт лёгкие процессы-заглушки с именами исполняемых файлов, которые отслеживает Discord, генерирует Steam-манифесты загрузки и отправляет телеметрию через локальный сокет Discord IPC RPC. Для Discord ваш компьютер выглядит так, будто на нём действительно запущены все необходимые игры.

> [!NOTE]  
> **100% Безопасно:** orbshacker **не внедряет код** в клиент Discord, не модифицирует файлы приложения, не перехватывает трафик и не использует пользовательские токены. Используются только официальный публичный API Discord и локальное взаимодействие с процессами.

<br/>

## ✨ Основные возможности

| Функция | Описание |
| :--- | :--- |
| ⚡ **Discord Quests & Orbs Collector** | **Пункт 4 в меню.** Автоматический поиск активных заданий в Discord. Фарм одной выбранной игры или **всех заданий разом (`[A]`)** за 15 минут (+700 Orbs за каждое). |
| 🎮 **Поддержка EA SPORTS FC 27** | Встроенный клиент **Discord Local RPC (`SET_ACTIVITY`)**, позволяющий фармить квесты игр, у которых нет `.exe` в базе Discord. |
| 🚂 **Steam Quest Mode** | Автоматическая генерация `appmanifest_<appid>.acf` со статусом скачивания в Steam для игр со строгой проверкой (Once Human, Where Winds Meet, Endfield, Monster Hunter и др.). |
| ⏱️ **Умный таймер и автоудаление** | Обратный отсчёт на 15 минут в реальном времени. После окончания таймера программа автоматически закрывает процессы и удаляет временные файлы. |
| 🌐 **Мультиязычный интерфейс** | 6 языков: **Русский**, **English**, **Español**, **Português**, **Deutsch**, **Français** с автоопределением языка вашей ОС. |
| 🖥️ **Кроссплатформенность** | Работает на **Windows** (готовый `.exe` или исходный код), **Linux** и **macOS**. |
| 🔄 **Автообновление с проверкой SHA-256** | Программа сама проверяет обновления на GitHub Releases и сверяет контрольные суммы. |

<br/>

## 📥 Инструкция по установке

### Способ 1: Windows Standalone EXE (Самый простой — без Python)

1. Перейдите на страницу **[GitHub Releases](https://github.com/Mextrim/orbshacker/releases/latest)**.
2. Скачайте файл **`orbshacker.exe`** (v2.3.1).
3. Поместите файл в любую удобную папку (например, `C:\orbshacker` или на Рабочий стол).
4. Запустите двойным кликом (или через командную строку). Всё готово к работе!

> [!TIP]  
> Windows Defender или браузер может показать предупреждение SmartScreen, так как программа собирает процессы в памяти и не имеет платного сертификата подписи кода. Это нормально — нажмите *«Подробнее»* -> *«Выполнить в любом случае»*.

---

### Способ 2: Запуск из исходного кода (Windows, Linux, macOS)

Этот способ подходит для пользователей Linux, macOS или тех, кто предпочитает запускать код через Python.

#### 1. Системные требования:
* **Python 3.10** или выше ([Скачать Python](https://www.python.org/downloads/)).
* Установленный **Git** (необязательно, можно скачать ZIP-архивом).
* Запущенный официальный клиент **Discord Desktop**.

#### 2. Клонирование и настройка:

```bash
# Клонируйте репозиторий
git clone https://github.com/Mextrim/orbshacker.git
cd orbshacker

# Создайте и активируйте виртуальное окружение:
# Windows (PowerShell):
python -m venv venv
.\venv\Scripts\Activate.ps1

# Windows (CMD):
python -m venv venv
.\venv\Scripts\activate.bat

# Linux / macOS (Bash / Zsh):
python3 -m venv venv
source venv/bin/activate
```

#### 3. Установка зависимостей:
```bash
pip install -r requirements.txt
```

> **Для пользователей Linux:**  
> Убедитесь, что у вас установлен Tkinter для отображения таймеров:  
> `sudo apt install python3-tk` (Ubuntu/Debian) или `sudo pacman -S tk` (Arch Linux).

#### 4. Запуск программы:
```bash
python orbshacker.py
# или
python -m orbshacker
```

<br/>

## 🚀 Пошаговый гайд: Как зафармить квесты и получить Orbs

1. **Запустите Discord** на компьютере.
2. Откройте вкладку квестов: **Настройки пользователя ⚙️ ➔ Задания** (или в меню программы нажмите `[O]`).
3. Нажмите кнопку **«Принять задание»** (*Accept Quest*) у интересующих игр (например, *EA SPORTS FC 27*, *Call of Duty*, *Where Winds Meet* и др.).
4. Запустите **`orbshacker.exe`** (или `python orbshacker.py`).
5. В главном меню введите цифру **`4`** (*Discord Quests & Orbs Collector*).
6. В открывшемся списке выберите:
   * **`A`** — чтобы запустить фарм **всех активных заданий одновременно** (рекомендуется!).
   * Или номер конкретной игры (например, `1`, `2` и т.д.).
7. Программа автоматически:
   * Создаст и запустит фоновые процессы.
   * Сгенерирует необходимые Steam AppManifest файлы.
   * Подключится к Discord Local RPC (для игр вроде FC 27).
8. **Подождите 15 минут.** На экране будет отображаться интерактивный дашборд со шкалой прогресса.
   * Вы можете нажать **`[M]`**, чтобы свернуть дашборд и вернуться в главное меню — квесты продолжат фармиться в фоне!
9. По истечении 15 минут прозвучит сигнал о завершении.
10. Перейдите в Discord и нажмите **«Забрать награду» (Claim Reward)** — на ваш баланс поступят **+700 Orbs** за каждый квест! 🎁

<br/>

## 📋 Описание меню программы

```text
+------------------------------------------------------------------+
|                    ГЛАВНОЕ МЕНЮ / MAIN MENU                      |
+------------------------------------------------------------------+
  1. Поиск по базе Discord (найти игру по названию или аббревиатуре)
  2. Ручной режим (ввести произвольное имя exe)
  3. Steam Quest Mode (создание манифестов для квестов со Steam)
  4. Discord Quests & Orbs Collector (автофарм квестов 700 Orbs)
  5. О программе и авторы
  6. Смена языка / Change Language [RU]
  7. Выход
```

<br/>

## ⚙️ Файл настроек (`settings.json` / `settings.py`)

Вы можете настроить поведение программы через файл `settings.json` (создаётся автоматически рядом с `.exe`) или `settings.py`:

```json
{
  "LANGUAGE": "auto",
  "TIMER_MINUTES": 15,
  "AUTO_DELETE_ON_TIMER_END": true,
  "AUTO_DELETE_ON_EXIT": false,
  "CHOSEN_FOLDER": "Desktop",
  "FAKE_EXE_DIR": "Win64"
}
```

* `LANGUAGE`: Язык интерфейса (`"auto"`, `"ru"`, `"en"`, `"es"`, `"pt"`, `"de"`, `"fr"`).
* `TIMER_MINUTES`: Длительность таймера квеста (по умолчанию `15` минут).
* `AUTO_DELETE_ON_TIMER_END`: Удалять временные процессы и папки по окончании таймера (`true`).
* `AUTO_DELETE_ON_EXIT`: Завершать процессы при выходе из программы (`false`).

<br/>

---

<br/>

# 🇬🇧 English (Guide & Documentation)

## 📌 What is orbshacker?

**orbshacker** is a fast, lightweight, and completely undetectable utility designed to complete **Discord Quests** and collect **Discord Orbs** (avatar decorations, profile badges, in-game rewards) **without downloading or installing a single gigabyte of games**.

Discord's quest tracking engine monitors running processes on your operating system, active Steam download flags, and local Discord IPC presence. orbshacker emulates these exact conditions by creating lightweight stub processes, generating legitimate Steam ACF manifests, and communicating via Discord's local RPC socket.

> [!NOTE]  
> **Completely Safe:** orbshacker **never injects code** into Discord's memory, never touches Discord's core files, and never asks for user tokens or passwords. It uses official public Discord endpoints and OS process management.

<br/>

## ✨ Key Features

* ⚡ **Discord Quests & Orbs Collector (Option 4):** Automatically retrieves active Discord Quests and lets you farm all quests simultaneously (`[A]`) in a single 15-minute run.
* 🎮 **Full EA SPORTS FC 27 Support:** Integrated **Discord Local IPC RPC client (`SET_ACTIVITY`)** ensures progress updates even for games without executables in Discord's detectable database.
* 🚂 **Steam Quest Mode:** Automatically creates `appmanifest_<appid>.acf` in your Steam directory with downloading state flags, satisfying Steam-dependent quest checks.
* ⏱️ **Self-Destructing Timers:** Standalone 15-minute countdowns with embedded configs. Automatically kills stub processes and removes generated files on completion.
* 🌐 **6 Languages:** English, Russian, Spanish, Portuguese, German, and French with automatic system language detection.
* 💻 **Cross-Platform:** Full compatibility with **Windows**, **Linux**, and **macOS**.
* 🔄 **SHA-256 Verified Auto-Updater:** Seamless in-place updates from GitHub Releases.

<br/>

## 📥 Installation Guide

### Option 1: Windows Standalone Executable (Recommended)

1. Head to the **[Latest GitHub Release](https://github.com/Mextrim/orbshacker/releases/latest)**.
2. Download **`orbshacker.exe`** (v2.3.1).
3. Place it anywhere you like (e.g., Desktop or `C:\Tools`).
4. Double-click to run. No Python installation required!

---

### Option 2: Running from Source (Windows, Linux, macOS)

#### 1. Prerequisites:
* **Python 3.10** or higher ([python.org](https://www.python.org/downloads/)).
* **Git** installed.
* **Discord Desktop** app running.

#### 2. Clone & Setup:
```bash
git clone https://github.com/Mextrim/orbshacker.git
cd orbshacker

# Virtual environment setup
# Windows (PowerShell):
python -m venv venv
.\venv\Scripts\Activate.ps1

# Linux / macOS (Bash / Zsh):
python3 -m venv venv
source venv/bin/activate
```

#### 3. Install Dependencies:
```bash
pip install -r requirements.txt
```

> **Linux users:** Install Python Tkinter if you wish to see standalone GUI timer windows:  
> `sudo apt install python3-tk` (Ubuntu/Debian) or `sudo pacman -S tk` (Arch).

#### 4. Launch:
```bash
python orbshacker.py
# or
python -m orbshacker
```

<br/>

## 🚀 How to Farm Discord Quests & Orbs in 15 Minutes

1. Make sure your **Discord Desktop** app is running.
2. In Discord, go to **User Settings ⚙️ ➔ Quests** and click **Accept Quest** on the games you want.
3. Launch `orbshacker.exe`.
4. In the menu, select option **`4`** (*Discord Quests & Orbs Collector*).
5. Press **`A`** to start farming all active quests simultaneously.
6. The dashboard will display live progress bars for each game.
   * Press **`[M]`** anytime to minimize the dashboard to the main menu without interrupting progress.
7. After 15 minutes, the timer completes.
8. Go back to Discord and click **Claim Reward** for **+700 Orbs** on each quest!

<br/>

---

<br/>

# 🇪🇸 Español (Guía Rápida)

<details>
<summary><b>Haz clic aquí para ver la guía en español</b></summary>

<br/>

### ¿Qué es orbshacker?
**orbshacker** es una herramienta para farmear misiones de **Discord Quests** y ganar **Orbs** sin necesidad de descargar cientos de gigabytes de juegos.

### Instalación rápida:
1. Descarga **`orbshacker.exe`** desde **[Releases](https://github.com/Mextrim/orbshacker/releases/latest)**.
2. Abre Discord y asegúrate de haber hecho clic en **Aceptar misión** en los juegos que desees.
3. Ejecuta `orbshacker.exe`.
4. En el menú principal selecciona la opción **`4`** (*Discord Quests & Orbs Collector*).
5. Presiona **`A`** para farmear todas las misiones activas a la vez.
6. Espera 15 minutos, vuelve a Discord y reclama tus recompensas (+700 Orbs por misión).

Para ejecutar desde código fuente en Linux/macOS:
```bash
git clone https://github.com/Mextrim/orbshacker.git
cd orbshacker
pip install -r requirements.txt
python orbshacker.py
```

</details>

<br/>

---

<br/>

# 🇩🇪 Deutsch (Kurzanleitung)

<details>
<summary><b>Klicken Sie hier für die deutsche Anleitung</b></summary>

<br/>

### Was ist orbshacker?
**orbshacker** ermöglicht es Ihnen, **Discord Quests** automatisch abzuschließen und **Discord Orbs** zu sammeln, ohne große Spiele herunterladen zu müssen.

### Schnellanleitung:
1. Laden Sie **`orbshacker.exe`** von den **[Releases](https://github.com/Mextrim/orbshacker/releases/latest)** herunter.
2. Starten Sie Discord und nehmen Sie die Quests unter **Benutzereinstellungen ➔ Quests** an.
3. Starten Sie `orbshacker.exe`.
4. Wählen Sie im Hauptmenü Option **`4`** (*Discord Quests & Orbs Collector*).
5. Drücken Sie **`A`**, um alle aktiven Quests gleichzeitig zu starten.
6. Warten Sie 15 Minuten und fordern Sie Ihre Orbs (+700 pro Quest) in Discord an.

Quellcode-Ausführung (Linux / macOS / Windows):
```bash
git clone https://github.com/Mextrim/orbshacker.git
cd orbshacker
pip install -r requirements.txt
python orbshacker.py
```

</details>

<br/>

---

<br/>

# 🇫🇷 Français (Guide Rapide)

<details>
<summary><b>Cliquez ici pour lire le guide en français</b></summary>

<br/>

### Qu'est-ce que orbshacker ?
**orbshacker** est un utilitaire sécurisé permettant de compléter les quêtes **Discord Quests** et de récolter des **Orbs** sans installer le moindre jeu volumineux.

### Installation & Utilisation :
1. Téléchargez **`orbshacker.exe`** depuis **[Releases](https://github.com/Mextrim/orbshacker/releases/latest)**.
2. Lancez Discord et acceptez les quêtes dans **Paramètres utilisateur ➔ Quêtes**.
3. Lancez `orbshacker.exe`.
4. Choisissez l'option **`4`** (*Discord Quests & Orbs Collector*).
5. Appuyez sur **`A`** pour lancer toutes les quêtes en parallèle.
6. Patientez 15 minutes, puis récupérez vos récompenses (+700 Orbs par quête) directement sur Discord.

Exécution depuis les sources :
```bash
git clone https://github.com/Mextrim/orbshacker.git
cd orbshacker
pip install -r requirements.txt
python orbshacker.py
```

</details>

<br/>

---

<br/>

# 🇵🇹 Português (Guia Rápido)

<details>
<summary><b>Clique aqui para ler o guia em português</b></summary>

<br/>

### O que é o orbshacker?
O **orbshacker** é uma ferramenta para completar missões do **Discord Quests** e ganhar **Orbs** sem precisar baixar centenas de gigabytes de jogos.

### Instalação & Uso Rápido:
1. Baixe o **`orbshacker.exe`** na página de **[Releases](https://github.com/Mextrim/orbshacker/releases/latest)**.
2. Abra o Discord e clique em **Aceitar Missão** nas configurações de presentes/tarefas.
3. Abra o `orbshacker.exe`.
4. Escolha a opção **`4`** (*Discord Quests & Orbs Collector*).
5. Pressione **`A`** para farmar todas as missões ativas simultaneamente.
6. Aguarde 15 minutos e resgate suas recompensas (+700 Orbs cada) no Discord.

Execução via código-fonte:
```bash
git clone https://github.com/Mextrim/orbshacker.git
cd orbshacker
pip install -r requirements.txt
python orbshacker.py
```

</details>

<br/>

---

<br/>

## 🛠️ Project Structure

```text
orbshacker/
├── orbshacker.exe         Standalone pre-compiled Windows executable (v2.3.1)
├── orbshacker.py          Root CLI launcher entry point
├── build.py               PyInstaller automated build script
├── orbshacker/
│   ├── __init__.py        Package version and metadata
│   ├── __main__.py        Package entry point, auto-faked detection & timer mode
│   ├── bake.py            Embedded-config markers for standalone processes
│   ├── config.py          Configuration manager with settings.json persistence
│   ├── discord_db.py      Official Discord detectable database loader & search
│   ├── errors.py          Custom exception hierarchy
│   ├── faker.py           Process spoofer and cross-platform launcher
│   ├── i18n.py            Multilingual engine (RU, EN, ES, PT, DE, FR)
│   ├── janitor.py         Crash-safe self-deletion & cleanup helpers
│   ├── main.py            Main interactive terminal loop & menu
│   ├── net.py             Resilient HTTP client with retry logic
│   ├── path_utils.py      Path sanitization and cross-platform utilities
│   ├── quests.py          Discord Quests Collector, IPC RPC client & dashboard
│   ├── steam.py           Steam registry discovery & ACF manifest generator
│   ├── timer.py           Countdown timer window & process lifecycle
│   ├── ui.py              ANSI terminal colors, animated banners & menus
│   └── updater.py         Automatic updater with SHA-256 verification
├── tests/                 Comprehensive test suite (152 passing pytest tests)
├── requirements.txt       Production dependencies
└── pyproject.toml         Project configuration
```

<br/>

## 🧪 Testing & Verification

The project includes an extensive test suite ensuring high reliability across all modules:

```bash
pip install -r requirements-dev.txt
pytest -v
```

<br/>

## ⚖️ Legal Notice

> **Educational purposes only.**  
> This software is created solely for educational and research purposes to study process monitoring architecture and Discord's local IPC mechanisms. Commercial use or distribution is strictly prohibited. Users are responsible for complying with Discord's Terms of Service.

<br/>

## 📄 License

Distributed under the **GNU General Public License v3.0 (GPL-3.0)**. See [`LICENSE`](./LICENSE) for more details.

<br/>

<div align="center">

Made with ❤️ by **[Mextrim](https://github.com/Mextrim)** &nbsp;•&nbsp; Original concept by **Strykey**

<br/>

[![GitHub stars](https://img.shields.io/github/stars/Mextrim/orbshacker?style=for-the-badge&color=4ade80&labelColor=1a1a1a)](https://github.com/Mextrim/orbshacker/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/Mextrim/orbshacker?style=for-the-badge&color=4ade80&labelColor=1a1a1a)](https://github.com/Mextrim/orbshacker/network)

<br/>

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:4ade80,40:0d1f0d,100:0a0a0a&height=120&section=footer" width="100%"/>

</div>
