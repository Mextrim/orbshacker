(function () {
  let currentLang = 'ru';
  let activeQuests = [];
  let isFarming = false;
  let farmDurationMinutes = 15;
  let soundEnabled = true;
  let discordPollInterval = null;

  // DOM Elements
  const langSelect = document.getElementById('langSelect');
  const btnSettings = document.getElementById('btnSettings');
  const btnMinimize = document.getElementById('btnMinimize');
  const btnMaximize = document.getElementById('btnMaximize');
  const btnClose = document.getElementById('btnClose');
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
  const telemetryLogs = document.getElementById('telemetryLogs');
  const btnClearLogs = document.getElementById('btnClearLogs');
  const modalCompleted = document.getElementById('modalCompleted');
  const btnModalDiscord = document.getElementById('btnModalDiscord');
  const btnModalClose = document.getElementById('btnModalClose');

  // Settings Modal Elements
  const modalSettings = document.getElementById('modalSettings');
  const btnSettingsClose = document.getElementById('btnSettingsClose');
  const btnSettingsSave = document.getElementById('btnSettingsSave');
  const settingsDurationInput = document.getElementById('settingsDurationInput');
  const settingsDurationVal = document.getElementById('settingsDurationVal');
  const settingsSoundToggle = document.getElementById('settingsSoundToggle');
  const settingsAutoDiscordToggle = document.getElementById('settingsAutoDiscordToggle');

  // 1. Translations & Language
  function setLanguage(lang) {
    if (!I18N[lang]) lang = 'en';
    currentLang = lang;
    langSelect.value = lang;

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
    checkDiscordStatus();
  }

  // Detect system/browser language
  const navLang = (navigator.language || 'ru').slice(0, 2).toLowerCase();
  if (I18N[navLang]) {
    currentLang = navLang;
  }

  langSelect.addEventListener('change', (e) => {
    setLanguage(e.target.value);
  });

  // 2. Window Controls
  btnMinimize.addEventListener('click', () => window.orbshacker.minimize());
  btnMaximize.addEventListener('click', () => window.orbshacker.maximize());
  btnClose.addEventListener('click', () => window.orbshacker.close());

  // 3. Audio Chime (Synthetic Web Audio)
  function playCompletionChime() {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
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

  // 4. Telemetry Logging
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

  // 5. Discord Status Polling
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

  // 6. Settings Modal Handlers
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
    addLog(`Settings updated: duration=${farmDurationMinutes}m, sound=${soundEnabled}`, 'info');
  });

  // 7. Render Quest Cards
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

  // 8. Farming Controls
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
      addLog('Farm session aborted by user.', 'warn');
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

  btnOpenDiscord.addEventListener('click', () => {
    window.orbshacker.call('open_discord_quests');
    addLog('Requested opening Discord quests page.', 'info');
  });

  // Modal Handlers
  btnModalClose.addEventListener('click', () => {
    modalCompleted.classList.remove('active');
  });

  btnModalDiscord.addEventListener('click', () => {
    window.orbshacker.call('open_discord_quests');
    modalCompleted.classList.remove('active');
  });

  // 9. Event Listener from Rust Core
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
    } else if (event === 'log') {
      addLog(data.message, data.level || 'info');
    }
  });

  // 10. Initial Load
  async function init() {
    try {
      const quests = await window.orbshacker.call('get_quests');
      activeQuests = quests || [];
      setLanguage(currentLang);
      addLog(`Loaded ${activeQuests.length} Discord Quests from Rust Core.`, 'success');

      checkDiscordStatus();
      discordPollInterval = setInterval(checkDiscordStatus, 4000);

      const status = await window.orbshacker.call('get_status');
      if (status && status.is_farming) {
        isFarming = true;
        btnFarmAll.disabled = true;
        btnFarmAllText.textContent = I18N[currentLang].farming;
        btnStopFarm.style.display = 'inline-flex';
        farmingStatusText.textContent = I18N[currentLang].farming;
        renderQuests();
      }
    } catch (err) {
      addLog(`Error initializing app: ${err.message}`, 'error');
    }
  }

  init();
})();
