(function () {
  let currentLang = 'ru';
  let currentTheme = localStorage.getItem('orbshacker_theme') || 'cyber';
  let activeQuests = [];
  let detectableGames = [];
  let gameCountTiers = [];
  let hoursTiers = [];

  let isFarming = false;
  let isBadgeFarming = false;
  let isHoursFarming = false;
  let isCustomFarming = false;
  let liveProfile = null;

  let farmDurationMinutes = 15;
  let selectedTargetHours = 13;
  let soundEnabled = true;
  let discordPollInterval = null;
  let rpcBroadcastEnabled = localStorage.getItem('orbshacker_rpc_enabled') !== 'false';

  // Theme metadata
  const THEMES = {
    cyber: { name: 'Кибер Неон', icon: '⚡' },
    nitro: { name: 'Discord Nitro', icon: '🎮' },
    oled: { name: 'Полночный OLED', icon: '🌌' },
    synth: { name: 'Неоновый Закат', icon: '🌆' },
    matrix: { name: 'Матрица', icon: '🟩' },
    crimson: { name: 'Кровавая Луна', icon: '🩸' },
    aurora: { name: 'Северное Сияние', icon: '✨' },
    amethyst: { name: 'Аметистовая Бездна', icon: '🔮' },
    solar: { name: 'Солнечная Вспышка', icon: '☀️' },
    tokyo: { name: 'Токио 2077', icon: '🏮' },
    bootstrap: { name: 'Bootstrap 5 UI', icon: '🅱️' },
    flat: { name: 'Flat Browser', icon: '🌐' },
    slate: { name: 'Modern Tables', icon: '📊' },
    liquid: { name: 'Apple Liquid Glass', icon: '💧' },
    material: { name: 'Material You UI', icon: '🎨' },
    win98: { name: 'Windows 98 Retro', icon: '🪟' },
    winxp: { name: 'Windows XP Luna', icon: '💿' },
    macos: { name: 'macOS Big Sur', icon: '🍏' },
    msdos: { name: 'MS-DOS CRT', icon: '📟' },
    discord: { name: 'Discord Official', icon: '💬' },
  };

  const LANGS = {
    ru: { name: 'Русский', flag: '🇷🇺' },
    en: { name: 'English', flag: '🇬🇧' },
    es: { name: 'Español', flag: '🇪🇸' },
    pt: { name: 'Português', flag: '🇵🇹' },
    de: { name: 'Deutsch', flag: '🇩🇪' },
    fr: { name: 'Français', flag: '🇫🇷' },
  };

  // DOM Elements
  const themeDropdownBtn = document.getElementById('themeDropdownBtn');
  const themeDropdownMenu = document.getElementById('themeDropdownMenu');
  const currentThemeLabel = document.getElementById('currentThemeLabel');

  const langDropdownBtn = document.getElementById('langDropdownBtn');
  const langDropdownMenu = document.getElementById('langDropdownMenu');
  const currentLangFlag = document.getElementById('currentLangFlag');
  const currentLangLabel = document.getElementById('currentLangLabel');

  const btnSettings = document.getElementById('btnSettings');
  const btnMinimize = document.getElementById('btnMinimize');
  const btnMaximize = document.getElementById('btnMaximize');
  const btnClose = document.getElementById('btnClose');

  // Tabs
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanels = {
    quests: document.getElementById('panelQuests'),
    badges: document.getElementById('panelBadges'),
    custom: document.getElementById('panelCustom'),
  };

  // Quests elements
  const btnFarmAll = document.getElementById('btnFarmAll');
  const btnFarmAllText = document.getElementById('btnFarmAllText');
  const btnOpenDiscord = document.getElementById('btnOpenDiscord');
  const btnStopFarm = document.getElementById('btnStopFarm');
  const timerText = document.getElementById('timerText');
  const progressText = document.getElementById('progressText');
  const progressPercentSub = document.getElementById('progressPercentSub');
  const progressFill = document.getElementById('progressFill');
  const farmingStatusText = document.getElementById('farmingStatusText');
  const questsGrid = document.getElementById('questsGrid');
  const questsCountBadge = document.getElementById('questsCountBadge');
  const totalOrbsText = document.getElementById('totalOrbsText');

  // Badges elements
  const btnFarmAll100 = document.getElementById('btnFarmAll100');
  const btnFarmNext10 = document.getElementById('btnFarmNext10');
  const btnFarmNext2 = document.getElementById('btnFarmNext2');
  const btnStopBadges = document.getElementById('btnStopBadges');
  const badgeCountProgressBox = document.getElementById('badgeCountProgressBox');
  const badgeCountStatusText = document.getElementById('badgeCountStatusText');
  const badgeCountPercentText = document.getElementById('badgeCountPercentText');
  const badgeCountProgressFill = document.getElementById('badgeCountProgressFill');
  const gameCountTierTracker = document.getElementById('gameCountTierTracker');
  const gamesSearchInput = document.getElementById('gamesSearchInput');
  const detectableGamesGrid = document.getElementById('detectableGamesGrid');
  const catalogCountLabel = document.getElementById('catalogCountLabel');

  // Hours elements
  const btnStartHoursFarm = document.getElementById('btnStartHoursFarm');
  const btnStartAfkFarm = document.getElementById('btnStartAfkFarm');
  const btnStopHoursFarm = document.getElementById('btnStopHoursFarm');
  const hoursTierTracker = document.getElementById('hoursTierTracker');
  const hoursGameSelect = document.getElementById('hoursGameSelect');
  const hoursLiveBox = document.getElementById('hoursLiveBox');
  const hoursStatusText = document.getElementById('hoursStatusText');
  const hoursTimerDisplay = document.getElementById('hoursTimerDisplay');
  const hoursProgressFill = document.getElementById('hoursProgressFill');
  const hoursPresetChips = document.querySelectorAll('.hours-presets .preset-chip');

  // Custom Game elements
  const customGameNameInput = document.getElementById('customGameNameInput');
  const customExeInput = document.getElementById('customExeInput');
  const customSteamIdInput = document.getElementById('customSteamIdInput');
  const btnLaunchCustomGame = document.getElementById('btnLaunchCustomGame');
  const btnStopCustomGame = document.getElementById('btnStopCustomGame');
  const customRunningLabel = document.getElementById('customRunningLabel');

  // Discord Rich Presence Broadcast Elements
  const rpcBroadcastBadge = document.getElementById('rpcBroadcastBadge');
  const rpcBroadcastText = document.getElementById('rpcBroadcastText');
  const settingsRpcBroadcastToggle = document.getElementById('settingsRpcBroadcastToggle');
  const linkRpcGithub = document.getElementById('linkRpcGithub');

  // Logs & Modals
  const telemetryLogs = document.getElementById('telemetryLogs');
  const btnClearLogs = document.getElementById('btnClearLogs');
  const modalCompleted = document.getElementById('modalCompleted');
  const btnModalDiscord = document.getElementById('btnModalDiscord');
  const btnModalClose = document.getElementById('btnModalClose');

  const modalSettings = document.getElementById('modalSettings');
  const btnSettingsClose = document.getElementById('btnSettingsClose');
  const btnSettingsSave = document.getElementById('btnSettingsSave');
  const settingsDurationInput = document.getElementById('settingsDurationInput');
  const settingsDurationVal = document.getElementById('settingsDurationVal');
  const settingsSoundToggle = document.getElementById('settingsSoundToggle');
  const settingsSoundProfile = document.getElementById('settingsSoundProfile');
  const btnTestSound = document.getElementById('btnTestSound');
  const settingsAutoStartToggle = document.getElementById('settingsAutoStartToggle');
  const settingsAutoShutdownToggle = document.getElementById('settingsAutoShutdownToggle');
  const settingsAutoDiscordToggle = document.getElementById('settingsAutoDiscordToggle');

  // Mini-Widget & Shutdown Elements
  const btnMiniMode = document.getElementById('btnMiniMode');
  const btnMiniExpand = document.getElementById('btnMiniExpand');
  const btnMiniStop = document.getElementById('btnMiniStop');
  const miniGameLabel = document.getElementById('miniGameLabel');
  const miniTimerDisplay = document.getElementById('miniTimerDisplay');
  const miniPercentDisplay = document.getElementById('miniPercentDisplay');
  const miniProgressFill = document.getElementById('miniProgressFill');
  const modalShutdown = document.getElementById('modalShutdown');
  const shutdownCountdownVal = document.getElementById('shutdownCountdownVal');
  const btnCancelShutdown = document.getElementById('btnCancelShutdown');
  const btnConfirmShutdown = document.getElementById('btnConfirmShutdown');
  const btnCopyLogs = document.getElementById('btnCopyLogs');
  const btnExportStats = document.getElementById('btnExportStats');

  // Updater Elements
  const btnUpdateAvailable = document.getElementById('btnUpdateAvailable');
  const updateAvailableText = document.getElementById('updateAvailableText');
  const modalUpdate = document.getElementById('modalUpdate');
  const btnUpdateModalClose = document.getElementById('btnUpdateModalClose');
  const updateCurrentVer = document.getElementById('updateCurrentVer');
  const updateNewVer = document.getElementById('updateNewVer');
  const updateReleaseNotes = document.getElementById('updateReleaseNotes');
  const updateProgressBox = document.getElementById('updateProgressBox');
  const updateProgressText = document.getElementById('updateProgressText');
  const updateProgressPercent = document.getElementById('updateProgressPercent');
  const updateProgressFill = document.getElementById('updateProgressFill');
  const btnOpenReleaseGithub = document.getElementById('btnOpenReleaseGithub');
  const btnPostponeUpdate = document.getElementById('btnPostponeUpdate');
  const btnStartDownloadUpdate = document.getElementById('btnStartDownloadUpdate');
  const settingsUpdateStatus = document.getElementById('settingsUpdateStatus');
  const btnCheckUpdateManual = document.getElementById('btnCheckUpdateManual');
  let latestUpdateInfo = null;
  let isDownloadingUpdate = false;

  // ==========================================
  // 1. THEME ENGINE
  // ==========================================
  function setTheme(theme) {
    if (!THEMES[theme]) theme = 'cyber';
    currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('orbshacker_theme', theme);

    if (currentThemeLabel) {
      const dict = I18N[currentLang] || I18N['ru'];
      if (dict && dict['theme_' + theme]) {
        currentThemeLabel.textContent = dict['theme_' + theme].replace(/^[^\s]+\s*/, '');
      } else {
        currentThemeLabel.textContent = THEMES[theme].name;
      }
    }

    if (themeDropdownBtn) {
      const iconSpan = themeDropdownBtn.querySelector('span:first-child');
      if (iconSpan && THEMES[theme] && THEMES[theme].icon) {
        iconSpan.textContent = THEMES[theme].icon;
      }
    }

    // Update checkmark in dropdown
    document.querySelectorAll('#themeDropdownMenu .dropdown-item').forEach((item) => {
      const val = item.getAttribute('data-theme-val');
      const isSel = val === theme;
      item.classList.toggle('selected', isSel);
      const chk = item.querySelector('.check');
      if (chk) chk.textContent = isSel ? '✓' : '';
    });
  }

  themeDropdownBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    langDropdownMenu.classList.remove('active');
    themeDropdownMenu.classList.toggle('active');
  });

  document.querySelectorAll('#themeDropdownMenu .dropdown-item').forEach((item) => {
    item.addEventListener('click', () => {
      const val = item.getAttribute('data-theme-val');
      if (val && THEMES[val]) {
        setTheme(val);
        themeDropdownMenu.classList.remove('active');
        addLog(`Theme changed to: ${THEMES[val].name}`, 'info');
      }
    });
  });

  // ==========================================
  // 2. LANGUAGE ENGINE (No ugly white select)
  // ==========================================
  function setLanguage(lang) {
    if (!I18N[lang]) lang = 'en';
    currentLang = lang;

    if (LANGS[lang]) {
      currentLangFlag.textContent = LANGS[lang].flag;
      currentLangLabel.textContent = LANGS[lang].name;
    }

    // Update checkmark in dropdown
    document.querySelectorAll('#langDropdownMenu .dropdown-item').forEach((item) => {
      const val = item.getAttribute('data-lang-val');
      const isSel = val === lang;
      item.classList.toggle('selected', isSel);
      const chk = item.querySelector('.check');
      if (chk) chk.textContent = isSel ? '✓' : '';
    });

    const dict = I18N[lang];
    if (currentThemeLabel && dict['theme_' + currentTheme]) {
      currentThemeLabel.textContent = dict['theme_' + currentTheme].replace(/^[^\s]+\s*/, '');
    }
    document.querySelectorAll('#themeDropdownMenu .dropdown-item').forEach((item) => {
      const val = item.getAttribute('data-theme-val');
      const textSpan = item.querySelector('span:first-child');
      if (textSpan && dict['theme_' + val]) {
        textSpan.textContent = dict['theme_' + val];
      }
    });
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (dict[key]) {
        el.textContent = dict[key];
      }
    });

    if (isFarming) {
      btnFarmAllText.textContent = dict.farming;
      farmingStatusText.textContent = dict.farming;
    } else {
      btnFarmAllText.textContent = dict.farm_all;
      farmingStatusText.textContent = dict.ready_to_farm;
    }

    renderQuests();
    renderTierTrackers();
    checkDiscordStatus();
  }

  langDropdownBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    themeDropdownMenu.classList.remove('active');
    langDropdownMenu.classList.toggle('active');
  });

  document.querySelectorAll('#langDropdownMenu .dropdown-item').forEach((item) => {
    item.addEventListener('click', () => {
      const val = item.getAttribute('data-lang-val');
      setLanguage(val);
      langDropdownMenu.classList.remove('active');
      addLog(`Language changed to: ${LANGS[val].name}`, 'info');
    });
  });

  // Close dropdowns on click outside
  document.addEventListener('click', () => {
    themeDropdownMenu.classList.remove('active');
    langDropdownMenu.classList.remove('active');
  });

  // ==========================================
  // 3. TAB NAVIGATION
  // ==========================================
  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-tab');
      tabButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      Object.keys(tabPanels).forEach((k) => {
        if (tabPanels[k]) {
          tabPanels[k].classList.toggle('active', k === target);
        }
      });
    });
  });

  // Window Controls
  btnMinimize.addEventListener('click', () => window.orbshacker.minimize());
  btnMaximize.addEventListener('click', () => window.orbshacker.maximize());
  btnClose.addEventListener('click', () => window.orbshacker.close());

  // Desktop Push Notifications
  function showDesktopNotification(title, message) {
    try {
      if (typeof Notification !== 'undefined') {
        if (Notification.permission === 'granted') {
          new Notification(title, { body: message });
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission().then((p) => {
            if (p === 'granted') new Notification(title, { body: message });
          });
        }
      }
    } catch (_) {}
  }

  // Multi-Profile Web Audio Chimes
  let soundProfile = localStorage.getItem('orbshacker_sound_profile') || 'cyber';

  function playCompletionChime(overrideProfile = null) {
    if (!soundEnabled) return;
    try {
      const profile = overrideProfile || soundProfile || 'cyber';
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const t = ctx.currentTime;

      if (profile === 'retro') {
        // 8-Bit Level Up Arpeggio
        const freqs = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.5];
        freqs.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(freq, t + i * 0.07);
          gain.gain.setValueAtTime(0.08, t + i * 0.07);
          gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.07 + 0.12);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t + i * 0.07);
          osc.stop(t + i * 0.07 + 0.14);
        });
      } else if (profile === 'zen') {
        // Meditative crystalline sine chime
        [528, 792, 1056].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, t);
          gain.gain.setValueAtTime(0, t);
          gain.gain.linearRampToValueAtTime(0.15 / (i + 1), t + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t);
          osc.stop(t + 2.0);
        });
      } else if (profile === 'fanfare') {
        // Victory Fanfare Triplet
        const notes = [
          { f: 440, delay: 0, dur: 0.12 },
          { f: 440, delay: 0.14, dur: 0.12 },
          { f: 440, delay: 0.28, dur: 0.12 },
          { f: 587.33, delay: 0.44, dur: 0.5 },
        ];
        notes.forEach((c) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(c.f, t + c.delay);
          gain.gain.setValueAtTime(0.2, t + c.delay);
          gain.gain.exponentialRampToValueAtTime(0.001, t + c.delay + c.dur);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t + c.delay);
          osc.stop(t + c.delay + c.dur + 0.05);
        });
      } else {
        // Cyber Neon Chime
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, t + i * 0.1);
          gain.gain.setValueAtTime(0, t + i * 0.1);
          gain.gain.linearRampToValueAtTime(0.2, t + i * 0.1 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t + i * 0.1);
          osc.stop(t + i * 0.1 + 0.4);
        });
      }
    } catch (_) {}
  }

  // Telemetry Logging
    function addLog(message, level = 'info') {
    if (telemetryLogs && telemetryLogs.children.length > 200) {
      telemetryLogs.removeChild(telemetryLogs.firstChild);
    }
    const entry = document.createElement('div');
    entry.className = `log-entry ${level}`;
    const time = new Date().toLocaleTimeString();
    entry.textContent = `[${time}] ${message}`;
    telemetryLogs.appendChild(entry);
    telemetryLogs.scrollTop = telemetryLogs.scrollHeight;
  }

  btnClearLogs.addEventListener('click', () => {
    telemetryLogs.innerHTML = '';
  });

  // Discord Status Polling
  async function checkDiscordStatus() {
    try {
      const res = await window.orbshacker.call('check_discord_status');
      const dot = document.querySelector('.status-dot');
      const text = document.getElementById('discordStatusText');
      const dict = I18N[currentLang] || {};
      const isConnected = !!(res && res.connected);
      if (isConnected) {
        dot.style.background = 'var(--accent-green)';
        dot.style.boxShadow = '0 0 6px var(--accent-green)';
        text.textContent = dict.status_connected || 'Discord подключён';
      } else {
        dot.style.background = 'var(--accent-orange)';
        dot.style.boxShadow = '0 0 6px var(--accent-orange)';
        text.textContent = dict.status_disconnected || 'Discord не запущен';
      }
      if (typeof updateRpcBadgeUI === 'function') {
        updateRpcBadgeUI(rpcBroadcastEnabled, isConnected);
      }
    } catch (_) {}
  }

  // Settings Handlers
  btnSettings.addEventListener('click', () => {
    modalSettings.classList.add('active');
  });

  btnSettingsClose.addEventListener('click', () => {
    modalSettings.classList.remove('active');
  });

  settingsDurationInput.addEventListener('input', (e) => {
    settingsDurationVal.textContent = `${e.target.value} мин`;
  });

  let autoShutdownEnabled = localStorage.getItem('orbshacker_auto_shutdown') === 'true';
  let shutdownTimerInterval = null;

  if (settingsSoundProfile) {
    settingsSoundProfile.value = soundProfile;
  }
  if (settingsAutoShutdownToggle) {
    settingsAutoShutdownToggle.checked = autoShutdownEnabled;
  }
  if (btnTestSound) {
    btnTestSound.addEventListener('click', () => {
      const p = settingsSoundProfile ? settingsSoundProfile.value : soundProfile;
      playCompletionChime(p);
    });
  }

  // Load OS Autostart state
  if (window.orbshacker && window.orbshacker.getAutoLaunch && settingsAutoStartToggle) {
    window.orbshacker.getAutoLaunch().then((enabled) => {
      settingsAutoStartToggle.checked = !!enabled;
    }).catch(() => {});
  }

  btnSettingsSave.addEventListener('click', () => {
    farmDurationMinutes = parseInt(settingsDurationInput.value, 10) || 15;
    soundEnabled = settingsSoundToggle.checked;
    if (settingsSoundProfile) {
      soundProfile = settingsSoundProfile.value;
      localStorage.setItem('orbshacker_sound_profile', soundProfile);
    }
    if (settingsAutoShutdownToggle) {
      autoShutdownEnabled = settingsAutoShutdownToggle.checked;
      localStorage.setItem('orbshacker_auto_shutdown', autoShutdownEnabled.toString());
    }
    if (settingsAutoStartToggle && window.orbshacker && window.orbshacker.setAutoLaunch) {
      window.orbshacker.setAutoLaunch(settingsAutoStartToggle.checked).catch(() => {});
    }

    if (settingsAutoDiscordToggle.checked) {
      if (!discordPollInterval) {
        discordPollInterval = setInterval(checkDiscordStatus, 4000);
      }
    } else if (discordPollInterval) {
      clearInterval(discordPollInterval);
      discordPollInterval = null;
    }
    if (!isFarming) {
      const m = farmDurationMinutes.toString().padStart(2, '0');
      timerText.textContent = `${m}:00`;
    }
    modalSettings.classList.remove('active');
    addLog(`Параметры сохранены: длительность=${farmDurationMinutes}мин, звук=${soundEnabled} (${soundProfile}), авто-выключение=${autoShutdownEnabled}`, 'info');
  });

  // Auto-Shutdown Countdown Dialog Logic
  function triggerAutoShutdownCountdown() {
    if (!autoShutdownEnabled) return;
    if (!modalShutdown || !shutdownCountdownVal) return;

    modalShutdown.classList.add('active');
    let secondsLeft = 30;
    shutdownCountdownVal.textContent = `${secondsLeft} сек`;

    if (shutdownTimerInterval) clearInterval(shutdownTimerInterval);
    shutdownTimerInterval = setInterval(() => {
      secondsLeft--;
      if (shutdownCountdownVal) shutdownCountdownVal.textContent = `${secondsLeft} сек`;
      if (secondsLeft <= 0) {
        clearInterval(shutdownTimerInterval);
        shutdownTimerInterval = null;
        if (window.orbshacker && window.orbshacker.shutdownSystem) {
          window.orbshacker.shutdownSystem();
        }
      }
    }, 1000);
  }

  if (btnCancelShutdown) {
    btnCancelShutdown.addEventListener('click', () => {
      if (shutdownTimerInterval) {
        clearInterval(shutdownTimerInterval);
        shutdownTimerInterval = null;
      }
      if (modalShutdown) modalShutdown.classList.remove('active');
      addLog('Авто-выключение компьютера отменено пользователем.', 'info');
    });
  }

  if (btnConfirmShutdown) {
    btnConfirmShutdown.addEventListener('click', () => {
      if (shutdownTimerInterval) {
        clearInterval(shutdownTimerInterval);
        shutdownTimerInterval = null;
      }
      if (window.orbshacker && window.orbshacker.shutdownSystem) {
        window.orbshacker.shutdownSystem();
      }
    });
  }

  // Copy Logs to Clipboard
  if (btnCopyLogs) {
    btnCopyLogs.addEventListener('click', async () => {
      const logs = Array.from(telemetryLogs.querySelectorAll('.log-entry'))
        .map((el) => el.textContent)
        .join('\n');
      if (!logs) return;
      let ok = false;
      if (window.orbshacker && window.orbshacker.copyToClipboard) {
        ok = await window.orbshacker.copyToClipboard(logs);
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(logs);
        ok = true;
      }
      if (ok) {
        const orig = btnCopyLogs.textContent;
        btnCopyLogs.textContent = '✅ Скопировано!';
        btnCopyLogs.style.color = 'var(--accent-green)';
        setTimeout(() => {
          btnCopyLogs.textContent = orig;
          btnCopyLogs.style.color = '';
        }, 1800);
      }
    });
  }

  // Export Stats to JSON
  if (btnExportStats) {
    btnExportStats.addEventListener('click', async () => {
      const report = {
        app: 'ORBSHACKER',
        version: 'v3.1.1',
        timestamp: new Date().toISOString(),
        active_quests_count: activeQuests.length,
        detectable_games_count: detectableGames.length,
        discord_connected: liveProfile ? liveProfile.connected : false,
        farm_duration_minutes: farmDurationMinutes,
        logs: Array.from(telemetryLogs.querySelectorAll('.log-entry')).map((e) => e.textContent),
      };
      const json = JSON.stringify(report, null, 2);
      if (window.orbshacker && window.orbshacker.copyToClipboard) {
        await window.orbshacker.copyToClipboard(json);
      }
      const orig = btnExportStats.textContent;
      btnExportStats.textContent = '✅ JSON в буфере!';
      btnExportStats.style.color = 'var(--accent-primary)';
      setTimeout(() => {
        btnExportStats.textContent = orig;
        btnExportStats.style.color = '';
      }, 1800);
      addLog('Отчёт телеметрии экспортирован в буфер обмена (JSON).', 'success');
    });
  }

  // Mini-Widget Floating View Mode
  if (btnMiniMode) {
    btnMiniMode.addEventListener('click', async () => {
      if (window.orbshacker && window.orbshacker.toggleMiniMode) {
        await window.orbshacker.toggleMiniMode();
      }
    });
  }
  if (btnMiniExpand) {
    btnMiniExpand.addEventListener('click', async () => {
      if (window.orbshacker && window.orbshacker.toggleMiniMode) {
        await window.orbshacker.toggleMiniMode();
      }
    });
  }
  if (btnMiniStop) {
    btnMiniStop.addEventListener('click', () => {
      if (isFarming) stopFarming();
      else if (isBadgeFarming || isHoursFarming || isCustomFarming) stopBadgeFarm();
    });
  }
  if (window.orbshacker && window.orbshacker.onMiniModeChange) {
    window.orbshacker.onMiniModeChange((isMini) => {
      document.body.classList.toggle('mini-mode', isMini);
      if (isMini) updateMiniWidgetDisplay();
    });
  }

  function updateMiniWidgetDisplay() {
    if (!miniGameLabel) return;
    if (isFarming) {
      miniGameLabel.textContent = `⚡ Квесты Discord (${activeQuests.length})`;
      miniTimerDisplay.textContent = timerText.textContent || '15:00';
      miniPercentDisplay.textContent = progressText.textContent || '0%';
      miniProgressFill.style.width = progressFill.style.width || '0%';
    } else if (isBadgeFarming) {
      miniGameLabel.textContent = badgeCountStatusText.textContent || 'Фарм игр';
      const timerMatch = (badgeCountStatusText.textContent || '').match(/\(([^)]+)\)/);
      miniTimerDisplay.textContent = timerMatch ? timerMatch[1] : '05:00';
      miniPercentDisplay.textContent = badgeCountPercentText.textContent || '0%';
      miniProgressFill.style.width = badgeCountProgressFill.style.width || '0%';
    } else if (isHoursFarming) {
      miniGameLabel.textContent = hoursStatusText.textContent || 'Фарм часов';
      miniTimerDisplay.textContent = hoursTimerDisplay.textContent || '00:00:00';
      miniPercentDisplay.textContent = 'AFK ∞';
      miniProgressFill.style.width = hoursProgressFill.style.width || '100%';
    } else if (isCustomFarming) {
      miniGameLabel.textContent = customGameNameInput.value || 'Своя Игра';
      miniTimerDisplay.textContent = 'ONLINE';
      miniPercentDisplay.textContent = '100%';
      miniProgressFill.style.width = '100%';
    } else {
      miniGameLabel.textContent = 'Готов к запуску';
      miniTimerDisplay.textContent = '00:00:00';
      miniPercentDisplay.textContent = '0%';
      miniProgressFill.style.width = '0%';
    }
  }

  // ==========================================
  // AUTO-UPDATER ENGINE (GitHub Releases)
  // ==========================================
  async function checkForAppUpdates(isManual = false) {
    if (!window.orbshacker || !window.orbshacker.checkForUpdates) return;
    try {
      if (isManual && settingsUpdateStatus) {
        settingsUpdateStatus.textContent = 'Проверка обновлений...';
      }
      const info = await window.orbshacker.checkForUpdates();
      if (!info) return;

      latestUpdateInfo = info;

      if (info.hasUpdate) {
        if (btnUpdateAvailable && updateAvailableText) {
          updateAvailableText.textContent = info.latestVersion;
          btnUpdateAvailable.style.display = 'inline-flex';
        }
        if (settingsUpdateStatus) {
          settingsUpdateStatus.innerHTML = `<span style="color: var(--accent-orange); font-weight: 700;">🔥 Доступна ${info.latestVersion}!</span>`;
        }
        addLog(`🔥 Доступна новая версия: ${info.latestVersion}! Нажмите на значок обновления в заголовке или настройках.`, 'warn');

        if (isManual) {
          showUpdateModal(info);
        }
      } else {
        if (settingsUpdateStatus) {
          settingsUpdateStatus.textContent = `У вас последняя версия (${info.currentVersion || 'v3.1.1'}) ✓`;
        }
        if (isManual) {
          addLog(`У вас установлена последняя актуальная версия (${info.currentVersion || 'v3.1.1'})!`, 'success');
        }
      }
    } catch (err) {
      if (isManual) {
        if (settingsUpdateStatus) settingsUpdateStatus.textContent = 'Ошибка проверки';
        addLog(`Ошибка проверки обновлений: ${err.message}`, 'error');
      }
    }
  }

  function formatReleaseNotesRu(rawNotes, newVer) {
    if (!rawNotes || typeof rawNotes !== 'string') {
      return `✨ Что нового в обновлении ${newVer || ''}:
• 🔮 Автоматический Discord Rich Presence: программа напрямую транслирует в ваш профиль Discord текущее действие (квесты Orbs, 356 игр для значков, фарм часов AFK, свою игру) с живым отсчётом времени через Application ID 1567134974031962272.
• ⚡ Кнопка-индикатор RPC в шапке: мгновенное отображение статуса вещания и возможность в один клик включить или выключить трансляцию.
• 🔒 Single-Instance Lock: надёжная защита от запуска дублирующих процессов программы.
• 🔄 Умный установщик обновлений: фоновая замена файлов без ошибок блокировки на Windows.
• 📌 Плавающий мини-виджет (Always-on-Top): карточка поверх всех окон с живым таймером.
• 🌙 Безопасный таймер авто-выключения ПК: отключение ПК по завершении фарма.
• 🏷️ Интерактивные фильтры по 7 категориям: быстрый выбор среди 356 игр.`;
    }

    const hasCyrillic = /[а-яА-ЯёЁ]{4,}/.test(rawNotes);
    if (hasCyrillic) {
      // Clean up markdown headers if any and present clean text
      return rawNotes
        .replace(/^#{1,6}\s*(.*)$/gm, '$1')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    }

    // Auto-translate English GitHub Release notes into clean Russian
    let translated = rawNotes
      .replace(/##?\s*🚀?\s*Orbshacker.*?(?=\n)/gi, `✨ Обновление Orbshacker ${newVer || ''}:`)
      .replace(/Multi-platform release.*?(?=\n)/gi, 'Официальный нативный релиз для Windows.')
      .replace(/###?\s*✨?\s*What's New.*?(?=\n)/gi, 'Что нового:')
      .replace(/Discord Rich Presence \(RPC\)/gi, 'Discord Rich Presence (Автоматический RPC)')
      .replace(/Single-Instance Lock/gi, 'Защита от повторного запуска (Single-Instance)')
      .replace(/Floating Mini-Widget Mode/gi, 'Плавающий мини-виджет (Always-on-Top)')
      .replace(/Safe Auto-Shutdown Timer/gi, 'Безопасный таймер авто-выключения ПК')
      .replace(/150\+\s*Games Instant Category Filter/gi, 'Интерактивные фильтры по категориям для 356 игр')
      .replace(/Zero-Footprint Web Audio Sound Engine/gi, 'Звуковой движок Web Audio (4 звуковых профиля)')
      .replace(/Autostart with OS \(Silent in Tray\)/gi, 'Тихий автозапуск с системой в трей')
      .replace(/Telemetry Copy & Export/gi, 'Копирование и экспорт логов')
      .replace(/Discord Profile Badges Booster/gi, 'Бустер значков профиля Discord (356 игр)')
      .replace(/Zero-Download Game Spoofer/gi, 'Фарм игр без реального скачивания файлов')
      .replace(/Theme Engine & Glassmorphism UI/gi, '20 дизайнерских тем (Win 98, XP, macOS Big Sur, MS-DOS, Discord)')
      .replace(/Cross-Platform Auto-Updates/gi, 'Плавное авто-обновление без ошибок')
      .replace(/^#{1,6}\s*(.*)$/gm, '$1');

    return translated.trim();
  }

  function showUpdateModal(info) {
    if (!info || !modalUpdate) return;
    if (updateCurrentVer) updateCurrentVer.textContent = info.currentVersion ? `v${info.currentVersion.replace(/^v/, '')}` : 'v3.0.0';
    if (updateNewVer) updateNewVer.textContent = info.latestVersion || 'v3.1.1';
    if (updateReleaseNotes) updateReleaseNotes.textContent = formatReleaseNotesRu(info.releaseNotes, info.latestVersion);
    if (updateProgressBox) updateProgressBox.style.display = 'none';
    if (btnStartDownloadUpdate) {
      btnStartDownloadUpdate.disabled = false;
      btnStartDownloadUpdate.innerHTML = '<span>⬇ Скачать и обновить</span>';
    }
    modalUpdate.classList.add('active');
  }

  if (btnUpdateAvailable) {
    btnUpdateAvailable.addEventListener('click', () => {
      if (latestUpdateInfo) showUpdateModal(latestUpdateInfo);
      else checkForAppUpdates(true);
    });
  }

  if (btnCheckUpdateManual) {
    btnCheckUpdateManual.addEventListener('click', () => checkForAppUpdates(true));
  }

  if (btnUpdateModalClose) {
    btnUpdateModalClose.addEventListener('click', () => {
      if (!isDownloadingUpdate) modalUpdate.classList.remove('active');
    });
  }

  if (btnPostponeUpdate) {
    btnPostponeUpdate.addEventListener('click', () => {
      if (!isDownloadingUpdate) modalUpdate.classList.remove('active');
    });
  }

  if (btnOpenReleaseGithub) {
    btnOpenReleaseGithub.addEventListener('click', () => {
      const url = (latestUpdateInfo && latestUpdateInfo.releaseUrl) || 'https://github.com/Mextrim/orbshacker/releases/latest';
      if (window.orbshacker && window.orbshacker.openExternal) {
        window.orbshacker.openExternal(url);
      }
    });
  }

  if (btnStartDownloadUpdate) {
    btnStartDownloadUpdate.addEventListener('click', async () => {
      if (!latestUpdateInfo || !latestUpdateInfo.downloadUrl) {
        addLog('Ссылка на скачивание не найдена в релизе.', 'error');
        return;
      }
      isDownloadingUpdate = true;
      btnStartDownloadUpdate.disabled = true;
      btnStartDownloadUpdate.innerHTML = '<span>⏳ Загрузка...</span>';
      if (btnPostponeUpdate) btnPostponeUpdate.disabled = true;
      if (updateProgressBox) updateProgressBox.style.display = 'flex';
      if (updateProgressFill) updateProgressFill.style.width = '0%';
      if (updateProgressPercent) updateProgressPercent.textContent = '0%';
      if (updateProgressText) updateProgressText.textContent = 'Подключение к серверам GitHub...';

      addLog(`Загрузка обновления ${latestUpdateInfo.latestVersion} с GitHub...`, 'info');

      try {
        await window.orbshacker.downloadUpdate({
          downloadUrl: latestUpdateInfo.downloadUrl,
          checksumUrl: latestUpdateInfo.checksumUrl,
          assetName: latestUpdateInfo.assetName
        });

        if (updateProgressText) updateProgressText.textContent = '✅ Обновление установлено! Перезапуск программы...';
        if (updateProgressFill) updateProgressFill.style.width = '100%';
        if (updateProgressPercent) updateProgressPercent.textContent = '100%';
        if (btnStartDownloadUpdate) btnStartDownloadUpdate.innerHTML = '<span>✅ Перезапуск...</span>';
        addLog('Обновление успешно загружено и проверено! Перезапуск программы...', 'success');
      } catch (err) {
        isDownloadingUpdate = false;
        btnStartDownloadUpdate.disabled = false;
        btnStartDownloadUpdate.innerHTML = '<span>🔄 Повторить попытку</span>';
        if (btnPostponeUpdate) btnPostponeUpdate.disabled = false;

        let friendlyError = (err && err.message) || 'Неизвестная ошибка';
        if (friendlyError.includes('EBUSY') || friendlyError.includes('locked')) {
          friendlyError = 'Файл программы занят. Закройте другие копии Orbshacker и повторите.';
        } else if (friendlyError.includes('SHA-256')) {
          friendlyError = 'Ошибка проверки контрольной суммы файла. Попробуйте снова.';
        } else if (friendlyError.includes('timeout') || friendlyError.includes('ETIMEDOUT')) {
          friendlyError = 'Таймаут соединения. Проверьте подключение к интернету и повторите.';
        } else if (friendlyError.includes('404')) {
          friendlyError = 'Файл обновления не найден в релизе на GitHub.';
        }

        if (updateProgressText) updateProgressText.textContent = `Ошибка: ${friendlyError}`;
        addLog(`Ошибка при установке обновления: ${friendlyError}`, 'error');
      }
    });
  }

  if (window.orbshacker && window.orbshacker.onUpdateProgress) {
    window.orbshacker.onUpdateProgress((p) => {
      if (updateProgressFill && updateProgressPercent && updateProgressText) {
        const pct = Math.round(p.percent);
        updateProgressFill.style.width = `${pct}%`;
        updateProgressPercent.textContent = `${pct}%`;
        const mb = (p.downloadedBytes / (1024 * 1024)).toFixed(1);
        const totalMb = (p.totalBytes / (1024 * 1024)).toFixed(1);

        if (pct >= 100) {
          updateProgressText.textContent = 'Проверка контрольной суммы SHA-256...';
          if (btnStartDownloadUpdate) btnStartDownloadUpdate.innerHTML = '<span>⚙️ Установка...</span>';
        } else {
          updateProgressText.textContent = `Загрузка: ${mb} МБ из ${totalMb} МБ (${pct}%)`;
        }
      }
    });
  }

  // ==========================================
  // 4. RENDER QUEST CARDS
  // ==========================================
  function renderQuests() {
    questsGrid.innerHTML = '';
    const dict = I18N[currentLang];
    const fragment = document.createDocumentFragment();

    activeQuests.forEach((q) => {
      const card = document.createElement('div');
      card.className = 'quest-card';

      let badgeClass = 'badge';
      let badgeText = q.badge;
      if (q.needs_rpc) {
        badgeClass = 'badge rpc';
        badgeText = dict.fc27_badge || q.badge;
      } else if (q.steam_app_id) {
        badgeClass = 'badge steam';
        badgeText = dict.steam_badge || q.badge;
      } else {
        badgeText = dict.direct_badge || q.badge;
      }

      const btnText = isFarming ? (dict.farming.slice(0, 10) + '...') : dict.single_farm;
      const btnDisabled = isFarming ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : '';
      const color = q.icon_color || '#3b82f6';
      const initial = (q.game_title || q.title || 'Q').charAt(0).toUpperCase();

      card.innerHTML = `
        <div class="quest-header">
          <div class="quest-header-left">
            <div class="quest-icon-badge" style="background: ${color}22; border-color: ${color}55; color: ${color}; box-shadow: 0 0 10px ${color}25;">
              <span>${initial}</span>
            </div>
            <div class="quest-title-block">
              <span class="quest-title">${q.title || q.name}</span>
              <span class="quest-publisher">${q.publisher || ''}</span>
            </div>
          </div>
          <span class="${badgeClass}">${badgeText}</span>
        </div>
        <div class="quest-footer">
          <div class="reward-pill">
            <span class="reward-orb"></span>
            <span>+${(q.orbs_reward || q.reward_orbs || 700).toLocaleString()} Orbs</span>
          </div>
          <button class="btn-card" data-id="${q.id}" ${btnDisabled}>
            ${btnText}
          </button>
        </div>
      `;

      const btn = card.querySelector('.btn-card');
      if (!isFarming) {
        btn.addEventListener('click', () => {
          startFarming([q.id]);
        });
      }

      fragment.appendChild(card);
    });

    questsGrid.appendChild(fragment);

    if (questsCountBadge) questsCountBadge.textContent = activeQuests.length;
    const totalOrbs = activeQuests.reduce((sum, q) => sum + (q.orbs_reward || q.reward_orbs || 0), 0);
    totalOrbsText.textContent = `+${totalOrbs.toLocaleString()}`;
  }

  // ==========================================
  // 5. QUESTS FARMING ACTIONS
  // ==========================================
  async function startFarming(questIds = ['all']) {
    try {
      addLog(`Starting farm for: ${questIds.join(', ')} (${farmDurationMinutes} min)...`, 'info');
      const res = await window.orbshacker.call('start_farm', { quests: questIds, minutes: farmDurationMinutes });
      if (res && res.started) {
        isFarming = true;
        btnFarmAll.disabled = true;
        btnFarmAllText.textContent = I18N[currentLang].farming;
        btnStopFarm.style.display = 'inline-flex';
        farmingStatusText.textContent = I18N[currentLang].farming;
        renderQuests();
        addLog(`Successfully launched ${res.launched_count} quest processes!`, 'success');
      }
    } catch (err) {
      addLog(`Failed to start farm: ${err.message}`, 'error');
    }
  }

  async function stopFarming() {
    try {
      await window.orbshacker.call('stop_farm');
      resetFarmingState();
      addLog('Quest farm session aborted by user.', 'warn');
    } catch (err) {
      addLog(`Failed to stop farm: ${err.message}`, 'error');
    }
  }

  function resetFarmingState() {
    isFarming = false;
    btnFarmAll.disabled = false;
    btnFarmAllText.textContent = I18N[currentLang].farm_all;
    btnStopFarm.style.display = 'none';
    farmingStatusText.textContent = I18N[currentLang].ready_to_farm;
    const m = farmDurationMinutes.toString().padStart(2, '0');
    timerText.textContent = `${m}:00`;
    progressText.textContent = '0.0%';
    progressPercentSub.textContent = '0%';
    progressFill.style.width = '0%';
    renderQuests();
  }

  btnFarmAll.addEventListener('click', () => startFarming(['all']));
  btnStopFarm.addEventListener('click', stopFarming);

  // Direct Open Discord Quests button
  btnOpenDiscord.addEventListener('click', () => {
    window.orbshacker.openDiscordQuests();
    addLog('Opening Discord Quests home page directly in Discord...', 'info');
  });

  // Modal handlers
  btnModalClose.addEventListener('click', () => {
    modalCompleted.classList.remove('active');
  });

  btnModalDiscord.addEventListener('click', () => {
    window.orbshacker.openDiscordQuests();
    modalCompleted.classList.remove('active');
  });

  // ==========================================
  // 6. BADGES VISUAL PROGRESSION & CATALOG
  // ==========================================
  function renderTierTrackers() {
    // Statistics removed per user request for a cleaner UI
  }

  function formatRemainingTime(seconds) {
    if (!seconds || seconds <= 0) return '';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return ` (${m}:${s.toString().padStart(2, '0')})`;
  }

  function highlightFarmingGame(gameName) {
    if (!detectableGamesGrid || !gameName) return;
    const cleanName = gameName.trim().toLowerCase();
    detectableGamesGrid.querySelectorAll('.game-item-chip').forEach((chip) => {
      const nameEl = chip.querySelector('.game-item-name');
      if (nameEl && nameEl.textContent.trim().toLowerCase() === cleanName) {
        chip.classList.add('farming');
      } else {
        chip.classList.remove('farming');
      }
    });
  }

  const TOP_2026_IDS = [
    'gta6', 'wilds', 'stalker2', 'spacemarine2', 'wukong', 'deadlock', 'silenthill2',
    'manorlords', 'helldivers2', 'dragonsdogma2', 'palworld', 'tekken8', 'persona3r',
    'frostpunk2', 'kcd2', 'marvel_rivals', 'poe2', 'civ7', 'doom_dark_ages'
  ];

  function getCategoryMeta(cat, name, id) {
    const c = (cat || '').toLowerCase();
    const n = (name || '').toLowerCase();
    const i = (id || '').toLowerCase();

    // 1. Horror
    if (c.includes('horror') || c.includes('хоррор') || ['silenthill', 'residentevil', 'deadspace', 'outlast', 'phasmophobia', 'fnaf', 'amnesia', 'alanwake', 'lethal'].some(k => i.includes(k) || n.includes(k))) {
      return { icon: '👻', cls: 'cat-horror', label: 'Хоррор' };
    }

    // 2. Shooters (FPS, TPS, Tactical, Arena, Battle Royale, Military)
    if (c.includes('shoot') || c.includes('fps') || c.includes('шутер') || c.includes('tps') || c.includes('looter') || c.includes('extraction') || c.includes('military') || c.includes('tactical') ||
        ['cs2', 'apex', 'pubg', 'tarkov', 'rainbow', 'tf2', 'doom', 'overwatch', 'warframe', 'valorant', 'crossfire', 'stalcraft', 'stalker', 'deltaforce', 'payday', 'helldivers', 'squad', 'arma', 'metro', 'gungeon', 'isaac', 'brotato', 'warthunder', 'wot', 'wows'].some(k => i.includes(k))) {
      return { icon: '🎯', cls: 'cat-shooter', label: 'Шутер' };
    }

    // 3. MOBA & Co-op / Party / Social
    if (c.includes('moba') || c.includes('hero') || c.includes('кооп') || c.includes('co-op') || c.includes('party') || c.includes('social') || c.includes('deduction') ||
        ['dota2', 'lol', 'rocket', 'deadlock', 'brawl', 'smite', 'paladins', 'amongus', 'fallguys', 'partyanimals', 'gangbeasts', 'goosegoose', 'crabgame', 'tabletop'].some(k => i.includes(k))) {
      return { icon: '👑', cls: 'cat-moba', label: 'MOBA / Кооп' };
    }

    // 4. Survival & Sandbox
    if (c.includes('survival') || c.includes('выживан') || c.includes('sandbox') ||
        ['rust', 'ark', 'palworld', 'dayz', 'valheim', 'forest', 'terraria', 'subnautica', 'minecraft', 'raft', '7dtd', 'enshrouded', 'projectzomboid', 'dontstarve'].some(k => i.includes(k))) {
      return { icon: '🌲', cls: 'cat-survival', label: 'Выживание' };
    }

    // 5. Racing & Simulators / Sports
    if (c.includes('racing') || c.includes('симулятор') || c.includes('гонк') || c.includes('sim') || c.includes('flight') || c.includes('truck') || c.includes('sport') || c.includes('golf') || c.includes('derby') || c.includes('mechanic') ||
        ['forza', 'eurotruck', 'assetto', 'beamng', 'f1', 'needforspeed', 'crew', 'granturismo', 'dirt', 'wrc', 'snowrunner', 'msfs', 'fifa', 'ea_fc', 'nba', 'wreckfest', 'mudrunner', 'mysummercar'].some(k => i.includes(k))) {
      return { icon: '🏎️', cls: 'cat-racing', label: 'Симулятор' };
    }

    // 6. Strategy, 4X, Colony & Builders
    if (c.includes('strat') || c.includes('стратег') || c.includes('rts') || c.includes('4x') || c.includes('colony') || c.includes('factory') || c.includes('automation') || c.includes('builder') || c.includes('management') || c.includes('deckbuilding') || c.includes('roguelike') ||
        ['civ', 'starcraft', 'totalwar', 'hearts', 'crusader', 'stellaris', 'manorlords', 'factorio', 'satisfactory', 'rimworld', 'frostpunk', 'ageofempires', 'warcraft', 'balatro', 'slaythespire', 'monstertrain', 'wildfrost', 'backpack'].some(k => i.includes(k))) {
      return { icon: '🏰', cls: 'cat-strategy', label: 'Стратегия' };
    }

    // 7. Fighting
    if (c.includes('fight') || c.includes('файтинг') || c.includes('brawler') ||
        ['tekken', 'streetfighter', 'mortal', 'guilty', 'brawlhalla', 'smash', 'stickfight'].some(k => i.includes(k))) {
      return { icon: '🥊', cls: 'cat-fighting', label: 'Файтинг' };
    }

    // 8. RPG, ARPG & Souls-like
    if (c.includes('rpg') || c.includes('ролев') || c.includes('souls') || c.includes('arpg') || c.includes('jrpg') ||
        ['witcher', 'cyberpunk', 'eldenring', 'skyrim', 'fallout', 'bg3', 'starfield', 'wukong', 'dragonsdogma', 'persona', 'kcd', 'poe', 'diablo', 'genshin', 'honkai', 'zelda', 'finalfantasy', 'chivalry', 'mordhau'].some(k => i.includes(k))) {
      return { icon: '⚔️', cls: 'cat-rpg', label: 'RPG' };
    }

    // 9. Action, Adventure, Metroidvania & Platformer
    if (c.includes('action') || c.includes('экшен') || c.includes('adventure') || c.includes('open world') || c.includes('metroidvania') || c.includes('thriller') || c.includes('puzzle') || c.includes('platformer') ||
        ['gta', 'rdr', 'assassin', 'batman', 'spiderman', 'godofwar', 'horizon', 'uncharted', 'tomb', 'silksong', 'portal', 'heavyrain', 'beyond', 'celeste', 'pizzatower', 'geometrydash', 'cuphead', 'speedrunners'].some(k => i.includes(k))) {
      return { icon: '⚡', cls: 'cat-action', label: 'Экшен' };
    }

    return { icon: '🎮', cls: 'cat-default', label: 'Игры' };
  }

  let selectedCategory = 'all';

  function updateCategoryCounts() {
    if (!detectableGames || detectableGames.length === 0) return;
    const counts = {
      all: detectableGames.length,
      top2026: 0,
      shooter: 0,
      rpg: 0,
      moba: 0,
      survival: 0,
      racing: 0,
      horror: 0,
      strategy: 0
    };

    detectableGames.forEach((g) => {
      if (TOP_2026_IDS.includes(g.id)) counts.top2026++;
      const meta = getCategoryMeta(g.category, g.name, g.id);
      if (meta.cls === 'cat-shooter') counts.shooter++;
      else if (meta.cls === 'cat-rpg' || meta.cls === 'cat-action') counts.rpg++;
      else if (meta.cls === 'cat-moba') counts.moba++;
      else if (meta.cls === 'cat-survival') counts.survival++;
      else if (meta.cls === 'cat-racing') counts.racing++;
      else if (meta.cls === 'cat-horror') counts.horror++;
      else if (meta.cls === 'cat-strategy') counts.strategy++;
    });

    const mapping = {
      all: 'catCountAll',
      top2026: 'catCountTop2026',
      shooter: 'catCountShooter',
      rpg: 'catCountRpg',
      moba: 'catCountMoba',
      survival: 'catCountSurvival',
      racing: 'catCountRacing',
      horror: 'catCountHorror',
      strategy: 'catCountStrategy'
    };

    Object.entries(mapping).forEach(([catKey, elId]) => {
      const el = document.getElementById(elId);
      if (el && counts[catKey] !== undefined) {
        el.textContent = counts[catKey];
      }
    });
  }

  function renderDetectableGames(filterText = '', category = null) {
    if (!detectableGamesGrid) return;
    if (category !== null) selectedCategory = category;
    detectableGamesGrid.innerHTML = '';
    const q = (filterText !== '' ? filterText : (gamesSearchInput ? gamesSearchInput.value : '')).toLowerCase().trim();

    const filtered = detectableGames.filter((g) => {
      // 1. Category check
      if (selectedCategory === 'top2026') {
        if (!TOP_2026_IDS.includes(g.id)) return false;
      } else if (selectedCategory === 'shooter') {
        const meta = getCategoryMeta(g.category, g.name, g.id);
        if (meta.cls !== 'cat-shooter') return false;
      } else if (selectedCategory === 'rpg') {
        const meta = getCategoryMeta(g.category, g.name, g.id);
        if (meta.cls !== 'cat-rpg' && meta.cls !== 'cat-action') return false;
      } else if (selectedCategory === 'moba') {
        const meta = getCategoryMeta(g.category, g.name, g.id);
        if (meta.cls !== 'cat-moba') return false;
      } else if (selectedCategory === 'survival') {
        const meta = getCategoryMeta(g.category, g.name, g.id);
        if (meta.cls !== 'cat-survival') return false;
      } else if (selectedCategory === 'racing') {
        const meta = getCategoryMeta(g.category, g.name, g.id);
        if (meta.cls !== 'cat-racing') return false;
      } else if (selectedCategory === 'horror') {
        const meta = getCategoryMeta(g.category, g.name, g.id);
        if (meta.cls !== 'cat-horror') return false;
      } else if (selectedCategory === 'strategy') {
        const meta = getCategoryMeta(g.category, g.name, g.id);
        if (meta.cls !== 'cat-strategy') return false;
      }

      // 2. Search text check
      if (q) {
        const meta = getCategoryMeta(g.category, g.name, g.id);
        return g.name.toLowerCase().includes(q) ||
               g.exe_name.toLowerCase().includes(q) ||
               (g.category && g.category.toLowerCase().includes(q)) ||
               meta.label.toLowerCase().includes(q);
      }
      return true;
    });

    const fragment = document.createDocumentFragment();

    filtered.forEach((g) => {
      const chip = document.createElement('div');
      chip.className = 'game-item-chip';
      const meta = getCategoryMeta(g.category, g.name, g.id);
      chip.innerHTML = `
        <div class="game-chip-info">
          <div class="game-chip-icon-badge ${meta.cls}" title="${meta.label}">${meta.icon}</div>
          <div class="game-chip-text">
            <span class="game-item-name" title="${escapeHtml(g.name)}">${escapeHtml(g.name)}</span>
            <span class="game-item-sub">${escapeHtml(g.exe_name)} • ${escapeHtml(g.category || meta.label)}</span>
          </div>
        </div>
        <div class="game-chip-actions">
          <button class="btn-chip-launch" title="Запустить игру на значок в Discord">▶ +1 игра</button>
          <button class="btn-chip-hours" title="Выбрать игру для фарма часов">⏱ Часы</button>
        </div>
      `;

      function selectGameForHours(game) {
        if (!hoursGameSelect) return;
        hoursGameSelect.value = game.id;
        const hoursCard = hoursGameSelect.closest('.badge-feature-card');
        if (hoursCard) {
          hoursCard.style.transition = 'box-shadow 0.3s ease, border-color 0.3s ease';
          hoursCard.style.borderColor = 'var(--accent-primary)';
          hoursCard.style.boxShadow = '0 0 24px var(--accent-primary-glow)';
          setTimeout(() => {
            hoursCard.style.borderColor = '';
            hoursCard.style.boxShadow = '';
          }, 1200);
          hoursCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        addLog(`Выбрана игра '${game.name}' для фарма часов.`, 'info');
      }

      chip.querySelector('.game-chip-info').addEventListener('click', () => {
        selectGameForHours(g);
      });

      chip.querySelector('.btn-chip-hours').addEventListener('click', (e) => {
        e.stopPropagation();
        selectGameForHours(g);
      });

      chip.querySelector('.btn-chip-launch').addEventListener('click', (e) => {
        e.stopPropagation();
        startSingleGame(g.id, g.name, badgeSpeedDuration);
      });

      fragment.appendChild(chip);
    });

    detectableGamesGrid.appendChild(fragment);

    if (catalogCountLabel) {
      catalogCountLabel.textContent = `${filtered.length} / ${detectableGames.length} игр`;
    }

    updateCategoryCounts();
  }

  // Interactive Category Filter Row Handlers
  document.querySelectorAll('#categoryFiltersRow .category-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#categoryFiltersRow .category-chip').forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      const cat = chip.getAttribute('data-cat') || 'all';
      renderDetectableGames(gamesSearchInput ? gamesSearchInput.value : '', cat);
    });
  });

  if (gamesSearchInput) {
    gamesSearchInput.addEventListener('input', (e) => {
      renderDetectableGames(e.target.value);
    });
  }

  // ==========================================
  // 7. BADGES: GAME COUNT BOOSTER (100+ Games)
  // ==========================================
  let badgeSpeedDuration = parseInt(localStorage.getItem('orbshacker_badge_speed') || '305', 10);
  if (badgeSpeedDuration < 300) {
    badgeSpeedDuration = 305;
    localStorage.setItem('orbshacker_badge_speed', '305');
  }

  const badgeSpeedChips = document.querySelectorAll('#badgeSpeedPresets .preset-chip');
  if (badgeSpeedChips.length > 0) {
    badgeSpeedChips.forEach((chip) => {
      const spd = parseInt(chip.getAttribute('data-badge-speed'), 10);
      chip.classList.toggle('active', spd === badgeSpeedDuration);
      chip.addEventListener('click', () => {
        badgeSpeedChips.forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        badgeSpeedDuration = spd;
        localStorage.setItem('orbshacker_badge_speed', spd.toString());
        addLog(`Длительность сессии пакета установлена: ${spd} сек (${(spd/60).toFixed(1)} мин).`, 'info');
      });
    });
  }

  async function startSingleGame(gameId, gameName, durationSecs = null) {
    const dur = Math.max(durationSecs || badgeSpeedDuration || 305, 300);
    try {
      addLog(`Запуск игры '${gameName}' на ${dur} сек. (Discord 5-мин Heartbeat)...`, 'info');
      const res = await window.orbshacker.call('start_single_game', { game_id: gameId, duration_secs: dur });
      if (res && res.started) {
        isBadgeFarming = true;
        btnFarmAll100.disabled = true;
        btnFarmNext10.disabled = true;
        btnFarmNext2.disabled = true;
        btnStopBadges.style.display = 'inline-flex';
        badgeCountProgressBox.style.display = 'flex';
        badgeCountStatusText.textContent = `Игра: ${res.game_name} (запущена...)`;
        badgeCountPercentText.textContent = '0%';
        badgeCountProgressFill.style.width = '0%';
        addLog(`Процесс '${res.game_name}' активен. Discord фиксирует сессию (таймер ${dur}с)...`, 'success');
      }
    } catch (err) {
      addLog(`Ошибка запуска игры: ${err.message}`, 'error');
    }
  }

  async function startBadgeCount(count, offset = 0) {
    const dur = Math.max(badgeSpeedDuration || 305, 300);
    try {
      addLog(`Запуск параллельного фарма ${count} игр (по 5 игр сразу, сессия ${dur}с, смещение ${offset})...`, 'info');
      const res = await window.orbshacker.call('start_badge_count', { target_count: count, start_offset: offset, duration_secs: dur });
      if (res && res.started) {
        isBadgeFarming = true;
        btnFarmAll100.disabled = true;
        btnFarmNext10.disabled = true;
        btnFarmNext2.disabled = true;
        btnStopBadges.style.display = 'inline-flex';
        badgeCountProgressBox.style.display = 'flex';
        badgeCountStatusText.textContent = `Подготовка пакета игр...`;
        badgeCountPercentText.textContent = '0%';
        badgeCountProgressFill.style.width = '0%';
        addLog(`Запущена серия из ${res.total_games} игр (по 5 одновременно)!`, 'success');
      }
    } catch (err) {
      addLog(`Failed to start badge game count farm: ${err.message}`, 'error');
    }
  }

  async function stopBadgeFarm() {
    try {
      await window.orbshacker.call('stop_badge_farm');
      resetBadgeCountState();
      resetHoursFarmState();
      resetCustomGameState();
      addLog('Badge farming stopped.', 'warn');
    } catch (err) {
      addLog(`Failed to stop badge farm: ${err.message}`, 'error');
    }
  }

  function resetBadgeCountState() {
    isBadgeFarming = false;
    btnFarmAll100.disabled = false;
    btnFarmNext10.disabled = false;
    btnFarmNext2.disabled = false;
    btnStopBadges.style.display = 'none';
    badgeCountProgressBox.style.display = 'none';
    if (detectableGamesGrid) {
      detectableGamesGrid.querySelectorAll('.game-item-chip.farming').forEach((c) => c.classList.remove('farming'));
    }
  }

  btnFarmAll100.addEventListener('click', () => startBadgeCount(detectableGames.length || 356, 0));
  btnFarmNext10.addEventListener('click', () => startBadgeCount(10, 0));
  btnFarmNext2.addEventListener('click', () => startBadgeCount(5, 0));

  btnStopBadges.addEventListener('click', stopBadgeFarm);

  // ==========================================
  // 8. BADGES: PLAYTIME HOURS BOOSTER
  // ==========================================
  function populateHoursGameSelect() {
    if (!hoursGameSelect || !detectableGames || !detectableGames.length) return;
    const currentVal = hoursGameSelect.value;
    hoursGameSelect.innerHTML = detectableGames
      .map((g) => `<option value="${g.id}">${g.name} (${g.exe_name})</option>`)
      .join('');
    if (currentVal && detectableGames.some((g) => g.id === currentVal)) {
      hoursGameSelect.value = currentVal;
    } else {
      hoursGameSelect.value = 'cs2';
    }
  }

  hoursPresetChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      hoursPresetChips.forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      selectedTargetHours = parseInt(chip.getAttribute('data-hours'), 10);
    });
  });

  async function startHoursFarm(isInfinite = false) {
    const gameId = hoursGameSelect.value || 'cs2';
    const hours = isInfinite ? 0 : (selectedTargetHours || 13);

    try {
      addLog(`Starting Playtime Hours booster (Game: ${gameId}, Goal: ${isInfinite ? 'Infinite AFK' : hours + 'h'})...`, 'info');
      const res = await window.orbshacker.call('start_badge_hours', {
        game_id: gameId,
        hours: hours,
        is_infinite: isInfinite,
      });

      if (res && res.started) {
        isHoursFarming = true;
        btnStartHoursFarm.disabled = true;
        btnStartAfkFarm.disabled = true;
        btnStopHoursFarm.style.display = 'inline-flex';
        hoursLiveBox.style.display = 'flex';
        hoursStatusText.textContent = `Фарм часов: ${res.game_name} ${isInfinite ? '(AFK ∞)' : `(Цель: ${hours}ч)`}`;
        hoursTimerDisplay.textContent = '00:00:00';
        hoursProgressFill.style.width = '0%';
        addLog(`Started zero-load background booster for '${res.game_name}'!`, 'success');
      }
    } catch (err) {
      addLog(`Failed to start hours farm: ${err.message}`, 'error');
    }
  }

  function resetHoursFarmState() {
    isHoursFarming = false;
    btnStartHoursFarm.disabled = false;
    btnStartAfkFarm.disabled = false;
    btnStopHoursFarm.style.display = 'none';
    hoursLiveBox.style.display = 'none';
  }

  btnStartHoursFarm.addEventListener('click', () => startHoursFarm(false));
  btnStartAfkFarm.addEventListener('click', () => startHoursFarm(true));
  btnStopHoursFarm.addEventListener('click', stopBadgeFarm);

  // ==========================================
  // 9. CUSTOM GAME LAUNCHER
  // ==========================================
  btnLaunchCustomGame.addEventListener('click', async () => {
    const name = customGameNameInput.value.trim() || 'Custom Game';
    let exe = customExeInput.value.trim() || 'game.exe';
    if (!exe.endsWith('.exe')) exe += '.exe';
    const appid = parseInt(customSteamIdInput.value, 10) || null;

    try {
      addLog(`Launching custom game stub '${name}' (${exe})...`, 'info');
      const res = await window.orbshacker.call('start_badge_hours', {
        game_id: exe,
        game_name: name,
        hours: 0,
        is_infinite: true,
      });

      if (res && res.started) {
        isCustomFarming = true;
        btnLaunchCustomGame.disabled = true;
        btnStopCustomGame.style.display = 'inline-flex';
        customRunningLabel.style.display = 'inline';
        customRunningLabel.textContent = `● '${name}' запущен и виден в Discord!`;
        addLog(`Custom game '${name}' is now active in Discord!`, 'success');
      }
    } catch (err) {
      addLog(`Failed to launch custom game: ${err.message}`, 'error');
    }
  });

  btnStopCustomGame.addEventListener('click', stopBadgeFarm);

  // Quick Presets for Custom Game Tab
  const CUSTOM_PRESETS = {
    gta6: { name: 'Grand Theft Auto VI', exe: 'GTA6.exe', appid: '271590' },
    stalker2: { name: 'S.T.A.L.K.E.R. 2: Heart of Chornobyl', exe: 'Stalker2-Win64-Shipping.exe', appid: '1643320' },
    wukong: { name: 'Black Myth: Wukong', exe: 'b1.exe', appid: '2358720' },
    spacemarine2: { name: 'Warhammer 40,000: Space Marine 2', exe: 'Warhammer 40000 Space Marine 2 - Retail.exe', appid: '2183900' },
    wilds: { name: 'Monster Hunter Wilds', exe: 'MonsterHunterWilds.exe', appid: '2246340' },
    deadlock: { name: 'Deadlock', exe: 'project8.exe', appid: '1422450' },
    helldivers2: { name: 'HELLDIVERS™ 2', exe: 'helldivers2.exe', appid: '553850' },
    silenthill2: { name: 'SILENT HILL 2', exe: 'SHProto-Win64-Shipping.exe', appid: '2124490' },
    manorlords: { name: 'Manor Lords', exe: 'ManorLords-Win64-Shipping.exe', appid: '1363080' },
  };

  document.querySelectorAll('.preset-pill-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const presetKey = btn.getAttribute('data-preset');
      const p = CUSTOM_PRESETS[presetKey];
      if (p) {
        customGameNameInput.value = p.name;
        customExeInput.value = p.exe;
        customSteamIdInput.value = p.appid;
        addLog(`Применён пресет: ${p.name}`, 'info');
      }
    });
  });

  function resetCustomGameState() {
    isCustomFarming = false;
    btnLaunchCustomGame.disabled = false;
    btnStopCustomGame.style.display = 'none';
    customRunningLabel.style.display = 'none';
  }

  // ==========================================
  // 10. BACKGROUND EVENTS FROM RUST CORE
  // ==========================================
  window.orbshacker.onEvent((event, data) => {
    if (event === 'tick') {
      const remainingSecs = Math.max(0, data.total_seconds - data.elapsed_seconds);
      const m = Math.floor(remainingSecs / 60).toString().padStart(2, '0');
      const s = (remainingSecs % 60).toString().padStart(2, '0');
      timerText.textContent = `${m}:${s}`;

      const pct = data.progress_percent;
      progressText.textContent = `${pct.toFixed(1)}%`;
      progressPercentSub.textContent = `${pct.toFixed(1)}%`;
      progressFill.style.width = `${pct}%`;
      updateMiniWidgetDisplay();
    } else if (event === 'farm_completed') {
      resetFarmingState();
      playCompletionChime();
      showDesktopNotification('ORBSHACKER', `🎉 Все задания Discord выполнены! +${data.total_orbs} Orbs получено!`);
      modalCompleted.classList.add('active');
      addLog(`🎉 All quests completed! +${data.total_orbs} Orbs earned!`, 'success');
      updateMiniWidgetDisplay();
      triggerAutoShutdownCountdown();
    } else if (event === 'badge_tick') {
      if (data.mode === 'count' || data.mode === 'single') {
        const remaining = Math.max(0, data.target_seconds - data.elapsed_seconds);
        const remStr = formatRemainingTime(remaining);
        badgeCountStatusText.textContent = `Игра: ${data.current_game}${remStr}`;
        badgeCountPercentText.textContent = `${data.progress_percent}%`;
        badgeCountProgressFill.style.width = `${data.progress_percent}%`;
        highlightFarmingGame(data.current_game);
      } else if (data.mode === 'hours') {
        const el = data.elapsed_seconds;
        const h = Math.floor(el / 3600).toString().padStart(2, '0');
        const m = Math.floor((el % 3600) / 60).toString().padStart(2, '0');
        const s = (el % 60).toString().padStart(2, '0');
        hoursTimerDisplay.textContent = `${h}:${m}:${s}`;
        hoursProgressFill.style.width = `${data.progress_percent || 100}%`;
      }
      updateMiniWidgetDisplay();
    } else if (event === 'badge_completed') {
      if (data.mode === 'count' || data.mode === 'single') {
        resetBadgeCountState();
        playCompletionChime();
        showDesktopNotification('ORBSHACKER', data.message || `🎉 Пакет игр завершён! Нажмите Ctrl+R в Discord.`);
        addLog(data.message || `🎉 Пакет игр завершён! Нажмите Ctrl+R в Discord для обновления окна профиля.`, 'success');
        // Refresh live stats from Discord servers
        setTimeout(checkDiscordStatus, 1500);
      } else if (data.mode === 'hours') {
        resetHoursFarmState();
        playCompletionChime();
        showDesktopNotification('ORBSHACKER', `🎉 Достигнута цель по времени: ${data.hours_farmed} ч!`);
        addLog(`🎉 Hours goal reached: ${data.hours_farmed} hours!`, 'success');
      }
      updateMiniWidgetDisplay();
      triggerAutoShutdownCountdown();
    } else if (event === 'log') {
      addLog(data.message, data.level || 'info');
    }
  });

  // ==========================================
  // 11. DISCORD RICH PRESENCE (APP BROADCAST)
  // ==========================================
  function updateRpcBadgeUI(enabled, connected) {
    if (!rpcBroadcastBadge) return;
    const dict = I18N[currentLang] || {};
    if (enabled && connected) {
      rpcBroadcastBadge.className = 'rpc-status-pill';
      if (rpcBroadcastText) {
        rpcBroadcastText.textContent = dict.rpc_pill_online || 'RPC В сети';
      }
      rpcBroadcastBadge.setAttribute('title', 'Discord Rich Presence: статус и ход фарма транслируются в ваш профиль с кнопкой перехода на GitHub');
    } else if (enabled && !connected) {
      rpcBroadcastBadge.className = 'rpc-status-pill connecting';
      if (rpcBroadcastText) {
        rpcBroadcastText.textContent = dict.rpc_pill_connecting || 'RPC Поиск Discord...';
      }
      rpcBroadcastBadge.setAttribute('title', 'Discord Rich Presence: ожидание запуска Discord IPC');
    } else {
      rpcBroadcastBadge.className = 'rpc-status-pill inactive';
      if (rpcBroadcastText) {
        rpcBroadcastText.textContent = dict.rpc_pill_disabled || 'RPC Выкл';
      }
      rpcBroadcastBadge.setAttribute('title', 'Discord Rich Presence: трансляция выключена в настройках');
    }
  }

  if (linkRpcGithub) {
    linkRpcGithub.addEventListener('click', (e) => {
      e.preventDefault();
      if (window.orbshacker && window.orbshacker.openExternal) {
        window.orbshacker.openExternal('https://github.com/Mextrim/orbshacker');
      } else {
        window.open('https://github.com/Mextrim/orbshacker', '_blank');
      }
    });
  }

  async function syncAppPresenceStatus() {
    try {
      const status = await window.orbshacker.call('get_app_presence_status');
      if (status) {
        rpcBroadcastEnabled = !!status.enabled;
        if (settingsRpcBroadcastToggle) {
          settingsRpcBroadcastToggle.checked = rpcBroadcastEnabled;
        }
        updateRpcBadgeUI(status.enabled, status.connected);
      }
    } catch (_) {}
  }

  if (settingsRpcBroadcastToggle) {
    settingsRpcBroadcastToggle.checked = rpcBroadcastEnabled;
    settingsRpcBroadcastToggle.addEventListener('change', async (e) => {
      const enabled = e.target.checked;
      rpcBroadcastEnabled = enabled;
      localStorage.setItem('orbshacker_rpc_enabled', enabled ? 'true' : 'false');
      try {
        await window.orbshacker.call('set_app_presence_enabled', { enabled });
        await syncAppPresenceStatus();
        addLog(
          enabled
            ? '🔮 Discord RPC: Трансляция статуса программы включена (ID: 1567134974031962272)'
            : '🔮 Discord RPC: Трансляция статуса программы отключена',
          'info'
        );
      } catch (err) {
        addLog(`Не удалось переключить RPC: ${err.message}`, 'error');
      }
    });
  }

  if (rpcBroadcastBadge) {
    rpcBroadcastBadge.addEventListener('click', async () => {
      const nextState = !rpcBroadcastEnabled;
      rpcBroadcastEnabled = nextState;
      if (settingsRpcBroadcastToggle) settingsRpcBroadcastToggle.checked = nextState;
      localStorage.setItem('orbshacker_rpc_enabled', nextState ? 'true' : 'false');
      try {
        await window.orbshacker.call('set_app_presence_enabled', { enabled: nextState });
        await syncAppPresenceStatus();
        addLog(
          nextState
            ? '🔮 Discord RPC: Трансляция статуса программы включена'
            : '🔮 Discord RPC: Трансляция статуса программы отключена',
          'info'
        );
      } catch (_) {}
    });
  }

  // ==========================================
  // 11.1 DISCORD RPC MEME PRESETS & CUSTOM CAPTIONS
  // ==========================================
  const RPC_MEME_PRESETS = {
    furry: {
      name: '🦊 Мастурбирует на фурри',
      details: 'Мастурбирует на фурри',
      state: 'Занят важным делом (99% прогресс)'
    },
    beer: {
      name: '🍺 Пьёт Балтику 9 в гараже с мужиками',
      details: 'Пьёт Балтику 9 в гараже с мужиками',
      state: 'Настраивает карбюратор и геополитику'
    },
    dota_delete: {
      name: '🗑️ Удаляет Доту в 47-й раз',
      details: 'Удаляет Доту в 47-й раз',
      state: 'Уже скачивает обратно (99%)'
    },
    cs_tilt: {
      name: '🎯 Сливает звание в CS2',
      details: 'Сливает Global Elite до Сильвера',
      state: 'Тиммейты без звука и мониторов'
    },
    shrimp: {
      name: '🦐 Сидит в позе креветки 8 часов',
      details: 'Сидит в позе креветки 8 часов',
      state: 'Позвоночник покинул этот мир'
    },
    reels_4am: {
      name: '💀 Смотрит рилсы в 4:00 утра',
      details: 'Смотрит рилсы в 4:00 утра',
      state: '«Ещё одно видео и точно спать»'
    },
    night_cheese: {
      name: '🧀 Ест сыр из холодильника в 3:00',
      details: 'Ест сыр прямо из холодильника',
      state: 'Кот смотрит с полным осуждением'
    },
    coder_bugs: {
      name: '🐛 Фиксит один маленький баг',
      details: 'Фиксит один маленький баг',
      state: 'Появилось 17 новых критических багов'
    },
    crypto_investor: {
      name: '📈 Инвестировал 500₽ в щиткоины',
      details: 'Инвестировал 500 рублей в крипту',
      state: 'Выбирает цвет будущей яхты'
    },
    souls_rage: {
      name: '🤬 Умирает от босса 148-й раз',
      details: 'Умирает от босса 148-й раз',
      state: 'Геймпад летит в стену (гиперзвук)'
    },
    minecraft_diamonds: {
      name: '⛏️ Копает алмазы на высоте Y: -58',
      details: 'Копает алмазы на высоте Y: -58',
      state: 'Провалился в лаву с Удачей III'
    },
    wb_cart: {
      name: '🛒 Корзина на WB на 150 000₽',
      details: 'Набрал корзину на WB на 150 000₽',
      state: 'Баланс карты: ровно 34 рубля'
    },
    shower_debate: {
      name: '🚿 Спорит сам с собой в душе',
      details: 'Спорит сам с собой в душе',
      state: 'Придумал идеальный ответ на спор 2017 года'
    },
    coffee_overdose: {
      name: '☕ Пьёт 6-ю чашку эспрессо подряд',
      details: 'Пьёт 6-ю чашку эспрессо подряд',
      state: 'Сердце выбивает соло на барабанах'
    },
    silksong_clown: {
      name: '🤡 Ждёт Silksong и Half-Life 3',
      details: 'Ждёт Silksong и Half-Life 3',
      state: 'Клоунский парик надет и зафиксирован'
    },
    hacker: {
      name: '💻 Взламывает Пентагон через Блокнот',
      details: 'Взламывает Пентагон через Блокнот',
      state: 'ACCESS GRANTED • Matrix 100%'
    },
    socks: {
      name: '🧦 Ищет второй носок по всей квартире',
      details: 'Ищет второй носок по всей квартире',
      state: 'Сложность: Экстремальная (0/2)'
    },
    pizza: {
      name: '🍕 Ждёт курьера с шаурмой и пиццей',
      details: 'Ждёт курьера с шаурмой и пиццей',
      state: 'Смотрит в глазок уже 45 минут'
    },
    cat: {
      name: '🐱 Гладит котика одной рукой',
      details: 'Гладит кота и боится пошевелиться',
      state: 'Мурчание на полную мощность'
    },
    casino: {
      name: '🎰 Крутит кейсы и ставит всё на красное',
      details: 'Крутит кейсы и ставит всё на красное',
      state: 'Осталось 5 рублей и надежда'
    },
    sleep: {
      name: '🛌 Спит с открытыми глазами на созвоне',
      details: 'Спит с открытыми глазами на созвоне',
      state: 'Кивает головой каждые 2 минуты'
    },
    stalker: {
      name: '☢️ Ловит маслину на ЧАЭС',
      details: 'Ловит маслину на ЧАЭС',
      state: 'Чики-брики и в дамки!'
    },
    rust_rock: {
      name: '🪨 Бежит голым по пляжу с факелом',
      details: 'Бежит голым по пляжу с факелом',
      state: 'Убит турелью через 4 секунды'
    },
    gym_monday: {
      name: '🏋️ Пойдёт в качалку с понедельника',
      details: 'Пойдёт в качалку с понедельника',
      state: 'Обещает себе это уже 6 лет подряд'
    },
    ghoul_1000_7: {
      name: '💅 Превращается в дед инсайда (1000-7)',
      details: 'Я гуль SSS-ранга (1000-7)',
      state: 'Прости меня, мам, я фанат Канеки'
    },
    grind: {
      name: '⚡ Фармит миллионы Orbs на чиле',
      details: 'Фармит миллионы Orbs на чиле',
      state: 'AFK-бустер активирован на максимум'
    },
    custom: {
      name: '✍️ Свой вариант...',
      details: '',
      state: ''
    }
  };

  const settingsRpcMemeToggle = document.getElementById('settingsRpcMemeToggle');
  const settingsRpcMemeSelect = document.getElementById('settingsRpcMemeSelect');
  const settingsRpcMemeDetails = document.getElementById('settingsRpcMemeDetails');
  const settingsRpcMemeState = document.getElementById('settingsRpcMemeState');
  const settingsRpcMemeMode = document.getElementById('settingsRpcMemeMode');
  const previewMemeDetails = document.getElementById('previewMemeDetails');
  const previewMemeState = document.getElementById('previewMemeState');
  const rpcMemePills = document.querySelectorAll('.rpc-meme-pill');

  function updateMemePreview() {
    const isEnabled = settingsRpcMemeToggle ? settingsRpcMemeToggle.checked : false;
    const detailsVal = settingsRpcMemeDetails ? settingsRpcMemeDetails.value.trim() : '';
    const stateVal = settingsRpcMemeState ? settingsRpcMemeState.value.trim() : '';

    if (previewMemeDetails) {
      previewMemeDetails.textContent = isEnabled && detailsVal ? detailsVal : 'В главном меню • Orbshacker';
    }
    if (previewMemeState) {
      previewMemeState.textContent = isEnabled && stateVal ? stateVal : 'Готов к запуску (+5,600 Orbs)';
    }
  }

  async function sendMemeRpcConfig() {
    if (!window.orbshacker || !window.orbshacker.call) return;
    const enabled = settingsRpcMemeToggle ? settingsRpcMemeToggle.checked : false;
    const details = settingsRpcMemeDetails ? settingsRpcMemeDetails.value.trim() : '';
    const state = settingsRpcMemeState ? settingsRpcMemeState.value.trim() : '';
    const apply_mode = settingsRpcMemeMode ? settingsRpcMemeMode.value : 'idle_only';

    const payload = {
      enabled,
      apply_mode,
      details: details ? details : null,
      state: state ? state : null,
    };

    try {
      await window.orbshacker.call('set_app_presence_meme_config', payload);
    } catch (_) {}
  }

  if (rpcMemePills && rpcMemePills.length > 0) {
    rpcMemePills.forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-meme');
        if (key && RPC_MEME_PRESETS[key]) {
          rpcMemePills.forEach((p) => p.classList.remove('active'));
          btn.classList.add('active');
          if (settingsRpcMemeSelect) settingsRpcMemeSelect.value = key;
          if (settingsRpcMemeDetails) settingsRpcMemeDetails.value = RPC_MEME_PRESETS[key].details;
          if (settingsRpcMemeState) settingsRpcMemeState.value = RPC_MEME_PRESETS[key].state;
          if (settingsRpcMemeToggle && !settingsRpcMemeToggle.checked) {
            settingsRpcMemeToggle.checked = true;
          }
          localStorage.setItem('orbshacker_rpc_meme_preset', key);
          localStorage.setItem('orbshacker_rpc_meme_details', RPC_MEME_PRESETS[key].details);
          localStorage.setItem('orbshacker_rpc_meme_state', RPC_MEME_PRESETS[key].state);
          localStorage.setItem('orbshacker_rpc_meme_enabled', 'true');
          updateMemePreview();
          sendMemeRpcConfig();
          addLog(`🎭 Discord RPC: Активирован мем-статус «${RPC_MEME_PRESETS[key].details}»`, 'success');
        }
      });
    });
  }

  if (settingsRpcMemeSelect) {
    settingsRpcMemeSelect.addEventListener('change', (e) => {
      const key = e.target.value;
      if (key && RPC_MEME_PRESETS[key]) {
        rpcMemePills.forEach((p) => {
          if (p.getAttribute('data-meme') === key) p.classList.add('active');
          else p.classList.remove('active');
        });
        if (key !== 'custom') {
          if (settingsRpcMemeDetails) settingsRpcMemeDetails.value = RPC_MEME_PRESETS[key].details;
          if (settingsRpcMemeState) settingsRpcMemeState.value = RPC_MEME_PRESETS[key].state;
        }
        if (settingsRpcMemeToggle && !settingsRpcMemeToggle.checked) {
          settingsRpcMemeToggle.checked = true;
        }
        localStorage.setItem('orbshacker_rpc_meme_preset', key);
        if (key !== 'custom') {
          localStorage.setItem('orbshacker_rpc_meme_details', RPC_MEME_PRESETS[key].details);
          localStorage.setItem('orbshacker_rpc_meme_state', RPC_MEME_PRESETS[key].state);
        }
        localStorage.setItem('orbshacker_rpc_meme_enabled', 'true');
        updateMemePreview();
        sendMemeRpcConfig();
      }
    });
  }

  if (settingsRpcMemeDetails) {
    settingsRpcMemeDetails.addEventListener('input', () => {
      localStorage.setItem('orbshacker_rpc_meme_details', settingsRpcMemeDetails.value);
      updateMemePreview();
      sendMemeRpcConfig();
    });
  }

  if (settingsRpcMemeState) {
    settingsRpcMemeState.addEventListener('input', () => {
      localStorage.setItem('orbshacker_rpc_meme_state', settingsRpcMemeState.value);
      updateMemePreview();
      sendMemeRpcConfig();
    });
  }

  if (settingsRpcMemeToggle) {
    settingsRpcMemeToggle.addEventListener('change', (e) => {
      localStorage.setItem('orbshacker_rpc_meme_enabled', e.target.checked ? 'true' : 'false');
      updateMemePreview();
      sendMemeRpcConfig();
      addLog(
        e.target.checked
          ? '🎭 Discord RPC: Мем-подпись включена'
          : '🎭 Discord RPC: Мем-подпись отключена (стандартный статус)',
        'info'
      );
    });
  }

  if (settingsRpcMemeMode) {
    settingsRpcMemeMode.addEventListener('change', (e) => {
      localStorage.setItem('orbshacker_rpc_meme_mode', e.target.value);
      sendMemeRpcConfig();
    });
  }

  // ==========================================
  // 12. INITIALIZATION
  // ==========================================
  async function init() {
    try {
      // 1. Set saved theme
      setTheme(currentTheme);

      // 2. Load Discord Quests
      const quests = await window.orbshacker.call('get_quests');
      activeQuests = quests || [];

      // 3. Load 150 Detectable Games
      const games = await window.orbshacker.call('get_detectable_games');
      detectableGames = games || [];
      renderDetectableGames();
      populateHoursGameSelect();

      // 4. Load Badge Tiers
      const tiers = await window.orbshacker.call('get_badge_tiers');
      if (tiers) {
        gameCountTiers = tiers.game_count_tiers || [];
        hoursTiers = tiers.hours_tiers || [];
        renderTierTrackers();
      }

      // 5. Set Language
      setLanguage(currentLang);
      addLog(`Engine ready! ${activeQuests.length} Quests, ${detectableGames.length} Detectable Games loaded.`, 'success');

      // 6. Check Discord IPC
      checkDiscordStatus();
      discordPollInterval = setInterval(checkDiscordStatus, 4000);

      // 7. Check if farm is already running
      const status = await window.orbshacker.call('get_status');
      if (status && status.is_farming) {
        isFarming = true;
        btnFarmAll.disabled = true;
        btnFarmAllText.textContent = I18N[currentLang].farming;
        btnStopFarm.style.display = 'inline-flex';
        farmingStatusText.textContent = I18N[currentLang].farming;
        renderQuests();
      }

      const badgeStatus = await window.orbshacker.call('get_badge_status');
      if (badgeStatus && badgeStatus.is_active) {
        if (badgeStatus.mode === 'count') {
          isBadgeFarming = true;
          btnStopBadges.style.display = 'inline-flex';
          badgeCountProgressBox.style.display = 'flex';
        } else if (badgeStatus.mode === 'hours') {
          isHoursFarming = true;
          btnStopHoursFarm.style.display = 'inline-flex';
          hoursLiveBox.style.display = 'flex';
        }
      }

      // 8. Initialize App Discord Rich Presence
      if (settingsRpcBroadcastToggle) {
        settingsRpcBroadcastToggle.checked = rpcBroadcastEnabled;
      }
      try {
        await window.orbshacker.call('set_app_presence_enabled', { enabled: rpcBroadcastEnabled });
        await syncAppPresenceStatus();
      } catch (_) {}

      // 8.1 Initialize Meme RPC Presets
      const savedMemeEnabled = localStorage.getItem('orbshacker_rpc_meme_enabled') === 'true';
      const savedPreset = localStorage.getItem('orbshacker_rpc_meme_preset') || 'furry';
      const savedDetails = localStorage.getItem('orbshacker_rpc_meme_details') || RPC_MEME_PRESETS.furry.details;
      const savedState = localStorage.getItem('orbshacker_rpc_meme_state') || RPC_MEME_PRESETS.furry.state;
      const savedMode = localStorage.getItem('orbshacker_rpc_meme_mode') || 'idle_only';

      if (settingsRpcMemeToggle) settingsRpcMemeToggle.checked = savedMemeEnabled;
      if (settingsRpcMemeSelect) settingsRpcMemeSelect.value = savedPreset;
      if (settingsRpcMemeDetails) settingsRpcMemeDetails.value = savedDetails;
      if (settingsRpcMemeState) settingsRpcMemeState.value = savedState;
      if (settingsRpcMemeMode) settingsRpcMemeMode.value = savedMode;
      if (rpcMemePills) {
        rpcMemePills.forEach((p) => {
          if (p.getAttribute('data-meme') === savedPreset) p.classList.add('active');
          else p.classList.remove('active');
        });
      }
      updateMemePreview();
      if (savedMemeEnabled) {
        try {
          await sendMemeRpcConfig();
        } catch (_) {}
      }

      // 9. Silently check for updates from GitHub in background
      setTimeout(() => {
        checkForAppUpdates(false);
      }, 1500);
    } catch (err) {
      addLog(`Error initializing app: ${err.message}`, 'error');
    }
  }

  init();
})();
