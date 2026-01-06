import React, { useEffect, useMemo, useState } from 'react';
import SessionPanel from '../components/SessionPanel';
import PresenceList from '../components/PresenceList';
import ChatBox from '../components/ChatBox';
import { fetchLogs, createLog, updateLog, deleteLog } from '../services/api';
import { connectWs, joinChannel, sendMessage, updatePresence } from '../services/ws';
import { useSessionDraft } from '../state/session';

export default function ReadingRoom({ user }) {
  // Safety check - ensure user is always an object
  const safeUser = user || null;
  const [logs, setLogs] = useState([]);
  const [messages, setMessages] = useState([]);
  const [presence, setPresence] = useState([]);
  const [mood, setMood] = useState('idle');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const draft = useSessionDraft();

  // Connect WebSocket and join reading_room channel
  useEffect(() => {
    if (!safeUser?.id || !safeUser?.token) return;

    const socket = connectWs(safeUser.token, (msg) => {
      if (msg.channel === 'reading_room') {
        if (msg.type === 'chat') {
          setMessages((m) => [...m, msg]);
        }
        if (msg.type === 'presence') {
          setPresence(msg.payload || []);
        }
        if (msg.type === 'mood') {
          setMood(msg.payload);
        }
      }
    });

    // Join reading_room channel when connected
    if (socket && socket.readyState === WebSocket.OPEN) {
      joinChannel('reading_room');
    } else {
      socket?.addEventListener('open', () => {
        joinChannel('reading_room');
      });
    }
  }, [safeUser]);

  // Update presence when draft changes
  useEffect(() => {
    if (draft.book && draft.targetPages) {
      updatePresence(draft.book, Number(draft.targetPages));
    }
  }, [draft.book, draft.targetPages]);

  useEffect(() => {
    if (!safeUser?.id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError('');
    
    fetchLogs(safeUser.id)
      .then((data) => {
        if (cancelled) return;
        console.log('Fetched logs:', data);
        setLogs(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Failed to fetch logs:', err);
        setError(err.message || 'Failed to load reading sessions');
        setLogs([]);
        setLoading(false);
      });
    
    return () => {
      cancelled = true;
    };
  }, [safeUser]);

  const handleEditLog = async (log) => {
    const newNotes = prompt('Edit notes:', log.reflection || '');
    if (newNotes !== null) {
      try {
        await updateLog(log.id, {
          user_id: safeUser.id,
          book_name: log.book_name,
          pages_read: log.pages_read,
          target_pages: log.target_pages,
          reflection: newNotes,
        });
        // Refresh logs
        const data = await fetchLogs(safeUser.id);
        setLogs(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.message || 'Failed to update log');
      }
    }
  };

  const handleDeleteLog = async (logId) => {
    if (confirm('Are you sure you want to delete this session?')) {
      try {
        await deleteLog(logId);
        // Refresh logs
        const data = await fetchLogs(safeUser.id);
        setLogs(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.message || 'Failed to delete log');
      }
    }
  };

  const submitSession = async () => {
    if (!safeUser?.id) {
      setError('Not logged in');
      return;
    }
    if (!draft.book || !draft.pages) {
      setError('Please fill in book name and pages read');
      return;
    }
    try {
      setError('');
      const payload = {
        user_id: safeUser.id,
        book_name: draft.book,
        pages_read: Number(draft.pages || 0),
        target_pages: Number(draft.targetPages || 0),
        reflection: draft.notes,
      };
      await createLog(payload);
      setLogs((l) => [payload, ...l]);
      draft.clear();
    } catch (err) {
      console.error('Failed to create log:', err);
      setError(err.message || 'Failed to save session');
    }
  };

  if (!safeUser) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-muted">Please login first.</p>
      </div>
    );
  }

  const getMoodStyles = () => {
    switch (mood) {
      case 'active':
        return 'bg-gradient-to-br from-blue-950/30 via-slate-900/30 to-teal-950/30';
      case 'calm':
        return 'bg-gradient-to-br from-indigo-950/30 via-slate-900/30 to-purple-950/30';
      default: // idle
        return 'bg-gradient-to-br from-slate-900/30 via-gray-900/30 to-zinc-900/30';
    }
  };

  return (
    <div className={`space-y-4 transition-colors duration-1000 p-4 rounded-xl ${getMoodStyles()}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Reading Room</h2>
        <div className="text-xs px-2 py-1 rounded-full bg-black/20 border border-white/10 capitalize text-muted">
          Mood: {mood}
        </div>
      </div>

      {error && (
        <div className="text-red-400 p-3 bg-[#2a1111] rounded-md">{error}</div>
      )}

      <div className="md:flex md:gap-4">
        <div className="md:w-1/3 space-y-4">
          <SessionPanel draft={draft} onSubmit={submitSession} />
          <div className="panel">
            <h4 className="text-sm font-semibold mb-2">Past sessions</h4>
            {loading ? (
              <p className="text-sm text-muted">Loading...</p>
            ) : logs.length === 0 ? (
              <p className="text-sm text-muted">No reading sessions yet. Start one above!</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {logs.map((l, i) => (
                  <li key={i} className="border border-gray-700 rounded-md p-3 bg-[#07101a]">
                    <div className="font-medium">{l.book_name || 'Untitled'}</div>
                    <div className="text-muted">Pages: {l.pages_read || 0}/{l.target_pages || 0}</div>
                    {l.reflection && (
                      <div className="mt-2">
                        <strong>Notes:</strong> {l.reflection}
                      </div>
                    )}
                    <div className="text-xs text-muted mt-1">
                      {l.created_at ? new Date(l.created_at).toLocaleString() : 'Unknown time'}
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => handleEditLog(l)}
                        className="px-2 py-1 bg-blue-600 rounded text-xs hover:bg-blue-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteLog(l.id)}
                        className="px-2 py-1 bg-red-600 rounded text-xs hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="md:flex-1 space-y-4">
          <PresenceList presence={presence} />
          <ChatBox
            channel="reading_room"
            user={safeUser}
            messages={messages}
            onSend={(body) => sendMessage('reading_room', body)}
          />
        </div>
      </div>
    </div>
  );
}
