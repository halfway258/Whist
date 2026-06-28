// ─── Stage Router ───
// Switches visible stage containers based on current_stage value.

const STAGES = ['LOBBY', 'DEALING', 'BETTING', 'PLAYING', 'ROUND_END', 'GAME_OVER'];

const HUD_STAGES = new Set(['DEALING', 'BETTING', 'PLAYING', 'ROUND_END']);

const stageElements = {};
let hudElement = null;
let currentStage = null;

/** @type {Map<string, (state: object) => void>} */
const stageRenderers = new Map();

/**
 * Initialize the router — cache DOM references.
 */
export function initRouter() {
  stageElements['LOBBY'] = document.getElementById('stage-lobby');
  stageElements['DEALING'] = document.getElementById('stage-dealing');
  stageElements['BETTING'] = document.getElementById('stage-betting');
  stageElements['PLAYING'] = document.getElementById('stage-playing');
  stageElements['ROUND_END'] = document.getElementById('stage-round-end');
  stageElements['GAME_OVER'] = document.getElementById('stage-game-over');
  hudElement = document.getElementById('hud');
}

/**
 * Register a render function for a stage.
 * @param {string} stage
 * @param {(state: object, container: HTMLElement) => void} renderFn
 */
export function registerStage(stage, renderFn) {
  stageRenderers.set(stage, renderFn);
}

/**
 * Route to the correct stage based on state.
 * @param {object} state
 */
export function routeState(state) {
  if (!state || !state.current_stage) return;

  const nextStage = state.current_stage;

  // Show/hide stage containers
  for (const [name, el] of Object.entries(stageElements)) {
    if (name === nextStage) {
      el.classList.add('active');
    } else {
      el.classList.remove('active');
    }
  }

  // Show/hide HUD
  if (hudElement) {
    hudElement.style.display = HUD_STAGES.has(nextStage) ? '' : 'none';
  }

  // Call the stage renderer
  const renderer = stageRenderers.get(nextStage);
  const container = stageElements[nextStage];
  if (renderer && container) {
    renderer(state, container);
  }

  // Update dev label if present
  const devLabel = document.getElementById('dev-stage-label');
  if (devLabel) devLabel.textContent = nextStage;

  currentStage = nextStage;
}

/**
 * Get the list of all stage names (for dev cycling).
 * @returns {string[]}
 */
export function getStages() {
  return STAGES;
}

/**
 * Get the current active stage name.
 * @returns {string|null}
 */
export function getCurrentStage() {
  return currentStage;
}
