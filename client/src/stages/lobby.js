import { connect, send, disconnect, onStatusChange, getConnectionStatus } from '../network.js';
import { updateState, getState } from '../state.js';
import { startTutorial } from '../tutorial.js';
import { logInteraction } from '../logger.js';
import { toggleSettingsMenu } from '../components/settings.js';

let chatHistory = [];
const DEFAULT_WS_URL = import.meta.env.VITE_WS_URL || 'wss://israeli-whist-backend.fly.dev';
const autoOpenedRooms = new Set();

/**
 * Render the LOBBY / Server Selection and Room Browser stage.
 * @param {object} state - Game State
 * @param {HTMLElement} container - Stage Container
 */
export function renderLobby(state, container) {
  container.innerHTML = '';

  const players = state.players || [];

  // If players is empty, show Server Selection / Room Browser
  if (players.length === 0) {
    chatHistory = [];
    autoOpenedRooms.clear();
    // If we have custom room list state or are viewing room browser
    if (state.view_stage === 'ROOM_LIST') {
      renderRoomBrowser(container, state);
    } else {
      renderServerSelection(container);
    }
  } else {
    // Already in a room waiting
    const isOffline = state.mode === 'offline';
    if (isOffline) {
      // Offline setup: bypass bots waiting lobby UI
      const card = document.createElement('div');
      card.className = 'glass-opaque p-8 max-w-sm w-full mx-4 flex flex-col items-center text-center shadow-2xl relative rounded-2xl';
      card.innerHTML = `
        <h2 class="text-xl font-black text-white uppercase tracking-wider mb-2">Setting Up Game...</h2>
        <p class="text-slate-400 text-xs font-semibold">Connecting and preparing offline session</p>
      `;
      container.appendChild(card);
    } else {
      renderWaitingRoom(players, container, state);
    }

    // Auto-open settings ONLY for offline mode host when first rendering the lobby
    const localPlayer = players[0] || {};
    const isHost = localPlayer.id === 'p1';
    if (isHost && state.room_id && isOffline) {
      if (!autoOpenedRooms.has(state.room_id)) {
        autoOpenedRooms.add(state.room_id);
        setTimeout(() => {
          toggleSettingsMenu('rules');
        }, 100);
      }
    }
  }
}

