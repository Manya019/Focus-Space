import React, { useEffect, useState, useRef } from "react";
import SessionPanel from "../components/SessionPanel";
import PresenceList from "../components/PresenceList";
import ChatBox from "../components/ChatBox";
import ChatLogo from "../components/ChatLogo";
import ShuffleLogo from "../components/ShuffleLogo";
import FullScreenLogo from "../components/FullScreenLogo";
import VideoLogo from "../components/VideoLogo";
import PomodoroTimer from "../components/PomodoroTimer";
import { fetchLogs, createLog, getProfile } from '../services/api';
import { connectWs, joinChannel, sendMessage, sendDelete, updatePresence } from '../services/ws';
import { useSessionDraft } from '../state/session';
import VideoMeeting from '../components/VideoMeeting';

const backgroundModules = import.meta.glob(
  "../assets/images/*.{jpg,jpeg,png}",
  { eager: true }
);

const backgrounds = Object.values(backgroundModules).map(m => m.default);

export default function ReadingRoom({ user }) {
  // Safety check - ensure user is always an object
  const safeUser = user || null;
  const containerRef = useRef(null);
  const [logs, setLogs] = useState([]);
  const [messages, setMessages] = useState([]);
  const [presence, setPresence] = useState([]);
  const [mood, setMood] = useState("idle");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [bottomMessageText, setBottomMessageText] = useState('');
  const [incomingSignal, setIncomingSignal] = useState(null);
  const [showVideo, setShowVideo] = useState(false);

  const draft = useSessionDraft();

  // Drag + minimize box
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

  // Load messages from localStorage on mount if user is logged in
  useEffect(() => {
    if (safeUser?.id) {
      const stored = localStorage.getItem(`reading_room_messages_${safeUser.id}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setMessages(parsed);
        } catch (e) {
          console.error('Failed to parse stored messages', e);
        }
      }
    } else {
      // Clear messages when user logs out
      setMessages([]);
    }
  }, [safeUser]);

  // Save messages to localStorage whenever messages change
  useEffect(() => {
    if (safeUser?.id && messages.length > 0) {
      localStorage.setItem(`reading_room_messages_${safeUser.id}`, JSON.stringify(messages));
    }
  }, [messages, safeUser]);

  // WebSocket
  useEffect(() => {
    if (!safeUser?.token) return;

    const { unsubscribe } = connectWs(safeUser.token, (msg) => {
      if (msg.channel !== 'reading_room') return;

      if (msg.type === 'chat') {
        const created_at = msg.created_at || new Date().toISOString();
        setMessages((prev) => {
          if (msg.id && prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, { ...msg, created_at }];
        });
        return;
      }

      if (msg.type === 'delete' && msg.id) {
        setMessages((prev) => prev.filter((m) => m.id !== msg.id));
        return;
      }

      if (msg.type === 'presence') setPresence(msg.payload || []);
      if (msg.type === 'mood') setMood(msg.payload);
      if (msg.type === 'signal') setIncomingSignal(msg);
    });

    joinChannel('reading_room');

    return () => {
      unsubscribe?.();
    };
  }, [safeUser]);

  // Presence
  useEffect(() => {
    if (draft.book && draft.targetPages) {
      updatePresence(draft.book, Number(draft.targetPages));
    }
  }, [draft.book, draft.targetPages]);

  // Logs
  useEffect(() => {
    if (!safeUser?.id) return;

    fetchLogs(safeUser.id)
      .then((data) => {
        const sortedData = Array.isArray(data) ? data.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)) : [];
        setLogs(sortedData);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [safeUser]);

  // Save session
  const submitSession = async () => {
    try {
      console.log('Submitting session:', { safeUser, draft });
      if (!safeUser?.id) {
        throw new Error('User not authenticated');
      }
      if (!draft.book || !draft.targetPages) {
        throw new Error('Book name and target pages are required');
      }
      const payload = {
        user_id: safeUser.id,
        book_name: draft.book,
        pages_read: Number(draft.pages) || 0,
        target_pages: Number(draft.targetPages),
        reflection: draft.notes || '',
      };
      console.log('Payload:', payload);
      const saved = await createLog(payload);
      console.log('Saved log:', saved);
      setLogs((l) => [{ ...payload, id: saved.id }, ...l]);
      draft.clear();
    } catch (err) {
      console.error('Submit session error:', err);
      setError(err.message || 'Failed to submit log');
    }
  };

  // Handle log updates from SessionPanel
  const handleLogUpdate = (updatedLogs) => {
    // Sort logs by created_at descending to ensure logs[0] is the latest
    const sortedLogs = updatedLogs.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    setLogs(sortedLogs);
  };

  const sendBottomMessage = () => {
    if (!bottomMessageText.trim()) return;
    sendMessage("reading_room", {
      body: bottomMessageText,
    });
    setBottomMessageText('');
  };

  // Drag handlers
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
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

  // Center the box on mount and when minimized state changes
  useEffect(() => {
    const centerBox = () => {
      const boxWidth = 320; // w-80
      const boxHeight = isMinimized ? 48 : 384; // h-12 or max-h-96 approx
      setPosition({
        x: Math.max(0, (window.innerWidth - boxWidth) / 2),
        y: Math.max(0, (window.innerHeight - boxHeight) / 2),
      });
    };
    centerBox();
  }, [isMinimized]);

  // Center the box on mount and when minimized state changes, with offset to avoid overlap
  useEffect(() => {
    const centerBox = () => {
      const boxWidth = 320; // w-80
      const boxHeight = isMinimized ? 48 : 384;
      setPosition({
        x: Math.max(0, (window.innerWidth - boxWidth) / 2),
        y: Math.max(0, (window.innerHeight - boxHeight) / 2 + 120),
      });
    };
    centerBox();
  }, [isMinimized]);

  if (!safeUser) {
    return <div className="p-6 text-center">Please login first</div>;
  }

  return (
    <div
      ref={containerRef}
      className="relative h-[95vh] p-2 rounded-xl bg-cover bg-center pb-16"
      style={{ backgroundImage: `url(${backgrounds[currentBg]})` }}
    >
      <div className="flex justify-between mb-2">
        <div>
          <h2 className="text-xl font-semibold">Reading Room</h2>
        </div>
        <div className="flex gap-2">
          <FullScreenLogo onClick={toggleFullScreen} />
          <VideoLogo onClick={() => setShowVideo(true)} />
          <ShuffleLogo
            onClick={() =>
              setCurrentBg((i) => (i + 1) % backgrounds.length)
            }
          />
          <ChatLogo onClick={() => setIsSidebarOpen((s) => !s)} />
        </div>
      </div>
      {logs.length > 0 && !isSidebarOpen && (
        <div className="mt-2 p-3 bg-black/30 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-white">Currently Reading: {logs[0].book_name}</span>
            <span className="text-xs text-white/70">{logs[0].pages_read}/{logs[0].target_pages} pages</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-accent h-2 rounded-full transition-all duration-300"
              style={{
                width: `${Math.min(100, (logs[0].pages_read / logs[0].target_pages) * 100)}%`
              }}
            ></div>
          </div>
        </div>
      )}

      {!isSidebarOpen && (
        <div className="flex justify-center">
          <PomodoroTimer />
        </div>
      )}

      {isSidebarOpen && (
        <div className="flex gap-4 h-full">
          <div className="w-1/3 bg-black/40 p-3 rounded">
            <PresenceList presence={presence} />
          </div>
          <div className="flex-1 bg-black/40 p-3 rounded">
            <ChatBox
              channel="reading_room"
              user={safeUser}
              messages={messages}
              onSend={(text, replyTo) =>
                sendMessage("reading_room", {
                  body: text,
                  reply_to_id: replyTo?.id ?? null,
                })
              }
              onDelete={(m) => {
                if (!m?.id) return;
                if (m.user?.id !== safeUser.id) return;
                setMessages((prev) => prev.filter((x) => x.id !== m.id));
                sendDelete('reading_room', m.id);
              }}
              onUserClick={async (u) => {
                const profile = await getProfile(u.id);
                alert(profile.username);
              }}
            />
          </div>
        </div>
      )}

      {/* Floating session panel */}
      <div
        ref={boxRef}
        className={`absolute w-80 cursor-move ${isDragging ? 'cursor-grabbing' : ''}`}
        style={{ left: position.x, top: position.y }}
        onMouseDown={handleMouseDown}
      >
        <SessionPanel
          draft={draft}
          onSubmit={submitSession}
          isMinimized={isMinimized}
          onMinimize={() => setIsMinimized(!isMinimized)}
          logs={logs}
          user={safeUser}
          onLogsUpdate={handleLogUpdate}
        />
      </div>

      {/* Video Meeting Component */}
      {showVideo && (
        <VideoMeeting
          user={safeUser}
          incomingSignal={incomingSignal}
          onClose={() => setShowVideo(false)}
        />
      )}
    </div>
  );
}
