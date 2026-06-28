import { send } from '../network.js';

/**
 * Render the ROUND_END stage showing round results breakdown for Israeli Whist.
 * @param {object} state - Game State
 * @param {HTMLElement} container - Stage Container
 */
export function renderRoundEnd(state, container) {
  container.innerHTML = '';

  const players = state.players || [];
  const gameStats = state.game_stats || { round: 1 };

  // Background overlay (semi-translucent with blur)
  const overlay = document.createElement('div');
  overlay.className = 'w-full h-full flex flex-col justify-center items-center p-4 bg-slate-950/90 backdrop-blur-md z-30 relative';

  // 1. Header Card
  const headerCard = document.createElement('div');
  headerCard.className = 'text-center mb-8 banner-animate';
  headerCard.innerHTML = `
    <h2 class="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-500 uppercase tracking-widest leading-none">Round Completed</h2>
    <p class="text-slate-400 text-sm mt-2 font-medium">Round ${gameStats.round} final standings & score adjustments</p>
  `;
  overlay.appendChild(headerCard);

  // 2. Round Results Summary Table (Large Glass Card)
  const tableCard = document.createElement('div');
  tableCard.className = 'glass p-6 w-full max-w-2xl border border-slate-800 shadow-2xl mb-8 relative z-10';

  // Build standings table
  const table = document.createElement('table');
  table.className = 'w-full text-left border-collapse';
  table.innerHTML = `
    <thead>
      <tr class="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
        <th class="pb-3 px-2">Player</th>
        <th class="pb-3 px-2 text-center">Bid</th>
        <th class="pb-3 px-2 text-center">Tricks Taken</th>
        <th class="pb-3 px-2 text-center">Status</th>
        <th class="pb-3 px-2 text-center">Score Change</th>
        <th class="pb-3 px-2 text-right">Total Score</th>
      </tr>
    </thead>
    <tbody class="divide-y divide-slate-800/40">
      ${players.map((p, idx) => {
        const isSelf = idx === 0;
        const tricks = p.tricks_taken || 0;
        const bet = p.bet !== null && p.bet !== undefined ? p.bet : 0;
        const success = tricks === bet;

        // Score change (check for state.players[i].score_change or calculate mock difference)
        // If score_change isn't provided, default to a sensible display
        const scoreChange = p.score_change !== undefined ? p.score_change : (success ? (10 + bet * bet) : -Math.abs(bet - tricks) * 10);
        const changeSign = scoreChange >= 0 ? `+${scoreChange}` : `${scoreChange}`;
        const changeClass = scoreChange >= 0 ? 'text-emerald-400 font-extrabold' : 'text-rose-500 font-extrabold';

        const statusBadge = success 
          ? `<span class="bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Made</span>`
          : `<span class="bg-rose-500/10 text-rose-400 border border-rose-500/25 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Missed</span>`;

        let rowClass = 'text-slate-300';
        if (isSelf) rowClass = 'text-white bg-slate-800/20 font-semibold';

        return `
          <tr class="${rowClass}">
            <td class="py-3.5 px-2 text-sm">
              ${p.name} ${isSelf ? '<span class="text-[10px] text-slate-500 font-normal ml-1">(You)</span>' : ''}
            </td>
            <td class="py-3.5 px-2 text-center font-mono font-bold">${bet}</td>
            <td class="py-3.5 px-2 text-center font-mono font-bold">${tricks}</td>
            <td class="py-3.5 px-2 text-center">${statusBadge}</td>
            <td class="py-3.5 px-2 text-center font-mono ${changeClass}">${changeSign}</td>
            <td class="py-3.5 px-2 text-right font-mono font-black score-animate text-white">${p.score} <span class="text-[10px] text-slate-500 font-normal">pts</span></td>
          </tr>
        `;
      }).join('')}
    </tbody>
  `;
  tableCard.appendChild(table);
  overlay.appendChild(tableCard);

  // 3. Ready Action Button
  const readyBtn = document.createElement('button');
  readyBtn.className = 'btn btn-primary text-base px-8 py-3 relative z-10 flex items-center gap-2';
  readyBtn.innerHTML = '<span>Next Round</span> <span>→</span>';
  readyBtn.addEventListener('click', () => {
    readyBtn.disabled = true;
    readyBtn.textContent = 'Waiting for players...';
    send({ action: 'ready_next_round' });
  });
  overlay.appendChild(readyBtn);

  container.appendChild(overlay);
}