function renderServerSelection(container) {
  const card = document.createElement('div');
  card.className = 'glass-opaque p-8 md:p-10 max-w-md w-full mx-4 flex flex-col items-center text-center shadow-2xl relative overflow-hidden';
  
  const loggedInUser = localStorage.getItem('whist_logged_in_username') || null;
  let loginHeaderHtml = '';
  let loginButtonHtml = '';

  // Account login is greyed out per request, but we still show a disabled state
  loginButtonHtml = `
    <button id="btn-login" class="btn btn-secondary text-base py-3.5 flex justify-center items-center gap-2 opacity-50 cursor-not-allowed text-slate-500" disabled>
      <span>👤</span> Account Login / Create (Disabled)
    </button>
  `;

  card.innerHTML = `
    <!-- Floating decorative suit symbols -->
    <div class="absolute -top-10 -left-10 text-9xl text-slate-700/5 select-none font-bold">♠</div>
    <div class="absolute -bottom-10 -right-10 text-9xl text-slate-700/5 select-none font-bold">♥</div>
    <div class="absolute top-1/2 right-4 text-6xl text-slate-700/5 select-none font-bold">♦</div>
    <div class="absolute top-1/3 left-4 text-6xl text-slate-700/5 select-none font-bold">♣</div>
 
    <div class="relative z-10 w-full flex flex-col items-center">
      <h1 class="text-5xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-400 to-blue-500 mb-2">WHIST</h1>
      <div class="text-[10px] uppercase font-black tracking-widest text-emerald-400/80 mb-4 bg-emerald-950/40 px-2 py-0.5 rounded">Israeli Edition</div>
      <p class="text-slate-400 text-sm mb-4">A classic trick-taking card game. Choose a connection option to start.</p>

      <!-- Player Nickname Selection -->
      <div class="flex flex-col gap-1.5 w-full mb-3.5 text-left relative z-20">
        <label class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Your Nickname</label>
        <input type="text" id="input-player-nickname" class="input w-full text-xs bg-slate-900 border border-slate-700 rounded text-slate-200 py-2.5 px-3 font-semibold" placeholder="Enter your name" maxlength="15" />
      </div>

      <!-- Server Connection Selection -->
      <div class="flex flex-col gap-1.5 w-full mb-5 text-left relative z-20">
        <label class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Server Connection</label>
        <select id="select-server-url" class="input w-full py-2 px-3 text-xs font-semibold bg-slate-900 border border-slate-700 rounded text-slate-200">
          <option value="wss://israeli-whist-backend.fly.dev">Online Server (Fly.io)</option>
          <option value="ws://127.0.0.1:8080">Local Server (127.0.0.1)</option>
          <option value="custom">Custom Server URL...</option>
        </select>
        <input type="text" id="input-custom-server-url" class="input w-full text-xs font-mono mt-1.5 hidden bg-slate-900 border border-slate-700 rounded text-slate-200 py-1.5 px-3" placeholder="ws://127.0.0.1:8080" />
      </div>

      <div class="flex flex-col gap-4 w-full" id="menu-buttons">
        <button id="btn-offline" class="btn btn-primary text-base py-3.5 flex justify-center items-center gap-2">
          <span>⚡</span> Play Offline vs Bots
        </button>
        <button id="btn-show-online" class="btn btn-secondary text-base py-3.5 flex justify-center items-center gap-2">
          <span>🌐</span> Online Multiplayer
        </button>
        ${loginButtonHtml}
        <button id="btn-tutorial" class="btn btn-secondary text-base py-3.5 flex justify-center items-center gap-2 border border-amber-500/25">
          <span>📖</span> Tutorial
        </button>
        <button id="btn-main-settings" class="btn btn-secondary text-base py-3.5 flex justify-center items-center gap-2">
          <span>⚙️</span> Game Settings
        </button>
      </div>
    </div>
  `;

  container.appendChild(card);

  const btnOffline = card.querySelector('#btn-offline');
  const btnShowOnline = card.querySelector('#btn-show-online');
  const btnTutorial = card.querySelector('#btn-tutorial');
  const btnMainSettings = card.querySelector('#btn-main-settings');
  const selectServer = card.querySelector('#select-server-url');
  const inputCustom = card.querySelector('#input-custom-server-url');
  const inputNickname = card.querySelector('#input-player-nickname');

  const currentSaved = localStorage.getItem('whist_server_url') || DEFAULT_WS_URL;
  const savedNickname = localStorage.getItem('whist_nickname') || 'Player';
  inputNickname.value = savedNickname;

  inputNickname.addEventListener('input', () => {
    const val = inputNickname.value.trim();
    localStorage.setItem('whist_nickname', val || 'Player');
  });

  // Initialize dropdown options from localStorage
  if (currentSaved === 'wss://israeli-whist-backend.fly.dev') {
    selectServer.value = 'wss://israeli-whist-backend.fly.dev';
    inputCustom.classList.add('hidden');
  } else if (currentSaved === 'ws://127.0.0.1:8080') {
    selectServer.value = 'ws://127.0.0.1:8080';
    inputCustom.classList.add('hidden');
  } else {
    selectServer.value = 'custom';
    inputCustom.value = currentSaved;
    inputCustom.classList.remove('hidden');
  }

  // Handle dropdown value changes
  selectServer.addEventListener('change', () => {
    const val = selectServer.value;
    if (val === 'custom') {
      inputCustom.classList.remove('hidden');
      inputCustom.focus();
      const customVal = inputCustom.value.trim() || 'ws://127.0.0.1:8080';
      localStorage.setItem('whist_server_url', customVal);
    } else {
      inputCustom.classList.add('hidden');
      inputCustom.classList.remove('border-rose-500');
      localStorage.setItem('whist_server_url', val);
    }
  });

  // Handle custom URL input edits
  inputCustom.addEventListener('input', () => {
    const customVal = inputCustom.value.trim();
    if (customVal) {
      localStorage.setItem('whist_server_url', customVal);
    }
  });

  // Re-enable connection buttons if connection fails
  if (window._lobbyStatusUnsubscribe) {
    window._lobbyStatusUnsubscribe();
  }
  window._lobbyStatusUnsubscribe = onStatusChange((status) => {
    if (status === 'disconnected') {
      btnOffline.disabled = false;
      btnOffline.classList.remove('btn-loading');
      btnOffline.textContent = '⚡ Play Offline vs Bots';
      btnShowOnline.disabled = false;
      btnShowOnline.classList.remove('btn-loading');
      btnShowOnline.textContent = '🌐 Online Multiplayer';
      window.hideLoading();
    }
  });

  const getWSUrl = (mode) => {
    const savedUrl = localStorage.getItem('whist_server_url') || DEFAULT_WS_URL;
    const nickname = inputNickname.value.trim() || 'Player';
    localStorage.setItem('whist_nickname', nickname);
    return `${savedUrl}?mode=${mode}&username=${encodeURIComponent(nickname)}`;
  };

  const validateAndConnect = (mode, btn) => {
    const savedUrl = localStorage.getItem('whist_server_url') || DEFAULT_WS_URL;
    if (!savedUrl.startsWith('ws://') && !savedUrl.startsWith('wss://')) {
      inputCustom.classList.remove('hidden');
      inputCustom.classList.add('border-rose-500');
      inputCustom.focus();
      btn.disabled = false;
      btn.textContent = btn.id === 'btn-offline' ? '⚡ Play Offline vs Bots' : '🌐 Online Multiplayer';
      return false;
    }
    inputCustom.classList.remove('border-rose-500');
    connect(getWSUrl(mode));
    return true;
  };

  btnOffline.addEventListener('click', () => {
    logInteraction('Button Click: Play Offline vs Bots');
    btnOffline.disabled = true;
    btnOffline.classList.add('btn-loading');
    window.showLoading('Starting Offline Match...');
    if (validateAndConnect('offline', btnOffline)) {
      const state = getState() || {};
      state.mode = 'offline';
      updateState(state);
    }
  });

  btnShowOnline.addEventListener('click', () => {
    logInteraction('Button Click: Online Multiplayer');
    btnShowOnline.disabled = true;
    btnShowOnline.classList.add('btn-loading');
    window.showLoading('Connecting to Online Lobby...');
    
    if (validateAndConnect('online', btnShowOnline)) {
      const state = getState() || {};
      state.mode = 'online';
      updateState(state);

      const unsubscribe = onStatusChange((status) => {
        if (status === 'connected') {
          unsubscribe();
          const state = getState() || {};
          state.view_stage = 'ROOM_LIST';
          updateState(state);
          send({ action: 'list_rooms' });
        }
      });
    }
  });

  const btnLogin = card.querySelector('#btn-login');
  const btnLogout = card.querySelector('#btn-logout');

  if (btnLogin) {
    btnLogin.addEventListener('click', () => {
      showLoginModal();
    });
  }

  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      logInteraction('Button Click: Logout Account');
      localStorage.removeItem('whist_logged_in_username');
      localStorage.removeItem('whist_username');
      localStorage.removeItem('whist_password');
      disconnect();
      
      const state = getState() || {};
      state.players = [];
      state.view_stage = 'SERVER_SELECT';
      updateState(state);
    });
  }

  btnTutorial.addEventListener('click', () => {
    logInteraction('Button Click: Tutorial');
    startTutorial();
  });

  btnMainSettings.addEventListener('click', () => {
    logInteraction('Button Click: Open Main Menu Settings');
    toggleSettingsMenu();
  });
}

