import { getMockState } from './mock.js';
import { updateState } from './state.js';

const TUTORIAL_STEPS = [
  {
    stage: 'LOBBY',
    title: '1. Lobby & Matchmaking',
    text: 'Welcome to Israeli Whist! This is the main menu. Here, you can select "Play Offline vs Bots" to start a solo game instantly, or "Online Multiplayer" to browse, join, or create public and private rooms.'
  },
  {
    stage: 'DEALING',
    title: '2. Dealing Phase',
    text: 'When a game session begins, the cards are dealt. Each of the 4 players receives 13 cards. Bots are automatically assigned to any empty seats to keep the game moving.'
  },
  {
    stage: 'BETTING',
    title: '3. Contract Bidding',
    text: "Bidding has 2 stages: 1. determining the leader and trump suit 2. determining each player's takes according to the trump suit. There are 'over' games that are aggressive (someone won't take enough!) and 'under' games that are surprising (someone will take too much!)."
  },
  {
    stage: 'PLAYING',
    title: '4. Gameplay Trick Loop',
    text: 'During play, you must follow the lead suit if you have it in hand. If you do not, you can play a trump card to "cut" the trick, or discard any other card. The player with the highest card of the lead suit (or highest trump) wins the trick.'
  },
  {
    stage: 'ROUND_END',
    title: '5. Round Results Breakdown',
    text: 'At the end of 13 tricks, the round is scored. Players who exactly made their bid earn bonus points (e.g. 10 + bid^2). Missing your bid loses points. Everyone must click "Next Round" to proceed.'
  },
  {
    stage: 'GAME_OVER',
    title: '6. Match Completed',
    text: 'The game ends when any player reaches the target score (usually 100 points). The player with the highest score wins the match! You can click "Return to Lobby" to start again.'
  }
];

export function startTutorial() {
  setTutorialStep(0);
}

function setTutorialStep(index) {
  const step = TUTORIAL_STEPS[index];
  if (!step) return;
  
  // Get mock state for this stage
  const mockState = getMockState(step.stage);
  
  // Mark it as tutorial
  mockState.in_tutorial = true;
  mockState.tutorial_step = index;
  
  // Update state to trigger render
  updateState(mockState);
  
  // Render overlay
  renderTutorialOverlay(index);
}

export function exitTutorial() {
  // Remove overlay
  const overlay = document.getElementById('tutorial-guide-overlay');
  if (overlay) overlay.remove();
  
  // Boot into clean lobby state
  const cleanLobbyState = {
    current_stage: 'LOBBY',
    players: [],
    my_hand: [],
    table_cards: [],
    prompt_data: null,
    trick_winner: null,
    winner: null,
    in_tutorial: false
  };
  updateState(cleanLobbyState);
}

function renderTutorialOverlay(stepIndex) {
  const step = TUTORIAL_STEPS[stepIndex];
  if (!step) return;

  let overlay = document.getElementById('tutorial-guide-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'tutorial-guide-overlay';
    overlay.className = 'fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl px-4 pointer-events-none';
    document.body.appendChild(overlay);
  }

  overlay.innerHTML = `
    <div class="glass p-5 border border-amber-500/30 bg-slate-900/90 shadow-2xl flex flex-col gap-4 pointer-events-auto rounded-2xl relative">
      <div class="absolute top-3 right-3 text-[10px] uppercase font-black tracking-widest text-amber-400 bg-amber-950/40 px-2.5 py-0.5 rounded">
        Step ${stepIndex + 1} of ${TUTORIAL_STEPS.length}
      </div>
      
      <div class="flex flex-col gap-1.5 text-left">
        <h4 class="text-sm font-black text-amber-400 uppercase tracking-wider">${step.title}</h4>
        <p class="text-xs text-slate-300 font-medium leading-relaxed">${step.text}</p>
      </div>

      <div class="flex justify-between items-center mt-2 pt-3 border-t border-slate-800">
        <button id="btn-tutorial-exit" class="btn btn-secondary text-xs !py-1.5 !px-3">
          Exit Tutorial
        </button>
        <div class="flex gap-2">
          <button id="btn-tutorial-prev" class="btn btn-secondary text-xs !py-1.5 !px-3" ${stepIndex === 0 ? 'disabled opacity-40 cursor-not-allowed' : ''}>
            ← Back
          </button>
          <button id="btn-tutorial-next" class="btn btn-primary text-xs !py-1.5 !px-4">
            ${stepIndex === TUTORIAL_STEPS.length - 1 ? 'Finish' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  `;

  // Hook button actions
  const btnExit = overlay.querySelector('#btn-tutorial-exit');
  const btnPrev = overlay.querySelector('#btn-tutorial-prev');
  const btnNext = overlay.querySelector('#btn-tutorial-next');

  btnExit.addEventListener('click', () => {
    exitTutorial();
  });

  if (stepIndex > 0) {
    btnPrev.addEventListener('click', () => {
      setTutorialStep(stepIndex - 1);
    });
  }

  btnNext.addEventListener('click', () => {
    if (stepIndex === TUTORIAL_STEPS.length - 1) {
      exitTutorial();
    } else {
      setTutorialStep(stepIndex + 1);
    }
  });
}
