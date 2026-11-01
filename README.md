<div align="center">
<img src="https://capsule-render.vercel.app/api?type=waving&color=0:0a0a0a,60:0d1f0d,100:1a4a1a&height=200&section=header&text=orbshacker&fontSize=70&fontColor=4ade80&fontAlignY=55&animation=fadeIn" width="100%"/>

<br/>

[![Version](https://img.shields.io/badge/version-v2.4.0%20(Rust%20%2B%20Electron)-4ade80?style=for-the-badge&logo=electron&logoColor=white)](https://github.com/Mextrim/orbshacker)
[![Rust](https://img.shields.io/badge/Rust-Core%20Engine-DEA584?style=for-the-badge&logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![Electron](https://img.shields.io/badge/Electron-Desktop%20GUI-47848F?style=for-the-badge&logo=electron&logoColor=white)](https://www.electronjs.org/)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20Linux%20%7C%20macOS-informational?style=for-the-badge&logo=windows&logoColor=white)](https://github.com/Mextrim/orbshacker)
[![Languages](https://img.shields.io/badge/Languages-RU%20%7C%20EN%20%7C%20ES%20%7C%20PT%20%7C%20DE%20%7C%20FR-blueviolet?style=for-the-badge)](https://github.com/Mextrim/orbshacker)
[![Discord](https://img.shields.io/badge/Discord-Orbs%20%26%20Quests-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.com)
[![License](https://img.shields.io/badge/License-GPL%20v3-c0392b?style=for-the-badge&logo=opensourceinitiative&logoColor=white)](./LICENSE)

<br/>

### ⬇️ **[Скачать orbshacker.exe (v2.4.0 Portable EXE)](https://github.com/Mextrim/orbshacker/releases/download/v2.4.0/orbshacker.exe)** &nbsp;|&nbsp; **[GitHub Releases](https://github.com/Mextrim/orbshacker/releases/latest)**

<br/>

### ⚡ **Новая версия на Rust + Electron (v2.4.0)**
*Быстрый, нативный системный движок на Rust и современный графический интерфейс на Electron.*  
*Blazing-fast native Rust core engine paired with a modern Electron desktop GUI.*

<br/>

**🌐 Выберите язык / Select language:**  
[🇷🇺 **Русский**](#-русский-описание-и-инструкция) &nbsp;•&nbsp; 
[🇬🇧 **English**](#-english-overview--guide) &nbsp;•&nbsp; 
[🇪🇸 **Español**](#-español-guía-rápida) &nbsp;•&nbsp; 
[🇩🇪 **Deutsch**](#-deutsch-kurzanleitung) &nbsp;•&nbsp; 
[🇫🇷 **Français**](#-français-guide-rapide) &nbsp;•&nbsp; 
[🇵🇹 **Português**](#-português-guia-rápido)

</div>

<br/>

---

<br/>

# 🇷🇺 Русский (Описание и инструкция)

## 📌 Что такое orbshacker (Rust + Electron)?

**orbshacker** переписан на связку **Rust + Electron**:
1. **Ядро на Rust (`src-rust`)**: сверхбыстрый нативный движок (размером всего 1.6 МБ), который напрямую подключается к локальному сокету Discord Local IPC (`\\.\pipe\discord-ipc-0` на Windows), генерирует Steam-манифесты загрузки, управляет процессами-заглушками и обеспечивает абсолютную стабильность без утечек памяти.
2. **Графический интерфейс на Electron (`src-gui`)**: стильный тёмный Desktop GUI в эстетике Discord/Cyberpunk. Карточки квестов, счётчик доступных Orbs (+5,600 Orbs), живой таймер обратного отсчёта на 15 минут, шкала прогресса, консоль телеметрии и кнопка запуска всех квестов в 1 клик.

> [!NOTE]  
> **100% Безопасно:** orbshacker **не внедряет код** в клиент Discord, не модифицирует файлы приложения, не перехватывает сетевой трафик и не требует пользовательских токенов или паролей.

<br/>

## ✨ Основные возможности

| Компонент | Возможности |
| :--- | :--- |
| ⚡ **1-Click Farm All** | Кнопка **«ФАРМИТЬ ВСЕ КВЕСТЫ»** одновременно запускает все активные задания Discord. Через 15 минут вы получаете +700 Orbs за каждое. |
| 🦀 **Native Rust Engine** | Компилируемое ядро на Rust с нулевым оверхедом и мгновенным откликом (IPC по JSON-RPC). |
| 🎮 **Поддержка EA SPORTS FC 27** | Встроенный нативный клиент **Discord Local RPC (`SET_ACTIVITY`)**, передающий статус игры напрямую через сокет Discord. |
| 🚂 **Steam Quest Mode** | Автоматическое определение пути к Steam и запись `appmanifest_<appid>.acf` со статусом загрузки (`StateFlags: 1026`). |
| ⏱️ **Интерактивный дашборд** | Обратный отсчёт времени в реальном времени, прогресс-бар, звуковой сигнал завершения и праздничное модальное окно. |
| 🌐 **6 языков интерфейса** | Русский, English, Español, Português, Deutsch, Français с автоопределением и переключением на лету. |
| 💻 **Кроссплатформенность** | Поддержка **Windows**, **Linux** и **macOS**. |

<br/>

## 🚀 Быстрый запуск

### 1. Предварительные требования:
* Установленный **Node.js** (v18+) и **npm**.
* Установленный **Rust** (`cargo`, `rustc`).
* Запущенный клиент **Discord Desktop**.

### 2. Установка и запуск:

```bash
# 1. Клонируйте репозиторий:
git clone https://github.com/Mextrim/orbshacker.git
cd orbshacker

# 2. Установите зависимости Electron:
cd src-gui
npm install
cd ..

# 3. Запустите приложение (Rust скомпилируется автоматически при первом запуске):
npm start
```

### 3. Ручная сборка Rust-ядра:
```bash
npm run build
```

<br/>

## 🎮 Как получить Orbs:
1. Запустите клиент **Discord** на ПК.
2. В Discord откройте раздел **Настройки пользователя ➔ Задания** и нажмите **«Принять задание»** на нужных играх.
3. Запустите orbshacker командой `npm start`.
4. Нажмите большую зелёную кнопку **«ФАРМИТЬ ВСЕ КВЕСТЫ»**.
5. Подождите 15 минут (прогресс отображается на дашборде).
6. После сигнала завершения перейдите в Discord и нажмите **«Забрать награду» (Claim Reward)**!

<br/>

---

<br/>

# 🇬🇧 English (Overview & Guide)

## 📌 What is orbshacker (Rust + Electron)?

**orbshacker** has been completely re-architected with **Rust + Electron**:
1. **Rust Core Engine (`src-rust`)**: A lightweight (~1.6 MB) native binary handling direct communication with Discord Local IPC named pipes (`\\.\pipe\discord-ipc-0`), Steam manifest generation (`appmanifest_<appid>.acf`), and stub process lifecycle management with zero memory leaks.
2. **Electron GUI (`src-gui`)**: A sleek Discord-themed desktop window featuring real-time quest progress bars, 15-minute countdown timers, telemetry log drawer, and a 1-click **"FARM ALL ACTIVE QUESTS"** button.

<br/>

## 🚀 Quickstart

```bash
# Clone the repository
git clone https://github.com/Mextrim/orbshacker.git
cd orbshacker

# Install Electron GUI dependencies
cd src-gui
npm install
cd ..

# Launch the app (auto-builds Rust release core and opens the GUI)
npm start
```

<br/>

## 🛠️ Project Structure

```text
orbshacker/
├── package.json           # Root scripts (npm start, npm run build)
├── scripts/
│   ├── start.js           # Auto-compiles Rust core and starts Electron GUI
│   └── build.js           # Builds optimized release Rust binary
├── src-rust/              # Native Rust Core Engine
│   ├── Cargo.toml
│   └── src/
│       ├── main.rs        # JSON-RPC service, stub launcher & CLI modes
│       ├── discord_rpc.rs # Windows Named Pipe / Unix Socket RPC client
│       ├── quests.rs      # Quests catalogue (FC 27, COD, Where Winds Meet, etc.)
│       ├── steam.rs       # Steam registry detection & ACF manifest generator
│       ├── faker.rs       # Process spoofer & cross-platform runner
│       ├── session.rs     # Farming session coordinator & ticker thread
│       └── rpc.rs         # JSON-RPC protocol over stdin/stdout
├── src-gui/               # Modern Electron Desktop App
│   ├── package.json
│   ├── main.js            # Electron main process (spawns Rust sidecar)
│   ├── preload.js         # Context bridge IPC API
│   └── renderer/
│       ├── index.html     # Desktop UI layout
│       ├── style.css      # Dark glassmorphism Discord styles
│       ├── app.js         # State management & event handling
│       └── i18n.js        # Localization dictionaries (RU, EN, ES, PT, DE, FR)
└── legacy-python/         # Archived original Python CLI implementation
```

<br/>

---

<br/>

# 🇪🇸 Español (Guía Rápida)

<details>
<summary><b>Haz clic aquí para ver la guía en español</b></summary>

<br/>

### Instalación y Uso:
```bash
git clone https://github.com/Mextrim/orbshacker.git
cd orbshacker
cd src-gui && npm install && cd ..
npm start
```
1. Abre Discord y acepta las misiones.
2. Haz clic en **"FARMEAR TODAS LAS MISIONES"**.
3. Espera 15 minutos y reclama tus recompensas (+700 Orbs por misión) en Discord.

</details>

<br/>

---

<br/>

# 🇩🇪 Deutsch (Kurzanleitung)

<details>
<summary><b>Klicken Sie hier für die deutsche Anleitung</b></summary>

<br/>

### Installation & Start:
```bash
git clone https://github.com/Mextrim/orbshacker.git
cd orbshacker
cd src-gui && npm install && cd ..
npm start
```
1. Starten Sie Discord und nehmen Sie die Quests an.
2. Klicken Sie auf **"ALLE QUESTS FARMEN"**.
3. Nach 15 Minuten fordern Sie Ihre Orbs in Discord an.

</details>

<br/>

---

<br/>

# 🇫🇷 Français (Guide Rapide)

<details>
<summary><b>Cliquez ici pour lire le guide en français</b></summary>

<br/>

### Installation & Lancement :
```bash
git clone https://github.com/Mextrim/orbshacker.git
cd orbshacker
cd src-gui && npm install && cd ..
npm start
```
1. Ouvrez Discord et acceptez les quêtes.
2. Cliquez sur **"FARMER TOUTES LES QUÊTES"**.
3. Patientez 15 minutes et récupérez vos Orbs sur Discord.

</details>

<br/>

---

<br/>

# 🇵🇹 Português (Guia Rápido)

<details>
<summary><b>Clique aqui para ler o guia em português</b></summary>

<br/>

### Instalação & Uso:
```bash
git clone https://github.com/Mextrim/orbshacker.git
cd orbshacker
cd src-gui && npm install && cd ..
npm start
```
1. Abra o Discord e aceite as tarefas.
2. Clique em **"FARMAR TODAS AS MISSÕES"**.
3. Aguarde 15 minutos e resgate suas recompensas no Discord.

</details>

<br/>

---

<br/>

## ⚖️ Legal Notice

> **Educational purposes only.**  
> This tool is provided strictly for educational and research purposes to study process manipulation and Discord's local IPC mechanisms. Commercial use is prohibited.

<br/>

## 📄 License

Distributed under the **GNU General Public License v3.0 (GPL-3.0)**. See [`LICENSE`](./LICENSE) for full terms.

<br/>

<div align="center">

Made with ❤️ by **[Mextrim](https://github.com/Mextrim)** &nbsp;•&nbsp; Original concept by **Strykey**

<br/>

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:4ade80,40:0d1f0d,100:0a0a0a&height=120&section=footer" width="100%"/>

</div>