function renderRoomBrowser(container, state) {
  const rooms = state.rooms || [];
  const card = document.createElement('div');
  card.className = 'glass-opaque p-8 max-w-2xl w-full mx-4 flex flex-col shadow-2xl relative z-10 max-h-[90vh] overflow-hidden';

  card.innerHTML = `
    <!-- Header -->
    <div class="flex justify-between items-center mb-6 pb-4 border-b border-slate-800">
      <div>
        <h2 class="text-2xl font-black text-white tracking-wide">Room Browser</h2>
        <p class="text-slate-400 text-xs mt-0.5">Select a room to play or spectate games</p>
      </div>
      <div class="flex gap-2">
        <button id="btn-refresh-rooms" class="btn btn-secondary text-xs !py-2 !px-3 flex items-center gap-1.5">
          🔄 Refresh
        </button>
        <button id="btn-create-room" class="btn btn-primary text-xs !py-2 !px-3 flex items-center gap-1.5">
          <span>+</span> Create Room
        </button>
      </div>
    </div>

    <!-- Rooms list -->
    <div class="flex-1 overflow-y-auto pr-1 flex flex-col gap-3 min-h-[250px] max-h-[350px] mb-6" id="rooms-list-container">
      ${rooms.length === 0 ? `
        <div class="text-center py-12 text-slate-500 font-medium">
          No active rooms found. Click "Create Room" to start one!
        </div>
      ` : rooms.map(room => {
        const isFull = room.players >= room.maxPlayers;
        const playerBadgeColor = isFull ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
        
        return `
          <div class="glass-sm p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-slate-800 hover:border-slate-700 transition-colors">
            <div class="flex flex-col gap-1 text-left">
              <div class="flex items-center gap-2">
                <span class="text-sm font-bold text-white">${room.name}</span>
                ${room.hasPassword ? '<span class="text-slate-400 text-[10px]">🔒 Private</span>' : '<span class="text-emerald-500/80 text-[10px]">🔓 Open</span>'}
              </div>
              <div class="flex gap-2 items-center">
                <span class="text-[10px] px-1.5 py-0.5 rounded border font-semibold ${playerBadgeColor}">${room.players}/${room.maxPlayers} Players</span>
                <span class="text-[10px] text-slate-500 font-mono">ID: ${room.id}</span>
              </div>
            </div>
            
            <div class="flex gap-2 self-end md:self-auto">
              <button class="btn btn-secondary text-xs !py-1.5 !px-3 btn-spectate" data-id="${room.id}" data-private="${room.hasPassword}">
                👁️ Spectate
              </button>
              ${!isFull ? `
                <button class="btn btn-primary text-xs !py-1.5 !px-4 btn-join" data-id="${room.id}" data-private="${room.hasPassword}">
                  ⚔️ Join Game
                </button>
              ` : `
                <button class="btn btn-secondary text-xs !py-1.5 !px-4 opacity-50 cursor-not-allowed" disabled>
                  Room Full
                </button>
              `}
            </div>
          </div>
        `;
      }).join('')}
    </div>

    <!-- Back to main menu -->
    <div class="flex justify-between items-center">
      <button id="btn-browser-back" class="btn btn-secondary text-xs !py-2 !px-4">
        ← Main Menu
      </button>
      <span class="text-[10px] text-slate-500 font-medium">Israeli Whist Room Broker active</span>
    </div>

    <!-- Sleek Password Modal (Hidden by Default) -->
    <div id="password-modal" class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center hidden z-30">
      <div class="glass-opaque p-6 max-w-sm w-full mx-4 border border-slate-800 flex flex-col items-center text-center">
        <h3 class="text-lg font-black text-white uppercase tracking-wider mb-1">Enter Room Token</h3>
        <p class="text-xs text-slate-400 mb-6">This room requires a password or private access key.</p>
        
        <input type="password" id="room-password-input" class="input w-full text-center mb-6 font-mono text-lg tracking-widest" placeholder="••••••••" />
        
        <div class="flex gap-2 w-full">
          <button id="btn-modal-cancel" class="btn btn-secondary flex-1 py-2 text-xs">Cancel</button>
          <button id="btn-modal-submit" class="btn btn-primary flex-1 py-2 text-xs">Submit</button>
        </div>
      </div>
    </div>

    <!-- Sleek Create Room Modal (Hidden by Default) -->
    <div id="create-room-modal" class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center hidden z-30">
      <div class="glass-opaque p-6 max-w-sm w-full mx-4 border border-slate-800 flex flex-col items-center text-center">
        <h3 class="text-lg font-black text-white uppercase tracking-wider mb-1">Create Room</h3>
        <p class="text-xs text-slate-400 mb-6">Set up your private or public Israeli Whist match.</p>
        
        <div class="flex flex-col gap-2 w-full mb-4 text-left">
          <label class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Room Name</label>
          <input type="text" id="create-room-name" class="input w-full text-sm" placeholder="New Whist Lounge" value="New Whist Lounge" maxlength="30" />
        </div>
        
        <div class="flex flex-col gap-2 w-full mb-6 text-left">
          <label class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Password / Token (Optional)</label>
          <input type="password" id="create-room-password" class="input w-full text-sm font-mono" placeholder="Leave blank for public room" />
        </div>
        
        <div class="flex gap-2 w-full">
          <button id="btn-create-cancel" class="btn btn-secondary flex-1 py-2.5 text-xs">Cancel</button>
          <button id="btn-create-submit" class="btn btn-primary flex-1 py-2.5 text-xs">Create</button>
        </div>
      </div>
    </div>
  `;

  container.appendChild(card);

  // Hook button events
  const btnBack = card.querySelector('#btn-browser-back');
  const btnCreate = card.querySelector('#btn-create-room');
  const btnRefresh = card.querySelector('#btn-refresh-rooms');
  const modal = card.querySelector('#password-modal');
  const modalCancel = card.querySelector('#btn-modal-cancel');
  const modalSubmit = card.querySelector('#btn-modal-submit');
  const passwordInput = card.querySelector('#room-password-input');

  const createModal = card.querySelector('#create-room-modal');
  const createCancel = card.querySelector('#btn-create-cancel');
  const createSubmit = card.querySelector('#btn-create-submit');
  const createNameInput = card.querySelector('#create-room-name');
  const createPassInput = card.querySelector('#create-room-password');

  let selectedRoom = null;
  let selectedRole = 'player';

  btnBack.addEventListener('click', () => {
    logInteraction('Button Click: Browser Back to Main Menu');
    const state = getState() || {};
    state.view_stage = 'SERVER_SELECT';
    updateState(state);
  });

  btnCreate.addEventListener('click', () => {
    createNameInput.value = 'New Whist Lounge';
    createPassInput.value = '';
    createModal.classList.remove('hidden');
    createNameInput.focus();
    createNameInput.select();
  });

  createCancel.addEventListener('click', () => {
    createModal.classList.add('hidden');
  });

  createSubmit.addEventListener('click', () => {
    const rName = createNameInput.value.trim();
    if (!rName) return;
    const rPass = createPassInput.value.trim();

    logInteraction(`Button Click: Create Room (name: "${rName}", private: ${!!rPass})`);
    createSubmit.disabled = true;
    createCancel.disabled = true;
    createNameInput.disabled = true;
    createPassInput.disabled = true;
    createSubmit.classList.add('btn-loading');
    window.showLoading('Creating Room...');

    const state = getState() || {};
    state.room_password = rPass || null;
    state.room_role = 'player';
    updateState(state);

    send({
      action: 'create_room',
      name: rName,
      password: rPass || null
    });
  });

  // Enable Enter key on inputs to submit
  createNameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') createSubmit.click();
  });
  createPassInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') createSubmit.click();
  });

  btnRefresh.addEventListener('click', () => {
    logInteraction('Button Click: Refresh Rooms List');
    btnRefresh.disabled = true;
    btnRefresh.classList.add('btn-loading');
    send({ action: 'list_rooms' });
    setTimeout(() => {
      if (btnRefresh && btnRefresh.disabled) {
        btnRefresh.disabled = false;
        btnRefresh.classList.remove('btn-loading');
      }
    }, 3000);
  });

  // Wire Join and Spectate buttons
  card.querySelectorAll('.btn-join').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedRoom = btn.dataset.id;
      selectedRole = 'player';
      const isPrivate = btn.dataset.private === 'true';

      logInteraction(`Button Click: Join Room (id: "${selectedRoom}", private: ${isPrivate})`);
      if (isPrivate) {
        passwordInput.value = '';
        modal.classList.remove('hidden');
        passwordInput.focus();
      } else {
        card.querySelectorAll('.btn-join, .btn-spectate').forEach(b => b.disabled = true);
        btn.classList.add('btn-loading');
        window.showLoading('Joining Room...');
        submitJoinRoom(selectedRoom, '', selectedRole);
      }
    });
  });

  card.querySelectorAll('.btn-spectate').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedRoom = btn.dataset.id;
      selectedRole = 'spectator';
      const isPrivate = btn.dataset.private === 'true';

      logInteraction(`Button Click: Spectate Room (id: "${selectedRoom}", private: ${isPrivate})`);
      if (isPrivate) {
        passwordInput.value = '';
        modal.classList.remove('hidden');
        passwordInput.focus();
      } else {
        card.querySelectorAll('.btn-join, .btn-spectate').forEach(b => b.disabled = true);
        btn.classList.add('btn-loading');
        window.showLoading('Joining as Spectator...');
        submitJoinRoom(selectedRoom, '', selectedRole);
      }
    });
  });

  modalCancel.addEventListener('click', () => {
    logInteraction('Button Click: Cancel Password Modal');
    modal.classList.add('hidden');
  });

  modalSubmit.addEventListener('click', () => {
    const pass = passwordInput.value.trim();
    if (!pass) return;
    logInteraction('Button Click: Submit Password Modal');
    modalSubmit.disabled = true;
    modalCancel.disabled = true;
    passwordInput.disabled = true;
    modalSubmit.classList.add('btn-loading');
    window.showLoading('Joining Room...');
    submitJoinRoom(selectedRoom, pass, selectedRole);
  });

  passwordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') modalSubmit.click();
  });
}

