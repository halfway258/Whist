import { getConnectionStatus } from '../network.js';
import { renderCardBack, renderCard } from './cards.js';
import { toggleSettingsMenu } from './settings.js';
import { logInteraction } from '../logger.js';

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

  // 1. Connection Status Dot and Menu button (Top-Right)
  const statusContainer = document.createElement('div');
  statusContainer.className = 'absolute top-2 right-2 md:top-4 md:right-4 flex items-center gap-2 md:gap-3 pointer-events-auto z-20';
  
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
    <div class="glass-sm px-2 py-1 md:px-3 md:py-1.5 flex items-center gap-1.5 md:gap-2">
      <span class="${dotClass}"></span>
      <span class="text-[10px] md:text-xs font-semibold text-slate-300">${statusText}</span>
    </div>
    <button id="btn-settings" class="btn btn-secondary text-[10px] md:text-xs !py-1 md:!py-1.5 !px-2 md:!px-3 flex items-center gap-1">
      ⚙️ Menu
    </button>
  `;
  container.appendChild(statusContainer);

  const btnSettings = statusContainer.querySelector('#btn-settings');
  btnSettings.addEventListener('click', () => {
    logInteraction('Button Click: Open Settings Menu');
    toggleSettingsMenu();
  });

  // 2. Round Info Badge (Top-Left)
  const showRoundStats = localStorage.getItem('whist_show_round_stats') !== 'false';
  if (showRoundStats) {
    const roundBadge = document.createElement('div');
    roundBadge.className = 'absolute top-2 left-2 md:top-4 md:left-4 glass-sm px-2.5 py-1.5 md:px-4 md:py-2 flex flex-col justify-center pointer-events-auto z-20';
    
    const playStyleText = gameStats.play_style ? ` | Play: ${gameStats.play_style}` : '';
    const biddingStageText = gameStats.bidding_stage && currentStage === 'BETTING' ? ` (${gameStats.bidding_stage})` : '';
    
    const getSuitSymbol = (suit) => {
      switch(suit) {
        case 'spades': return '♠';
        case 'hearts': return '♥';
        case 'diamonds': return '♦';
        case 'clubs': return '♣';
        default: return '';
      }
    };

    const capitalize = (str) => {
      if (!str) return '';
      return str.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    };

    const trumpText = gameStats.trump_suit && gameStats.trump_suit !== 'no_trump' ? ` | Trump: ${capitalize(gameStats.trump_suit)} ${getSuitSymbol(gameStats.trump_suit)}` : (gameStats.trump_suit === 'no_trump' ? ' | Trump: NT' : '');

    roundBadge.innerHTML = `
      <div class="text-[8px] md:text-[9px] text-slate-400 font-bold uppercase tracking-wider">Israeli Whist${playStyleText}${trumpText}</div>
      <div class="text-sm md:text-xl font-black text-white font-mono leading-none mt-1">Round ${gameStats.round}${biddingStageText}</div>
      <div class="text-[9px] md:text-[10px] text-amber-400 font-semibold mt-0.5 md:mt-1">Target: ${gameStats.target_score}</div>
    `;
    container.appendChild(roundBadge);
  }

  // 3. Render 4 Players
  // Bottom: 0, Left: 1, Top: 2, Right: 3
  // Local player (0) is placed above the hand cards area to avoid overlaps
  const layoutClasses = [
    'bottom-28 left-2 md:bottom-32 md:left-6',                        // Player 0 (Bottom-Left)
    'left-2 md:left-6 top-[35%] -translate-y-1/2',      // Player 1 (Left)
    'top-2 right-[124px] md:top-4 md:left-1/2 md:-translate-x-1/2 md:right-auto',        // Player 2 (Top)
    'right-2 md:right-6 top-[35%] -translate-y-1/2'       // Player 3 (Right)
  ];

  const isMobile = window.innerWidth < 768;

  for (let i = 0; i < 4; i++) {
    const player = players[i];
    if (!player) continue;

    const isLocal = i === 0 && !state.is_spectator;
    const isTurn = player.is_turn;
    const isThinking = player.status === 'Thinking...';

    // Player card container
    const playerEl = document.createElement('div');
    playerEl.className = `absolute ${layoutClasses[i]} flex flex-col items-center pointer-events-auto transition-all duration-300 z-20`;

    // Bubble status indicator (speech bubble style)
    if (player.status && !isLocal) {
      const bubble = document.createElement('div');
      // Position bubble relative to player card depending on location
      let bubblePos = 'bottom-full mb-2 left-1/2 -translate-x-1/2';
      if (i === 2) {
        // Player 2 (Top player) bubble should be below the card to be visible within viewport bounds
        bubblePos = 'top-full mt-2 left-1/2 -translate-x-1/2';
      } else if (!isMobile) {
        if (i === 1) bubblePos = 'left-full ml-2 top-1/2 -translate-y-1/2';
        if (i === 3) bubblePos = 'right-full mr-2 top-1/2 -translate-y-1/2';
      }

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
    cardBody.className = `glass-sm px-2 py-1.5 md:px-4 md:py-3 flex flex-col items-center min-w-24 md:min-w-32 border-2 transition-all duration-300 relative z-10 ${isTurn ? 'turn-glow border-emerald-500' : 'border-slate-700/30'}`;

    // Wording changes for Israeli Whist: Show tricks taken / bet in playing/round-end stages
    let tricksDisplay = '';
    if (currentStage === 'PLAYING' || currentStage === 'ROUND_END') {
      const tricksTaken = player.tricks_taken || 0;
      const betTakes = player.bet !== null && typeof player.bet === 'object' ? player.bet.takes : player.bet;
      const bet = betTakes !== null && betTakes !== undefined && betTakes !== 'skip' ? betTakes : '-';
      tricksDisplay = `
        <div class="text-[9px] md:text-[11px] font-bold mt-1 md:mt-1.5 flex flex-col items-center">
          <span class="text-slate-400 text-[8px] md:text-[9px] uppercase tracking-wider">Tricks</span>
          <span class="text-emerald-400 text-xs md:text-sm font-mono mt-0.5">${tricksTaken} <span class="text-slate-500 text-[10px] md:text-xs">/ ${bet}</span></span>
        </div>
      `;
    } else if (player.bet !== null && player.bet !== undefined && player.bet !== 'skip') {
      const betTakes = typeof player.bet === 'object' ? player.bet.takes : player.bet;
      tricksDisplay = `
        <div class="text-[9px] md:text-[11px] font-bold mt-1 md:mt-1.5 flex flex-col items-center">
          <span class="text-slate-400 text-[8px] md:text-[9px] uppercase tracking-wider">Bet Bid</span>
          <span class="text-amber-400 font-mono mt-0.5 text-xs md:text-sm">${betTakes}</span>
        </div>
      `;
    }

    const showOppCards = localStorage.getItem('whist_show_opp_cards') !== 'false';
    const showHandSim = (showOppCards || state.is_spectator === true) && (currentStage === 'PLAYING' || currentStage === 'BETTING') && !isLocal;

    // Render opponent hand count badge directly in the cardBody on mobile
    let compactHandDisplay = '';
    if (showHandSim && isMobile && player.hand_size !== undefined) {
      compactHandDisplay = `
        <div class="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 mt-1 pt-1 border-t border-slate-800/30 w-full justify-center">
          <span>🎴</span>
          <span class="font-mono text-blue-400">${player.hand_size}</span>
        </div>
      `;
    }

    let turnLabel = '';
    if (isTurn) {
      if (isLocal) {
        turnLabel = 'Your Turn';
      } else {
        if (currentStage === 'BETTING') turnLabel = 'Bidding...';
        else if (currentStage === 'PLAYING') turnLabel = 'Playing...';
        else turnLabel = 'Thinking...';
      }
    }

    cardBody.innerHTML = `
      <div class="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wide truncate max-w-[80px] md:max-w-[120px]">${isLocal ? 'You' : player.name}</div>
      <div class="text-sm md:text-lg font-black text-white font-mono mt-0.5">${player.score} <span class="text-[9px] md:text-xs text-amber-400 font-normal">Score</span></div>
      ${tricksDisplay}
      ${compactHandDisplay}
      ${isTurn ? `<div class="text-[8px] md:text-[9px] ${isLocal ? 'text-emerald-400' : 'text-amber-400'} font-extrabold uppercase tracking-wider animate-pulse mt-1">${turnLabel}</div>` : ''}
    `;

    playerEl.appendChild(cardBody);

    // Render opponent hand simulation if on desktop or if spectating (always visible for spectators)
    if (showHandSim && (!isMobile || state.is_spectator) && player.hand_size !== undefined) {
      const handSimContainer = document.createElement('div');
      
      const isSpec = state.is_spectator === true;
      
      // Position fanned cards at screen edges
      let positionClass = '';
      let baseRotation = 0;
      
      if (isSpec) {
        if (i === 0) { // Bottom
          positionClass = 'absolute bottom-6 left-1/2 -translate-x-1/2';
        } else if (i === 1) { // Left
          positionClass = `absolute ${isMobile ? 'left-20' : 'left-28 md:left-36'} top-1/2 -translate-y-1/2`;
        } else if (i === 2) { // Top
          positionClass = `absolute ${isMobile ? 'top-16' : 'top-20 md:top-24'} left-1/2 -translate-x-1/2`;
        } else if (i === 3) { // Right
          positionClass = `absolute ${isMobile ? 'right-20' : 'right-28 md:right-36'} top-1/2 -translate-y-1/2`;
        }
      } else {
        if (i === 0) { // Bottom
          positionClass = 'absolute bottom-4 left-32 md:left-40';
          baseRotation = 0;
        } else if (i === 1) { // Left
          positionClass = 'absolute -left-4 top-[35%] -translate-y-1/2';
          baseRotation = 90;
        } else if (i === 2) { // Top
          positionClass = 'absolute -top-4 left-1/2 -translate-x-1/2';
          baseRotation = 180;
        } else if (i === 3) { // Right
          positionClass = 'absolute -right-4 top-[35%] -translate-y-1/2';
          baseRotation = -90;
        }
      }

      const containerWidth = isSpec ? (i === 1 || i === 3 ? 'w-24' : 'w-[500px]') : 'w-48';
      const containerHeight = isSpec ? (i === 1 || i === 3 ? 'h-[460px]' : 'h-24') : 'h-10';
      handSimContainer.className = `${positionClass} flex justify-center items-center ${containerWidth} ${containerHeight} z-10 pointer-events-none`;
      
      const handSize = player.hand_size;
      const cardContainer = document.createElement('div');
      cardContainer.className = 'relative w-full h-full flex justify-center items-center';
      
      if (!isSpec && baseRotation !== 0) {
        cardContainer.style.transform = `rotate(${baseRotation}deg)`;
      }
      
      // Sort hand if it is visible to spectator
      const sortedHand = player.hand ? [...player.hand].sort((a, b) => {
        const SUIT_ORDER = { clubs: 0, diamonds: 1, spades: 2, hearts: 3 };
        const orderA = SUIT_ORDER[a.suit] !== undefined ? SUIT_ORDER[a.suit] : 99;
        const orderB = SUIT_ORDER[b.suit] !== undefined ? SUIT_ORDER[b.suit] : 99;
        if (orderA !== orderB) return orderA - orderB;
        return b.value - a.value;
      }) : null;
      
      for (let c = 0; c < handSize; c++) {
        let cardEl;
        if (sortedHand && sortedHand[c]) {
          cardEl = renderCard(sortedHand[c], { mini: !isSpec, small: isSpec });
        } else {
          cardEl = renderCardBack({ mini: !isSpec, small: isSpec });
        }
        cardEl.style.position = 'absolute';
        
        // Overlapping offset
        const centerIdx = (handSize - 1) / 2;
        let transform = '';
        
        if (isSpec) {
          if (i === 1 || i === 3) {
            // Vertical alignment for Left and Right hands
            const offset = (c - centerIdx) * (isMobile ? 22 : 30);
            transform = `translateY(${offset}px)`;
          } else {
            // Horizontal alignment for Bottom and Top hands
            const offset = (c - centerIdx) * (isMobile ? 24 : 35);
            transform = `translateX(${offset}px)`;
            const rotation = (c - centerIdx) * 1.5;
            transform += ` rotate(${rotation}deg)`;
          }
        } else {
          const offset = (c - centerIdx) * 6; 
          transform = `translateX(${offset}px)`;
          const rotation = (c - centerIdx) * 2;
          transform += ` rotate(${rotation}deg)`;
        }
        
        cardEl.style.transform = transform;
        cardEl.style.transformOrigin = '50% 100%';
        cardEl.style.zIndex = c;
        
        cardContainer.appendChild(cardEl);
      }
      handSimContainer.appendChild(cardContainer);
      container.appendChild(handSimContainer);
    }

    container.appendChild(playerEl);
  }
}
