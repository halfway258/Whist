import { renderCard } from '../components/cards.js';
import { send } from '../network.js';

/**
 * Render the PLAYING stage (card play loop).
 * @param {object} state - Game State
 * @param {HTMLElement} container - Stage Container
 */
export function renderPlaying(state, container) {
  container.innerHTML = '';

  const players = state.players || [];
  const localPlayer = players[0] || { id: 'p1', is_turn: false };
  const tableCards = state.table_cards || [];
  const myHand = state.my_hand || [];

  // Main board container (flex column filling viewport)
  const board = document.createElement('div');
  board.className = 'w-full h-full flex flex-col justify-between items-center p-4 relative';

  // 1. Table Felt Area with 2x2 grid in the center
  const table = document.createElement('div');
  table.className = 'table-felt w-full max-w-4xl flex-1 rounded-[40px] relative overflow-hidden flex items-center justify-center min-h-[220px] my-4';

  const centerGrid = document.createElement('div');
  centerGrid.className = 'grid grid-cols-3 grid-rows-3 gap-3 items-center justify-items-center w-72 h-72 relative z-10';

  // Seat index layout positions on a 3x3 grid:
  // Row 0: [Empty, Top, Empty]
  // Row 1: [Left, Empty, Right]
  // Row 2: [Empty, Bottom, Empty]
  // Bottom seat = Player index 0
  // Left seat = Player index 1
  // Top seat = Player index 2
  // Right seat = Player index 3
  const seatGridCoordinates = [
    { row: 3, col: 2, name: 'bottom' }, // 0: Bottom
    { row: 2, col: 1, name: 'left' },   // 1: Left
    { row: 1, col: 2, name: 'top' },    // 2: Top
    { row: 2, col: 3, name: 'right' }   // 3: Right
  ];

  // Helper: check what card a player has played
  const getPlayedCardForPlayer = (playerId) => {
    const playObj = tableCards.find(tc => tc.player_id === playerId);
    return playObj ? playObj.card : null;
  };

  // Build the 3x3 grid cells
  for (let r = 1; r <= 3; r++) {
    for (let c = 1; c <= 3; c++) {
      const cell = document.createElement('div');
      
      // Determine if this cell matches any player seat position
      const seatIdx = seatGridCoordinates.findIndex(coord => coord.row === r && coord.col === c);

      if (seatIdx !== -1) {
        const player = players[seatIdx];
        cell.className = 'flex flex-col items-center justify-center gap-1 w-20 h-28 relative';

        if (player) {
          const playedCard = getPlayedCardForPlayer(player.id);

          if (playedCard) {
            // Render the played card
            const cardSvg = renderCard(playedCard, { small: true });
            cardSvg.style.boxShadow = '0 6px 12px rgba(0,0,0,0.3)';
            
            // Rotate played card according to seat position
            let rotation = 0;
            if (seatIdx === 1) rotation = 90;
            else if (seatIdx === 2) rotation = 180;
            else if (seatIdx === 3) rotation = -90;
            if (rotation !== 0) {
              cardSvg.style.transform = `rotate(${rotation}deg)`;
            }
            
            cell.appendChild(cardSvg);
            
            // Add a small player initials badge below the card
            const initialsBadge = document.createElement('div');
            initialsBadge.className = 'text-[9px] font-bold text-slate-300 uppercase mt-1 bg-slate-950/60 px-1.5 py-0.5 rounded';
            initialsBadge.textContent = seatIdx === 0 ? 'You' : player.name;
            cell.appendChild(initialsBadge);
          } else {
            // Empty placeholder for player who hasn't played yet
            cell.className += ' border-2 border-dashed border-slate-700/30 rounded-lg flex items-center justify-center';
            cell.innerHTML = `
              <div class="text-[9px] font-black text-slate-600 uppercase text-center">
                ${seatIdx === 0 ? 'You' : player.name}
              </div>
            `;
          }
        }
      } else if (r === 2 && c === 2) {
        // Center cell (decorative or showing stage information)
        cell.className = 'flex flex-col items-center justify-center w-full h-full text-center';
        
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
          return str.charAt(0).toUpperCase() + str.slice(1);
        };

        if (tableCards.length > 0) {
          const leadSuit = tableCards[0].card.suit;
          const symbol = getSuitSymbol(leadSuit);
          const name = capitalize(leadSuit);
          cell.innerHTML = `
            <span class="text-[8px] font-bold text-emerald-500/40 uppercase tracking-widest">LEAD SUIT</span>
            <span class="text-sm font-black text-emerald-400 mt-1">${symbol} ${name}</span>
          `;
        } else {
          cell.innerHTML = `
            <span class="text-[8px] font-bold text-emerald-600/40 uppercase tracking-widest">TABLE</span>
          `;
        }
      } else {
        // Empty outer cells
        cell.className = 'w-20 h-28';
      }

      centerGrid.appendChild(cell);
    }
  }

  table.appendChild(centerGrid);
  board.appendChild(table);

  // 2. Player Hand Area (Bottom)
  const handContainer = document.createElement('div');
  handContainer.className = 'w-full flex justify-center items-center h-28 relative mt-2 pointer-events-auto fanned-hand';

  // Sort hand by alternating color order: Clubs, Diamonds, Spades, Hearts
  const SUIT_ORDER = { clubs: 0, diamonds: 1, spades: 2, hearts: 3 };
  const sortedHand = [...myHand].sort((a, b) => {
    const orderA = SUIT_ORDER[a.suit] !== undefined ? SUIT_ORDER[a.suit] : 99;
    const orderB = SUIT_ORDER[b.suit] !== undefined ? SUIT_ORDER[b.suit] : 99;
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    return b.value - a.value;
  });

  const totalCards = sortedHand.length;
  const isOurTurn = localPlayer.is_turn;

  sortedHand.forEach((card, idx) => {
    const cardEl = renderCard(card);
    
    cardEl.style.position = 'absolute';
    cardEl.style.left = '50%';
    
    // overlapping fan positioning
    const centerIdx = (totalCards - 1) / 2;
    const offset = (idx - centerIdx) * 32;
    const rotation = (idx - centerIdx) * 2.5;
    
    // Set as CSS variables to allow beautiful hover / adjacent card transitions
    cardEl.style.setProperty('--card-offset', `${offset}px`);
    cardEl.style.setProperty('--card-rot', `${rotation}deg`);
    
    cardEl.style.transformOrigin = '50% 120%';
    cardEl.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';

    const playable = isOurTurn && (() => {
      if (tableCards.length === 0) return true;
      const leadSuit = tableCards[0].card.suit;
      if (card.suit === leadSuit) return true;
      // Valid only if void of LeadSuit in hand
      const hasLeadSuit = sortedHand.some(c => c.suit === leadSuit);
      return !hasLeadSuit;
    })();

    if (playable) {
      cardEl.classList.add('playable');
      
      // Hook up card click logic
      cardEl.addEventListener('click', () => {
        // Disable hand inputs instantly to prevent double-click
        const allCards = handContainer.querySelectorAll('.game-card');
        allCards.forEach(c => {
          c.classList.add('disabled');
          c.classList.remove('playable');
        });

        // Send card play request to server
        send({
          action: 'play_card',
          card: { suit: card.suit, value: card.value }
        });
      });
    } else {
      // Muted card state
      if (isOurTurn) {
        cardEl.classList.add('unplayable');
      } else {
        cardEl.classList.add('disabled');
      }
    }

    handContainer.appendChild(cardEl);
  });

  board.appendChild(handContainer);
  container.appendChild(board);
}
