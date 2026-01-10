import { useEffect, useRef, useCallback } from 'react';

export function useWebSocket(token, channel = 'reading_room', onMessage) {
  const wsRef = useRef(null);

  const sendMessage = useCallback((type, payload) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const msg = { type, channel };
      if (payload) msg.payload = payload;
      wsRef.current.send(JSON.stringify(msg));
    }
  }, [channel]);

  useEffect(() => {
    if (!token) return;
    const wsUrl = `${import.meta.env.VITE_WS_URL}/ws${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onopen = () => {
      // Automatically send join message
      wsRef.current.send(JSON.stringify({ type: 'join', channel }));
    };

    wsRef.current.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        onMessage?.(msg);
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    };

    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    wsRef.current.onclose = () => {
      console.log('WebSocket closed');
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [token, channel, onMessage]);

  return { sendMessage };
}