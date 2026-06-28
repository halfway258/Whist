import { connect, send, onStatusChange } from '../network.js';
import { updateState, getState } from '../state.js';
import { startTutorial } from '../tutorial.js';
import { logInteraction } from '../logger.js';

let chatHistory = [];

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
    // If we have custom room list state or are viewing room browser
    if (state.view_stage === 'ROOM_LIST') {
      renderRoomBrowser(container, state);
    } else {
      renderServerSelection(container);
    }
  } else {
    // Already in a room waiting
    renderWaitingRoom(players, container, state);
  }
}

function renderServerSelection(container) {
  const card = document.createElement('div');
  card.className = 'glass p-8 md:p-10 max-w-md w-full mx-4 flex flex-col items-center text-center shadow-2xl relative overflow-hidden';
  
  card.innerHTML = `
    <!-- Floating decorative suit symbols -->
    <div class="absolute -top-10 -left-10 text-9xl text-slate-700/5 select-none font-bold">♠</div>
    <div class="absolute -bottom-10 -right-10 text-9xl text-slate-700/5 select-none font-bold">♥</div>
    <div class="absolute top-1/2 right-4 text-6xl text-slate-700/5 select-none font-bold">♦</div>
    <div class="absolute top-1/3 left-4 text-6xl text-slate-700/5 select-none font-bold">♣</div>

    <div class="relative z-10 w-full flex flex-col items-center">
      <h1 class="text-5xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-400 to-blue-500 mb-2">WHIST</h1>
      <div class="text-[10px] uppercase font-black tracking-widest text-emerald-400/80 mb-6 bg-emerald-950/40 px-2 py-0.5 rounded">Israeli Edition</div>
      <p class="text-slate-400 text-sm mb-8">A classic trick-taking card game. Choose a connection option to start.</p>

      <div class="flex flex-col gap-4 w-full" id="menu-buttons">
        <button id="btn-offline" class="btn btn-primary text-base py-3.5 flex justify-center items-center gap-2">
          <span>⚡</span> Play Offline vs Bots
        </button>
        <button id="btn-show-online" class="btn btn-secondary text-base py-3.5 flex justify-center items-center gap-2">
          <span>🌐</span> Online Multiplayer
        </button>
        <button id="btn-tutorial" class="btn btn-secondary text-base py-3.5 flex justify-center items-center gap-2 border border-amber-500/25">
          <span>📖</span> Learn Tutorial
        </button>
      </div>
    </div>
  `;

  container.appendChild(card);

  const btnOffline = card.querySelector('#btn-offline');
  const btnShowOnline = card.querySelector('#btn-show-online');
  const btnTutorial = card.querySelector('#btn-tutorial');

  btnOffline.addEventListener('click', () => {
    logInteraction('Button Click: Play Offline vs Bots');
    btnOffline.disabled = true;
    btnOffline.textContent = 'Connecting...';
    connect('ws://127.0.0.1:8080?mode=offline');
  });

  btnShowOnline.addEventListener('click', () => {
    logInteraction('Button Click: Online Multiplayer');
    btnShowOnline.disabled = true;
    btnShowOnline.textContent = 'Connecting...';
    
    // Connect to server automatically
    connect('ws://127.0.0.1:8080?mode=online');

    const unsubscribe = onStatusChange((status) => {
      if (status === 'connected') {
        unsubscribe();
        const state = getState() || {};
        state.view_stage = 'ROOM_LIST';
        updateState(state);
        
        // Request the real list of rooms from the server
        send({ action: 'list_rooms' });
      }
    });
  });

  btnTutorial.addEventListener('click', () => {
    logInteraction('Button Click: Learn Tutorial');
    startTutorial();
  });
}

function renderRoomBrowser(container, state) {
  const rooms = state.rooms || [];
  const card = document.createElement('div');
  card.className = 'glass p-8 max-w-2xl w-full mx-4 flex flex-col shadow-2xl relative z-10 max-h-[90vh] overflow-hidden';

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
      <div class="glass p-6 max-w-sm w-full mx-4 border border-slate-800 flex flex-col items-center text-center">
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
      <div class="glass p-6 max-w-sm w-full mx-4 border border-slate-800 flex flex-col items-center text-center">
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
    createModal.classList.add('hidden');

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
    send({ action: 'list_rooms' });
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
    modal.classList.add('hidden');
    submitJoinRoom(selectedRoom, pass, selectedRole);
  });

  passwordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') modalSubmit.click();
  });
}

function submitJoinRoom(roomId, password, role) {
  // Send websocket payload
  send({
    action: 'join_room',
    room_id: roomId,
    password: password || null,
    role: role // 'player' or 'spectator'
  });
}

