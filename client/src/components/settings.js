import { send, connect, disconnect, getConnectionStatus, onStatusChange } from '../network.js';
import { getState, updateState } from '../state.js';
import { logInteraction } from '../logger.js';

export function toggleSettingsMenu() {
  let menu = document.getElementById('settings-menu-overlay');
  if (menu) {
    logInteraction('Settings menu toggled close');
    if (menu._cleanup) menu._cleanup();
    menu.remove();
    return;
  }

  logInteraction('Settings menu opened');
  
  // Load current visual setting values
  const textSize = parseInt(localStorage.getItem('whist_text_size') || '18', 10);
  const cardSpacing = parseInt(localStorage.getItem('whist_card_spacing') || '32', 10);
  const feltBrightness = parseInt(localStorage.getItem('whist_felt_brightness') || '100', 10);
  const theme = localStorage.getItem('whist_theme') || 'dark';
  const showRoundStats = localStorage.getItem('whist_show_round_stats') !== 'false';
  const showOppCards = localStorage.getItem('whist_show_opp_cards') !== 'false';
  const showChat = localStorage.getItem('whist_show_chat') !== 'false';

  const state = getState() || {};
  const currentStage = state.current_stage || 'LOBBY';
  const players = state.players || [];
  const localPlayer = players[0] || null;
  const isHost = localPlayer ? localPlayer.id === 'p1' : true; 
  const canEditRules = currentStage === 'LOBBY' && isHost;

  // Retrieve current game rules settings from state
  const gameSettings = state.settings || {
    end_condition: 'score',
    target_score: 100,
    target_rounds: 8,
    exchange_cards_count: 2,
    bot_difficulty: 'hard'
  };

  // Load current Server URL values
  const defaultServerUrl = import.meta.env.VITE_WS_URL || 'ws://127.0.0.1:8080';
  const savedServerUrl = localStorage.getItem('whist_server_url') || defaultServerUrl;
  const isPlayingOrWaiting = players.length > 0;

  const connStatus = getConnectionStatus();
  let statusClass = 'border-slate-800 text-slate-500 bg-slate-900/40';
  let statusText = 'Disconnected';
  if (connStatus === 'connected') {
    statusClass = 'border-emerald-500/20 text-emerald-400 bg-emerald-950/10';
    statusText = 'Connected';
  } else if (connStatus === 'connecting') {
    statusClass = 'border-amber-500/20 text-amber-400 bg-amber-950/20';
    statusText = 'Connecting';
  }

  menu = document.createElement('div');
  menu.id = 'settings-menu-overlay';
  menu.className = 'fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 pointer-events-auto';

  menu.innerHTML = `
    <div class="glass-opaque p-6 md:p-8 max-w-md w-full mx-4 border border-slate-800 flex flex-col shadow-2xl relative rounded-2xl max-h-[90vh] overflow-hidden">
      <!-- Header -->
      <div class="flex border-b border-slate-800 pb-3 mb-5">
        <button id="tab-visuals" class="flex-1 text-center py-2 text-xs font-black uppercase tracking-wider text-amber-400 border-b-2 border-amber-500">Visuals</button>
        <button id="tab-server" class="flex-1 text-center py-2 text-xs font-black uppercase tracking-wider text-slate-400 border-b-2 border-transparent">Server</button>
        <button id="tab-rules" class="flex-1 text-center py-2 text-xs font-black uppercase tracking-wider text-slate-400 border-b-2 border-transparent">Game Rules</button>
      </div>

      <!-- Tab Content Container -->
      <div id="settings-tab-content" class="flex-1 overflow-y-auto pr-1 mb-6">
        <!-- Visual Settings -->
        <div id="panel-visuals" class="flex flex-col gap-5">
          <!-- Theme selector -->
          <div class="flex justify-between items-center text-xs font-bold uppercase tracking-wide text-slate-300">
            <span>Theme Mode</span>
            <select id="theme-selector" class="input py-1 text-xs font-semibold">
              <option value="dark" ${theme === 'dark' ? 'selected' : ''}>Dark Mode</option>
              <option value="light" ${theme === 'light' ? 'selected' : ''}>Light Mode</option>
            </select>
          </div>

          <!-- Text Size Slider -->
          <div class="flex flex-col gap-1.5">
            <div class="flex justify-between items-center text-xs font-bold uppercase tracking-wide text-slate-300">
              <span>Text Size</span>
              <span id="text-size-val" class="font-mono text-amber-400 text-sm">${textSize}px</span>
            </div>
            <input type="range" id="text-size-slider" min="12" max="28" value="${textSize}" class="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
          </div>

          <!-- Card Offset/Spacing Slider -->
          <div class="flex flex-col gap-1.5">
            <div class="flex justify-between items-center text-xs font-bold uppercase tracking-wide text-slate-300">
              <span>Card Fan Spacing</span>
              <span id="card-spacing-val" class="font-mono text-amber-400 text-sm">${cardSpacing}px</span>
            </div>
            <input type="range" id="card-spacing-slider" min="15" max="60" value="${cardSpacing}" class="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
          </div>

          <!-- HUD Toggles -->
          <div class="flex flex-col gap-3 border-t border-slate-800/60 pt-4">
            <label class="flex items-center gap-3 cursor-pointer text-xs font-bold uppercase text-slate-300 select-none">
              <input type="checkbox" id="toggle-round-stats" class="accent-emerald-500 rounded" ${showRoundStats ? 'checked' : ''} />
              <span>Show Round Stats Badge</span>
            </label>
            <label class="flex items-center gap-3 cursor-pointer text-xs font-bold uppercase text-slate-300 select-none">
              <input type="checkbox" id="toggle-chat" class="accent-emerald-500 rounded" ${showChat ? 'checked' : ''} />
              <span>Show Lobby Chat Box</span>
            </label>
          </div>
        </div>

        <!-- Server Settings -->
        <div id="panel-server" class="flex flex-col gap-5 hidden">
          <!-- Connection Status -->
          <div class="flex justify-between items-center text-xs font-bold uppercase tracking-wide text-slate-300">
            <span>Connection Status</span>
            <span id="server-status-badge" class="px-2 py-0.5 rounded font-black text-[10px] uppercase tracking-wider border ${statusClass}">${statusText}</span>
          </div>

          <!-- Server URL Input -->
          <div class="flex flex-col gap-2">
            <label class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">WebSocket Server URL</label>
            <input type="text" id="settings-server-url" class="input w-full text-sm font-mono" placeholder="${defaultServerUrl}" value="${savedServerUrl}" ${isPlayingOrWaiting ? 'disabled' : ''} />
            <div id="settings-server-url-error" class="text-rose-400 text-[10px] font-bold mt-1 hidden"></div>
          </div>

          <!-- Helper instructions -->
          <p class="text-[11px] text-slate-400 leading-normal">
            The client connects to this Erlang WebSocket server to host rooms and process game logic.
          </p>

          ${isPlayingOrWaiting ? `
            <div class="glass-sm p-3 border border-amber-500/20 text-amber-400 text-[11px] font-semibold text-center leading-relaxed">
              ⚠️ Leave your current match or waiting room to modify the Server URL.
            </div>
          ` : `
            <div class="flex gap-2">
              <button id="btn-reset-server-url" class="btn btn-secondary flex-1 py-2 text-xs font-bold">
                Reset Default
              </button>
              <button id="btn-save-server-url" class="btn btn-gold flex-1 py-2 text-xs font-bold">
                Save & Connect
              </button>
            </div>
          `}
        </div>

        <!-- Game Rules Settings -->
        <div id="panel-rules" class="flex flex-col gap-5 hidden">
          ${!canEditRules ? `
            <div class="glass-sm p-3 border border-amber-500/20 text-amber-400 text-[11px] font-semibold text-center leading-relaxed mb-2">
              ⚠️ Game rules can only be modified in the waiting Lobby by the room Host.
            </div>
          ` : ''}

          <!-- Ending Condition -->
          <div class="flex flex-col gap-2">
            <div class="flex justify-between items-center text-xs font-bold uppercase tracking-wide text-slate-300">
              <span>Ending Condition</span>
              <select id="rules-end-condition" class="input py-1 text-xs font-semibold" ${!canEditRules ? 'disabled' : ''}>
                <option value="score" ${gameSettings.end_condition === 'score' ? 'selected' : ''}>Target Score</option>
                <option value="rounds" ${gameSettings.end_condition === 'rounds' ? 'selected' : ''}>Number of Rounds</option>
              </select>
            </div>
          </div>

          <!-- Target Score -->
          <div id="rule-score-container" class="flex flex-col gap-1.5 ${gameSettings.end_condition === 'rounds' ? 'hidden' : ''}">
            <div class="flex justify-between items-center text-xs font-bold uppercase tracking-wide text-slate-300">
              <span>Target Score Limit</span>
              <span id="rules-score-val" class="font-mono text-amber-400 text-sm">${gameSettings.target_score} pts</span>
            </div>
            <input type="range" id="rules-score-slider" min="50" max="300" step="25" value="${gameSettings.target_score}" class="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500" ${!canEditRules ? 'disabled' : ''} />
          </div>

          <!-- Target Rounds -->
          <div id="rule-rounds-container" class="flex flex-col gap-1.5 ${gameSettings.end_condition !== 'rounds' ? 'hidden' : ''}">
            <div class="flex justify-between items-center text-xs font-bold uppercase tracking-wide text-slate-300">
              <span>Max Round Limit</span>
              <span id="rules-rounds-val" class="font-mono text-amber-400 text-sm">${gameSettings.target_rounds} rounds</span>
            </div>
            <input type="range" id="rules-rounds-slider" min="1" max="20" value="${gameSettings.target_rounds}" class="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500" ${!canEditRules ? 'disabled' : ''} />
          </div>

          <!-- Cards in Exchange -->
          <div class="flex justify-between items-center text-xs font-bold uppercase tracking-wide text-slate-300">
            <span>Cards in Exchange</span>
            <select id="rules-exchange-cards" class="input py-1 text-xs font-semibold" ${!canEditRules ? 'disabled' : ''}>
              <option value="0" ${parseInt(gameSettings.exchange_cards_count, 10) === 0 ? 'selected' : ''}>0 (No Exchange)</option>
              <option value="1" ${parseInt(gameSettings.exchange_cards_count, 10) === 1 ? 'selected' : ''}>1 Card</option>
              <option value="2" ${parseInt(gameSettings.exchange_cards_count, 10) === 2 || gameSettings.exchange_cards_count === undefined ? 'selected' : ''}>2 Cards (Standard)</option>
              <option value="3" ${parseInt(gameSettings.exchange_cards_count, 10) === 3 ? 'selected' : ''}>3 Cards</option>
            </select>
          </div>

          <!-- Bot Difficulty -->
          <div class="flex justify-between items-center text-xs font-bold uppercase tracking-wide text-slate-300">
            <span>Bot Play Difficulty</span>
            <select id="rules-bot-difficulty" class="input py-1 text-xs font-semibold" ${!canEditRules ? 'disabled' : ''}>
              <option value="easy" ${gameSettings.bot_difficulty === 'easy' ? 'selected' : ''}>Easy Mode</option>
              <option value="hard" ${gameSettings.bot_difficulty === 'hard' || gameSettings.bot_difficulty === undefined ? 'selected' : ''}>Hard Mode</option>
            </select>
          </div>

          <!-- Apply Rules Button -->
          ${canEditRules ? `
            <button id="btn-apply-rules" class="btn btn-gold w-full py-2 text-xs font-bold mt-2">
              Apply Rules Settings
            </button>
          ` : ''}
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex flex-col gap-3 w-full border-t border-slate-800 pt-4">
        <button id="btn-settings-close" class="btn btn-primary w-full py-2.5 text-xs font-bold">
          Close Settings
        </button>
        ${players.length > 0 ? `
          <button id="btn-settings-exit" class="btn btn-danger w-full py-2.5 text-xs font-bold">
            Exit Game
          </button>
        ` : ''}
      </div>
    </div>
  `;

  document.body.appendChild(menu);

  // Hook up tabs
  const tabVisuals = menu.querySelector('#tab-visuals');
  const tabServer = menu.querySelector('#tab-server');
  const tabRules = menu.querySelector('#tab-rules');
  const panelVisuals = menu.querySelector('#panel-visuals');
  const panelServer = menu.querySelector('#panel-server');
  const panelRules = menu.querySelector('#panel-rules');

  const setTab = (activeTab) => {
    const tabs = [
      { btn: tabVisuals, panel: panelVisuals },
      { btn: tabServer, panel: panelServer },
      { btn: tabRules, panel: panelRules }
    ];
    tabs.forEach(t => {
      if (t.btn === activeTab) {
        t.btn.className = 'flex-1 text-center py-2 text-xs font-black uppercase tracking-wider text-amber-400 border-b-2 border-amber-500';
        t.panel.classList.remove('hidden');
      } else {
        t.btn.className = 'flex-1 text-center py-2 text-xs font-black uppercase tracking-wider text-slate-400 border-b-2 border-transparent';
        t.panel.classList.add('hidden');
      }
    });
  };

  tabVisuals.addEventListener('click', () => setTab(tabVisuals));
  tabServer.addEventListener('click', () => setTab(tabServer));
  tabRules.addEventListener('click', () => setTab(tabRules));

  // Connection status live updates
  const statusBadge = menu.querySelector('#server-status-badge');
  const unsubscribeStatus = onStatusChange((newStatus) => {
    if (!statusBadge) return;
    let sClass = 'border-slate-800 text-slate-500 bg-slate-900/40';
    let sText = 'Disconnected';
    if (newStatus === 'connected') {
      sClass = 'border-emerald-500/20 text-emerald-400 bg-emerald-950/10';
      sText = 'Connected';
    } else if (newStatus === 'connecting') {
      sClass = 'border-amber-500/20 text-amber-400 bg-amber-950/20';
      sText = 'Connecting';
    }
    statusBadge.className = `px-2 py-0.5 rounded font-black text-[10px] uppercase tracking-wider border ${sClass}`;
    statusBadge.textContent = sText;
  });

  // Store cleanup on menu element
  menu._cleanup = unsubscribeStatus;

  let unsubscribeSave = null;
  let connectionTimeout = null;

  const closeMenu = () => {
    if (unsubscribeSave) unsubscribeSave();
    clearTimeout(connectionTimeout);
    if (menu._cleanup) menu._cleanup();
    menu.remove();
  };

  // Hook up server inputs if not playing
  if (!isPlayingOrWaiting) {
    const inputUrl = menu.querySelector('#settings-server-url');
    const btnReset = menu.querySelector('#btn-reset-server-url');
    const btnSave = menu.querySelector('#btn-save-server-url');
    const errorEl = menu.querySelector('#settings-server-url-error');

    btnReset.addEventListener('click', () => {
      logInteraction('Button Click: Reset Server URL to Default');
      inputUrl.value = defaultServerUrl;
      if (errorEl) errorEl.classList.add('hidden');
    });

    btnSave.addEventListener('click', () => {
      const val = inputUrl.value.trim();
      if (!val) return;
      
      if (errorEl) errorEl.classList.add('hidden');
      if (!val.startsWith('ws://') && !val.startsWith('wss://')) {
        if (errorEl) {
          errorEl.textContent = 'URL must start with ws:// or wss://';
          errorEl.classList.remove('hidden');
        }
        return;
      }

      logInteraction(`Button Click: Attempting Save & Connect Server URL: "${val}"`);
      btnSave.disabled = true;
      btnSave.classList.add('btn-loading');
      btnReset.disabled = true;
      window.showLoading('Connecting to server...');

      // Persist the URL immediately
      localStorage.setItem('whist_server_url', val);

      // Trigger connection
      connect(val);

      if (unsubscribeSave) unsubscribeSave();

      // Timeout connection check after 5 seconds
      clearTimeout(connectionTimeout);
      connectionTimeout = setTimeout(() => {
        if (unsubscribeSave) unsubscribeSave();
        btnSave.disabled = false;
        btnSave.classList.remove('btn-loading');
        btnSave.textContent = 'Save & Connect';
        btnReset.disabled = false;
        window.hideLoading();
        if (errorEl) {
          errorEl.textContent = 'Connection timeout. Check server status.';
          errorEl.classList.remove('hidden');
        }
      }, 5000);

      unsubscribeSave = onStatusChange((status) => {
        if (status === 'connected') {
          clearTimeout(connectionTimeout);
          if (unsubscribeSave) unsubscribeSave();
          btnSave.classList.remove('btn-loading');
          btnSave.textContent = 'Connected! ✓';
          btnSave.className = 'btn btn-primary flex-1 py-2 text-xs font-bold';
          setTimeout(() => {
            closeMenu();
          }, 800);
        }
      });
    });
  }

  // Visual inputs
  const themeSelector = menu.querySelector('#theme-selector');
  const textSizeSlider = menu.querySelector('#text-size-slider');
  const textSizeVal = menu.querySelector('#text-size-val');
  const cardSpacingSlider = menu.querySelector('#card-spacing-slider');
  const cardSpacingVal = menu.querySelector('#card-spacing-val');
  
  const toggleRoundStats = menu.querySelector('#toggle-round-stats');
  const toggleChat = menu.querySelector('#toggle-chat');

  const btnClose = menu.querySelector('#btn-settings-close');
  const btnExit = menu.querySelector('#btn-settings-exit');

  // Theme change
  themeSelector.addEventListener('change', () => {
    const val = themeSelector.value;
    localStorage.setItem('whist_theme', val);
    if (val === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
    logInteraction(`Setting Changed: Theme set to ${val}`);
  });

  // Text size change
  textSizeSlider.addEventListener('input', () => {
    const val = textSizeSlider.value;
    textSizeVal.textContent = `${val}px`;
    localStorage.setItem('whist_text_size', val);
    document.documentElement.style.fontSize = `${val}px`;
    logInteraction(`Setting Changed: Text Size set to ${val}px`);
  });

  // Card spacing change
  cardSpacingSlider.addEventListener('input', () => {
    const val = cardSpacingSlider.value;
    cardSpacingVal.textContent = `${val}px`;
    localStorage.setItem('whist_card_spacing', val);
    logInteraction(`Setting Changed: Card Spacing set to ${val}px`);
    updateState({ ...getState() });
  });

  // Toggle handlers
  toggleRoundStats.addEventListener('change', () => {
    localStorage.setItem('whist_show_round_stats', toggleRoundStats.checked);
    logInteraction(`Setting Changed: Show Round Stats Badge set to ${toggleRoundStats.checked}`);
    updateState({ ...getState() });
  });

  toggleChat.addEventListener('change', () => {
    localStorage.setItem('whist_show_chat', toggleChat.checked);
    logInteraction(`Setting Changed: Show Lobby Chat Box set to ${toggleChat.checked}`);
    updateState({ ...getState() });
  });

  // Game rules inputs
  if (canEditRules) {
    const endConditionSelector = menu.querySelector('#rules-end-condition');
    const scoreContainer = menu.querySelector('#rule-score-container');
    const scoreSlider = menu.querySelector('#rules-score-slider');
    const scoreVal = menu.querySelector('#rules-score-val');
    const roundsContainer = menu.querySelector('#rule-rounds-container');
    const roundsSlider = menu.querySelector('#rules-rounds-slider');
    const roundsVal = menu.querySelector('#rules-rounds-val');
    const exchangeSelector = menu.querySelector('#rules-exchange-cards');
    const difficultySelector = menu.querySelector('#rules-bot-difficulty');
    const btnApply = menu.querySelector('#btn-apply-rules');

    endConditionSelector.addEventListener('change', () => {
      const val = endConditionSelector.value;
      if (val === 'score') {
        scoreContainer.classList.remove('hidden');
        roundsContainer.classList.add('hidden');
      } else {
        scoreContainer.classList.add('hidden');
        roundsContainer.classList.remove('hidden');
      }
    });

    scoreSlider.addEventListener('input', () => {
      scoreVal.textContent = `${scoreSlider.value} pts`;
    });

    roundsSlider.addEventListener('input', () => {
      roundsVal.textContent = `${roundsSlider.value} rounds`;
    });

    btnApply.addEventListener('click', () => {
      const payload = {
        action: 'update_settings',
        settings: {
          end_condition: endConditionSelector.value,
          target_score: parseInt(scoreSlider.value, 10),
          target_rounds: parseInt(roundsSlider.value, 10),
          exchange_cards_count: parseInt(exchangeSelector.value, 10),
          bot_difficulty: difficultySelector.value
        }
      };
      send(payload);
      logInteraction(`Applied Game Rules Settings: ${JSON.stringify(payload.settings)}`);
      
      btnApply.textContent = 'Settings Applied! ✓';
      btnApply.className = 'btn btn-primary w-full py-2 text-xs font-bold mt-2';
      setTimeout(() => {
        btnApply.textContent = 'Apply Rules Settings';
        btnApply.className = 'btn btn-gold w-full py-2 text-xs font-bold mt-2';
      }, 1500);
    });
  }

  // Close button
  btnClose.addEventListener('click', () => {
    logInteraction('Button Click: Close Settings');
    closeMenu();
  });

  // Exit button
  if (btnExit) {
    btnExit.addEventListener('click', () => {
      logInteraction('Button Click: Exit Game');
      const isOffline = state.mode === 'offline';
      const warningMsg = isOffline 
        ? 'Game will not be saved. Still exit?' 
        : 'Are you sure you want to exit the match? You will be replaced by a bot.';

      showCustomConfirm(warningMsg, () => {
        logInteraction('Button Click: Confirm Exit Game');
        closeMenu();
        send({ action: 'leave_room' });
        disconnect();
        
        const cleanLobbyState = {
          current_stage: 'LOBBY',
          players: [],
          my_hand: [],
          table_cards: [],
          prompt_data: null,
          trick_winner: null,
          winner: null,
          view_stage: 'SERVER_SELECT',
          mode: null
        };
        updateState(cleanLobbyState);
      });
    });
  }
}

function showCustomConfirm(message, callback) {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-[100] pointer-events-auto';
  modal.innerHTML = `
    <div class="glass-opaque p-6 max-w-sm w-full mx-4 border border-slate-800 flex flex-col items-center text-center shadow-2xl rounded-2xl animate-fade-in">
      <h3 class="text-base font-extrabold text-white mb-2">Confirm Action</h3>
      <p class="text-xs text-slate-400 mb-6 leading-relaxed">${message}</p>
      <div class="flex gap-3 w-full">
        <button id="confirm-cancel" class="btn btn-secondary flex-1 py-2 text-xs">Cancel</button>
        <button id="confirm-ok" class="btn btn-danger flex-1 py-2 text-xs">Confirm</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const btnCancel = modal.querySelector('#confirm-cancel');
  const btnOk = modal.querySelector('#confirm-ok');

  btnCancel.addEventListener('click', () => {
    modal.remove();
  });

  btnOk.addEventListener('click', () => {
    modal.remove();
    callback();
  });
}
