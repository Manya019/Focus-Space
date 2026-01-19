let ws = null;
const listeners = new Set();
let userToken = null;
let reconnectTimer = null;

const WS_BASE = import.meta.env.VITE_WS_URL;

if (!WS_BASE) {
  throw new Error('VITE_WS_URL is not defined. Set it in your deployment env and redeploy.');
}

function normalizeWsBase(base) {
  const url = new URL(base, window.location.href);

  // Allow VITE_WS_URL to be set to an HTTP(S) backend base.
  if (url.protocol === 'http:') url.protocol = 'ws:';
  if (url.protocol === 'https:') url.protocol = 'wss:';

  if (url.protocol !== 'ws:' && url.protocol !== 'wss:') {
    throw new Error(`VITE_WS_URL must be ws:// or wss:// (or http(s)://). Got: ${url.protocol}`);
  }

  // Backend exposes WebSocket at GET /ws
  if (!url.pathname || url.pathname === '/') {
    url.pathname = '/ws';
  }

  return url;
}

function buildWsUrl(token) {
  const url = normalizeWsBase(WS_BASE);
  if (token) url.searchParams.set('token', token);
  return url.toString();
}

function scheduleReconnect() {
  if (!userToken) return;
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(() => {
    // Reconnect without adding more listeners.
    connectWs(userToken);
  }, 2000);
}

function ensureOpenSend(payload) {
  const socket = ws;
  if (!socket) return;

  if (socket.readyState === WebSocket.OPEN) {
    socket.send(payload);
    return;
  }

  socket.addEventListener(
    'open',
    () => {
      try {
        socket.send(payload);
      } catch {
        // ignore
      }
    },
    { once: true }
  );
}

// connectWs returns { socket, unsubscribe }.
// unsubscribe is crucial to avoid accumulating handlers when navigating between pages.
export function connectWs(token, onMessage) {
  userToken = token;
  if (onMessage) listeners.add(onMessage);

  const unsubscribe = () => {
    if (onMessage) listeners.delete(onMessage);
  };

  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return { socket: ws, unsubscribe };
  }

  const url = buildWsUrl(token);
  const socket = new WebSocket(url);
  ws = socket;

  socket.onopen = () => {
    console.log('WebSocket connected:', url);

    // Default: always join reading room; other pages can join additional channels.
    try {
      socket.send(
        JSON.stringify({
          type: 'join',
          channel: 'reading_room',
        })
      );
    } catch {
      // ignore
    }
  };

  socket.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      listeners.forEach((handler) => handler?.(msg));
    } catch (err) {
      console.error('Failed to parse WS message:', err);
    }
  };

  socket.onerror = (error) => {
    console.error('WebSocket error:', error);
    console.error('WebSocket URL:', url);
    console.error('WebSocket readyState:', socket.readyState);
  };

  socket.onclose = () => {
    console.log('WebSocket closed, reconnecting...');

    // Only clear the global if this socket is still the current one.
    if (ws === socket) {
      ws = null;
    }

    scheduleReconnect();
  };

  return { socket, unsubscribe };
}

export function joinChannel(channel) {
  if (!channel) return;
  ensureOpenSend(
    JSON.stringify({
      type: 'join',
      channel,
    })
  );
}

export function sendMessage(channel, bodyOrMsg) {
  if (!channel) return;

  // Flexible implementation
  // If bodyOrMsg is an object with a 'type' field, use it as the full message
  // Otherwise treat as chat body

  let msg = {
    type: 'chat',
    channel,
    body: '',
  };

  if (typeof bodyOrMsg === 'object' && bodyOrMsg !== null && bodyOrMsg.type) {
    // Advanced usage: passing full message object
    msg = { ...msg, ...bodyOrMsg };
  } else if (typeof bodyOrMsg === 'object' && bodyOrMsg !== null) {
    // Legacy support for chat with extra fields
    msg.body = bodyOrMsg.body || '';
    if (bodyOrMsg.id) msg.id = bodyOrMsg.id;
    if (bodyOrMsg.reply_to_id) msg.reply_to_id = bodyOrMsg.reply_to_id;
    if (bodyOrMsg.created_at) msg.created_at = bodyOrMsg.created_at;
  } else {
    // Simple string message
    msg.body = bodyOrMsg;
  }

  ensureOpenSend(JSON.stringify(msg));
}

export function sendDelete(channel, id) {
  if (!channel || !id) return;
  ensureOpenSend(
    JSON.stringify({
      type: 'delete',
      channel,
      id,
    })
  );
}

export function updatePresence(book, targetPages) {
  ensureOpenSend(
    JSON.stringify({
      type: 'presence_update',
      channel: 'reading_room',
      payload: {
        book,
        target_pages: targetPages,
      },
    })
  );
}
