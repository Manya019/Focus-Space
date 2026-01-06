let ws = null;
let messageHandlers = [];
let userToken = null;

export function connectWs(token, onMessage) {
  // Store token for reconnection
  userToken = token;

  if (ws && ws.readyState === WebSocket.OPEN) {
    // Add handler if not already added
    if (!messageHandlers.includes(onMessage)) {
      messageHandlers.push(onMessage);
    }
    return ws;
  }

  try {
    const url = `ws://localhost:8080/ws${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    ws = new WebSocket(url);

    ws.onopen = () => {
      console.log('WebSocket connected');
      // Add handler
      if (!messageHandlers.includes(onMessage)) {
        messageHandlers.push(onMessage);
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        // Call all registered handlers
        messageHandlers.forEach(handler => handler?.(msg));
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket closed, reconnecting...');
      ws = null;
      setTimeout(() => {
        if (userToken) {
          connectWs(userToken, onMessage);
        }
      }, 2000);
    };
  } catch (err) {
    console.error('Failed to create WebSocket:', err);
  }

  return ws;
}

export function joinChannel(channel) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({
    type: 'join',
    channel: channel
  }));
}

export function sendMessage(channel, body) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({
    type: 'chat',
    channel: channel,
    body: body
  }));
}

export function updatePresence(book, targetPages) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({
    type: 'presence_update',
    channel: 'reading_room',
    payload: {
      book: book,
      target_pages: targetPages
    }
  }));
}

