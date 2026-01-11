import { useEffect, useRef, useCallback } from 'react';

export function useWebSocket(token, channel = 'reading_room', onMessage) {
  const wsRef = useRef(null);
  const queueRef = useRef([]); // message queue

  const flushQueue = () => {
    while (queueRef.current.length > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(queueRef.current.shift());
    }
  };

  const sendMessage = useCallback((type, payload) => {
    const msg = JSON.stringify({ type, channel, payload });

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(msg);
    } else {
      queueRef.current.push(msg); //  queue while connecting
    }
  }, [channel]);

  useEffect(() => {
    if (!token) return;

    const wsUrl = `${import.meta.env.VITE_WS_URL}?token=${encodeURIComponent(token)}`;
    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onopen = () => {
      // Join room
      wsRef.current.send(JSON.stringify({ type: 'join', channel }));

      // Flush any queued messages
      flushQueue();
    };

    wsRef.current.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        onMessage?.(msg);
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    };

    wsRef.current.onerror = (e) => {
      console.error('WebSocket error:', e);
    };

    wsRef.current.onclose = () => {
      console.log('WebSocket closed');
    };

    return () => wsRef.current?.close();
  }, [token, channel, onMessage]);

  return { sendMessage };
}
