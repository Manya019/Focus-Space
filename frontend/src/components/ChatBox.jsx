import React, { useEffect, useMemo, useRef, useState } from 'react';

function formatTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
}

function messageKey(m, index) {
  return m?.id ?? `${m?.created_at ?? 'no-ts'}:${m?.user?.id ?? 'no-user'}:${index}`;
}

export default function ChatBox({
  channel,
  user,
  messages,
  onSend,
  onDelete,
  readOnly = false,
  onUserClick
}) {
  const [replyTo, setReplyTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [messageText, setMessageText] = useState('');
  const endRef = useRef();

  const { roots, byId } = useMemo(() => {
    const byId = new Map();
    for (const m of messages || []) {
      if (m?.id) byId.set(m.id, m);
    }

    const roots = messages || [];

    const sortByTime = (a, b) => {
      const ta = a?.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b?.created_at ? new Date(b.created_at).getTime() : 0;
      return ta - tb;
    };

    roots.sort(sortByTime);

    return { roots, byId };
  }, [messages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendReply = () => {
    if (!replyText.trim() || !onSend || !replyTo) return;
    onSend(replyText, replyTo);
    setReplyText('');
    setReplyTo(null);
  };

  const sendMessage = () => {
    if (!messageText.trim() || !onSend) return;
    onSend(messageText);
    setMessageText('');
  };

  const canDelete = (m) => {
    if (!onDelete || readOnly) return false;
    if (!m?.id) return false;
    return m?.user?.id && user?.id && m.user.id === user.id;
  };

  const renderMessage = (m, index) => {
    const key = messageKey(m, index);
    // Use current user's data for consistency if this is their message
    const messageUser = (m.user?.id === user?.id && user) ? user : m.user;
    const avatarLabel = (messageUser?.username || messageUser?.email || 'A')[0].toUpperCase();
    const parent = m.reply_to_id ? byId.get(m.reply_to_id) : null;
    const parentUser = parent?.user?.id === user?.id && user ? user : parent?.user;

    return (
      <div key={key}>
        <div className="flex items-start space-x-3 group">
          <div
            className={`w-8 h-8 bg-accent rounded-full flex items-center justify-center text-white text-xs font-bold ${
              onUserClick ? 'cursor-pointer' : ''
            }`}
            onClick={() => onUserClick?.(messageUser)}
          >
            {avatarLabel}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-baseline space-x-2">
              <span
                className={`text-m text-white ${onUserClick ? 'cursor-pointer' : ''}`}
                onClick={() => onUserClick?.(messageUser)}
              >
                {messageUser?.username || messageUser?.email || 'Anonymous'}
              </span>
              <span className="text-xs text-muted">{formatTime(m.created_at)}</span>
            </div>

            {parent && (
              <div className="mt-1 text-xs text-muted border-l border-gray-700 pl-2 truncate">
                Replying to <span className="text-gray-300">{parentUser?.username || parentUser?.email || 'Anonymous'}</span>:
                <span className="ml-1 text-gray-400">{parent.body}</span>
              </div>
            )}

            <div className="text-m text-white mt-1 break-words">{m.body}</div>

            {!readOnly && (
              <div className="flex gap-2 mt-1">
                <button
                  onClick={() => setReplyTo(m)}
                  className="text-xs text-muted hover:text-white transition-opacity"
                >
                  Reply
                </button>

                {canDelete(m) && (
                  <button
                    onClick={() => onDelete?.(m)}
                    className="text-xs text-red-400 hover:text-red-300 transition-opacity"
                  >
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="overflow-y-auto p-4 space-y-4">
        {roots.map((m, i) => renderMessage(m, 0, i))}
        <div ref={endRef} />
      </div>

      {!readOnly && !replyTo && (
        <div className="p-4 border-t border-gray-800 mt-auto">
          <div className="flex gap-2">
            <input
              className="flex-1 bg-[#07101a] rounded-md px-3 py-2 text-sm border border-gray-800 focus:outline-none focus:ring-2 focus:ring-accent"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder={`Message #${channel}`}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            />
            <button
              className="px-4 py-2 bg-accent rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50"
              onClick={sendMessage}
              disabled={!messageText.trim()}
            >
              Send
            </button>
          </div>
        </div>
      )}

      {replyTo && !readOnly && (
        <div className="p-4 border-t border-gray-800 mt-auto">
          <div className="mb-2 text-sm text-muted truncate">
            Replying to {replyTo.user?.username || replyTo.user?.email || 'Anonymous'}: "{replyTo.body}"
          </div>
          <div className="flex gap-2">
            <input
              className="flex-1 bg-[#07101a] rounded-md px-3 py-2 text-sm border border-gray-800 focus:outline-none focus:ring-2 focus:ring-accent"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Type your reply..."
              onKeyPress={(e) => e.key === 'Enter' && sendReply()}
            />
            <button
              className="px-4 py-2 bg-accent rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50"
              onClick={sendReply}
              disabled={!replyText.trim()}
            >
              Reply
            </button>
            <button
              className="px-4 py-2 bg-gray-600 rounded-md text-sm font-medium hover:opacity-90"
              onClick={() => {
                setReplyTo(null);
                setReplyText('');
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
