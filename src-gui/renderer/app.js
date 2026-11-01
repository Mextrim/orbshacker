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
  const presetChips = document.querySelectorAll('.preset-chip');

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
  const settingsAutoDiscordToggle = document.getElementById('settingsAutoDiscordToggle');

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

  // Audio Chime
  function playCompletionChime() {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12);
        gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.12);
        gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + i * 0.12 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.12);
        osc.stop(ctx.currentTime + i * 0.12 + 0.45);
      });
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

  btnSettingsSave.addEventListener('click', () => {
    farmDurationMinutes = parseInt(settingsDurationInput.value, 10) || 15;
    soundEnabled = settingsSoundToggle.checked;
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
    addLog(`Settings applied: duration=${farmDurationMinutes}m, sound=${soundEnabled}`, 'info');
  });

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
            <span class="quest-title">${q.title}</span>
            <span class="quest-publisher">${q.publisher}</span>
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
    // 1. Games count tier tracker
    if (gameCountTierTracker && gameCountTiers.length > 0) {
      gameCountTierTracker.innerHTML = '';
      gameCountTiers.forEach((tier) => {
        const pill = document.createElement('div');
        // Currently user has 8 games as seen in screenshot
        const isUnlocked = 8 >= tier.threshold;
        const isCurrent = tier.threshold === 10; // Next target is 10
        pill.className = `tier-pill ${isUnlocked ? 'unlocked' : ''} ${isCurrent ? 'current' : ''}`;
        pill.innerHTML = `
          <span class="tier-name">${tier.title}</span>
          <span class="tier-count">${tier.threshold} игр</span>
        `;
        gameCountTierTracker.appendChild(pill);
      });
    }

    // 2. Hours tier tracker
    if (hoursTierTracker && hoursTiers.length > 0) {
      hoursTierTracker.innerHTML = '';
      hoursTiers.forEach((tier) => {
        const pill = document.createElement('div');
        // Currently user has 7 hours as seen in screenshot
        const isUnlocked = 7 >= tier.threshold;
        const isCurrent = tier.threshold === 20; // Next target is 20
        pill.className = `tier-pill ${isUnlocked ? 'unlocked' : ''} ${isCurrent ? 'current' : ''}`;
        pill.innerHTML = `
          <span class="tier-name">${tier.title}</span>
          <span class="tier-count">${tier.threshold} ч</span>
        `;
        hoursTierTracker.appendChild(pill);
      });
    }
  }

  function renderDetectableGames(filterText = '') {
    if (!detectableGamesGrid) return;
    detectableGamesGrid.innerHTML = '';
    const q = filterText.toLowerCase().trim();

    const filtered = detectableGames.filter(
      (g) => g.name.toLowerCase().includes(q) || g.exe_name.toLowerCase().includes(q) || g.category.toLowerCase().includes(q)
    );

    filtered.forEach((g) => {
      const chip = document.createElement('div');
      chip.className = 'game-item-chip';
      chip.innerHTML = `
        <span class="game-item-name">${g.name}</span>
        <span class="game-item-sub">${g.exe_name} • ${g.category}</span>
      `;
      chip.addEventListener('click', () => {
        // Quick select for hours booster
        if (hoursGameSelect) {
          hoursGameSelect.value = g.id;
          addLog(`Selected '${g.name}' for hours farming.`, 'info');
        }
      });
      detectableGamesGrid.appendChild(chip);
    });

    if (catalogCountLabel) {
      catalogCountLabel.textContent = `${filtered.length} / ${detectableGames.length} игр`;
    }
  }

  if (gamesSearchInput) {
    gamesSearchInput.addEventListener('input', (e) => {
      renderDetectableGames(e.target.value);
    });
  }

  // ==========================================
  // 7. BADGES: GAME COUNT BOOSTER (100+ Games)
  // ==========================================
  async function startBadgeCount(count) {
    try {
      addLog(`Starting Discord Game Count badge farm for ${count} games...`, 'info');
      const res = await window.orbshacker.call('start_badge_count', { target_count: count, duration_secs: 20 });
      if (res && res.started) {
        isBadgeFarming = true;
        btnFarmAll100.disabled = true;
        btnFarmNext10.disabled = true;
        btnFarmNext2.disabled = true;
        btnStopBadges.style.display = 'inline-flex';
        badgeCountProgressBox.style.display = 'flex';
        badgeCountStatusText.textContent = `Фарм игр: 0 / ${res.total_games}`;
        badgeCountPercentText.textContent = '0%';
        badgeCountProgressFill.style.width = '0%';
        addLog(`Started cycle across ${res.total_games} detectable games!`, 'success');
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
  }

  btnFarmAll100.addEventListener('click', () => startBadgeCount(105));
  btnFarmNext10.addEventListener('click', () => startBadgeCount(10));
  btnFarmNext2.addEventListener('click', () => startBadgeCount(2));
  btnStopBadges.addEventListener('click', stopBadgeFarm);

  // ==========================================
  // 8. BADGES: PLAYTIME HOURS BOOSTER
  // ==========================================
  presetChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      presetChips.forEach((c) => c.classList.remove('active'));
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
    } else if (event === 'farm_completed') {
      resetFarmingState();
      playCompletionChime();
      modalCompleted.classList.add('active');
      addLog(`🎉 All quests completed! +${data.total_orbs} Orbs earned!`, 'success');
    } else if (event === 'badge_tick') {
      if (data.mode === 'count') {
        badgeCountStatusText.textContent = `[${data.current_index}/${data.total_games}] Текущие: ${data.current_game}`;
        badgeCountPercentText.textContent = `${data.progress_percent}%`;
        badgeCountProgressFill.style.width = `${data.progress_percent}%`;
      } else if (data.mode === 'hours') {
        const el = data.elapsed_seconds;
        const h = Math.floor(el / 3600).toString().padStart(2, '0');
        const m = Math.floor((el % 3600) / 60).toString().padStart(2, '0');
        const s = (el % 60).toString().padStart(2, '0');
        hoursTimerDisplay.textContent = `${h}:${m}:${s}`;
        hoursProgressFill.style.width = `${data.progress_percent || 100}%`;
      }
    } else if (event === 'badge_completed') {
      if (data.mode === 'count') {
        resetBadgeCountState();
        playCompletionChime();
        addLog(`🎉 Batch completed! Successfully farmed ${data.completed_games} games for badge!`, 'success');
      } else if (data.mode === 'hours') {
        resetHoursFarmState();
        playCompletionChime();
        addLog(`🎉 Hours goal reached: ${data.hours_farmed} hours!`, 'success');
      }
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

      // 3. Load 105 Detectable Games
      const games = await window.orbshacker.call('get_detectable_games');
      detectableGames = games || [];
      renderDetectableGames();

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
    } catch (err) {
      addLog(`Error initializing app: ${err.message}`, 'error');
    }
  }

  init();
})();