function submitJoinRoom(roomId, password, role) {
  const state = getState() || {};
  state.room_password = password || null;
  state.room_role = role || 'player';
  updateState(state);

  // Send websocket payload
  send({
    action: 'join_room',
    room_id: roomId,
    password: password || null,
    role: role // 'player' or 'spectator'
  });
}

function renderWaitingRoom(players, container, state) {
  const showChat = localStorage.getItem('whist_show_chat') !== 'false';
  const card = document.createElement('div');
  if (showChat) {
    card.className = 'glass-opaque p-8 max-w-4xl w-full mx-4 flex flex-col md:flex-row gap-6 shadow-2xl relative rounded-2xl';
  } else {
    card.className = 'glass-opaque p-8 max-w-xl w-full mx-4 flex flex-col gap-6 shadow-2xl relative rounded-2xl';
  }

  const count = players.length;
  const isSpectator = state.is_spectator === true;
  const localPlayer = players[0] || {};
  const isHostUser = localPlayer.id === 'p1';
  const isReadyUser = localPlayer.status === 'Ready';

  const otherPlayers = players.slice(1);
  const otherHumans = otherPlayers.filter(p => !p.bot);
  const allOthersReady = otherHumans.every(p => p.status === 'Ready');

  // Read game settings for active rule display
  const gameSettings = state.settings || {
    end_condition: 'rounds',
    target_score: 100,
    target_rounds: 0,
    exchange_cards_count: 2,
    bot_difficulty: 'hard'
  };

  const endCondText = gameSettings.end_condition === 'rounds' 
    ? (gameSettings.target_rounds === 0 ? 'Choose after each round' : `${gameSettings.target_rounds} Rounds`)
    : `${gameSettings.target_score} Points`;
  const exchangeText = gameSettings.exchange_cards_count === 0 
    ? 'No Exchange' 
    : `${gameSettings.exchange_cards_count} Cards`;
  const difficultyText = gameSettings.bot_difficulty === 'easy' ? 'Easy Bots' : 'Hard Bots';

  card.innerHTML = `
    <!-- Left Side: Players & Controls -->
    <div class="flex-1 flex flex-col items-center text-center">
      <!-- Header row containing title and settings button -->
      <div class="flex justify-between items-center w-full mb-3 pb-2 border-b border-slate-800/40">
        <h2 class="text-2xl font-black text-white tracking-wide">Waiting Room</h2>
        <button id="btn-waiting-room-settings" class="btn btn-secondary text-xs !py-1 !px-2.5 flex items-center gap-1">⚙️ Settings</button>
      </div>

      <div class="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1 pulse-soft">
        ${isSpectator ? 'Spectating Mode — Waiting for game launch' : 'Waiting for players to join...'}
      </div>
      
      <!-- Active Rules Badges -->
      <div class="flex flex-wrap gap-2 justify-center mb-4">
        <span class="text-[9px] uppercase font-black tracking-wider px-2 py-0.5 rounded border border-slate-800 bg-slate-950/40 text-slate-400">Goal: ${endCondText}</span>
        <span class="text-[9px] uppercase font-black tracking-wider px-2 py-0.5 rounded border border-slate-800 bg-slate-950/40 text-slate-400">Passing: ${exchangeText}</span>
        <span class="text-[9px] uppercase font-black tracking-wider px-2 py-0.5 rounded border border-slate-800 bg-slate-950/40 text-slate-400">AI: ${difficultyText}</span>
      </div>
      
      ${isSpectator ? '<div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-900/50 border border-slate-800 px-3 py-1 rounded mb-6">Viewer</div>' : '<div class="mb-4"></div>'}

      <!-- Players grid -->
      <div class="grid grid-cols-2 gap-4 w-full mb-6">
        ${[0, 1, 2, 3].map(i => {
          const player = players[i];
          if (player) {
            const isHost = player.id === 'p1';
            const isReady = player.status === 'Ready';
            const isSelf = player.id === localPlayer.id;
            
            let badgeText = isHost ? 'Host' : (isReady ? 'Ready' : 'Not Ready');
            let badgeClass = isHost ? 'text-amber-400 border-amber-500/30 bg-amber-950/20' : (isReady ? 'text-emerald-400 border-emerald-500/20 bg-emerald-950/10' : 'text-slate-500 border-slate-800 bg-slate-900/40');
            
            return `
              <div class="glass-opaque px-3 py-4 flex flex-col items-center border border-slate-800 hover:border-slate-700 hover:scale-[1.02] transition-all cursor-pointer player-card" data-id="${player.id}" data-name="${player.name}">
                <div class="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-base mb-2">
                  ${player.name.charAt(0).toUpperCase()}
                </div>
                <span class="text-xs font-bold text-white truncate max-w-full">${player.name} ${isSelf ? '<span class="text-[9px] text-slate-500">(You)</span>' : ''}</span>
                <span class="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border mt-2 ${badgeClass}">${badgeText}</span>
              </div>
            `;
          } else {
            return `
              <div class="glass-opaque px-3 py-4 flex flex-col items-center opacity-40 border border-slate-700/30 border-dashed animate-pulse">
                <div class="w-9 h-9 rounded-full bg-slate-800 text-slate-600 flex items-center justify-center font-bold text-base mb-2">
                  ?
                </div>
                <span class="text-xs font-semibold text-slate-500">Waiting</span>
                <span class="text-[9px] text-slate-600 font-medium uppercase mt-1.5">-</span>
              </div>
            `;
          }
        }).join('')}
      </div>

      <!-- Controls -->
      <div class="flex flex-col gap-3 w-full mt-auto">
        <div class="flex items-center justify-center gap-2 text-slate-400 text-xs font-medium">
          <span class="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          <span>${count}/4 Players Connected</span>
        </div>

        <div class="flex gap-3 justify-center w-full mt-1">
          ${isHostUser ? `
            <button id="btn-close-room" class="btn btn-secondary text-xs flex-1 !py-2.5 !px-3 border border-rose-500/20 hover:border-rose-500/40 text-rose-300">Close Room</button>
            <button id="btn-start-game" class="btn btn-primary text-xs flex-1 !py-2.5 !px-4 ${!allOthersReady ? 'opacity-50 cursor-not-allowed' : ''}" ${!allOthersReady ? 'title="All connected players must ready up before starting."' : ''}>Start Game</button>
          ` : `
            <button id="btn-exit-room" class="btn btn-secondary text-xs flex-1 !py-2.5 !px-3">Exit Room</button>
            ${!isSpectator ? `<button id="btn-ready-room" class="btn btn-primary text-xs flex-1 !py-2.5 !px-4">${isReadyUser ? 'Unready' : 'Ready Up'}</button>` : ''}
          `}
        </div>
      </div>
    </div>

    ${showChat ? `
      <!-- Divider -->
      <div class="hidden md:block w-px bg-slate-800 self-stretch"></div>

      <!-- Right Side: Chat Box -->
      <div class="w-full md:w-80 flex flex-col h-[320px] md:h-auto">
        <h3 class="text-xs font-bold text-slate-400 uppercase tracking-widest text-left mb-3">Room Chat</h3>
        
        <!-- Chat logs container -->
        <div id="chat-messages" class="flex-1 overflow-y-auto pr-1 bg-slate-950/50 border border-slate-800/80 rounded-xl p-3 flex flex-col gap-2 min-h-[160px] max-h-[220px] md:max-h-[300px] text-left">
          <div class="text-[10px] text-slate-500 italic text-center py-4">Welcome to the lobby chat. Say hello!</div>
        </div>
        
        <!-- Chat input form -->
        <form id="chat-form" class="flex gap-2 mt-3 pointer-events-auto">
          <input type="text" id="chat-input" class="input flex-1 !py-2 text-xs" placeholder="Type a message..." maxlength="100" autocomplete="off" />
          <button type="submit" class="btn btn-primary text-xs !py-2 !px-3.5">Send</button>
        </form>
      </div>
    ` : ''}
  `;

  container.appendChild(card);

  // Hook button actions
  const btnExit = card.querySelector('#btn-exit-room');
  const btnReady = card.querySelector('#btn-ready-room');
  const btnClose = card.querySelector('#btn-close-room');
  const btnStart = card.querySelector('#btn-start-game');
  const btnWaitingSettings = card.querySelector('#btn-waiting-room-settings');
  const chatForm = card.querySelector('#chat-form');
  const chatInput = card.querySelector('#chat-input');
  const msgsContainer = card.querySelector('#chat-messages');

  // Populated saved messages on render
  if (showChat && msgsContainer && chatHistory.length > 0) {
    msgsContainer.innerHTML = '';
    chatHistory.forEach(data => {
      const msgEl = document.createElement('div');
      msgEl.className = 'text-xs text-slate-300 leading-normal';
      let nameColor = 'text-emerald-400';
      if (data.player_name === 'Spectator') nameColor = 'text-slate-400';
      else if (data.player_name === 'You' || data.player_name === players[0]?.name) nameColor = 'text-amber-400';

      msgEl.innerHTML = `<span class="font-extrabold ${nameColor}">${data.player_name}:</span> <span class="font-medium">${data.message}</span>`;
      msgsContainer.appendChild(msgEl);
    });
    msgsContainer.scrollTop = msgsContainer.scrollHeight;
  }

  // Set up live chat event listener (removes previous first to avoid duplicates)
  if (window._chatListener) {
    window.removeEventListener('whist_chat', window._chatListener);
  }

  window._chatListener = (e) => {
    const data = e.detail;
    chatHistory.push(data);
    
    if (showChat && msgsContainer) {
      const welcome = msgsContainer.querySelector('.italic');
      if (welcome) welcome.remove();

      const msgEl = document.createElement('div');
      msgEl.className = 'text-xs text-slate-300 leading-normal';
      
      let nameColor = 'text-emerald-400';
      if (data.player_name === 'Spectator') nameColor = 'text-slate-400';
      else if (data.player_name === 'You' || data.player_name === players[0]?.name) nameColor = 'text-amber-400';

      msgEl.innerHTML = `<span class="font-extrabold ${nameColor}">${data.player_name}:</span> <span class="font-medium">${data.message}</span>`;
      msgsContainer.appendChild(msgEl);
      msgsContainer.scrollTop = msgsContainer.scrollHeight;
    }
  };
  window.addEventListener('whist_chat', window._chatListener);

  // Wire buttons
  if (btnWaitingSettings) {
    if (isSpectator) {
      btnWaitingSettings.disabled = true;
      btnWaitingSettings.classList.add('opacity-50', 'cursor-not-allowed');
    } else {
      btnWaitingSettings.addEventListener('click', () => {
        logInteraction('Button Click: Open Waiting Room Settings');
        toggleSettingsMenu();
      });
    }
  }

  if (btnExit) {
    btnExit.addEventListener('click', () => {
      logInteraction('Button Click: Exit Room');
      btnExit.disabled = true;
      btnExit.classList.add('btn-loading');
      send({ action: 'leave_room' });

      chatHistory = [];
      if (window._chatListener) {
        window.removeEventListener('whist_chat', window._chatListener);
        window._chatListener = null;
      }

      const state = getState() || {};
      state.view_stage = 'ROOM_LIST';
      updateState(state);
      send({ action: 'list_rooms' });
    });
  }

  if (btnReady) {
    btnReady.addEventListener('click', () => {
      logInteraction('Button Click: Ready Up / Unready');
      btnReady.disabled = true;
      btnReady.classList.add('btn-loading');
      send({ action: 'ready_toggle' });
    });
  }

  if (btnClose) {
    btnClose.addEventListener('click', () => {
      logInteraction('Button Click: Close Room');
      showCustomConfirm('Are you sure you want to close this room? All players will be disconnected.', () => {
        logInteraction('Button Click: Confirm Close Room');
        btnClose.disabled = true;
        btnClose.classList.add('btn-loading');
        send({ action: 'close_room' });
      });
    });
  }

  if (btnStart) {
    btnStart.addEventListener('click', () => {
      const currentOthers = (getState().players || []).slice(1);
      const currentOthersHumans = currentOthers.filter(p => !p.bot);
      const currentReady = currentOthersHumans.every(p => p.status === 'Ready');
      if (!currentReady) {
        alert('Cannot start game: All other connected players must ready up first.');
        return;
      }

      logInteraction('Button Click: Host clicked Start Game - Open Rules Confirm Popup');
      toggleSettingsMenu('rules', true);
    });
  }

  // Wire Chat submit
  if (showChat && chatForm && chatInput) {
    chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const msg = chatInput.value.trim();
      if (!msg) return;

      logInteraction(`Form Submit: Send Chat message: "${msg}"`);
      send({
        action: 'chat',
        message: msg
      });

      chatInput.value = '';
      chatInput.focus();
    });
  }

  // Wire player card clicks to show statistics profile
  card.querySelectorAll('.player-card').forEach(el => {
    if (isSpectator) {
      el.classList.remove('cursor-pointer');
      el.classList.add('cursor-default');
    } else {
      el.addEventListener('click', () => {
        const pId = el.dataset.id;
        const pName = el.dataset.name;
        logInteraction(`Button Click: View Player Profile ID: ${pId}, Name: ${pName}`);
        showPlayerInfoModal(pId, pName);
      });
    }
  });
}

