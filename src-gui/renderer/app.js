(function () {
  let currentLang = 'ru';
  let activeQuests = [];
  let isFarming = false;

  // DOM Elements
  const langSelect = document.getElementById('langSelect');
  const btnMinimize = document.getElementById('btnMinimize');
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
  btnClose.addEventListener('click', () => window.orbshacker.close());

  // 3. Audio Chime (Synthetic Web Audio)
  function playCompletionChime() {
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

  // 5. Render Quest Cards
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
          <button class="btn-card" data-id="${q.id}">
            ${dict.single_farm}
          </button>
        </div>
      `;

      card.querySelector('.btn-card').addEventListener('click', () => {
        startFarming([q.id]);
      });

      questsGrid.appendChild(card);
    });

    questsCountBadge.textContent = activeQuests.length;
    const totalOrbs = activeQuests.reduce((sum, q) => sum + q.orbs_reward, 0);
    totalOrbsText.textContent = `+${totalOrbs.toLocaleString()}`;
  }

  // 6. Farming Controls
  async function startFarming(questIds = ['all']) {
    try {
      addLog(`Starting farm for: ${questIds.join(', ')}...`, 'info');
      const res = await window.orbshacker.call('start_farm', { quests: questIds, minutes: 15 });
      if (res && res.started) {
        isFarming = true;
        btnFarmAll.disabled = true;
        btnFarmAllText.textContent = I18N[currentLang].farming;
        btnStopFarm.style.display = 'inline-flex';
        farmingStatusText.textContent = I18N[currentLang].farming;
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
    timerText.textContent = '15:00';
    progressText.textContent = '0.0%';
    progressPercentSub.textContent = '0%';
    progressFill.style.width = '0%';
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

  // 7. Event Listener from Rust Core
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

  // 8. Initial Load
  async function init() {
    try {
      const quests = await window.orbshacker.call('get_quests');
      activeQuests = quests || [];
      setLanguage(currentLang);
      addLog(`Loaded ${activeQuests.length} Discord Quests from Rust Core.`, 'success');

      const status = await window.orbshacker.call('get_status');
      if (status && status.is_farming) {
        isFarming = true;
        btnFarmAll.disabled = true;
        btnFarmAllText.textContent = I18N[currentLang].farming;
        btnStopFarm.style.display = 'inline-flex';
        farmingStatusText.textContent = I18N[currentLang].farming;
      }
    } catch (err) {
      addLog(`Error initializing app: ${err.message}`, 'error');
    }
  }

  init();
})();
