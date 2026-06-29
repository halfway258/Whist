// ─── Main Entry Point ───
// Boots the app: initializes router, registers stages, connects WebSocket.

import './style.css';
import { updateState, subscribe, getState } from './state.js';
import { initRouter, registerStage, routeState, getStages, getCurrentStage } from './router.js';
import { setMessageHandler, connect } from './network.js';

// Stage renderers
import { renderLobby } from './stages/lobby.js';
import { renderDealing } from './stages/dealing.js';
import { renderBetting } from './stages/betting.js';
import { renderPlaying } from './stages/playing.js';
import { renderRoundEnd } from './stages/round-end.js';
import { renderGameOver } from './stages/game-over.js';

// Components
import { renderHUD } from './components/hud.js';

// ─── Boot ───
function boot() {
  // Load settings from local storage and apply them to the DOM
  const textSize = localStorage.getItem('whist_text_size') || '18';
  document.documentElement.style.fontSize = `${textSize}px`;

  const feltBrightness = localStorage.getItem('whist_felt_brightness') || '100';
  document.documentElement.style.setProperty('--table-brightness', parseFloat(feltBrightness) / 100);

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

  // Subscribe to state changes → route + render HUD
  subscribe((state) => {
    routeState(state);

    // Render HUD for gameplay stages
    const hudEl = document.getElementById('hud');
    if (hudEl && ['DEALING', 'BETTING', 'PLAYING', 'ROUND_END'].includes(state.current_stage)) {
      renderHUD(state, hudEl);
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
    } else if (data && data.type === 'room_closed') {
      showToast("Room closed by host.");
      const state = getState() || {};
      state.players = [];
      state.view_stage = 'ROOM_LIST';
      updateState(state);
    } else {
      updateState(data);
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
