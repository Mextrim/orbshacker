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
      currentThemeLabel.textContent = THEMES[theme].name;
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
      setTheme(val);
      themeDropdownMenu.classList.remove('active');
      addLog(`Theme changed to: ${THEMES[val].name}`, 'info');
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
      const dict = I18N[currentLang];
      if (res && res.connected) {
        dot.style.background = 'var(--accent-green)';
        dot.style.boxShadow = '0 0 6px var(--accent-green)';
        text.textContent = dict.status_connected;
      } else {
        dot.style.background = 'var(--accent-orange)';
        dot.style.boxShadow = '0 0 6px var(--accent-orange)';
        text.textContent = dict.status_disconnected;
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
        version: 'v2.5.0',
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
          settingsUpdateStatus.textContent = `У вас последняя версия (${info.currentVersion || 'v2.5.0'}) ✓`;
        }
        if (isManual) {
          addLog(`У вас установлена последняя актуальная версия (${info.currentVersion || 'v2.5.0'})!`, 'success');
        }
      }
    } catch (err) {
      if (isManual) {
        if (settingsUpdateStatus) settingsUpdateStatus.textContent = 'Ошибка проверки';
        addLog(`Ошибка проверки обновлений: ${err.message}`, 'error');
      }
    }
  }

  function showUpdateModal(info) {
    if (!info || !modalUpdate) return;
    if (updateCurrentVer) updateCurrentVer.textContent = info.currentVersion ? `v${info.currentVersion.replace(/^v/, '')}` : 'v2.5.0';
    if (updateNewVer) updateNewVer.textContent = info.latestVersion || 'v2.5.0';
    if (updateReleaseNotes) updateReleaseNotes.textContent = info.releaseNotes || 'Улучшения производительности и исправления ошибок.';
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
      if (btnPostponeUpdate) btnPostponeUpdate.disabled = true;
      if (updateProgressBox) updateProgressBox.style.display = 'flex';
      if (updateProgressFill) updateProgressFill.style.width = '0%';
      if (updateProgressPercent) updateProgressPercent.textContent = '0%';
      if (updateProgressText) updateProgressText.textContent = 'Подключение к GitHub Releases...';

      addLog(`Загрузка обновления ${latestUpdateInfo.latestVersion} с GitHub...`, 'info');

      try {
        await window.orbshacker.downloadUpdate({
          downloadUrl: latestUpdateInfo.downloadUrl,
          checksumUrl: latestUpdateInfo.checksumUrl,
          assetName: latestUpdateInfo.assetName
        });

        if (updateProgressText) updateProgressText.textContent = '✅ Обновление установлено! Перезапуск...';
        if (updateProgressFill) updateProgressFill.style.width = '100%';
        if (updateProgressPercent) updateProgressPercent.textContent = '100%';
        addLog('Обновление успешно загружено и проверено! Перезапуск программы...', 'success');
      } catch (err) {
        isDownloadingUpdate = false;
        btnStartDownloadUpdate.disabled = false;
        if (btnPostponeUpdate) btnPostponeUpdate.disabled = false;
        if (updateProgressText) updateProgressText.textContent = `Ошибка: ${err.message}`;
        addLog(`Ошибка при установке обновления: ${err.message}`, 'error');
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
        updateProgressText.textContent = `Загрузка: ${mb} MB / ${totalMb} MB (${pct}%)`;
      }
    });
  }

  // ==========================================
  // 4. RENDER QUEST CARDS
  // ==========================================
  function renderQuests() {
    questsGrid.innerHTML = '';
    const dict = I18N[currentLang];

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

      card.innerHTML = `
        <div class="quest-header">
          <div class="quest-title-block">
            <span class="quest-title">${q.title || q.name}</span>
            <span class="quest-publisher">${q.publisher || ''}</span>
          </div>
          <span class="${badgeClass}">${badgeText}</span>
        </div>
        <div class="quest-footer">
          <div class="reward-pill">
            <span class="reward-orb"></span>
            <span>+${q.orbs_reward} Orbs</span>
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

      questsGrid.appendChild(card);
    });

    questsCountBadge.textContent = activeQuests.length;
    const totalOrbs = activeQuests.reduce((sum, q) => sum + q.orbs_reward, 0);
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

  let selectedCategory = 'all';

  function renderDetectableGames(filterText = '', category = null) {
    if (!detectableGamesGrid) return;
    if (category !== null) selectedCategory = category;
    detectableGamesGrid.innerHTML = '';
    const q = (filterText !== '' ? filterText : (gamesSearchInput ? gamesSearchInput.value : '')).toLowerCase().trim();

    const filtered = detectableGames.filter((g) => {
      // 1. Category check
      if (selectedCategory === 'top2026') {
        const topIds = ['wilds', 'stalker2', 'spacemarine2', 'wukong', 'deadlock', 'silenthill2', 'manorlords', 'helldivers2', 'dragonsdogma2', 'palworld', 'tekken8', 'persona3r', 'frostpunk2'];
        if (!topIds.includes(g.id)) return false;
      } else if (selectedCategory === 'shooter') {
        const cat = (g.category || '').toLowerCase();
        if (!cat.includes('шутер') && !cat.includes('shooter') && !['cs2', 'apex', 'pubg', 'tarkov', 'rainbow', 'tf2', 'doom', 'overwatch', 'warframe'].some((k) => g.id.includes(k))) return false;
      } else if (selectedCategory === 'rpg') {
        const cat = (g.category || '').toLowerCase();
        if (!cat.includes('rpg') && !cat.includes('ролевая') && !cat.includes('souls') && !['witcher', 'cyberpunk', 'eldenring', 'skyrim', 'fallout', 'bg3', 'starfield'].some((k) => g.id.includes(k))) return false;
      } else if (selectedCategory === 'moba') {
        const cat = (g.category || '').toLowerCase();
        if (!cat.includes('moba') && !cat.includes('кооп') && !cat.includes('co-op') && !['dota2', 'lol', 'rocket', 'deadlock', 'lethal'].some((k) => g.id.includes(k))) return false;
      } else if (selectedCategory === 'survival') {
        const cat = (g.category || '').toLowerCase();
        if (!cat.includes('выживание') && !cat.includes('survival') && !['rust', 'ark', 'palworld', 'dayz', 'valheim', 'forest', 'terraria', 'subnautica'].some((k) => g.id.includes(k))) return false;
      } else if (selectedCategory === 'racing') {
        const cat = (g.category || '').toLowerCase();
        if (!cat.includes('симулятор') && !cat.includes('гонки') && !cat.includes('racing') && !['forza', 'eurotrucks', 'assetto', 'beamng', 'f1'].some((k) => g.id.includes(k))) return false;
      }

      // 2. Search text check
      if (q) {
        return g.name.toLowerCase().includes(q) || g.exe_name.toLowerCase().includes(q) || (g.category && g.category.toLowerCase().includes(q));
      }
      return true;
    });

    filtered.forEach((g) => {
      const chip = document.createElement('div');
      chip.className = 'game-item-chip';
      chip.innerHTML = `
        <div class="game-chip-info">
          <span class="game-item-name" title="${g.name}">${g.name}</span>
          <span class="game-item-sub">${g.exe_name} • ${g.category}</span>
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

      detectableGamesGrid.appendChild(chip);
    });

    if (catalogCountLabel) {
      catalogCountLabel.textContent = `${filtered.length} / ${detectableGames.length} игр`;
    }
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

  btnFarmAll100.addEventListener('click', () => startBadgeCount(150, 0));
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
  // 11. INITIALIZATION
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

      // 8. Silently check for updates from GitHub in background
      setTimeout(() => {
        checkForAppUpdates(false);
      }, 1500);
    } catch (err) {
      addLog(`Error initializing app: ${err.message}`, 'error');
    }
  }

  init();
})();
