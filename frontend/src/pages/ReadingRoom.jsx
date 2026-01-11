import React, { useEffect, useState, useRef } from "react";
import SessionPanel from "../components/SessionPanel";
import PresenceList from "../components/PresenceList";
import ChatBox from "../components/ChatBox";
import ChatLogo from "../components/ChatLogo";
import ShuffleLogo from "../components/ShuffleLogo";
import FullScreenLogo from "../components/FullScreenLogo";
import PomodoroTimer from "../components/PomodoroTimer";
import {
  fetchLogs,
  createLog,
  updateLog,
  deleteLog,
  getProfile,
} from "../services/api";
import { useWebSocket } from "../hooks/useWebSocket";
import { useSessionDraft } from "../state/session";

/* 🔥 Load all images from src/assets/images (Vite-safe) */
const backgroundModules = import.meta.glob(
  "../assets/images/*.{jpg,jpeg,png}",
  { eager: true }
);
const backgrounds = Object.values(backgroundModules).map(m => m.default);

export default function ReadingRoom({ user }) {
  const safeUser = user || null;
  const containerRef = useRef(null);

  const [logs, setLogs] = useState([]);
  const [messages, setMessages] = useState([]);
  const [presence, setPresence] = useState([]);
  const [mood, setMood] = useState("idle");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [currentBg, setCurrentBg] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const draft = useSessionDraft();

  /* WebSocket */
  const { sendMessage } = useWebSocket(safeUser?.token, "reading_room", (msg) => {
    if (msg.channel !== "reading_room") return;

    if (msg.type === "chat") {
      msg.created_at = new Date().toISOString();
      setMessages((m) => [...m, msg]);
    }
    if (msg.type === "presence") setPresence(msg.payload || []);
    if (msg.type === "mood") setMood(msg.payload);
  });

  /* Send presence */
  useEffect(() => {
    if (draft.book && draft.targetPages) {
      sendMessage("presence_update", {
        book: draft.book,
        target_pages: Number(draft.targetPages),
      });
    }
  }, [draft.book, draft.targetPages, sendMessage]);

  /* Load logs */
  useEffect(() => {
    if (!safeUser?.id) return;

    fetchLogs(safeUser.id)
      .then((data) => setLogs(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message));
  }, [safeUser]);

  /* Fullscreen */
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handler = () => setIsFullScreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  if (!safeUser) {
    return <div className="p-6 text-center">Please login first</div>;
  }

  return (
    <div
      ref={containerRef}
      className="h-[95vh] bg-cover bg-center rounded-xl p-2"
      style={{
        backgroundImage: `url(${backgrounds[currentBg]})`,
      }}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl font-semibold">Reading Room</h2>
        <div className="flex gap-2">
          <FullScreenLogo onClick={toggleFullScreen} />
          <ShuffleLogo
            onClick={() => setCurrentBg((i) => (i + 1) % backgrounds.length)}
          />
          <ChatLogo onClick={() => setIsSidebarOpen((s) => !s)} />
        </div>
      </div>

      {!isSidebarOpen && <PomodoroTimer />}

      {error && (
        <div className="bg-red-900/50 p-2 rounded text-red-300">{error}</div>
      )}

      {isSidebarOpen && (
        <div className="flex h-full gap-4">
          <div className="w-1/3 bg-black/40 rounded p-2 overflow-y-auto">
            <PresenceList presence={presence} />
          </div>

          <div className="flex-1 bg-black/40 rounded p-2">
            <ChatBox
              channel="reading_room"
              user={safeUser}
              messages={messages}
              onSend={(text) => sendMessage("chat", { text })}
              onUserClick={async (u) => {
                try {
                  const profile = await getProfile(u.id);
                  alert(profile.username);
                } catch {}
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
