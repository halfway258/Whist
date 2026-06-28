import { renderCardBack } from '../components/cards.js';

/**
 * Render the DEALING stage animation.
 * @param {object} state - Game State
 * @param {HTMLElement} container - Stage Container
 */
export function renderDealing(state, container) {
  container.innerHTML = '';

  const players = state.players || [];

  // 1. Create a centered poker table felt
  const table = document.createElement('div');
  table.className = 'table-felt w-full max-w-4xl h-[420px] rounded-[40px] relative overflow-hidden flex items-center justify-center';
  
  // Add a nice subtle grid pattern in the table center
  table.innerHTML = `
    <div class="absolute inset-10 border border-emerald-800/20 rounded-[30px] pointer-events-none"></div>
    <div class="absolute inset-0 flex items-center justify-center">
      <div class="text-[10px] uppercase font-black tracking-widest text-emerald-950 select-none">WHIST DEALING</div>
    </div>
  `;

  // 2. Setup the center deck where cards originate
  const centerDeck = document.createElement('div');
  centerDeck.className = 'absolute z-20 flex items-center justify-center';
  // Render a visual deck stack (stacked layers of card backs)
  for (let i = 0; i < 5; i++) {
    const cardBack = renderCardBack();
    cardBack.style.position = 'absolute';
    cardBack.style.transform = `translate(${-i * 0.5}px, ${-i * 0.5}px)`;
    cardBack.style.boxShadow = `${i}px ${i}px 4px rgba(0,0,0,0.15)`;
    centerDeck.appendChild(cardBack);
  }
  table.appendChild(centerDeck);

  // 3. Stagger-deal cards to 4 positions
  // Bottom: 0, Left: 1, Top: 2, Right: 3
  const dealTargets = [
    { x: '0px', y: '140px', rot: '0deg' },     // Player 0 (Bottom)
    { x: '-220px', y: '0px', rot: '90deg' },   // Player 1 (Left)
    { x: '0px', y: '-140px', rot: '0deg' },    // Player 2 (Top)
    { x: '220px', y: '0px', rot: '-90deg' }    // Player 3 (Right)
  ];

  // We want to deal 13 cards per player, in round-robin order
  // To avoid cluttering the DOM, we can deal a total of 13 rounds of 4 cards
  const totalRounds = 13;
  let animIndex = 0;

  for (let round = 0; round < totalRounds; round++) {
    for (let playerIdx = 0; playerIdx < 4; playerIdx++) {
      if (!players[playerIdx]) continue;

      const target = dealTargets[playerIdx];
      const cardBack = renderCardBack({ small: true });
      
      cardBack.style.position = 'absolute';
      // Set custom CSS properties for the deal animation
      cardBack.style.setProperty('--deal-x', target.x);
      cardBack.style.setProperty('--deal-y', target.y);
      cardBack.style.setProperty('--deal-rot', target.rot);
      // Stagger delay: deal in sequence
      cardBack.style.setProperty('--deal-delay', `${animIndex * 0.05}s`);
      
      cardBack.classList.add('deal-animate');

      table.appendChild(cardBack);
      animIndex++;
    }
  }

  // 4. Player Seat Labels on Table (just under their targeted hand positions)
  const seatPositions = [
    'bottom-2 left-1/2 -translate-x-1/2',
    'left-2 top-1/2 -translate-y-1/2',
    'top-2 left-1/2 -translate-x-1/2',
    'right-2 top-1/2 -translate-y-1/2'
  ];

  for (let i = 0; i < 4; i++) {
    const player = players[i];
    if (!player) continue;

    const label = document.createElement('div');
    label.className = `absolute ${seatPositions[i]} glass-sm px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-300 z-10`;
    label.textContent = i === 0 ? 'You' : player.name;
    table.appendChild(label);
  }

  container.appendChild(table);
}