function showPlayerInfoModal(playerId, playerName) {
  // Generate seed-based statistics so they are consistent for the same player name
  const seed = playerName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const gamesPlayed = (seed % 80) + 20;
  const winPercent = (seed % 25) + 40; // 40% - 65%
  const favoriteSuit = ['hearts', 'diamonds', 'clubs', 'spades'][seed % 4];
  const bidsMet = (seed % 20) + 70; // 70% - 90%

  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 pointer-events-auto';
  
  modal.innerHTML = `
    <div class="glass-opaque p-6 max-w-sm w-full mx-4 border border-slate-800 flex flex-col items-center text-center shadow-2xl relative rounded-2xl animate-fade-in">
      <div class="w-16 h-16 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-3xl mb-4 border border-amber-500/25">
        ${playerName.charAt(0).toUpperCase()}
      </div>
      <h3 class="text-lg font-black text-white mb-1">${playerName}</h3>
      <div class="text-[9px] uppercase font-black tracking-widest text-slate-500 mb-6">Player Card ID: ${playerId}</div>

      <!-- Stats Grid -->
      <div class="grid grid-cols-2 gap-4 w-full mb-8">
        <div class="glass-sm p-3 flex flex-col items-center border border-slate-800/80">
          <span class="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Games Played</span>
          <span class="text-lg font-black text-white font-mono mt-1">${gamesPlayed}</span>
        </div>
        <div class="glass-sm p-3 flex flex-col items-center border border-slate-800/80">
          <span class="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Win Rate</span>
          <span class="text-lg font-black text-emerald-400 font-mono mt-1">${winPercent}%</span>
        </div>
        <div class="glass-sm p-3 flex flex-col items-center border border-slate-800/80">
          <span class="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Favorite Suit</span>
          <span class="text-sm font-bold text-white mt-1 capitalize">${favoriteSuit}</span>
        </div>
        <div class="glass-sm p-3 flex flex-col items-center border border-slate-800/80">
          <span class="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Bids Met</span>
          <span class="text-lg font-black text-amber-400 font-mono mt-1">${bidsMet}%</span>
        </div>
      </div>

      <button id="btn-close-stats" class="btn btn-secondary w-full py-2.5 text-xs font-bold">
        Close Profile
      </button>
    </div>
  `;
  document.body.appendChild(modal);

  modal.querySelector('#btn-close-stats').addEventListener('click', () => {
    modal.remove();
  });
}

