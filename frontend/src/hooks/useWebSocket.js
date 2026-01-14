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
    // Match backend WSMessage schema: chat text should go in `body`.
    const msgObj = { type, channel };
    if (type === 'chat') {
      msgObj.body = payload;
    } else {
      msgObj.payload = payload;
    }
    const msg = JSON.stringify(msgObj);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(msg);
    } else {
      queueRef.current.push(msg); //  queue while connecting
    }
  }, [channel]);

  useEffect(() => {
    if (!token) return;

    // Allow VITE_WS_URL to be a ws(s)://... URL or an http(s)://... backend base.
    const base = import.meta.env.VITE_WS_URL;
    const url = new URL(base, window.location.href);
    if (url.protocol === 'http:') url.protocol = 'ws:';
    if (url.protocol === 'https:') url.protocol = 'wss:';
    if (!url.pathname || url.pathname === '/') url.pathname = '/ws';
    url.searchParams.set('token', token);
    const wsUrl = url.toString();
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
