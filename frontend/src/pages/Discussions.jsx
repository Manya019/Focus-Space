import React, { useEffect, useState } from 'react';
import ChatBox from '../components/ChatBox';
import { getMessages, createMessage, deleteMessage, fetchLogs, getProfile } from '../services/api';
import { connectWs, joinChannel, sendMessage, sendDelete } from '../services/ws';
import { History, MessageSquare, BookOpen, X, Info } from 'lucide-react';
import { cn } from '../lib/utils';

function normalizeApiMessage(m) {
  return {
    id: m.id,
    body: m.body,
    created_at: m.created_at,
    reply_to_id: m.reply_to_id ?? null,
    user: {
      id: m.user_id,
      username: m.username,
      email: m.email,
    },
  };
}

function normalizeWsMessage(msg) {
  return {
    id: msg.id,
    body: msg.body,
    created_at: msg.created_at || new Date().toISOString(),
    reply_to_id: msg.reply_to_id ?? null,
    user: msg.user,
  };
}

export default function Discussions({ user }) {
  const [messages, setMessages] = useState([]);
  const [historyMessages, setHistoryMessages] = useState([]);
  const [readingLogs, setReadingLogs] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState('');

  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);

  const safeUser = user || null;

  useEffect(() => {
    if (!safeUser?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    getMessages('general', 50)
      .then((data) => {
        const list = Array.isArray(data) ? data.map(normalizeApiMessage) : [];
        setMessages(list);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load messages:', err);
        setError(err.message || 'Failed to load messages');
        setLoading(false);
      });
  }, [safeUser?.id]);

  const loadMessageHistory = async () => {
    if (loadingHistory || !safeUser?.id) return;
    setLoadingHistory(true);
    try {
      const [chatData, logsData] = await Promise.all([
        getMessages('general', 100),
        fetchLogs(safeUser.id)
      ]);
      const normalized = Array.isArray(chatData) ? chatData.map(normalizeApiMessage) : [];
      setHistoryMessages(normalized);
      setReadingLogs(Array.isArray(logsData) ? logsData : []);
      setShowHistory(true);
    } catch (err) {
      console.error('Failed to load history:', err);
      setError('Failed to load history');
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (!safeUser?.id) return;

    const { socket, unsubscribe } = connectWs(safeUser.token || safeUser.id, (msg) => {
      if (msg.channel !== 'general') return;

      if (msg.type === 'chat') {
        const incoming = normalizeWsMessage(msg);
        setMessages((prev) => {
          // 1. Exact ID check
          if (incoming.id && prev.some((m) => m.id === incoming.id)) return prev;
          
          // 2. Optimistic match check (body + user)
          // If we find an optimistic message with the same content and user, 
          // we'll replace it with the real one from the server.
          const optMatch = prev.find(m => m.id < 0 && m.body === incoming.body && m.user?.id === incoming.user?.id);
          if (optMatch) {
            return prev.map(m => m.id === optMatch.id ? incoming : m);
          }
          
          return [...prev, incoming];
        });
        return;
      }

      if (msg.type === 'delete' && msg.id) {
        setMessages((prev) => prev.filter((m) => m.id !== msg.id));
      }
    });

    if (socket && socket.readyState === WebSocket.OPEN) {
      joinChannel('general');
    } else {
      socket?.addEventListener('open', () => {
        joinChannel('general');
      });
    }

    return () => unsubscribe?.();
  }, [safeUser?.id]);

  const handleSend = async (body, replyTo) => {
    const reply_to_id = replyTo?.id ?? null;
    const tempId = -Date.now();
    const createdAt = new Date().toISOString();

    const tempMessage = {
      id: tempId,
      body,
      created_at: createdAt,
      reply_to_id,
      user: {
        id: safeUser.id,
        username: safeUser.username,
        email: safeUser.email,
      },
    };

    setMessages((prev) => [...prev, tempMessage]);

    try {
      const saved = await createMessage(
        { channel: 'general', body, reply_to_id },
        safeUser.token || safeUser.id
      );

      const savedId = saved?.id;
      const savedCreatedAt = saved?.created_at || createdAt;

      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId
            ? { ...m, id: savedId, created_at: savedCreatedAt, reply_to_id }
            : m
        )
      );

      sendMessage('general', {
        id: savedId,
        body,
        reply_to_id,
        created_at: savedCreatedAt,
      });

      setError('');
    } catch (err) {
      console.error('Failed to send message:', err);
      setError(err.message || 'Failed to send message');
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    }
  };

  const handleDelete = async (msg) => {
    if (!msg?.id || msg.id < 0) return;
    if (msg.user?.id !== safeUser.id) return;

    const id = msg.id;
    setMessages((prev) => prev.filter((m) => m.id !== id));

    try {
      await deleteMessage(id, safeUser.token || safeUser.id);
      sendDelete('general', id);
    } catch (err) {
      setError(err.message || 'Failed to delete message');
    }
  };

  if (!safeUser) {
    return (
      <div className="h-full flex items-center justify-center p-6 text-center">
        <div className="max-w-sm space-y-4">
          <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mx-auto border border-slate-800">
            <Info className="text-indigo-400" size={32} />
          </div>
          <h2 className="text-xl font-bold text-white">Join the Discussion</h2>
          <p className="text-slate-400 text-sm">Please log in to participate in the FocusSpace discussions.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-950">
      {/* Header */}
      <div className="px-6 py-4 bg-slate-900/50 border-b border-slate-800 flex items-center justify-between backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600/20 rounded-xl flex items-center justify-center border border-indigo-500/20">
            <MessageSquare className="text-indigo-400" size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white leading-none mb-1">General Discussion</h1>
            <p className="text-xs text-slate-500">Share your thoughts on what you're reading</p>
          </div>
        </div>

        <button 
          onClick={loadMessageHistory}
          disabled={loadingHistory}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-all active:scale-95 disabled:opacity-50"
        >
          <History size={14} className={cn(loadingHistory && "animate-spin")} />
          {loadingHistory ? "Loading..." : "Message History"}
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col relative overflow-hidden">
          {error && (
            <div className="absolute top-4 left-4 right-4 z-20 animate-in fade-in slide-in-from-top-2">
              <div className="bg-red-950/80 backdrop-blur-md border border-red-900/50 text-red-200 px-4 py-2 rounded-lg text-xs flex items-center justify-between shadow-2xl">
                <span>{error}</span>
                <button onClick={() => setError('')}><X size={14} /></button>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-hidden">
            <ChatBox
              channel="general"
              user={safeUser}
              messages={messages}
              onSend={handleSend}
              onDelete={handleDelete}
              onUserClick={async (user) => {
                setSelectedUser(user);
                try {
                  const profile = await getProfile(user.id);
                  setUserProfile(profile);
                } catch (err) {
                  setUserProfile(null);
                }
                setShowUserModal(true);
              }}
            />
          </div>
        </div>

        {/* Sidebar History (Conditional) */}
        {showHistory && (
          <div className="w-80 bg-slate-900/30 border-l border-slate-800 flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
              <div className="flex items-center gap-2">
                <History size={16} className="text-slate-500" />
                <span className="text-sm font-bold text-white">History</span>
              </div>
              <button onClick={() => setShowHistory(false)} className="text-slate-500 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
              {/* Reading Logs in History */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  <BookOpen size={12} />
                  <span>Your Reading Logs</span>
                </div>
                <div className="space-y-2">
                  {readingLogs.map((log, i) => (
                    <div key={i} className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3 hover:bg-slate-800/60 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-bold text-indigo-300 truncate pr-2">{log.book_name}</span>
                        <span className="text-[10px] text-slate-500 shrink-0">
                          {log.created_at ? new Date(log.created_at).toLocaleDateString() : ''}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400">
                        Read <span className="text-slate-200 font-medium">{log.pages_read}</span> pages
                        {log.target_pages > 0 && <span> of {log.target_pages} target</span>}
                      </div>
                      {log.reflection && (
                        <div className="mt-2 text-[11px] text-slate-500 italic leading-relaxed border-l-2 border-indigo-900/50 pl-2">
                          "{log.reflection}"
                        </div>
                      )}
                    </div>
                  ))}
                  {readingLogs.length === 0 && (
                    <p className="text-xs text-slate-600 text-center py-4 italic">No logs found</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* User Profile Modal */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-sm w-full mx-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 bg-indigo-600 rounded-3xl flex items-center justify-center text-white text-3xl font-bold shadow-xl shadow-indigo-900/40 mb-6 transform -rotate-3">
                {(selectedUser.username || 'U')[0].toUpperCase()}
              </div>
              <h3 className="text-2xl font-bold text-white mb-1">{selectedUser.username || 'Anonymous User'}</h3>
              <p className="text-indigo-400 text-sm font-medium mb-6">{selectedUser.email}</p>
              
              {userProfile ? (
                <div className="w-full space-y-4 pt-6 border-t border-slate-800 text-left">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">About</span>
                    <p className="text-sm text-slate-300 leading-relaxed bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
                      {userProfile.about || "This user is a person of few words."}
                    </p>
                  </div>
                  <div className="flex justify-between items-center bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Fav Genre</span>
                    <span className="text-xs font-bold text-indigo-300 bg-indigo-950/50 px-3 py-1 rounded-full border border-indigo-900/30">
                      {userProfile.genre || 'None set'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="w-full h-24 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                </div>
              )}

              <button 
                onClick={() => setShowUserModal(false)}
                className="mt-8 w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all active:scale-95 border border-slate-700"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
