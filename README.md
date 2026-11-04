<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:090b10,50:111622,100:00f2fe&height=220&section=header&text=ORBSHACKER&fontSize=65&fontColor=00f2fe&fontAlignY=52&desc=100%25%20Native%20Rust%20Discord%20Quests%2C%20Badges%20%26%20Hours%20Booster%20(Windows)&descSize=18&descAlignY=72&descColor=94a3b8&animation=fadeIn" width="100%"/>

<br/>

[![Release](https://img.shields.io/badge/Release-v3.0.0-00f2fe?style=for-the-badge&logo=github&logoColor=white)](https://github.com/Mextrim/orbshacker/releases/latest)
[![Website](https://img.shields.io/badge/Official_Site-GitHub_Pages-70e000?style=for-the-badge&logo=googlechrome&logoColor=white)](https://mextrim.github.io/orbshacker/)
[![Platform](https://img.shields.io/badge/Platform-Windows_x64-0078d4?style=for-the-badge&logo=windows&logoColor=white)](https://github.com/Mextrim/orbshacker/releases/latest)
[![Rust Architecture](https://img.shields.io/badge/Rust_Native-1.9_MB-DEA584?style=for-the-badge&logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![RAM Usage](https://img.shields.io/badge/RAM_Usage-~35_MB-00f5d4?style=for-the-badge&logo=speedtest&logoColor=white)](https://github.com/Mextrim/orbshacker/releases/latest)
[![License](https://img.shields.io/badge/License-GPL_v3-ef4444?style=for-the-badge&logo=opensourceinitiative&logoColor=white)](./LICENSE)

<br/>

### 🌐 **[Официальный сайт проекта (GitHub Pages)](https://mextrim.github.io/orbshacker/)**

<br/>

| ⚡ Автономная версия (1 файл) | 📦 Полный архив |
| :---: | :---: |
| **[orbshacker.exe](https://github.com/Mextrim/orbshacker/releases/latest)**<br/>*(~1.9 МБ, 100% чистый Rust, запуск в 1 клик)* | **[orbshacker-v3.0.0-win-x64.zip](https://github.com/Mextrim/orbshacker/releases/latest)**<br/>*(~1.0 МБ, портативный архив с программой и документацией)* |

<br/>

**⚡ ORBSHACKER v3.0.0** — полностью переписанный на **100% чистый нативный Rust** специализированный комплекс для Windows (10/11 x64) для автоматического выполнения заданий **Discord Quests (Orbs)**, прокачки значков профиля Discord (**353 игры** и **5 000+ часов онлайна**), живой трансляции статуса через **Discord Rich Presence (RPC)**, 100% фонового запуска игр без засорения панели задач и безопасного авто-выключения ПК.

---

</div>

<br/>

## 🚀 Преимущества перехода на 100% Native Rust (v3.0.0)

| Характеристика | Старый Electron (v2.x) | Чистый Rust (v3.0.0) | Разница |
| :--- | :---: | :---: | :---: |
| **Размер исполняемого файла** | ~110–120 МБ | **1.90 МБ** | **В 60 раз меньше!** |
| **Потребление оперативной памяти (RAM)** | 250–350 МБ | **~30–35 МБ** | **В 8 раз меньше!** |
| **Количество процессов в диспетчере** | 5–6 процессов | **1 нативный процесс** | **Чистый диспетчер задач** |
| **Скорость холодного старта** | 2.5–4.5 сек | **< 0.15 сек** | **Мгновенный отклик** |
| **Зависимости от Node.js / Electron** | Требовались | **0 (Полная автономность)** | **Без сторонних runtime** |

---

<br/>

## 🌟 Ключевые возможности

### 1. 🔇 100% Бесшумный фоновый запуск игр (Zero Taskbar Spam)
* Процессы эмуляции запускаются исключительно в скрытом системном фоне с Win32-флагами `WS_EX_TOOLWINDOW | WS_EX_NOACTIVATE | CREATE_NO_WINDOW`.
* **Никакого спама на панели задач и в Alt+Tab**: окно размером 1×1 пиксель вынесено за координаты монитора (`-32000, -32000`), не перехватывает фокус мыши или клавиатуры у пользователя.
* **100% зачёт в Discord**: флаг видимости окна остаётся активным (`IsWindowVisible == true`), благодаря чему клиент Discord стабильно засчитывает игровое время и все достижения.

---

### 2. 🎨 20 Уникальных тем оформления
Мгновенное переключение тем оформления на лету с плавной прокруткой меню:
* 💾 **Windows 98 Classic** — аутентичный серый ретро-стиль `#c0c0c0`, скошенные 3D-бордюры, синий градиент заголовка и шрифт MS Sans Serif.
* 🪟 **Windows XP (Luna)** — легендарный синий градиент Royal Blue `#0055ea`, закруглённые изумрудные кнопки «Пуск» и серебристые рамки.
* 🍎 **macOS (Big Sur / Sonoma)** — ультрасовременный эффект Frosted Glass, полупрозрачные карточки, неоновые акценты и шрифт SF Pro Display.
* 📟 **MS-DOS Terminal** — монохромный изумрудный CRT-экран `#00ff41` на глубоком чёрном фоне с эффектом мерцания и ретро-шрифтом.
* 💬 **Discord Dark Theme** — фирменная палитра Discord Nitro (`#313338`, Blurple `#5865f2`, плашка `#2b2d31`).
* 💧 **Apple Liquid Glass** — глубокий 24px блюр, сатурация 180% и зеркальные блики.
* 🅱️ **Bootstrap 5 UI** — строгий корпоративный стиль (Indigo Blue + Emerald).
* 🌐 **Flat Browser** — ультраминималистичный плоский дизайн.
* 📊 **Modern Tables (Slate)** — эстетика дашбордов с микросеткой и бирюзовым неоном.
* ⚡ **Кибер Неон**, 🤖 **Cyberpunk 2077**, 🟣 **Midnight Purple**, 🟩 **Matrix Hacker**, 🌅 **Sunset Coral**, 🌌 **AMOLED Deep Dark**, 🕹️ **Retro 80s Synthwave**, 🧛 **Dracula Dark**, ❄️ **Nord Arctic**, ☀️ **Clean Light**, 🌲 **Forest Moss**.

---

### 3. 🔮 Автоматический Discord Rich Presence (RPC)
* Программа напрямую транслирует в ваш профиль Discord текущее действие через официальный Application ID `1567134974031962272`:
  - **Квесты Orbs**: статус фарма заданий с живым отсчётом времени.
  - **Значки профиля**: текущая игра, номер в каталоге (например, `Counter-Strike 2 (+4): 5/353`).
  - **Фарм часов AFK**: название игры и прошедшее время.
  - **Своя игра**: кастомный запуск любой игры (включая GTA 6) без скачивания файлов.
  - **Забавные мемные статусы**: «Фармит значки как боженька», «Наматывает часы в CS2», «Ловит фуррей в VR», «Сидит в DOS и ждёт GTA 6» и многие другие.
* Кнопка-индикатор в заголовке окна для мгновенного включения/отключения RPC в один клик.

---

### 4. 📌 Плавающий мини-виджет (Always-on-Top)
* Нажмите кнопку **`📌`** в заголовке окна, чтобы свернуть Orbshacker в компактную карточку (`360x130`).
* Виджет закрепляется поверх всех окон с живым таймером и кнопкой быстрой остановки.

---

### 5. 🌙 Безопасное авто-выключение ПК по завершении фарма
* По окончании выполнения заданий или достижения цели игровых часов запускается 30-секундный таймер выключения с возможностью отмены (`❌ Отменить`).

---

### 6. 🏷️ Интерактивные фильтры по категориям для 353 игр
* Мгновенный поиск и умные фильтры:
  * `🎮 Все (353)`
  * `🔥 Топ 2026` (Grand Theft Auto VI, S.T.A.L.K.E.R. 2, Black Myth: Wukong, Monster Hunter Wilds, Deadlock, Space Marine 2)
  * `🔫 Шутеры` (CS2, Apex Legends, PUBG, Escape from Tarkov, Rainbow Six Siege)
  * `⚔️ RPG / Экшен` (Cyberpunk 2077, The Witcher 3, Elden Ring, Baldur's Gate 3)
  * `👑 MOBA & Кооп` (Dota 2, League of Legends, Helldivers 2, Lethal Company)
  * `🌲 Выживание` (Rust, Palworld, DayZ, ARK, Sons of the Forest)
  * `🏎️ Симуляторы` (Euro Truck Simulator 2, Forza Horizon 5, Assetto Corsa)

---

### 7. 🔔 Встроенный синтезатор звуков (Web Audio API)
* 4 звуковых профиля без загрузки лишних файлов:
  * `⚡ Кибер-сигнал (Tokyo 2077)`
  * `🎮 8-Bit Level Up (Ретро)`
  * `🔔 Мягкий колокольчик (Дзен)`
  * `🎺 Победный фанфар`
* Кнопка `▶ Тест` в окне настроек для мгновенного прослушивания.

---

### 8. 📋 Экспорт телеметрии и логов
* Копирование логов в буфер обмена (`📋 Скопировать`) и экспорт структурированного JSON-отчёта (`📊 Экспорт`).

---

## 🛠️ Быстрый старт (Windows x64)

1. Скачайте **[orbshacker.exe](https://github.com/Mextrim/orbshacker/releases/latest)** (~1.9 МБ).
2. Запустите двойным кликом — установка не требуется!
3. Выберите нужные задания или игры и нажмите «Начать фарм».

---

## 📄 Лицензия
Проект распространяется под свободной лицензией **GNU General Public License v3.0**.  
Разработано с ❤️ командой **[@Mextrim](https://github.com/Mextrim)**.
