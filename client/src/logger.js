import { send } from './network.js';

/**
 * Log a client-side user interaction or stage change, printing to console and writing to server log file.
 * @param {string} msg 
 */
export function logInteraction(msg) {
  console.log(`[Client Interaction] ${msg}`);
  try {
    send({
      action: 'client_log',
      message: msg
    });
  } catch (e) {
    // Ignore if not connected yet
  }
}
