let ws = null;
let messageHandlers = [];
let userToken = null;

const WS_BASE = import.meta.env.VITE_WS_URL;

if (!WS_BASE) {
  throw new Error("VITE_WS_URL is not defined. Set it in Vercel and redeploy.");
}

export function connectWs(token, onMessage) {
  userToken = token;

  if (ws && ws.readyState === WebSocket.OPEN) {
    if (!messageHandlers.includes(onMessage)) {
      messageHandlers.push(onMessage);
    }
    return ws;
  }

  try {
    const url = `${WS_BASE}${token ? `?token=${encodeURIComponent(token)}` : ""}`;
    ws = new WebSocket(url);

    ws.onopen = () => {
      console.log("WebSocket connected:", url);

      if (!messageHandlers.includes(onMessage)) {
        messageHandlers.push(onMessage);
      }

      // Auto join reading room
      ws.send(JSON.stringify({
        type: "join",
        channel: "reading_room"
      }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        messageHandlers.forEach((handler) => handler?.(msg));
      } catch (err) {
        console.error("Failed to parse WS message:", err);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    ws.onclose = () => {
      console.log("WebSocket closed, reconnecting...");
      ws = null;

      setTimeout(() => {
        if (userToken) {
          connectWs(userToken, onMessage);
        }
      }, 2000);
    };
  } catch (err) {
    console.error("Failed to create WebSocket:", err);
  }

  return ws;
}

export function joinChannel(channel) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({
    type: "join",
    channel
  }));
}

export function sendMessage(channel, payload) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({
    type: "chat",
    channel,
    payload
  }));
}

export function updatePresence(book, targetPages) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({
    type: "presence_update",
    channel: "reading_room",
    payload: {
      book,
      target_pages: targetPages
    }
  }));
}
