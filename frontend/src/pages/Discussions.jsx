import React, { useEffect, useState } from 'react';
import ChatBox from '../components/ChatBox';
import { getMessages, createMessage, fetchLogs } from '../services/api';
import { connectWs, joinChannel, sendMessage } from '../services/ws';

export default function Discussions({ user }) {
  const [messages, setMessages] = useState([]);
  const [historyMessages, setHistoryMessages] = useState([]);
  const [readingLogs, setReadingLogs] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState('');

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
        console.log('Loaded recent messages:', data);
        setMessages(Array.isArray(data) ? data : []);
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
    if (loadingHistory) return;

    setLoadingHistory(true);
    try {
      const [chatData, logsData] = await Promise.all([
        getMessages('general', 100), // Load more messages for history
        fetchLogs(safeUser.id) // Load reading logs
      ]);
      
      setHistoryMessages(Array.isArray(chatData) ? chatData.slice(20) : []); // Skip the recent 20
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

    const socket = connectWs(safeUser.token, (msg) => {
      if (msg.channel === 'general' && msg.type === 'chat') {
        // Add new message to current session messages only
        setMessages((m) => [...m, msg]);
      }
    });

    if (socket && socket.readyState === WebSocket.OPEN) {
      joinChannel('general');
    } else {
      socket?.addEventListener('open', () => {
        joinChannel('general');
      });
    }
  }, [safeUser]);

  const handleSend = async (body) => {
    if (!safeUser?.token) {
      setError('Not logged in');
      return;
    }

    try {
      // Persist via REST API first
      const saved = await createMessage({ channel: 'general', body }, safeUser.token);
      // Then send via WebSocket for real-time broadcast
      sendMessage('general', body);
      setError('');
    } catch (err) {
      console.error('Failed to send message:', err);
      setError(err.message || 'Failed to send message');
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
    <div className="h-full flex flex-col">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">#general</h3>
      </div>
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
            <div className="bg-panel rounded-md p-4 space-y-4">
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
              <div className="max-h-64 overflow-y-auto">
                <div className="mb-4">
                  <h5 className="text-xs font-medium text-muted mb-2">Chat Messages</h5>
                  <ChatBox
                    channel="general"
                    user={safeUser}
                    messages={historyMessages.map((m) => ({
                      type: 'chat',
                      channel: 'general',
                      body: m.body,
                      user: {
                        id: m.user_id,
                        username: m.username,
                        email: m.email,
                      },
                      created_at: m.created_at,
                    }))}
                    onSend={() => {}} // Disable sending in history
                    readOnly={true}
                  />
                </div>
                
                {/* Reading Session Logs */}
                <div>
                  <h5 className="text-xs font-medium text-muted mb-2">Reading Session Logs</h5>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
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
            </div>
          )}

          {/* Load History Button */}
          {!showHistory && (
            <div className="text-center">
              <button
                onClick={loadMessageHistory}
                disabled={loadingHistory}
                className="text-sm text-muted hover:text-white disabled:opacity-50"
              >
                {loadingHistory ? 'Loading History...' : 'Load Message History'}
              </button>
            </div>
          )}

          {/* Current Session Messages */}
          <div className="bg-panel rounded-md overflow-hidden flex-1">
            <div className="p-3 border-b border-gray-700">
              <span className="text-xs text-muted">Current Session</span>
            </div>
            <ChatBox
              channel="general"
              user={safeUser}
              messages={messages.map((m) => ({
                type: 'chat',
                channel: 'general',
                body: m.body,
                user: {
                  id: m.user_id,
                  username: m.username,
                  email: m.email,
                },
                created_at: m.created_at,
              }))}
              onSend={handleSend}
            />
          </div>
        </div>
      )}
    </div>
  );
}
