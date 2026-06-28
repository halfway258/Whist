import { send, disconnect } from '../network.js';
import { getState, updateState } from '../state.js';
import { logInteraction } from '../logger.js';

export function toggleSettingsMenu() {
  let menu = document.getElementById('settings-menu-overlay');
  if (menu) {
    logInteraction('Settings menu toggled close');
    menu.remove();
    return;
  }

  logInteraction('Settings menu opened');
  // Load current setting values
  const textSize = parseInt(localStorage.getItem('whist_text_size') || '18', 10);
  const cardSpacing = parseInt(localStorage.getItem('whist_card_spacing') || '32', 10);
  const feltBrightness = parseInt(localStorage.getItem('whist_felt_brightness') || '100', 10);

  menu = document.createElement('div');
  menu.id = 'settings-menu-overlay';
  menu.className = 'fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 pointer-events-auto';

  menu.innerHTML = `
    <div class="glass p-8 max-w-sm w-full mx-4 border border-slate-800 flex flex-col shadow-2xl relative rounded-2xl">
      <h3 class="text-xl font-black text-white uppercase tracking-wider text-center mb-6">Game Settings</h3>
      
      <!-- Text Size Slider -->
      <div class="flex flex-col gap-2 mb-6">
        <div class="flex justify-between items-center text-xs font-bold uppercase tracking-wide text-slate-300">
          <span>Text Size</span>
          <span id="text-size-val" class="font-mono text-amber-400 text-sm">${textSize}px</span>
        </div>
        <input type="range" id="text-size-slider" min="12" max="28" value="${textSize}" class="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
      </div>

      <!-- Card Offset/Spacing Slider -->
      <div class="flex flex-col gap-2 mb-6">
        <div class="flex justify-between items-center text-xs font-bold uppercase tracking-wide text-slate-300">
          <span>Card Fan Spacing</span>
          <span id="card-spacing-val" class="font-mono text-amber-400 text-sm">${cardSpacing}px</span>
        </div>
        <input type="range" id="card-spacing-slider" min="15" max="60" value="${cardSpacing}" class="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
      </div>

      <!-- Table Felt Brightness Slider -->
      <div class="flex flex-col gap-2 mb-8">
        <div class="flex justify-between items-center text-xs font-bold uppercase tracking-wide text-slate-300">
          <span>Table Brightness</span>
          <span id="brightness-val" class="font-mono text-amber-400 text-sm">${feltBrightness}%</span>
        </div>
        <input type="range" id="brightness-slider" min="30" max="200" value="${feltBrightness}" class="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
      </div>

      <!-- Action Buttons -->
      <div class="flex flex-col gap-3 w-full">
        <button id="btn-settings-close" class="btn btn-primary w-full py-2.5 text-xs font-bold">
          Close Settings
        </button>
        <button id="btn-settings-exit" class="btn btn-danger w-full py-2.5 text-xs font-bold">
          Exit Game
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(menu);

  // Wire up slider inputs
  const textSizeSlider = menu.querySelector('#text-size-slider');
  const textSizeVal = menu.querySelector('#text-size-val');
  const cardSpacingSlider = menu.querySelector('#card-spacing-slider');
  const cardSpacingVal = menu.querySelector('#card-spacing-val');
  const brightnessSlider = menu.querySelector('#brightness-slider');
  const brightnessVal = menu.querySelector('#brightness-val');
  const btnClose = menu.querySelector('#btn-settings-close');
  const btnExit = menu.querySelector('#btn-settings-exit');

  // Text size change handler
  textSizeSlider.addEventListener('input', () => {
    const val = textSizeSlider.value;
    textSizeVal.textContent = `${val}px`;
    localStorage.setItem('whist_text_size', val);
    document.documentElement.style.fontSize = `${val}px`;
    logInteraction(`Setting Changed: Text Size set to ${val}px`);
  });

  // Card spacing change handler
  cardSpacingSlider.addEventListener('input', () => {
    const val = cardSpacingSlider.value;
    cardSpacingVal.textContent = `${val}px`;
    localStorage.setItem('whist_card_spacing', val);
    logInteraction(`Setting Changed: Card Spacing set to ${val}px`);
    // Trigger state re-render to apply new spacing to fanned cards
    const currentState = getState() || {};
    updateState({ ...currentState });
  });

  // Table brightness change handler
  brightnessSlider.addEventListener('input', () => {
    const val = brightnessSlider.value;
    brightnessVal.textContent = `${val}%`;
    localStorage.setItem('whist_felt_brightness', val);
    document.documentElement.style.setProperty('--table-brightness', val / 100);
    logInteraction(`Setting Changed: Table Brightness set to ${val}%`);
  });

  // Close button
  btnClose.addEventListener('click', () => {
    logInteraction('Button Click: Close Settings');
    menu.remove();
  });

  // Exit button
  btnExit.addEventListener('click', () => {
    logInteraction('Button Click: Exit Game');
    showCustomConfirm('Are you sure you want to exit the match? You will be replaced by a bot.', () => {
      logInteraction('Button Click: Confirm Exit Game');
      menu.remove();
      send({ action: 'leave_room' });
      disconnect();
      
      // Clean reset back to Lobby
      const cleanLobbyState = {
        current_stage: 'LOBBY',
        players: [],
        my_hand: [],
        table_cards: [],
        prompt_data: null,
        trick_winner: null,
        winner: null,
        view_stage: 'SERVER_SELECT'
      };
      updateState(cleanLobbyState);
    });
  });
}

function showCustomConfirm(message, callback) {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-[100] pointer-events-auto';
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
