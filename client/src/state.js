// ─── State Manager ───
// Single source of truth. The backend overwrites this entirely on each message.

/** @type {import('./mock.js').GameState} */
let gameState = null;

/** @type {Set<(state: object) => void>} */
const listeners = new Set();

/**
 * Completely replace the game state and notify all listeners.
 * @param {object} newState
 */
export function updateState(newState) {
  const oldStage = gameState ? gameState.view_stage : 'SERVER_SELECT';
  const oldRooms = gameState ? gameState.rooms : [];
  gameState = { view_stage: oldStage, rooms: oldRooms, ...newState };
  for (const fn of listeners) {
    try {
      fn(gameState);
    } catch (err) {
      console.error('[State] Listener error:', err);
    }
  }
}

/**
 * Get current state snapshot.
 * @returns {object|null}
 */
export function getState() {
  return gameState;
}

/**
 * Subscribe to state changes. Returns an unsubscribe function.
 * @param {(state: object) => void} fn
 * @returns {() => void}
 */
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
