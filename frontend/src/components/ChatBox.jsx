import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Trash2, Reply, Send, X, User } from 'lucide-react';
import { cn } from '../lib/utils';

function formatTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
}

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }
}

function getMessageDate(dateString) {
  if (!dateString) return '';
  return new Date(dateString).toDateString();
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
  const [messageText, setMessageText] = useState('');
  const endRef = useRef();

  const { roots, byId } = useMemo(() => {
    const byId = new Map();
    for (const m of messages || []) {
      if (m?.id) byId.set(m.id, m);
    }

    const roots = [...(messages || [])];
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

  const handleSendMessage = () => {
    if (!messageText.trim() || !onSend) return;
    onSend(messageText, replyTo);
    setMessageText('');
    setReplyTo(null);
  };

  const canDelete = (m) => {
    if (!onDelete || readOnly) return false;
    if (!m?.id) return false;
    return m?.user?.id && user?.id && m.user.id === user.id;
  };

  const renderMessage = (m, index) => {
    const isMe = m.user?.id === user?.id;
    const key = messageKey(m, index);
    const messageUser = (isMe && user) ? user : m.user;
    const avatarLabel = (messageUser?.username || messageUser?.email || 'U')[0].toUpperCase();
    const parent = m.reply_to_id ? byId.get(m.reply_to_id) : null;
    const parentUser = parent?.user?.id === user?.id && user ? user : parent?.user;

    return (
      <div key={key} className={cn("flex w-full mb-4 group", isMe ? "justify-end" : "justify-start")}>
        <div className={cn("flex max-w-[80%] items-end gap-2", isMe ? "flex-row-reverse" : "flex-row")}>
          <div
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-lg shrink-0",
              isMe ? "bg-indigo-600" : "bg-slate-700",
              onUserClick && "cursor-pointer hover:ring-2 hover:ring-indigo-400 transition-all"
            )}
            onClick={() => onUserClick?.(messageUser)}
          >
            {avatarLabel}
          </div>

          <div className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
            <div className="flex items-center gap-2 mb-1 px-1">
              <span className="text-[11px] font-medium text-slate-400">
                {messageUser?.username || messageUser?.email || 'Anonymous'}
              </span>
              <span className="text-[10px] text-slate-500">{formatTime(m.created_at)}</span>
            </div>

            {parent && (
              <div className={cn(
                "mb-1 px-3 py-1 rounded-lg bg-slate-800/50 border border-slate-700 text-[11px] text-slate-400 flex items-center gap-2 max-w-full",
                isMe ? "rounded-br-none" : "rounded-bl-none"
              )}>
                <Reply size={10} className="text-slate-500" />
                <span className="truncate">
                  <span className="text-slate-300 mr-1">{parentUser?.username || 'User'}:</span>
                  {parent.body}
                </span>
              </div>
            )}

            <div className={cn(
              "px-4 py-2.5 rounded-2xl text-sm relative group/bubble",
              isMe 
                ? "bg-indigo-600 text-white rounded-tr-none shadow-indigo-900/20" 
                : "bg-slate-800 text-slate-100 rounded-tl-none border border-slate-700 shadow-slate-950/20",
              "shadow-lg"
            )}>
              <div className="break-words leading-relaxed">{m.body}</div>
              
              {!readOnly && (
                <div className={cn(
                  "absolute top-0 opacity-0 group-hover/bubble:opacity-100 transition-opacity flex items-center gap-1 bg-slate-900/90 backdrop-blur-sm border border-slate-700 rounded-lg p-1 shadow-xl z-10",
                  isMe ? "-left-16" : "-right-16"
                )}>
                  <button
                    onClick={() => setReplyTo(m)}
                    className="p-1.5 hover:bg-slate-700 rounded-md text-slate-400 hover:text-white transition-colors"
                    title="Reply"
                  >
                    <Reply size={14} />
                  </button>
                  {canDelete(m) && (
                    <button
                      onClick={() => onDelete?.(m)}
                      className="p-1.5 hover:bg-red-900/30 rounded-md text-slate-400 hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderMessagesWithDates = () => {
    const elements = [];
    let lastDate = null;

    for (let i = 0; i < roots.length; i++) {
      const m = roots[i];
      const currentDate = getMessageDate(m.created_at);

      if (currentDate !== lastDate) {
        elements.push(
          <div key={`date-${currentDate}`} className="flex items-center gap-4 my-8">
            <div className="h-px flex-1 bg-slate-800"></div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-4 py-1 border border-slate-800 rounded-full bg-slate-900/50">
              {formatDate(m.created_at)}
            </div>
            <div className="h-px flex-1 bg-slate-800"></div>
          </div>
        );
        lastDate = currentDate;
      }
      elements.push(renderMessage(m, i));
    }

    return elements;
  };

  return (
    <div className="flex flex-col h-full bg-slate-950/50">
      <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
        {roots.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-slate-900 flex items-center justify-center border border-slate-800 shadow-inner">
              <User size={32} className="opacity-20" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">No messages yet</p>
              <p className="text-xs opacity-60">Be the first to start the discussion!</p>
            </div>
          </div>
        ) : (
          renderMessagesWithDates()
        )}
        <div ref={endRef} />
      </div>

      {!readOnly && (
        <div className="p-4 bg-slate-900/40 border-t border-slate-800/50 backdrop-blur-md">
          {replyTo && (
            <div className="mb-2 px-3 py-2 bg-indigo-950/30 border border-indigo-900/30 rounded-lg flex items-center justify-between animate-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-center gap-2 text-xs text-indigo-300 truncate">
                <Reply size={12} />
                <span className="font-medium text-indigo-200">
                  {replyTo.user?.username || 'User'}
                </span>
                <span className="opacity-60 truncate">"{replyTo.body}"</span>
              </div>
              <button 
                onClick={() => setReplyTo(null)}
                className="text-indigo-400 hover:text-indigo-200 p-1"
              >
                <X size={14} />
              </button>
            </div>
          )}
          
          <div className="relative flex items-center gap-3">
            <div className="relative flex-1 group">
              <input
                className="w-full bg-slate-900/80 rounded-xl px-4 py-3 text-sm text-white border border-slate-700/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all placeholder:text-slate-600 shadow-inner"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder={`Message #${channel}...`}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              />
            </div>
            <button
              className="flex items-center justify-center w-11 h-11 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-900/20 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale"
              onClick={handleSendMessage}
              disabled={!messageText.trim()}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