function renderWaitingRoom(players, container, state) {
  const card = document.createElement('div');
  card.className = 'glass p-8 max-w-4xl w-full mx-4 flex flex-col md:flex-row gap-6 shadow-2xl relative rounded-2xl';

  const count = players.length;
  const isSpectator = state.is_spectator === true;
  const localPlayer = players[0] || {};
  const isHostUser = localPlayer.id === 'p1';
  const isReadyUser = localPlayer.status === 'Ready';

  card.innerHTML = `
    <!-- Left Side: Players & Controls -->
    <div class="flex-1 flex flex-col items-center text-center">
      <h2 class="text-2xl font-black text-white mb-1 tracking-wide">Waiting Room</h2>
      <div class="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2 pulse-soft">
        ${isSpectator ? 'Spectating Mode — Waiting for game launch' : 'Waiting for players to join...'}
      </div>
      
      ${isSpectator ? '<div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-900/50 border border-slate-800 px-3 py-1 rounded mb-6">Viewer</div>' : '<div class="mb-6"></div>'}

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
              <div class="glass-sm px-3 py-4 flex flex-col items-center border border-slate-800 hover:border-slate-700 hover:scale-[1.02] transition-all cursor-pointer player-card" data-id="${player.id}" data-name="${player.name}">
                <div class="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-base mb-2">
                  ${player.name.charAt(0).toUpperCase()}
                </div>
                <span class="text-xs font-bold text-white truncate max-w-full">${player.name} ${isSelf ? '<span class="text-[9px] text-slate-500">(You)</span>' : ''}</span>
                <span class="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border mt-2 ${badgeClass}">${badgeText}</span>
              </div>
            `;
          } else {
            return `
              <div class="glass-sm px-3 py-4 flex flex-col items-center opacity-40 border border-slate-700/30 border-dashed animate-pulse">
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
            <button id="btn-start-game" class="btn btn-primary text-xs flex-1 !py-2.5 !px-4">Start Game</button>
          ` : `
            <button id="btn-exit-room" class="btn btn-secondary text-xs flex-1 !py-2.5 !px-3">Exit Room</button>
            ${!isSpectator ? `<button id="btn-ready-room" class="btn btn-primary text-xs flex-1 !py-2.5 !px-4">${isReadyUser ? 'Unready' : 'Ready Up'}</button>` : ''}
          `}
        </div>
      </div>
    </div>

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
  `;

  container.appendChild(card);

  // Hook button actions
  const btnExit = card.querySelector('#btn-exit-room');
  const btnReady = card.querySelector('#btn-ready-room');
  const btnClose = card.querySelector('#btn-close-room');
  const btnStart = card.querySelector('#btn-start-game');
  const chatForm = card.querySelector('#chat-form');
  const chatInput = card.querySelector('#chat-input');
  const msgsContainer = card.querySelector('#chat-messages');

  // Populated saved messages on render
  if (chatHistory.length > 0) {
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
    
    if (msgsContainer) {
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
  if (btnExit) {
    btnExit.addEventListener('click', () => {
      logInteraction('Button Click: Exit Room');
      btnExit.disabled = true;
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
      send({ action: 'ready_toggle' });
    });
  }

  if (btnClose) {
    btnClose.addEventListener('click', () => {
      logInteraction('Button Click: Close Room');
      showCustomConfirm('Are you sure you want to close this room? All players will be disconnected.', () => {
        logInteraction('Button Click: Confirm Close Room');
        btnClose.disabled = true;
        send({ action: 'close_room' });
      });
    });
  }

  if (btnStart) {
    btnStart.addEventListener('click', () => {
      logInteraction('Button Click: Start Game Early (with bots)');
      btnStart.disabled = true;
      btnStart.textContent = 'Starting...';
      send({ action: 'start_game' });
    });
  }

  // Wire Chat submit
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

  // Wire player card clicks to show statistics profile
  card.querySelectorAll('.player-card').forEach(el => {
    el.addEventListener('click', () => {
      const pId = el.dataset.id;
      const pName = el.dataset.name;
      logInteraction(`Button Click: View Player Profile ID: ${pId}, Name: ${pName}`);
      showPlayerInfoModal(pId, pName);
    });
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
    <div class="glass p-6 max-w-sm w-full mx-4 border border-slate-800 flex flex-col items-center text-center shadow-2xl relative rounded-2xl animate-fade-in">
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
    <div class="glass p-6 max-w-sm w-full mx-4 border border-slate-800 flex flex-col items-center text-center shadow-2xl rounded-2xl animate-fade-in">
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
