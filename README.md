<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:090b10,50:111622,100:00f2fe&height=220&section=header&text=ORBSHACKER&fontSize=65&fontColor=00f2fe&fontAlignY=52&desc=Discord%20Quests%2C%20Profile%20Badges%20%26%20Hours%20Booster%20(Windows)&descSize=18&descAlignY=72&descColor=94a3b8&animation=fadeIn" width="100%"/>

<br/>

[![Release](https://img.shields.io/badge/Release-v2.11.0-00f2fe?style=for-the-badge&logo=github&logoColor=white)](https://github.com/Mextrim/orbshacker/releases/latest)
[![Website](https://img.shields.io/badge/Official_Site-GitHub_Pages-70e000?style=for-the-badge&logo=googlechrome&logoColor=white)](https://mextrim.github.io/orbshacker/)
[![Platform](https://img.shields.io/badge/Platform-Windows_x64-0078d4?style=for-the-badge&logo=windows&logoColor=white)](https://github.com/Mextrim/orbshacker/releases/latest)
[![Rust Core](https://img.shields.io/badge/Rust_Engine-465_KB-DEA584?style=for-the-badge&logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![Launcher](https://img.shields.io/badge/Native_Launcher-1.5_MB-00f5d4?style=for-the-badge&logo=rocket&logoColor=white)](https://github.com/Mextrim/orbshacker/releases/latest)
[![License](https://img.shields.io/badge/License-GPL_v3-ef4444?style=for-the-badge&logo=opensourceinitiative&logoColor=white)](./LICENSE)

<br/>

### 🌐 **[Официальный сайт проекта (GitHub Pages)](https://mextrim.github.io/orbshacker/)**

<br/>

| 🚀 Нативный Лаунчер | ⚡ Портативная версия | 📦 Полный архив |
| :---: | :---: | :---: |
| **[orbshacker-launcher.exe](https://github.com/Mextrim/orbshacker/releases/latest)**<br/>*(~1.5 МБ, авто-скачивание и запуск)* | **[orbshacker.exe](https://github.com/Mextrim/orbshacker/releases/latest)**<br/>*(Автономный исполняемый файл)* | **[orbshacker-win-x64.zip](https://github.com/Mextrim/orbshacker/releases/latest)**<br/>*(Полный пакет с runtime и ffmpeg)* |

<br/>

**⚡ ORBSHACKER v2.11.0** — специализированный нативный комплекс для Windows (10/11 x64) для автоматического выполнения заданий **Discord Quests (Orbs)**, прокачки значков профиля Discord (**150+ игр** и **5 000+ часов онлайна**), живой трансляции статуса через **Discord Rich Presence (RPC)**, 100% фонового запуска игр без засорения панели задач и безопасного авто-выключения ПК.

---

</div>

<br/>

## 🌟 Ключевые возможности

### 1. 🔇 100% Бесшумный фоновый запуск игр (Zero Taskbar Spam)
* Процессы эмуляции запускаются исключительно в скрытом системном фоне с Win32-флагами `WS_EX_TOOLWINDOW | WS_EX_NOACTIVATE | CREATE_NO_WINDOW`.
* **Никакого спама на панели задач и в Alt+Tab**: окно размером 1×1 пиксель вынесено за координаты монитора (`-32000, -32000`), не перехватывает фокус мыши или клавиатуры у пользователя.
* **100% зачёт в Discord**: флаг видимости окна остаётся активным (`IsWindowVisible == true`), благодаря чему клиент Discord стабильно засчитывает игровое время и все достижения.

---

### 2. 🎨 15 Премиальных тем оформления
Мгновенное переключение тем оформления на лету с плавной прокруткой меню:
* 💧 **Apple Liquid Glass** — глубокий 24px блюр, сатурация 180% и зеркальные блики.
* 🅱️ **Bootstrap 5 UI** — строгий корпоративный стиль (Indigo Blue + Emerald).
* 🌐 **Flat Browser** — ультраминималистичный плоский дизайн.
* 📊 **Modern Tables (Slate)** — эстетика дашбордов с микросеткой и бирюзовым неоном.
* 🎨 **Material You UI** — палитра Deep Purple & Teal в стиле Material Design 3.
* ⚡ **Кибер Неон (Cyber Neon)**, 🎮 **Discord Nitro**, 🌌 **Полночный OLED**, 🌆 **Неоновый Закат**, 🟩 **Матрица**, 🩸 **Кровавая Луна**, ✨ **Северное Сияние**, 🔮 **Аметистовая Бездна**, ☀️ **Солнечная Вспышка**, 🏮 **Токио 2077**.

---

### 3. 🔮 Автоматический Discord Rich Presence (RPC)
* Программа напрямую транслирует в ваш профиль Discord текущее действие через официальный Application ID `1567134974031962272`:
  - **Квесты Orbs**: статус фарма заданий с живым отсчётом времени.
  - **Значки профиля**: текущая игра, номер в каталоге (например, `Counter-Strike 2 (+4): 5/150`).
  - **Фарм часов AFK**: название игры и прошедшее время.
  - **Своя игра**: кастомный запуск любой игры без скачивания файлов.
* Кнопка-индикатор в заголовке окна для мгновенного включения/отключения RPC в один клик.

---

### 4. 📌 Плавающий мини-виджет (Always-on-Top)
* Нажмите кнопку **`📌`** в заголовке окна, чтобы свернуть Orbshacker в компактную карточку (`360x130`).
* Виджет закрепляется поверх всех окон с живым таймером и кнопкой быстрой остановки.

---

### 5. 🌙 Безопасное авто-выключение ПК по завершении фарма
* По окончании выполнения заданий или достижения цели игровых часов запускается 30-секундный таймер выключения с возможностью отмены (`❌ Отменить`).

---

### 6. 🏷️ Интерактивные фильтры по категориям для 150+ игр
* Мгновенный поиск и умные фильтры:
  * `🎮 Все (150)`
  * `🔥 Топ 2026` (S.T.A.L.K.E.R. 2, Black Myth: Wukong, Monster Hunter Wilds, Deadlock, Space Marine 2)
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

### 8. 🚀 Тихий автозапуск в трей и экспорт телеметрии
* Опция автоматического запуска свернутым в трей при старте Windows.
* Копирование логов в буфер обмена (`📋 Скопировать`) и экспорт в JSON (`📊 Экспорт`).

---

## 🛠️ Быстрый старт (Windows x64)

1. Скачайте **[orbshacker-launcher.exe](https://github.com/Mextrim/orbshacker/releases/latest)** (~1.5 МБ).
2. Поместите в любую удобную папку и запустите.
3. Лаунчер автоматически скачает последнюю версию программы с GitHub и запустит ORBSHACKER!

---

## 📄 Лицензия
Проект распространяется под свободной лицензией **GNU General Public License v3.0**.  
Разработано с ❤️ командой **[@Mextrim](https://github.com/Mextrim)**.
