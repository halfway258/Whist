import { renderCard } from '../components/cards.js';
import { send } from '../network.js';
import { logInteraction } from '../logger.js';

/**
 * Render the BETTING stage.
 * @param {object} state - Game State
 * @param {HTMLElement} container - Stage Container
 */
export function renderBetting(state, container) {
  container.innerHTML = '';

  const players = state.players || [];
  const isSpectator = state.is_spectator === true;
  const localPlayer = isSpectator ? { name: 'Spectator', is_turn: false } : (players[0] || { name: 'You', is_turn: false });
  const promptData = state.prompt_data || { bidding_stage: 'SUIT', min_bet: 5, max_bet: 13 };
  const myHand = state.my_hand || [];
  const biddingStage = (promptData.bidding_stage || 'SUIT').toUpperCase();
  const isExchange = biddingStage === 'EXCHANGE';

  // Main board container
  const board = document.createElement('div');
  board.className = 'w-full h-full flex flex-col justify-between items-center p-4 relative';

  // 1. Table Felt Area
  const table = document.createElement('div');
  table.className = 'table-felt w-full max-w-4xl flex-1 rounded-[40px] relative overflow-hidden flex flex-col items-center justify-center min-h-[220px] mt-16 md:mt-24 mb-4';
  
  // Decorative text in the center
  const centerText = document.createElement('div');
  centerText.className = 'text-center z-0';
  
  if (localPlayer.is_turn) {
    if (isExchange) {
      centerText.innerHTML = `
        <div class="text-xs uppercase font-extrabold tracking-widest text-amber-400 mb-2 pulse-soft">Card Exchange Phase</div>
        <div class="text-sm font-semibold text-slate-400">Select exactly 2 cards from your hand to pass clockwise.</div>
      `;
    } else if (promptData.bidding_stage === 'TAKES') {
      centerText.innerHTML = `
        <div class="text-xs uppercase font-extrabold tracking-widest text-emerald-500/60 mb-2">Bid Your Expected Tricks</div>
        <div class="text-sm font-semibold text-slate-400">The total sum of all player bids cannot be exactly 13.</div>
      `;
    } else {
      centerText.innerHTML = `
        <div class="text-xs uppercase font-extrabold tracking-widest text-emerald-500/60 mb-2">Declare Contract Suit</div>
        <div class="text-sm font-semibold text-slate-400">Bid at least 5 takes to set the contract, or select Skip.</div>
      `;
    }
  } else {
    const activePlayer = players.find(p => p.is_turn);
    const activeName = activePlayer ? activePlayer.name : 'other players';
    centerText.innerHTML = `
      <div class="text-xs uppercase font-extrabold tracking-widest text-amber-500/60 mb-2">Waiting For Players</div>
      <div class="text-sm font-semibold text-slate-400 flex items-center justify-center gap-1">
        <span>Waiting for <span class="text-amber-400 font-extrabold">${activeName}</span> to make a choice</span>
        <span class="inline-flex items-center">
          <span class="thinking-dot"></span>
          <span class="thinking-dot"></span>
          <span class="thinking-dot"></span>
        </span>
      </div>
    `;
  }
  table.appendChild(centerText);
  board.appendChild(table);

  // Keep track of card selections in Exchange phase
  const selectedCards = [];

  // 2. Action Overlay (Only if it's our turn)
  if (localPlayer.is_turn) {
    const overlay = document.createElement('div');
    overlay.className = 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 glass-opaque p-6 max-w-md w-full shadow-2xl flex flex-col items-center border border-emerald-500/20';

    if (isExchange) {
      overlay.innerHTML = `
        <h3 class="text-lg font-black text-white uppercase tracking-wider mb-1">Exchange Cards</h3>
        <p class="text-slate-400 text-[11px] font-medium mb-6">Choose 2 cards to pass to the next player</p>
        <div class="w-full flex flex-col items-center gap-4">
          <div class="text-slate-400 text-xs font-semibold" id="exchange-count">0 of 2 Selected</div>
          <button id="btn-confirm-exchange" class="btn btn-primary w-full py-3" disabled>Confirm Exchange</button>
        </div>
      `;

      const confirmBtn = overlay.querySelector('#btn-confirm-exchange');
      confirmBtn.addEventListener('click', () => {
        if (selectedCards.length === 2) {
          logInteraction(`Button Click: Confirm Exchange (cards: ${JSON.stringify(selectedCards)})`);
          // Disable overlay controls
          confirmBtn.disabled = true;
          confirmBtn.classList.add('btn-loading');
          overlay.querySelector('h3').textContent = 'Submitting...';
          send({ action: 'exchange_cards', cards: selectedCards });
        }
      });

      board.appendChild(overlay);
    } else if (biddingStage === 'SUIT') {
      overlay.innerHTML = `
        <h3 class="text-lg font-black text-white uppercase tracking-wider mb-1">Select Trump & Bid</h3>
        <p class="text-slate-400 text-[11px] font-medium mb-4">Choose a suit and bid at least ${promptData.min_bet} takes</p>
        
        <div class="w-full flex flex-col gap-4">
          <!-- Suit buttons -->
          <div class="flex flex-col gap-1.5">
            <label class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Trump Suit</label>
            <div class="grid grid-cols-5 gap-1.5 w-full" id="suit-buttons-container">
              <button data-suit="no_trump" class="btn btn-gold py-2 px-1 text-xs font-bold border border-slate-700/50">NT</button>
              <button data-suit="spades" class="btn btn-secondary py-2 px-1 text-xs font-bold border border-slate-700/50">♠</button>
              <button data-suit="hearts" class="btn btn-secondary py-2 px-1 text-xs font-bold border border-slate-700/50 text-rose-500">♥</button>
              <button data-suit="diamonds" class="btn btn-secondary py-2 px-1 text-xs font-bold border border-slate-700/50 text-amber-500">♦</button>
              <button data-suit="clubs" class="btn btn-secondary py-2 px-1 text-xs font-bold border border-slate-700/50 text-emerald-400">♣</button>
            </div>
          </div>

          <!-- Takes select slider -->
          <div class="flex flex-col items-center gap-2">
            <label class="text-[10px] uppercase font-bold text-slate-400 tracking-wider self-start">Minimum Bid: ${promptData.min_bet}</label>
            <div class="text-3xl font-black text-amber-400 font-mono" id="slider-val">${promptData.min_bet}</div>
            <input type="range" min="${promptData.min_bet}" max="13" value="${promptData.min_bet}" class="w-full accent-amber-400 cursor-pointer h-2 bg-slate-800 rounded-lg appearance-none" id="bet-slider" />
          </div>

          <!-- Actions -->
          <div class="flex gap-3 mt-2">
            <button id="btn-skip-bid" class="btn btn-secondary flex-1 py-3">Skip</button>
            <button id="btn-confirm-bid" class="btn btn-primary flex-1 py-3">Bid</button>
          </div>
        </div>
      `;

      let selectedSuit = 'no_trump';

      const suitContainer = overlay.querySelector('#suit-buttons-container');
      const suitButtons = suitContainer.querySelectorAll('button');
      
      suitButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          logInteraction(`Button Click: Select Trump Suit: "${btn.dataset.suit}"`);
          suitButtons.forEach(b => {
            b.className = b.className.replace('btn-gold', 'btn-secondary');
            if (!b.className.includes('btn-secondary')) {
              b.className += ' btn-secondary';
            }
          });
          btn.className = btn.className.replace('btn-secondary', 'btn-gold');
          selectedSuit = btn.dataset.suit;
        });
      });

      const slider = overlay.querySelector('#bet-slider');
      const valDisplay = overlay.querySelector('#slider-val');
      const confirmBtn = overlay.querySelector('#btn-confirm-bid');
      const skipBtn = overlay.querySelector('#btn-skip-bid');

      slider.addEventListener('input', (e) => {
        valDisplay.textContent = e.target.value;
      });

      confirmBtn.addEventListener('click', () => {
        const takes = parseInt(slider.value, 10);
        logInteraction(`Button Click: Confirm Suit Bid (takes: ${takes}, suit: "${selectedSuit}")`);
        confirmBtn.disabled = true;
        skipBtn.disabled = true;
        confirmBtn.classList.add('btn-loading');
        overlay.querySelector('h3').textContent = 'Submitting...';
        send({ action: 'bet', takes, suit: selectedSuit });
      });

      skipBtn.addEventListener('click', () => {
        logInteraction('Button Click: Skip Suit Bid');
        confirmBtn.disabled = true;
        skipBtn.disabled = true;
        skipBtn.classList.add('btn-loading');
        overlay.querySelector('h3').textContent = 'Skipping...';
        send({ action: 'bet', takes: 0, suit: 'skip' });
      });

      board.appendChild(overlay);
    } else {
      // Stage 2: TAKES
      const min = promptData.min_bet;
      const max = promptData.max_bet;
      const restricted = promptData.restricted_bet;

      // Start with a safe initial value that is not the restricted one
      let initialVal = min;
      if (initialVal === restricted) {
        if (initialVal + 1 <= max) {
          initialVal = initialVal + 1;
        } else if (initialVal - 1 >= min) {
          initialVal = initialVal - 1;
        }
      }

      overlay.innerHTML = `
        <h3 class="text-lg font-black text-white uppercase tracking-wider mb-1">Make Your Bid</h3>
        <p class="text-slate-400 text-[11px] font-medium mb-4" id="bid-limit-msg">Choose a bid from ${min} to ${max}</p>
        
        <div class="w-full flex flex-col items-center gap-4">
          <div class="text-4xl font-black text-amber-400 font-mono" id="slider-val">${initialVal}</div>
          <input type="range" min="${min}" max="${max}" value="${initialVal}" class="w-full accent-amber-400 cursor-pointer h-2 bg-slate-800 rounded-lg appearance-none" id="bet-slider" />
          <div id="restricted-warning" class="text-rose-400 text-xs font-bold hidden">Sum cannot be 13. This bid is disabled.</div>
          <button id="btn-confirm-bet" class="btn btn-primary w-full py-3 mt-2">Confirm Bet</button>
        </div>
      `;

      const slider = overlay.querySelector('#bet-slider');
      const valDisplay = overlay.querySelector('#slider-val');
      const warningDisplay = overlay.querySelector('#restricted-warning');
      const confirmBtn = overlay.querySelector('#btn-confirm-bet');

      const checkRestriction = (val) => {
        if (restricted !== undefined && val === restricted) {
          warningDisplay.classList.remove('hidden');
          confirmBtn.disabled = true;
          confirmBtn.classList.add('opacity-50', 'cursor-not-allowed');
        } else {
          warningDisplay.classList.add('hidden');
          confirmBtn.disabled = false;
          confirmBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
      };

      // Run initial check
      checkRestriction(initialVal);

      slider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        valDisplay.textContent = val;
        checkRestriction(val);
      });

      confirmBtn.addEventListener('click', () => {
        const val = parseInt(slider.value, 10);
        logInteraction(`Button Click: Confirm Takes Bid (takes: ${val})`);
        confirmBtn.disabled = true;
        slider.disabled = true;
        confirmBtn.classList.add('btn-loading');
        overlay.querySelector('h3').textContent = 'Confirming...';
        send({ action: 'bet', takes: val });
      });

      board.appendChild(overlay);
    }
  }

  // 3. Hand Area (Bottom)
  const handContainer = document.createElement('div');
  handContainer.className = `w-full flex justify-center items-center h-28 relative mt-2 fanned-hand ${isExchange && localPlayer.is_turn ? 'pointer-events-auto' : 'pointer-events-none'}`;

  // Sort hand
  const SUIT_ORDER = { clubs: 0, diamonds: 1, spades: 2, hearts: 3 };
  const sortedHand = [...myHand].sort((a, b) => {
    const orderA = SUIT_ORDER[a.suit] !== undefined ? SUIT_ORDER[a.suit] : 99;
    const orderB = SUIT_ORDER[b.suit] !== undefined ? SUIT_ORDER[b.suit] : 99;
    if (orderA !== orderB) return orderA - orderB;
    return b.value - a.value;
  });

  const totalCards = sortedHand.length;
  sortedHand.forEach((card, idx) => {
    const cardEl = renderCard(card);
    cardEl.style.position = 'absolute';
    cardEl.style.left = '50%';
    
    const centerIdx = (totalCards - 1) / 2;
    const spacing = parseFloat(localStorage.getItem('whist_card_spacing') || '32');
    const offset = (idx - centerIdx) * spacing;
    const rotation = (idx - centerIdx) * 2.5;
    
    // Set as CSS variables to allow beautiful hover / adjacent card transitions
    cardEl.style.setProperty('--card-offset', `${offset}px`);
    cardEl.style.setProperty('--card-rot', `${rotation}deg`);
    
    cardEl.style.transformOrigin = '50% 120%';
    cardEl.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';

    // Click handler for card exchange
    if (isExchange && localPlayer.is_turn) {
      cardEl.classList.add('playable');
      cardEl.addEventListener('click', () => {
        const isSelected = cardEl.classList.contains('selected');
        
        if (isSelected) {
          logInteraction(`Card Click: Deselect card for exchange (suit: "${card.suit}", value: ${card.value})`);
          cardEl.classList.remove('selected');
          const index = selectedCards.findIndex(c => c.suit === card.suit && c.value === card.value);
          if (index > -1) selectedCards.splice(index, 1);
        } else {
          if (selectedCards.length < 2) {
            logInteraction(`Card Click: Select card for exchange (suit: "${card.suit}", value: ${card.value})`);
            cardEl.classList.add('selected');
            selectedCards.push(card);
          }
        }
        
        // Update overlay button & text
        const countDisplay = document.getElementById('exchange-count');
        const confirmBtn = document.getElementById('btn-confirm-exchange');
        if (countDisplay) {
          countDisplay.textContent = `${selectedCards.length} of 2 Selected`;
        }
        if (confirmBtn) {
          confirmBtn.disabled = (selectedCards.length !== 2);
        }
      });
    }

    handContainer.appendChild(cardEl);
  });

  board.appendChild(handContainer);
  container.appendChild(board);
}
