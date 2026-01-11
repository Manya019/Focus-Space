import React, { useEffect, useMemo, useState, useRef } from 'react';
import SessionPanel from '../components/SessionPanel';
import PresenceList from '../components/PresenceList';
import ChatBox from '../components/ChatBox';
import ChatLogo from '../components/ChatLogo';
import ShuffleLogo from '../components/ShuffleLogo';
import FullScreenLogo from '../components/FullScreenLogo';
import PomodoroTimer from '../components/PomodoroTimer';
import { fetchLogs, createLog, updateLog, deleteLog, getProfile } from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';
import { useSessionDraft } from '../state/session';

const backgrounds = Object.values(
  import.meta.glob("../assets/images/*.{jpg}", { eager: true, as: "url" })
);


export default function ReadingRoom({ user }) {
  // Safety check - ensure user is always an object
  const safeUser = user || null;
  const containerRef = useRef(null);
  const [logs, setLogs] = useState([]);
  const [messages, setMessages] = useState([]);
  const [presence, setPresence] = useState([]);
  const [mood, setMood] = useState('idle');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const draft = useSessionDraft();

  // States for movable and minimizable box
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialPosition, setInitialPosition] = useState({ x: 0, y: 0 });
  const boxRef = useRef(null);

  // State for sidebar toggle
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);


  // State for background
  const [currentBg, setCurrentBg] = useState(0);

  // State for full screen
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Full screen toggle
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullScreenChange);
  }, []);

  // State for user profile modal
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);

  // Connect WebSocket and join reading_room channel
  const { sendMessage } = useWebSocket(safeUser?.token, 'reading_room', (msg) => {
    if (msg.channel === 'reading_room') {
      if (msg.type === 'chat') {
        msg.created_at = new Date().toISOString();
        setMessages((m) => {
          const exists = m.some(existing => existing.body === msg.body && existing.user?.id === msg.user?.id);
          if (!exists) return [...m, msg];
          return m;
        });
      }
      if (msg.type === 'presence') {
        setPresence(msg.payload || []);
      }
      if (msg.type === 'mood') {
        setMood(msg.payload);
      }
    }
  });

  // Update presence when draft changes
  useEffect(() => {
    if (draft.book && draft.targetPages) {
      sendMessage('presence_update', { book: draft.book, target_pages: Number(draft.targetPages) });
    }
  }, [draft.book, draft.targetPages, sendMessage]);

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
      const saved = await createLog(payload);
      setLogs((l) => [{ ...payload, id: saved.id }, ...l]);
      draft.clear();
    } catch (err) {
      console.error('Failed to create log:', err);
      setError(err.message || 'Failed to save session');
    }
  };

  // Drag handlers
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
    });
    setInitialPosition(position);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    const boxWidth = boxRef.current ? boxRef.current.offsetWidth : 320;
    const boxHeight = boxRef.current ? boxRef.current.offsetHeight : (isMinimized ? 48 : 384);
    const newX = initialPosition.x + deltaX;
    const newY = initialPosition.y + deltaY;
    const clampedX = Math.max(0, Math.min(newX, window.innerWidth - boxWidth));
    const clampedY = Math.max(0, Math.min(newY, window.innerHeight - boxHeight));
    setPosition({
      x: clampedX,
      y: clampedY,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Center the box on mount and when minimized state changes, with offset to avoid overlap
  useEffect(() => {
    const centerBox = () => {
      const boxWidth = 320; // w-80
      const boxHeight = isMinimized ? 48 : 384; // h-12 or max-h-96 approx
      setPosition({
        x: Math.max(0, (window.innerWidth - boxWidth) / 2),
        y: Math.max(0, (window.innerHeight - boxHeight) / 2 + 120), // Offset down by 120px
      });
    };
    centerBox();
    window.addEventListener('resize', centerBox);
    return () => window.removeEventListener('resize', centerBox);
  }, [isMinimized]);

  if (!safeUser) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-muted">Please login first.</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="space-y-4 p-1 rounded-xl h-[95vh] bg-cover bg-top"
      style={{
        backgroundImage: `url(${backgrounds[currentBg]})`,
        filter: isSidebarOpen ? 'brightness(1)' : 'none'
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-semibold px-2">Reading Room</h2>
        <div className="flex items-center gap-2">
          <FullScreenLogo onClick={toggleFullScreen} />
          <ShuffleLogo onClick={() => setCurrentBg((prev) => (prev + 1) % backgrounds.length)} />
          <ChatLogo onClick={() => setIsSidebarOpen(!isSidebarOpen)} />
        </div>
      </div>

      {!isSidebarOpen && (
        <div className="flex justify-center mb-4">
          <PomodoroTimer />
        </div>
      )}

      

      {error && (
        <div className="text-red-400 p-3 bg-[#2a1111] rounded-md">{error}</div>
      )}

      {/* Movable and Minimizable Box for Session Content */}
      <div
        ref={boxRef}
        className={`absolute bg-black/80 border border-gray-600 rounded-lg shadow-lg cursor-move will-change-transform ${
          isMinimized ? 'w-64 h-12' : 'w-80 h-auto max-h-96'
        } overflow-hidden`}
        style={{ left: 0, top: 0, transform: `translate(${position.x}px, ${position.y}px)`, zIndex: 40 }}
        onMouseDown={handleMouseDown}
      >
        <div
          className="flex items-center justify-between p-2 bg-gray-800 rounded-t-lg"
        >
          <h4 className="text-sm font-semibold text-white">Reading Sessions</h4>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-white hover:text-gray-300 text-lg"
          >
            {isMinimized ? '+' : '-'}
          </button>
        </div>
        {!isMinimized && (
          <div className="p-4 space-y-4 overflow-y-auto max-h-80">
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
        )}
      </div>

      {isSidebarOpen && (
        <div className={`md:flex md:gap-4 ${isFullScreen ? 'h-screen' : 'h-[85vh]'}`}>
          <div className="md:w-1/3 overflow-y-auto backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-4 shadow-2xl">
            <PresenceList presence={presence} />
          </div>
          <div className="md:flex-1 flex flex-col backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-4 shadow-2xl">
            <ChatBox
              channel="reading_room"
              user={safeUser}
              messages={messages}
              onSend={(body) => sendMessage('chat', { text: body })}
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
