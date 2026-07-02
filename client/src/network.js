// ─── WebSocket Connection Manager ───
// Clean wrapper with auto-reconnect and exponential backoff.

let socket = null;
let reconnectTimer = null;
let reconnectDelay = 1000;
const MAX_DELAY = 10000;
let heartbeatInterval = null;

function startHeartbeat() {
  stopHeartbeat();
  heartbeatInterval = setInterval(() => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      send({ action: 'ping' });
    }
  }, 15000);
}

function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

/** @type {'disconnected'|'connecting'|'connected'} */
let status = 'disconnected';

/** @type {Set<(status: string) => void>} */
const statusListeners = new Set();

/** @type {((data: object) => void)|null} */
let onMessage = null;

/**
 * Set the handler for incoming messages.
 * @param {(data: object) => void} handler
 */
export function setMessageHandler(handler) {
  onMessage = handler;
}

/**
 * Connect to the game server.
 * @param {string} [url='ws://127.0.0.1:8080']
 */
export function connect(url = 'ws://127.0.0.1:8080') {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    socket.close();
  }

  setStatus('connecting');
  console.log(`[Network] Connecting to ${url}...`);

  try {
    socket = new WebSocket(url);
  } catch (err) {
    console.error('[Network] WebSocket creation failed:', err);
    scheduleReconnect(url);
    return;
  }

  const activeSocket = socket;



  socket.addEventListener('open', () => {
    if (socket !== activeSocket) return;
    console.log('[Network] Connected');
    reconnectDelay = 1000; // reset backoff
    setStatus('connected');
    startHeartbeat();
  });

  socket.addEventListener('message', (event) => {
    if (socket !== activeSocket) return;
    try {
      const data = JSON.parse(event.data);
      if (onMessage) onMessage(data);
    } catch (err) {
      console.error('[Network] Failed to parse message:', err);
    }
  });

  socket.addEventListener('close', (event) => {
    if (socket !== activeSocket) {
      console.log('[Network] Discarded old socket close event ignored');
      return;
    }
    console.log(`[Network] Disconnected (code: ${event.code})`);
    stopHeartbeat();
    setStatus('disconnected');
    scheduleReconnect(url);
  });

  socket.addEventListener('error', (err) => {
    if (socket !== activeSocket) return;
    console.error('[Network] Error:', err);
  });
}

/**
 * Send a JSON object to the server.
 * @param {object} data
 */
export function send(data) {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    console.warn('[Network] Cannot send — not connected');
    return;
  }
  socket.send(JSON.stringify(data));
}

/**
 * Disconnect from the server.
 */
export function disconnect() {
  clearTimeout(reconnectTimer);
  stopHeartbeat();
  if (socket) {
    socket.close();
    socket = null;
  }
  setStatus('disconnected');
}

/**
 * Get current connection status.
 * @returns {'disconnected'|'connecting'|'connected'}
 */
export function getConnectionStatus() {
  return status;
}

/**
 * Subscribe to connection status changes.
 * @param {(status: string) => void} fn
 * @returns {() => void}
 */
export function onStatusChange(fn) {
  statusListeners.add(fn);
  return () => statusListeners.delete(fn);
}

// ─── Internal ───

function setStatus(newStatus) {
  status = newStatus;
  for (const fn of statusListeners) fn(status);
}

function scheduleReconnect(url) {
  clearTimeout(reconnectTimer);
  console.log(`[Network] Reconnecting in ${reconnectDelay}ms...`);
  reconnectTimer = setTimeout(() => {
    reconnectDelay = Math.min(reconnectDelay * 2, MAX_DELAY);
    connect(url);
  }, reconnectDelay);
}
