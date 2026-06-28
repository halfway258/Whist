import { send } from '../network.js';
import { updateState } from '../state.js';
import { logInteraction } from '../logger.js';

/**
 * Render the GAME_OVER stage.
 * @param {object} state - Game State
 * @param {HTMLElement} container - Stage Container
 */
export function renderGameOver(state, container) {
  container.innerHTML = '';

  const players = state.players || [];
  const localPlayer = players[0] || { id: 'p1', name: 'You' };
  const winner = state.winner || { id: '', name: 'Unknown' };

  // Sort players descending by score for the final podium/scoreboard
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  // Background overlay (full viewport flex column)
  const overlay = document.createElement('div');
  overlay.className = 'w-full h-full flex flex-col justify-center items-center p-4 bg-slate-950/95 z-30 relative overflow-hidden';

  // 1. Victory particles (confetti)
  const isLocalWinner = winner.id === localPlayer.id;
  const particleCount = isLocalWinner ? 50 : 15;
  const colors = ['#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#ef4444'];

  for (let i = 0; i < particleCount; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    p.style.left = `${Math.random() * 100}%`;
    p.style.bottom = '0%';
    p.style.animationDelay = `${Math.random() * 2}s`;
    p.style.width = `${Math.random() * 6 + 4}px`;
    p.style.height = p.style.width;
    overlay.appendChild(p);
  }

  // 2. Result Banner
  const banner = document.createElement('div');
  banner.className = 'glass banner-animate p-8 max-w-md w-full text-center border shadow-2xl mb-8 flex flex-col items-center relative z-10';
  
  if (isLocalWinner) {
    banner.classList.add('border-amber-500/30', 'bg-amber-950/10');
    banner.innerHTML = `
      <div class="text-6xl mb-4 animate-bounce">🏆</div>
      <h1 class="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-500 tracking-wider mb-2">VICTORY!</h1>
      <p class="text-slate-300 text-sm font-semibold">Congratulations, you won the match!</p>
    `;
  } else {
    banner.classList.add('border-slate-800', 'bg-slate-900/40');
    banner.innerHTML = `
      <div class="text-5xl mb-4">🤝</div>
      <h1 class="text-3xl font-black text-slate-300 tracking-wider mb-2">GAME OVER</h1>
      <p class="text-slate-400 text-sm font-medium">Winner: <span class="text-amber-400 font-extrabold">${winner.name}</span></p>
    `;
  }
  overlay.appendChild(banner);

  // 3. Final scoreboard card
  const scoresCard = document.createElement('div');
  scoresCard.className = 'glass-sm p-6 w-full max-w-md border border-slate-800 shadow-xl mb-8 relative z-10';
  
  // Title
  scoresCard.innerHTML = `
    <h3 class="text-xs font-black text-slate-400 uppercase tracking-widest text-center mb-4">Final Standings</h3>
  `;

  // Standings table
  const table = document.createElement('table');
  table.className = 'w-full text-left border-collapse';
  table.innerHTML = `
    <thead>
      <tr class="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
        <th class="pb-2">Rank</th>
        <th class="pb-2">Player</th>
        <th class="pb-2 text-right">Final Score</th>
      </tr>
    </thead>
    <tbody class="divide-y divide-slate-800/40">
      ${sortedPlayers.map((p, idx) => {
        const isWinner = p.id === winner.id;
        const isSelf = p.id === localPlayer.id;
        
        let rowClass = 'text-slate-300';
        if (isWinner) rowClass = 'text-amber-400 font-bold bg-amber-500/5';
        else if (isSelf) rowClass = 'text-white font-medium bg-slate-800/20';

        const rankLabel = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;

        return `
          <tr class="${rowClass}">
            <td class="py-3 px-1.5 text-sm">${rankLabel}</td>
            <td class="py-3 px-1.5 text-sm">
              ${p.name} ${isSelf ? '<span class="text-[10px] text-slate-500 font-normal ml-1">(You)</span>' : ''}
            </td>
            <td class="py-3 px-1.5 text-sm font-mono font-black text-right">${p.score} <span class="text-[10px] text-slate-500 font-normal">pts</span></td>
          </tr>
        `;
      }).join('')}
    </tbody>
  `;
  scoresCard.appendChild(table);
  overlay.appendChild(scoresCard);

  // 4. Return button
  const returnBtn = document.createElement('button');
  returnBtn.className = 'btn btn-primary text-base px-8 py-3 relative z-10';
  returnBtn.textContent = 'Return to Lobby';
  
  returnBtn.addEventListener('click', () => {
    logInteraction('Button Click: Return to Lobby from Game Over screen');
    returnBtn.disabled = true;
    returnBtn.textContent = 'Resetting...';
    
    // Notify server of return
    send({ action: 'return_menu' });
    
    // Instantly reset local client to lobby state
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
  });
  overlay.appendChild(returnBtn);

  container.appendChild(overlay);
}
