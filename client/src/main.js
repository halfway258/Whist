// ─── Main Entry Point ───
// Boots the app: initializes router, registers stages, connects WebSocket.

import './style.css';
import { updateState, subscribe, getState } from './state.js';
import { initRouter, registerStage, routeState, getStages, getCurrentStage } from './router.js';
import { setMessageHandler, connect, send, onStatusChange } from './network.js';

// Stage renderers
import { renderLobby } from './stages/lobby.js';
import { renderDealing } from './stages/dealing.js';
import { renderBetting } from './stages/betting.js';
import { renderPlaying } from './stages/playing.js';
import { renderRoundEnd } from './stages/round-end.js';
import { renderGameOver } from './stages/game-over.js';

// Components
import { renderHUD } from './components/hud.js';

// ─── Global Loading Helpers ───
window.showLoading = (message) => {
  const overlay = document.getElementById('loading-overlay');
  const text = document.getElementById('loading-text');
  if (overlay && text) {
    text.textContent = message || 'Loading...';
    overlay.classList.add('active');
  }
};

window.hideLoading = () => {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) {
    overlay.classList.remove('active');
  }
};

// ─── Boot ───
function boot() {
  // Load settings from local storage and apply them to the DOM
  const textSize = localStorage.getItem('whist_text_size') || '18';
  document.documentElement.style.fontSize = `${textSize}px`;

  document.documentElement.style.setProperty('--table-brightness', 1.0);

  const theme = localStorage.getItem('whist_theme') || 'dark';
  if (theme === 'light') {
    document.body.classList.add('light-theme');
  } else {
    document.body.classList.remove('light-theme');
  }

  // Initialize router (caches DOM refs)
  initRouter();

  // Register stage renderers
  registerStage('LOBBY', renderLobby);
  registerStage('DEALING', renderDealing);
  registerStage('BETTING', renderBetting);
  registerStage('PLAYING', renderPlaying);
  registerStage('ROUND_END', renderRoundEnd);
  registerStage('GAME_OVER', renderGameOver);

  // ─── Inactivity / Bot Takeover Timer ───
  let inactivityTimer = null;
  let idleCountdownInterval = null;

  function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    inactivityTimer = null;

    if (document.getElementById('idle-confirm-modal')) {
      return;
    }

    const state = getState() || {};
    if (state.mode !== 'online' || state.is_spectator === true) {
      return;
    }

    const isMyTurn = state.prompt_data && (
      state.prompt_data.player_id === 'p1' ||
      (state.current_stage === 'BETTING' && state.prompt_data.action === 'exchange_cards')
    );

    const localPlayer = state.players ? state.players.find(p => p.id === 'p1') : null;
    const isAlreadyBot = localPlayer ? localPlayer.bot === true : false;

    if (isMyTurn && !isAlreadyBot) {
      console.log('[Inactivity] Starting 60s inactivity check');
      inactivityTimer = setTimeout(showIdleConfirmModal, 60000);
    }
  }

  function showIdleConfirmModal() {
    console.log('[Inactivity] Inactivity limit reached. Showing "Still there?" modal.');
    
    let modal = document.getElementById('idle-confirm-modal');
    if (modal) return;
    
    modal = document.createElement('div');
    modal.id = 'idle-confirm-modal';
    modal.className = 'fixed inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center z-[9999] text-center px-4 transition-all duration-300';
    
    let countdownVal = 30;
    
    modal.innerHTML = `
      <div class="glass p-8 max-w-sm w-full rounded-2xl border border-amber-500/20 shadow-2xl flex flex-col items-center gap-4 animate-scale-in">
        <div class="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-xl font-bold animate-bounce">⏳</div>
        <h3 class="text-base font-extrabold text-white uppercase tracking-wider">Are you still there?</h3>
        <p class="text-slate-400 text-xs leading-relaxed">It is your turn. Please confirm you are still here, or a bot will temporarily take over.</p>
        
        <div class="text-3xl font-black font-mono text-amber-400 my-2" id="idle-countdown">${countdownVal}s</div>
        
        <button id="btn-idle-confirm" class="btn btn-primary text-xs w-full py-2.5 mt-2">Yes, I'm here!</button>
      </div>
    `;
    document.body.appendChild(modal);
    
    const confirmBtn = modal.querySelector('#btn-idle-confirm');
    confirmBtn.addEventListener('click', () => {
      logInteraction('Button Click: Confirm Active ("Still there?")');
      clearInterval(idleCountdownInterval);
      modal.remove();
      resetInactivityTimer();
    });
    
    idleCountdownInterval = setInterval(() => {
      countdownVal--;
      const countdownEl = document.getElementById('idle-countdown');
      if (countdownEl) {
        countdownEl.textContent = `${countdownVal}s`;
      }
      
      if (countdownVal <= 0) {
        clearInterval(idleCountdownInterval);
        modal.remove();
        triggerBotTakeover();
      }
    }, 1000);
  }

  function triggerBotTakeover() {
    console.log('[Inactivity] Timer expired. Triggering bot takeover.');
    send({ action: 'set_bot_mode', bot: true });
  }

  // Reset inactivity timer on any click event
  document.body.addEventListener('click', () => {
    resetInactivityTimer();
  });

  // Subscribe to state changes → route + render HUD
  subscribe((state) => {
    routeState(state);
    window.hideLoading();

    // Reset timer on state updates (since turn or phase changes resets the turn duration)
    resetInactivityTimer();

    // Render HUD for gameplay stages
    const hudEl = document.getElementById('hud');
    if (hudEl && ['DEALING', 'BETTING', 'PLAYING', 'ROUND_END'].includes(state.current_stage)) {
      renderHUD(state, hudEl);
    }

    // Bot control override banner
    let botBanner = document.getElementById('bot-control-banner');
    const localPlayer = state.players ? state.players.find(p => p.id === 'p1') : null;
    const isBotActive = localPlayer ? localPlayer.bot === true : false;
    const isSpectator = state.is_spectator === true;
    
    if (isBotActive && state.mode === 'online' && !isSpectator && ['DEALING', 'BETTING', 'PLAYING', 'ROUND_END'].includes(state.current_stage)) {
      if (!botBanner) {
        botBanner = document.createElement('div');
        botBanner.id = 'bot-control-banner';
        botBanner.className = 'fixed bottom-24 left-1/2 -translate-x-1/2 z-[50] flex flex-col items-center gap-1.5 animate-bounce';
        botBanner.innerHTML = `
          <div class="glass-opaque px-5 py-3 rounded-2xl border border-emerald-500/30 shadow-2xl flex items-center gap-4">
            <div class="flex flex-col text-left">
              <span class="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Bot Takeover Active</span>
              <span class="text-[11px] text-slate-300 font-medium">A bot is currently playing your turns.</span>
            </div>
            <button id="btn-take-control" class="btn btn-primary text-[11px] !py-1.5 !px-3 font-bold bg-emerald-500 hover:bg-emerald-600 border border-emerald-400/20">Resume Control</button>
          </div>
        `;
        document.body.appendChild(botBanner);
        
        const takeControlBtn = botBanner.querySelector('#btn-take-control');
        takeControlBtn.addEventListener('click', () => {
          logInteraction('Button Click: Resume Control');
          takeControlBtn.disabled = true;
          takeControlBtn.classList.add('btn-loading');
          send({ action: 'set_bot_mode', bot: false });
        });
      }
    } else {
      if (botBanner) {
        botBanner.remove();
      }
    }
  });

  // WebSocket: incoming messages overwrite state
  setMessageHandler((data) => {
    if (data && data.type === 'error') {
      showToast(data.reason || data.error_type);
      // Re-trigger render using current state to unlock any client-side disabled inputs
      const currentState = getState();
      if (currentState) {
        updateState({ ...currentState });
      }
    } else if (data && data.type === 'rooms_list') {
      // Only update the rooms list in the current state
      const currentState = getState() || {};
      updateState({ ...currentState, rooms: data.rooms });
    } else if (data && data.type === 'chat_message') {
      // Dispatch a global event for the waiting room chat box
      const event = new CustomEvent('whist_chat', { detail: data });
      window.dispatchEvent(event);
    } else if (data && data.type === 'login_response') {
      window.dispatchEvent(new CustomEvent('whist_login_response', { detail: data }));
    } else if (data && data.type === 'register_response') {
      window.dispatchEvent(new CustomEvent('whist_register_response', { detail: data }));
    } else if (data && data.type === 'room_closed') {
      showToast("Room closed by host.");
      const state = getState() || {};
      state.players = [];
      state.view_stage = 'ROOM_LIST';
      state.room_id = undefined;
      state.room_password = null;
      state.room_role = 'player';
      updateState(state);
      send({ action: 'list_rooms' });
    } else {
      // Compare player lists to trigger system notifications for bot replacements/reclaims
      const oldState = getState() || {};
      const oldPlayers = oldState.players || [];
      const newPlayers = data ? (data.players || []) : [];
      if (oldPlayers.length > 0 && newPlayers.length > 0) {
        newPlayers.forEach(newP => {
          const oldP = oldPlayers.find(p => p.id === newP.id);
          if (oldP) {
            if (!oldP.bot && newP.bot) {
              const sysMsg = {
                type: 'chat_message',
                player_name: 'System',
                message: `${newP.name.replace(' (Bot)', '')} took too long to make a decision and has been replaced by a bot.`
              };
              window.dispatchEvent(new CustomEvent('whist_chat', { detail: sysMsg }));
            }
            if (oldP.bot && !newP.bot) {
              const sysMsg = {
                type: 'chat_message',
                player_name: 'System',
                message: `${newP.name} has reconnected and reclaimed their seat!`
              };
              window.dispatchEvent(new CustomEvent('whist_chat', { detail: sysMsg }));
            }
          }
        });
      }
      updateState(data);
    }
  });

  onStatusChange((status) => {
    const state = getState() || {};
    if (state.mode === 'online') {
      let overlay = document.getElementById('network-disconnected-overlay');
      if (status === 'disconnected') {
        if (!overlay) {
          overlay = document.createElement('div');
          overlay.id = 'network-disconnected-overlay';
          overlay.className = 'fixed inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center z-[9999] text-center px-4 transition-all duration-300';
          overlay.innerHTML = `
            <div class="glass p-8 max-w-sm w-full rounded-2xl border border-rose-500/20 shadow-2xl flex flex-col items-center gap-4">
              <div class="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 text-xl font-bold animate-pulse">⚠️</div>
              <h3 class="text-base font-extrabold text-white uppercase tracking-wider">Disconnected</h3>
              <p class="text-slate-400 text-xs leading-relaxed">Your connection to the game server was lost. Attempting to reconnect...</p>
              <div class="flex items-center gap-2 mt-2">
                <span class="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                <span class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Reconnecting</span>
              </div>
            </div>
          `;
          document.body.appendChild(overlay);
        }
      } else if (status === 'connected') {
        if (overlay) {
          overlay.remove();
        }
        
        if (state.room_id) {
          console.log(`[Network] Auto-rejoining room: ${state.room_id}`);
          send({
            action: 'join_room',
            room_id: state.room_id,
            password: state.room_password || null,
            role: state.room_role || 'player'
          });
        }
      }
    }
  });

  // Initialize cleanly into the lobby stage
  const cleanLobbyState = {
    current_stage: 'LOBBY',
    players: [],
    my_hand: [],
    table_cards: [],
    prompt_data: null,
    trick_winner: null,
    winner: null
  };
  updateState(cleanLobbyState);
}

