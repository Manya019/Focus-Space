import React, { useEffect, useState } from 'react';
import ChatBox from '../components/ChatBox';
import { getMessages, createMessage, deleteMessage, fetchLogs, getProfile } from '../services/api';
import { connectWs, joinChannel, sendMessage, sendDelete } from '../services/ws';

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

  // State for user profile modal
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);

  const safeUser = user || null;

  // Load recent messages (last 20) for active chat
  useEffect(() => {
    if (!safeUser?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    getMessages('general', 20)
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
  }, [safeUser]);

  // Load message history when requested
  const loadMessageHistory = async () => {
    if (loadingHistory || !safeUser?.id) return;

    setLoadingHistory(true);
    try {
      const [chatData, logsData] = await Promise.all([
        getMessages('general', 100),
        fetchLogs(safeUser.id)
      ]);

      const normalized = Array.isArray(chatData) ? chatData.map(normalizeApiMessage) : [];

      // Preserve previous behavior: first 20 are current session, rest is "history".
      setHistoryMessages(normalized.slice(20));
      setReadingLogs(Array.isArray(logsData) ? logsData : []);
      setShowHistory(true);
    } catch (err) {
      console.error('Failed to load message history:', err);
      setError('Failed to load message history');
    } finally {
      setLoadingHistory(false);
    }
  };

  // Connect WebSocket and join general channel
  useEffect(() => {
    if (!safeUser?.id || !safeUser?.token) return;

    const { socket, unsubscribe } = connectWs(safeUser.token, (msg) => {
      if (msg.channel !== 'general') return;

      if (msg.type === 'chat') {
        const incoming = normalizeWsMessage(msg);
        setMessages((prev) => {
          if (incoming.id && prev.some((m) => m.id === incoming.id)) return prev;
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

    return () => {
      unsubscribe?.();
    };
  }, [safeUser]);

  const handleSend = async (body, replyTo) => {
    if (!safeUser?.token) {
      setError('Not logged in');
      return;
    }

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
      // Persist via REST API first (gives us a stable DB id for threads/deletes)
      const saved = await createMessage(
        { channel: 'general', body, reply_to_id },
        safeUser.token
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

      // Broadcast via WebSocket for realtime updates to other clients
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
    if (!safeUser?.token) {
      setError('Not logged in');
      return;
    }

    if (!msg?.id || msg.id < 0) return;
    if (msg.user?.id !== safeUser.id) return;

    const id = msg.id;
    // Optimistic UI
    setMessages((prev) => prev.filter((m) => m.id !== id));

    try {
      await deleteMessage(id, safeUser.token);
      sendDelete('general', id);
    } catch (err) {
      setError(err.message || 'Failed to delete message');
      // Fallback: reload current messages to restore consistency
      try {
        const data = await getMessages('general', 20);
        const list = Array.isArray(data) ? data.map(normalizeApiMessage) : [];
        setMessages(list);
      } catch {
        // ignore
      }
    }
  };

  if (!safeUser) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-muted">Please login first.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">

      {error && (
        <div className="text-red-400 p-3 bg-[#2a1111] rounded-md mb-4">{error}</div>
      )}

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted">Loading messages...</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col space-y-4">
          {/* Message History Section */}
          {showHistory && (
            <div className="bg-panel rounded-md p-4 max-h-64 overflow-y-auto">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-muted">Message History</h4>
                <button
                  onClick={() => setShowHistory(false)}
                  className="text-xs text-muted hover:text-white"
                >
                  Hide History
                </button>
              </div>

              {/* Chat Message History */}
              <div className="mb-4">
                <h5 className="text-xs font-medium text-muted mb-2">Chat Messages</h5>
                <ChatBox
                  channel="general"
                  user={safeUser}
                  messages={historyMessages}
                  onSend={() => {}}
                  readOnly={true}
                />
              </div>

              {/* Reading Session Logs */}
              <div>
                <h5 className="text-xs font-medium text-muted mb-2">Reading Session Logs</h5>
                <div className="space-y-2">
                  {readingLogs.length > 0 ? (
                    readingLogs.map((log, i) => (
                      <div key={i} className="bg-[#07101a] rounded-md p-3 border border-gray-800">
                        <div className="flex items-start space-x-3">
                          <div className="w-6 h-6 bg-accent rounded-full flex items-center justify-center text-white text-xs font-bold">
                            📖
                          </div>
                          <div className="flex-1">
                            <div className="flex items-baseline space-x-2 mb-1">
                              <span className="font-semibold text-sm text-gray-200">
                                {log.book_name}
                              </span>
                              <span className="text-xs text-muted">
                                {log.created_at ? new Date(log.created_at).toLocaleDateString() : ''}
                              </span>
                            </div>
                            <div className="text-sm text-gray-100">
                              Read {log.pages_read} pages {log.target_pages > 0 ? `of ${log.target_pages} target` : ''}
                              {log.reflection && (
                                <div className="mt-2 text-xs text-muted italic">
                                  "{log.reflection}"
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-muted text-center py-4">
                      No reading session logs found
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Current Session Messages */}
          <div className="bg-panel rounded-md overflow-hidden h-[80vh]">
            <div className="p-3 border-b border-gray-700">
              <span className="text-xs text-muted">Current Session</span>
            </div>
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
      )}

      {/* User Profile Modal */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-panel rounded-md p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">User Profile</h2>
              <button onClick={() => setShowUserModal(false)} className="text-muted hover:text-white">✕</button>
            </div>
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center text-white text-xl font-bold">
                {(selectedUser.username || 'U')[0].toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-semibold">{selectedUser.username || 'User'}</h3>
              </div>
            </div>
            {userProfile && (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted">About:</span>
                  <span>{userProfile.about || 'Not set'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Favorite genre:</span>
                  <span>{userProfile.genre || 'Not set'}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
