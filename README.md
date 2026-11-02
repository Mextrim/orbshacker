<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:090b10,50:111622,100:00f2fe&height=220&section=header&text=ORBSHACKER&fontSize=65&fontColor=00f2fe&fontAlignY=52&desc=Discord%20Quests%2C%20Profile%20Badges%20%26%20Hours%20Booster&descSize=18&descAlignY=72&descColor=94a3b8&animation=fadeIn" width="100%"/>

<br/>

[![Release](https://img.shields.io/badge/Release-v2.5.0-00f2fe?style=for-the-badge&logo=github&logoColor=white)](https://github.com/Mextrim/orbshacker/releases/latest)
[![Website](https://img.shields.io/badge/Official_Site-GitHub_Pages-70e000?style=for-the-badge&logo=googlechrome&logoColor=white)](https://mextrim.github.io/orbshacker/)
[![Platform](https://img.shields.io/badge/Platform-Windows_%7C_Linux-blue?style=for-the-badge&logo=linux&logoColor=white)](https://github.com/Mextrim/orbshacker/releases/latest)
[![Rust Core](https://img.shields.io/badge/Rust_Engine-507_KB-DEA584?style=for-the-badge&logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![Launcher](https://img.shields.io/badge/Native_Launcher-1.8_MB-00f5d4?style=for-the-badge&logo=rocket&logoColor=white)](https://github.com/Mextrim/orbshacker/releases/download/v2.5.0/orbshacker-launcher.exe)
[![License](https://img.shields.io/badge/License-GPL_v3-ef4444?style=for-the-badge&logo=opensourceinitiative&logoColor=white)](./LICENSE)

<br/>

### 🌐 **[Официальный сайт проекта (GitHub Pages)](https://mextrim.github.io/orbshacker/)**

<br/>

| 🪟 **Windows (x64)** | 🐧 **Linux (x64 - Любой дистрибутив)** |
| :---: | :---: |
| 🚀 **[Скачать Лаунчер orbshacker-launcher.exe (1.8 МБ)](https://github.com/Mextrim/orbshacker/releases/download/v2.5.0/orbshacker-launcher.exe)**<br/>*(Автоматически скачивает и распаковывает все файлы с GitHub)* | 🚀 **[Скачать Лаунчер orbshacker-launcher-linux-x64 (1.8 МБ)](https://github.com/Mextrim/orbshacker/releases/download/v2.5.0/orbshacker-launcher-linux-x64)**<br/>*(Для всех дистрибутивов: Ubuntu, Arch, Fedora, Debian)* |
| 📦 **[Скачать полный ZIP-архив (115 МБ)](https://github.com/Mextrim/orbshacker/releases/download/v2.5.0/orbshacker-v2.5.0-win-x64.zip)** | 📦 **[Скачать AppImage (85 МБ)](https://github.com/Mextrim/orbshacker/releases/download/v2.5.0/orbshacker-2.5.0.AppImage)** |
| ⚡ **[Портативный orbshacker.exe (80 МБ)](https://github.com/Mextrim/orbshacker/releases/download/v2.5.0/orbshacker.exe)** | 🐧 **[Скачать tar.gz архив (85 МБ)](https://github.com/Mextrim/orbshacker/releases/download/v2.5.0/orbshacker-v2.5.0-linux-x64.tar.gz)** |

<br/>

**⚡ ORBSHACKER v2.5.0** — мощный комплекс для автоматического выполнения заданий **Discord Quests (Orbs)**, прокачки значков профиля Discord (**100+ игр** и **5 000+ часов онлайна**) и запуска любых кастомных игр без нагрузки на ПК и без реального скачивания файлов.

*Поддерживаются только **Windows** и **Linux**.*

---

</div>

<br/>

## 🌟 Возможности программы

### 1. 🚀 Нативный ультралёгкий лаунчер (`orbshacker-launcher`)
* **Размер всего 1.8 МБ**: написан на чистом Rust без тяжёлых сторонних библиотек.
* **Автоматическая установка**: лаунчер подключается к GitHub Releases, скачивает последнюю версию дистрибутива, распаковывает все библиотеки (`ffmpeg.dll`, `d3dcompiler_47.dll`) и запускает приложение.
* **Никаких ошибок missing DLL**: исключена ошибка `Не удается продолжить выполнение кода, поскольку система не обнаружила ffmpeg.dll`.
* **Мгновенный старт**: если приложение уже скачано, запуск происходит за **0.05 секунды** без задержек.

---

### 2. 🏆 Бустер значков профиля Discord (Profile Badges)
Прокачивайте официальные значки Discord, отображаемые в вашем профиле:

```
[Значок: Количество игр на ПК]
Пробующий (2 игры) ➔ Интересующийся (5) ➔ Энтузиаст (10) ➔ Рейнджер (15) ➔ Исследователь (20) 
➔ Искатель приключений (30) ➔ Открыватель (40) ➔ Свободный дух (60) ➔ Многосторонняя личность (80) ➔ 👑 Универсал (От 100 игр)
```

* **Каталог из 105 обнаруживаемых игр**: CS2, Dota 2, GTA V, Rust, Cyberpunk 2077, Palworld, Helldivers 2, Apex Legends, Witcher 3 и др.
* **Параллельный запуск по 5 игр одновременно**: быстрая прокачка уровня значка.
* **100% зачёт Discord Heartbeat**: строгое соблюдение интервала фиксации активности Discord (от 5 до 10 минут).
* **Минималистичный UI**: без громоздких плашек и лишних чисел — чистый прогресс `Игра: CS2 (04:12) [15%]`.

---

### 3. ⏱️ Бесконечный AFK-фарм игровых часов
Накрутка игрового времени для значка «Вечный игрок» (вплоть до 5 000+ часов):
* **0.0% нагрузки на процессор и видеокарту**: процесс работает в фоне без нагрева ПК.
* **Пресеты**: 1ч, 5ч, 10ч, 24ч, 100ч и **Бесконечный AFK-режим**.

---

### 4. 🎮 Запуск любой игры без скачивания (Своя Игра)
* Отображение любой игры в статусе Discord Rich Presence без скачивания гигабайтов данных на SSD:
  * Введите любое название (например, *S.T.A.L.K.E.R. 2: Heart of Chornobyl*, *Grand Theft Auto VI*, *Black Myth: Wukong*).
  * Укажите имя процесса (например, `Stalker2-Win64-Shipping.exe`).
  * Нажмите «Запустить» — игра мгновенно видна в вашем Discord-статусе!

---

### 5. 🎨 10 неоновых стилей оформления
Мгновенное переключение тем оформления на лету:
* ⚡ **Кибер Неон (Cyber Neon)**
* 🎮 **Токио 2077 (Tokyo 2077)**
* 🌌 **Discord Nitro**
* 🖤 **Полночный OLED**
* 🌆 **Неоновый Закат (Synthwave Sunset)**
* 🟩 **Матрица (Matrix)**
* 🩸 **Кровавая Луна (Crimson)**

---

## 🛠️ Быстрый старт

### 🪟 Для Windows:
1. Скачайте **[orbshacker-launcher.exe](https://github.com/Mextrim/orbshacker/releases/download/v2.5.0/orbshacker-launcher.exe)**.
2. Поместите в любую удобную папку и запустите.
3. Лаунчер сам скачает всё необходимое с GitHub и запустит ORBSHACKER!

### 🐧 Для Linux:
1. Скачайте **[orbshacker-launcher-linux-x64](https://github.com/Mextrim/orbshacker/releases/download/v2.5.0/orbshacker-launcher-linux-x64)**.
2. Дайте права на исполнение:
   ```bash
   chmod +x orbshacker-launcher-linux-x64
   ./orbshacker-launcher-linux-x64
   ```
3. Или запустите портативный AppImage:
   ```bash
   chmod +x orbshacker-2.5.0.AppImage
   ./orbshacker-2.5.0.AppImage
   ```

---

## 📄 Лицензия
Проект распространяется под свободной лицензией **GNU General Public License v3.0**.  
Разработано с ❤️ командой **[@Mextrim](https://github.com/Mextrim)**.