// ─── Start ───
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

// ─── Toast System for Server Errors ───
const ERROR_MESSAGES = {
  must_follow_suit: 'Must follow the lead suit!',
  card_not_in_hand: 'Card is not in your hand!',
  not_your_turn: "It's not your turn!",
};

function showToast(message) {
  const displayMsg = ERROR_MESSAGES[message] || message;
  
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'fixed top-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none w-full max-w-sm px-4';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'glass-sm px-4 py-3 shadow-2xl border border-rose-500/30 text-xs font-bold text-rose-200 flex items-center justify-center gap-2 transition-all duration-300 transform -translate-y-4 opacity-0 pointer-events-auto cursor-pointer';
  
  const icon = document.createElement('span');
  icon.textContent = '⚠️';
  icon.className = 'text-rose-400 text-sm';
  toast.appendChild(icon);

  const text = document.createElement('span');
  text.textContent = displayMsg;
  toast.appendChild(text);

  toast.addEventListener('click', () => {
    toast.remove();
  });

  container.appendChild(toast);

  // Trigger entrance transition
  requestAnimationFrame(() => {
    toast.classList.remove('-translate-y-4', 'opacity-0');
  });

  // Schedule removal
  setTimeout(() => {
    if (toast.parentNode) {
      toast.classList.add('-translate-y-4', 'opacity-0');
      toast.addEventListener('transitionend', () => {
        toast.remove();
        if (container.children.length === 0) {
          container.remove();
        }
      });
    }
  }, 3000);
}
