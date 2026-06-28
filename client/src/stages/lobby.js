import { connect, send } from '../network.js';
import { updateState, getState } from '../state.js';

// Mock rooms for browser simulation (if not connected yet or for dev simulation)
const MOCK_ROOMS = [
  { id: 'room-1', name: 'Tel Aviv Open Championship', players: 3, maxPlayers: 4, hasPassword: true },
  { id: 'room-2', name: 'Casual Friday Whist', players: 1, maxPlayers: 4, hasPassword: false },
  { id: 'room-3', name: 'Elite Masters Room', players: 4, maxPlayers: 4, hasPassword: true },
  { id: 'room-4', name: 'Beginners Welcome Room', players: 2, maxPlayers: 4, hasPassword: false }
];

/**
 * Render the LOBBY / Server Selection and Room Browser stage.
 * @param {object} state - Game State
 * @param {HTMLElement} container - Stage Container
 */
export function renderLobby(state, container) {
  container.innerHTML = '';

  const players = state.players || [];

  // If players is empty or has only 1 player, show Server Selection / Room Browser
  if (players.length <= 1) {
    // If we have custom room list state or are viewing room browser
    if (state.view_stage === 'ROOM_LIST') {
      renderRoomBrowser(container);
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
      </div>
    </div>
  `;

  container.appendChild(card);

  const btnOffline = card.querySelector('#btn-offline');
  const btnShowOnline = card.querySelector('#btn-show-online');

  btnOffline.addEventListener('click', () => {
    btnOffline.disabled = true;
    btnOffline.textContent = 'Connecting...';
    connect('ws://127.0.0.1:8080?mode=offline');
  });

  btnShowOnline.addEventListener('click', () => {
    btnShowOnline.disabled = true;
    btnShowOnline.textContent = 'Connecting...';
    
    // Connect to server automatically
    connect('ws://127.0.0.1:8080?mode=online');

    // Transition straight to the Room Browser screen
    setTimeout(() => {
      const state = getState() || {};
      state.view_stage = 'ROOM_LIST';
      updateState(state);
    }, 500);
  });
}

function renderRoomBrowser(container) {
  const card = document.createElement('div');
  card.className = 'glass p-8 max-w-2xl w-full mx-4 flex flex-col shadow-2xl relative z-10 max-h-[90vh] overflow-hidden';

  card.innerHTML = `
    <!-- Header -->
    <div class="flex justify-between items-center mb-6 pb-4 border-b border-slate-800">
      <div>
        <h2 class="text-2xl font-black text-white tracking-wide">Room Browser</h2>
        <p class="text-slate-400 text-xs mt-0.5">Select a room to play or spectate games</p>
      </div>
      <button id="btn-create-room" class="btn btn-primary text-xs !py-2 !px-3 flex items-center gap-1.5">
        <span>+</span> Create Room
      </button>
    </div>

    <!-- Rooms list -->
    <div class="flex-1 overflow-y-auto pr-1 flex flex-col gap-3 min-h-[250px] max-h-[350px] mb-6" id="rooms-list-container">
      ${MOCK_ROOMS.map(room => {
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
  `;

  container.appendChild(card);

  // Hook button events
  const btnBack = card.querySelector('#btn-browser-back');
  const btnCreate = card.querySelector('#btn-create-room');
  const modal = card.querySelector('#password-modal');
  const modalCancel = card.querySelector('#btn-modal-cancel');
  const modalSubmit = card.querySelector('#btn-modal-submit');
  const passwordInput = card.querySelector('#room-password-input');

  let selectedRoom = null;
  let selectedRole = 'player';

  btnBack.addEventListener('click', () => {
    const state = getState() || {};
    state.view_stage = 'SERVER_SELECT';
    updateState(state);
  });

  btnCreate.addEventListener('click', () => {
    const rName = prompt("Enter Room Name:", "New Whist Lounge");
    if (!rName) return;
    const rPass = prompt("Enter optional Password / Token (leave blank for open):");
    
    // Send room create request to server
    send({
      action: 'create_room',
      name: rName,
      password: rPass || null
    });

    // Standalone demo simulation: add new room and refresh browser view
    const newId = `room-${MOCK_ROOMS.length + 1}`;
    MOCK_ROOMS.push({
      id: newId,
      name: rName,
      players: 1,
      maxPlayers: 4,
      hasPassword: !!rPass
    });
    renderRoomBrowser(container);
  });

  // Wire Join and Spectate buttons
  card.querySelectorAll('.btn-join').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedRoom = btn.dataset.id;
      selectedRole = 'player';
      const isPrivate = btn.dataset.private === 'true';

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
    modal.classList.add('hidden');
  });

  modalSubmit.addEventListener('click', () => {
    const pass = passwordInput.value.trim();
    if (!pass) return;
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

  // Mock server reply for standalone client demo
  console.log(`[Lobby] Joining room ${roomId} as ${role}...`);
  setTimeout(() => {
    const state = getState() || {};
    state.is_spectator = role === 'spectator';
    // Setup players array mock to trigger Waiting Room phase
    state.players = [
      { id: 'p1', name: 'You', score: 0, is_turn: false, cards_played: [], bet: null, status: '' },
      { id: 'p2', name: 'Alice', score: 0, is_turn: false, cards_played: [], bet: null, status: '' }
    ];
    updateState(state);
  }, 800);
}

function renderWaitingRoom(players, container, state) {
  const card = document.createElement('div');
  card.className = 'glass p-8 max-w-lg w-full mx-4 flex flex-col items-center text-center shadow-2xl relative';

  const count = players.length;
  const isSpectator = state.is_spectator === true;

  card.innerHTML = `
    <h2 class="text-2xl font-black text-white mb-1 tracking-wide">Waiting Room</h2>
    <div class="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2 pulse-soft">
      ${isSpectator ? 'Spectating Mode — Waiting for game launch' : 'Waiting for players to join...'}
    </div>
    
    ${isSpectator ? '<div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-900/50 border border-slate-800 px-3 py-1 rounded mb-8">Viewer</div>' : '<div class="mb-8"></div>'}

    <!-- Players grid -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 w-full mb-8">
      ${[0, 1, 2, 3].map(i => {
        const player = players[i];
        if (player) {
          return `
            <div class="glass-sm px-3 py-5 flex flex-col items-center border border-emerald-500/25 bg-emerald-950/10">
              <div class="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-lg mb-3">
                ${player.name.charAt(0).toUpperCase()}
              </div>
              <span class="text-sm font-bold text-white truncate max-w-full">${player.name}</span>
              <span class="text-[10px] text-emerald-400 font-medium uppercase mt-1">Ready</span>
            </div>
          `;
        } else {
          return `
            <div class="glass-sm px-3 py-5 flex flex-col items-center opacity-40 border border-slate-700/30 border-dashed animate-pulse">
              <div class="w-10 h-10 rounded-full bg-slate-800 text-slate-600 flex items-center justify-center font-bold text-lg mb-3">
                ?
              </div>
              <span class="text-sm font-semibold text-slate-500">Waiting</span>
              <span class="text-[10px] text-slate-600 font-medium uppercase mt-1">-</span>
            </div>
          `;
        }
      }).join('')}
    </div>

    <div class="flex items-center justify-center gap-6 text-slate-400 text-sm font-medium">
      <div class="flex items-center gap-2">
        <span class="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
        <span>${count}/4 Players Connected</span>
      </div>
      
      <!-- Back / Exit Room Button -->
      <button id="btn-exit-room" class="btn btn-secondary text-xs !py-1.5 !px-3">
        Exit Room
      </button>
    </div>
  `;

  container.appendChild(card);

  const btnExit = card.querySelector('#btn-exit-room');
  btnExit.addEventListener('click', () => {
    btnExit.disabled = true;
    send({ action: 'leave_room' });

    // Mock reset state back to room browser
    const state = getState() || {};
    state.players = [];
    state.is_spectator = false;
    state.view_stage = 'ROOM_LIST';
    updateState(state);
  });
}
