import { getConnectionStatus } from '../network.js';
import { renderCardBack } from './cards.js';

/**
 * Render the Heads-Up Display (HUD) overlay.
 * @param {object} state - Game State
 * @param {HTMLElement} container - HUD container element
 */
export function renderHUD(state, container) {
  // Clear the container
  container.innerHTML = '';

  const players = state.players || [];
  const gameStats = state.game_stats || { round: 0, target_score: 100 };
  const connStatus = getConnectionStatus();
  const currentStage = state.current_stage || 'PLAYING';

  // 1. Connection Status Dot (Top-Right)
  const statusContainer = document.createElement('div');
  statusContainer.className = 'absolute top-4 right-4 flex items-center gap-2 glass-sm px-3 py-1.5 pointer-events-auto z-20';
  
  let dotClass = 'status-dot disconnected';
  let statusText = 'Disconnected';
  if (connStatus === 'connected') {
    dotClass = 'status-dot connected';
    statusText = 'Connected';
  } else if (connStatus === 'connecting') {
    dotClass = 'status-dot connecting';
    statusText = 'Connecting...';
  }

  statusContainer.innerHTML = `
    <span class="${dotClass}"></span>
    <span class="text-xs font-semibold text-slate-300">${statusText}</span>
  `;
  container.appendChild(statusContainer);

  // 2. Round Info Badge (Top-Left)
  const roundBadge = document.createElement('div');
  roundBadge.className = 'absolute top-4 left-4 glass-sm px-4 py-2 flex flex-col justify-center pointer-events-auto z-20';
  
  const playStyleText = gameStats.play_style ? ` | Play: ${gameStats.play_style}` : '';
  const biddingStageText = gameStats.bidding_stage && currentStage === 'BETTING' ? ` (${gameStats.bidding_stage})` : '';
  
  function getSuitSymbol(suit) {
    switch(suit) {
      case 'spades': return '♠';
      case 'hearts': return '♥';
      case 'diamonds': return '♦';
      case 'clubs': return '♣';
      default: return '';
    }
  }

  function capitalize(str) {
    if (!str) return '';
    return str.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  const trumpText = gameStats.trump_suit && gameStats.trump_suit !== 'no_trump' ? ` | Trump: ${capitalize(gameStats.trump_suit)} ${getSuitSymbol(gameStats.trump_suit)}` : (gameStats.trump_suit === 'no_trump' ? ' | Trump: NT' : '');

  roundBadge.innerHTML = `
    <div class="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Israeli Whist${playStyleText}${trumpText}</div>
    <div class="text-xl font-black text-white font-mono leading-none mt-1">Round ${gameStats.round}${biddingStageText}</div>
    <div class="text-[10px] text-amber-400 font-semibold mt-1">Target: ${gameStats.target_score}</div>
  `;
  container.appendChild(roundBadge);

  // 3. Render 4 Players
  // Bottom: 0, Left: 1, Top: 2, Right: 3
  // Local player (0) is placed at bottom-left corner to avoid overlapping cards in hand
  const layoutClasses = [
    'bottom-6 left-6',                        // Player 0 (Bottom-Left)
    'left-6 top-[35%] -translate-y-1/2',      // Player 1 (Left)
    'top-4 left-1/2 -translate-x-1/2',        // Player 2 (Top)
    'right-6 top-[35%] -translate-y-1/2'       // Player 3 (Right)
  ];

  for (let i = 0; i < 4; i++) {
    const player = players[i];
    if (!player) continue;

    const isLocal = i === 0;
    const isTurn = player.is_turn;
    const isThinking = player.status === 'Thinking...';

    // Player card container
    const playerEl = document.createElement('div');
    playerEl.className = `absolute ${layoutClasses[i]} flex flex-col items-center pointer-events-auto transition-all duration-300 z-20`;

    // Bubble status indicator (speech bubble style)
    if (player.status && !isLocal) {
      const bubble = document.createElement('div');
      // Position bubble relative to player card depending on location
      let bubblePos = 'bottom-full mb-2';
      if (i === 1) bubblePos = 'left-full ml-2 top-1/2 -translate-y-1/2';
      if (i === 3) bubblePos = 'right-full mr-2 top-1/2 -translate-y-1/2';

      bubble.className = `absolute ${bubblePos} glass-sm px-2.5 py-1 text-[11px] font-semibold text-slate-200 border border-slate-700/50 shadow-lg whitespace-nowrap`;
      
      if (isThinking) {
        bubble.innerHTML = `
          <span>Thinking</span>
          <span class="inline-flex items-center ml-0.5">
            <span class="thinking-dot"></span>
            <span class="thinking-dot"></span>
            <span class="thinking-dot"></span>
          </span>
        `;
      } else {
        bubble.textContent = player.status;
      }
      playerEl.appendChild(bubble);
    }

    // Card Body
    const cardBody = document.createElement('div');
    cardBody.className = `glass-sm px-4 py-3 flex flex-col items-center min-w-32 border-2 transition-all duration-300 ${isTurn ? 'turn-glow border-emerald-500' : 'border-slate-700/30'}`;

    // Wording changes for Israeli Whist: Show tricks taken / bet in playing/round-end stages
    let tricksDisplay = '';
    if (currentStage === 'PLAYING' || currentStage === 'ROUND_END') {
      const tricksTaken = player.tricks_taken || 0;
      const betTakes = player.bet !== null && typeof player.bet === 'object' ? player.bet.takes : player.bet;
      const bet = betTakes !== null && betTakes !== undefined && betTakes !== 'skip' ? betTakes : '-';
      tricksDisplay = `
        <div class="text-[11px] font-bold mt-1.5 flex flex-col items-center">
          <span class="text-slate-400 text-[9px] uppercase tracking-wider">Tricks Taken</span>
          <span class="text-emerald-400 text-sm font-mono mt-0.5">${tricksTaken} <span class="text-slate-500 text-xs">/ ${bet}</span></span>
        </div>
      `;
    } else if (player.bet !== null && player.bet !== undefined && player.bet !== 'skip') {
      const betTakes = typeof player.bet === 'object' ? player.bet.takes : player.bet;
      tricksDisplay = `
        <div class="text-[11px] font-bold mt-1.5 flex flex-col items-center">
          <span class="text-slate-400 text-[9px] uppercase tracking-wider">Bet Bid</span>
          <span class="text-amber-400 font-mono mt-0.5">${betTakes}</span>
        </div>
      `;
    }

    cardBody.innerHTML = `
      <div class="text-xs font-bold text-slate-400 uppercase tracking-wide">${isLocal ? 'You' : player.name}</div>
      <div class="text-lg font-black text-white font-mono mt-0.5">${player.score} <span class="text-xs text-amber-400 font-normal">Score</span></div>
      ${tricksDisplay}
      ${isTurn ? '<div class="text-[9px] text-emerald-400 font-extrabold uppercase tracking-wider animate-pulse mt-1">Your Turn</div>' : ''}
    `;

    playerEl.appendChild(cardBody);

    // Render opponent hand simulation if in PLAYING or BETTING stage
    const showHandSim = (currentStage === 'PLAYING' || currentStage === 'BETTING') && !isLocal;
    if (showHandSim && player.hand_size !== undefined) {
      const handSimContainer = document.createElement('div');
      handSimContainer.className = 'relative flex justify-center items-center h-12 mt-3 w-full';
      
      const handSize = player.hand_size;
      const cardContainer = document.createElement('div');
      cardContainer.className = 'relative h-10 w-full flex justify-center';
      
      // Rotate fanned cards according to seat position
      let baseRotation = 0;
      if (i === 1) baseRotation = 90;
      else if (i === 2) baseRotation = 180;
      else if (i === 3) baseRotation = -90;
      
      if (baseRotation !== 0) {
        cardContainer.style.transform = `rotate(${baseRotation}deg)`;
      }
      
      for (let c = 0; c < handSize; c++) {
        const cardBack = renderCardBack({ mini: true });
        cardBack.style.position = 'absolute';
        
        // Overlapping offset
        const centerIdx = (handSize - 1) / 2;
        const offset = (c - centerIdx) * 8; // 8px overlapping spacing
        let transform = `translateX(${offset}px)`;
        
        // Add a tiny rotation for that fanned feel
        const rotation = (c - centerIdx) * 2;
        transform += ` rotate(${rotation}deg)`;
        
        cardBack.style.transform = transform;
        cardBack.style.transformOrigin = '50% 100%';
        cardBack.style.zIndex = c;
        
        cardContainer.appendChild(cardBack);
      }
      handSimContainer.appendChild(cardContainer);
      playerEl.appendChild(handSimContainer);
    }

    container.appendChild(playerEl);
  }
}
