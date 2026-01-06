import React, { useEffect, useRef, useState } from 'react';

export default function ChatBox({ channel, user, messages, onSend, readOnly = false }) {
  const [text, setText] = useState('');
  const endRef = useRef();

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = () => {
    if (!text.trim() || !onSend) return;
    onSend(text);
    setText('');
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center text-white text-xs font-bold">
              {(m.user?.username || m.user?.email || 'A')[0].toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="flex items-baseline space-x-2">
                <span className="font-semibold text-sm text-gray-200">
                  {m.user?.username || m.user?.email || 'Anonymous'}
                </span>
                <span className="text-xs text-muted">
                  {m.created_at ? formatTime(m.created_at) : ''}
                </span>
              </div>
              <div className="text-sm text-gray-100 mt-1">
                {m.body}
              </div>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      {!readOnly && (
        <div className="p-4 border-t border-gray-800">
          <div className="flex gap-2">
            <input
              className="flex-1 bg-[#07101a] rounded-md px-3 py-2 text-sm border border-gray-800 focus:outline-none focus:ring-2 focus:ring-accent"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={`Message #${channel}`}
              onKeyPress={(e) => e.key === 'Enter' && send()}
            />
            <button
              className="px-4 py-2 bg-accent rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50"
              onClick={send}
              disabled={!text.trim()}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