function showCustomConfirm(message, callback) {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 pointer-events-auto';
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

function showLoginModal() {
  let modal = document.getElementById('login-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'login-modal';
    modal.className = 'fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 pointer-events-auto';
    document.body.appendChild(modal);
  }

  let isLoginMode = true;

  const renderModalContent = () => {
    modal.innerHTML = `
      <div class="glass-opaque p-6 max-w-sm w-full mx-4 border border-slate-800 shadow-2xl rounded-2xl flex flex-col gap-4 text-left relative animate-fade-in">
        <h3 id="login-modal-title" class="text-lg font-black text-white uppercase tracking-wider">
          ${isLoginMode ? 'Account Login' : 'Create Profile'}
        </h3>
        <p id="login-modal-desc" class="text-xs text-slate-400">
          ${isLoginMode ? 'Log in to your profile to use your custom username in rooms.' : 'Register a new account profile to track stats and scores.'}
        </p>
        
        <!-- Inputs -->
        <div class="flex flex-col gap-3">
          <div class="flex flex-col gap-1">
            <label class="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Username</label>
            <input type="text" id="login-username" class="input w-full text-xs" placeholder="Enter username" maxlength="15" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Password</label>
            <input type="password" id="login-password" class="input w-full text-xs" placeholder="Enter password" />
          </div>
        </div>
        
        <div id="login-error-msg" class="text-rose-400 text-xs font-bold hidden"></div>

        <!-- Actions -->
        <div class="flex flex-col gap-2 mt-2">
          <button id="btn-login-submit" class="btn btn-primary text-xs py-2.5">
            ${isLoginMode ? 'Log In' : 'Register Profile'}
          </button>
          <button id="btn-login-toggle" class="text-emerald-400 hover:text-emerald-300 text-xs font-bold text-center underline mt-1">
            ${isLoginMode ? "Don't have an account? Create one" : 'Already have an account? Log in'}
          </button>
          <button id="btn-login-cancel" class="btn btn-secondary text-xs py-2.5 mt-1">
            Cancel
          </button>
        </div>
      </div>
    `;

    const btnSubmit = modal.querySelector('#btn-login-submit');
    const btnToggle = modal.querySelector('#btn-login-toggle');
    const btnCancel = modal.querySelector('#btn-login-cancel');
    const usernameInput = modal.querySelector('#login-username');
    const passwordInput = modal.querySelector('#login-password');
    const errorMsg = modal.querySelector('#login-error-msg');

    btnToggle.addEventListener('click', () => {
      isLoginMode = !isLoginMode;
      renderModalContent();
    });

    btnCancel.addEventListener('click', () => {
      window.removeEventListener('whist_login_response', handleLoginResponse);
      window.removeEventListener('whist_register_response', handleRegisterResponse);
      modal.remove();
    });

    btnSubmit.addEventListener('click', () => {
      const userVal = usernameInput.value.trim();
      const passVal = passwordInput.value.trim();
      if (!userVal || !passVal) {
        errorMsg.textContent = 'Please fill out all fields.';
        errorMsg.classList.remove('hidden');
        return;
      }
      errorMsg.classList.add('hidden');
      btnSubmit.disabled = true;
      btnSubmit.classList.add('btn-loading');
      btnCancel.disabled = true;
      btnToggle.disabled = true;

      const actionFn = () => {
        window.showLoading(isLoginMode ? 'Logging in...' : 'Registering account...');
        if (isLoginMode) {
          window.addEventListener('whist_login_response', handleLoginResponse);
          send({ action: 'login', username: userVal, password: passVal });
        } else {
          window.addEventListener('whist_register_response', handleRegisterResponse);
          send({ action: 'register', username: userVal, password: passVal });
        }
      };

      const status = getConnectionStatus();
      if (status === 'connected') {
        actionFn();
      } else {
        window.showLoading('Connecting to server...');
        const savedUrl = localStorage.getItem('whist_server_url') || DEFAULT_WS_URL;
        connect(savedUrl + `?mode=online`);
        
        let unsubscribe = null;
        unsubscribe = onStatusChange((newStatus) => {
          if (newStatus === 'connected') {
            if (unsubscribe) unsubscribe();
            actionFn();
          } else if (newStatus === 'disconnected') {
            if (unsubscribe) unsubscribe();
            window.hideLoading();
            btnSubmit.disabled = false;
            btnSubmit.classList.remove('btn-loading');
            btnCancel.disabled = false;
            btnToggle.disabled = false;
            errorMsg.textContent = 'Could not connect to server.';
            errorMsg.classList.remove('hidden');
          }
        });
      }
    });

    const handleLoginResponse = (e) => {
      const data = e.detail;
      window.removeEventListener('whist_login_response', handleLoginResponse);
      if (data.status === 'ok') {
        localStorage.setItem('whist_logged_in_username', data.username);
        localStorage.setItem('whist_username', data.username);
        localStorage.setItem('whist_password', passwordInput.value.trim());

        window.hideLoading();
        modal.remove();
        
        // Re-render lobby
        const state = getState() || {};
        state.players = [];
        state.view_stage = 'SERVER_SELECT';
        updateState(state);
      } else {
        window.hideLoading();
        btnSubmit.disabled = false;
        btnSubmit.classList.remove('btn-loading');
        btnCancel.disabled = false;
        btnToggle.disabled = false;
        errorMsg.textContent = data.reason || 'Login failed.';
        errorMsg.classList.remove('hidden');
      }
    };

    const handleRegisterResponse = (e) => {
      const data = e.detail;
      window.removeEventListener('whist_register_response', handleRegisterResponse);
      if (data.status === 'ok') {
        window.hideLoading();
        alert('Profile created successfully! Please log in.');
        isLoginMode = true;
        renderModalContent();
      } else {
        window.hideLoading();
        btnSubmit.disabled = false;
        btnSubmit.classList.remove('btn-loading');
        btnCancel.disabled = false;
        btnToggle.disabled = false;
        errorMsg.textContent = data.reason || 'Registration failed.';
        errorMsg.classList.remove('hidden');
      }
    };
  };

  renderModalContent();
}
