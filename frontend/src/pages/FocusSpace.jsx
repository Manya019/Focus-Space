import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Maximize2, Minimize2, Video, Shuffle, MessageSquare, 
  Eye, EyeOff, Trophy, Sparkles, Music, Volume2, Users, Palette 
} from "lucide-react";
import SessionPanel from "../components/SessionPanel";
import PresenceList from "../components/PresenceList";
import ChatBox from "../components/ChatBox";
import PomodoroTimer from "../components/PomodoroTimer";
import { fetchLogs, createLog, getProfile } from '../services/api';
import { connectWs, joinChannel, sendMessage, sendDelete, updatePresence } from '../services/ws';
import { useSessionDraft } from '../state/session';
import VideoMeeting from '../components/VideoMeeting';
import MusicWidget from '../components/MusicWidget';
import { cn } from "../lib/utils";
import { usePomo } from "../state/pomo";
import { fetchThemeVideos } from "../services/videoApi";
import focusRoomBg from "../assets/images/focus_room.png";

// Asset pre-loading
const backgroundModules = import.meta.glob("../assets/images/*.{jpg,jpeg,png,mp4}", { eager: true });
const staticBackgrounds = Object.entries(backgroundModules).map(([path, m]) => ({
  name: path.split('/').pop().split('.')[0].replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
  url: m.default,
  type: path.endsWith('.mp4') ? 'video' : 'image'
}));
const guaranteedFallback = "https://images.unsplash.com/photo-1518173946687-a4c8a9ba332f?auto=format&fit=crop&q=80&w=2500";

const defaultCategorizedBackgrounds = {
  "Lofi & Cozy": [
    { name: "Default Study", url: focusRoomBg, type: "image" },
    { name: "Wegow Lofi Study", url: "https://media.giphy.com/media/XbJYBCi69nyVOffLIU/giphy.gif", type: "image" },
    { name: "Window Reading with Cats", url: "https://media.istockphoto.com/id/1921411068/video/girl-reading-a-book-with-lovely-cats-by-the-window-magical-rays-flying-through-the-clouds.mp4?s=mp4-640x640-is&k=20&c=i0a5X7B_eoLt4dQ1QII34MTlXDEX4LCNE7dJZJXukm0=", type: "video" }
  ],
  "Anime & Pixel": [
    { name: "Woman with Cat & Beverage", url: "https://media.giphy.com/media/tLD05H89Sokz90GAhy/giphy.gif", type: "image" },
    { name: "Lofi Bunny Study", url: "https://media.giphy.com/media/aer096d3vD4rYVsgNn/giphy.gif", type: "image" }
  ],
  "Space & Sci-Fi": []
};

export default function FocusSpace({ user }) {
  const safeUser = user || null;
  const containerRef = useRef(null);
  const boxRef = useRef(null);
  const audioRef = useRef(null);

  // Initialize session panel position with a function to avoid (0,0) issue
  const [sessionPanelPosition, setSessionPanelPosition] = useState(() => {
    const panelWidth = 320;
    const panelHeight = 88;
    const availableWidth = Math.max(panelWidth + 48, typeof window !== 'undefined' ? window.innerWidth : 1024);
    const maxX = Math.max(24, availableWidth - panelWidth - 32);
    return {
      x: Math.min(Math.max(24, (availableWidth - panelWidth) / 2), maxX),
      y: 205,
    };
  });



  // States
  const [logs, setLogs] = useState([]);
  const [messages, setMessages] = useState([]);
  const [presence, setPresence] = useState([]);
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [isZenMode, setIsZenMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleZenMode = () => {
    const nextZen = !isZenMode;
    setIsZenMode(nextZen);
    if (nextZen) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(err => {
          console.warn("Fullscreen request blocked:", err);
        });
      }
    } else {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(err => {
          console.warn("Fullscreen exit failed:", err);
        });
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsZenMode(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);
  const [currentBg, setCurrentBg] = useState(0);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [showMusicWidget, setShowMusicWidget] = useState(false);
  const [showPalettePanel, setShowPalettePanel] = useState(false);
  const [selectedBgCategory, setSelectedBgCategory] = useState("Lofi & Cozy");
  const [incomingSignal, setIncomingSignal] = useState(null);
  const [currentSoundscape, setCurrentSoundscape] = useState({ id: 'forest', name: 'Forest Birds Ambient', url: 'https://www.soundjay.com/nature/forest-birds-01.mp3' });
  const [volume, setVolume] = useState(0.5);
  const [roomTotalPages, setRoomTotalPages] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [currentTheme, setCurrentTheme] = useState('Nature');
  const [themeVideos, setThemeVideos] = useState([]);



  const draft = useSessionDraft();
  const { workDuration, timeLeft, mode } = usePomo();
  const isRightPanelOpen = (isSidebarOpen || showPalettePanel) && !isZenMode;

  useEffect(() => {
    if (isRightPanelOpen) {
      setIsMinimized(true);
    }
  }, [isRightPanelOpen]);

  useEffect(() => {
    const placeSessionPanel = () => {
      const panelWidth = isMinimized ? 192 : 320;
      const panelHeight = isMinimized ? 88 : 520;
      const reservedRight = isRightPanelOpen && window.innerWidth >= 1024 ? 480 : 0;
      const availableWidth = Math.max(panelWidth + 48, window.innerWidth - reservedRight);
      
      // Position below Pomodoro timer when minimized, otherwise centered
      const pomodoroBottomY = isMinimized ? 205 : 260;
      const maxX = Math.max(24, availableWidth - panelWidth - 32);
      const maxY = Math.max(120, window.innerHeight - panelHeight - 32);
      const y = Math.min(pomodoroBottomY, maxY);

      setSessionPanelPosition({
        x: Math.min(Math.max(24, (availableWidth - panelWidth) / 2), maxX),
        y,
      });
    };

    placeSessionPanel();
    window.addEventListener('resize', placeSessionPanel);
    return () => window.removeEventListener('resize', placeSessionPanel);
  }, [isMinimized, isRightPanelOpen]);

  const soundscapes = [
    { id: 'forest', name: 'Forest', url: 'https://www.soundjay.com/nature/forest-birds-01.mp3' },
    { id: 'rain', name: 'Rain', url: 'https://www.soundjay.com/nature/rain-01.mp3' },
    { id: 'library', name: 'Library', url: 'https://www.soundjay.com/misc/sounds/typing-at-the-office-01.mp3' },
  ];

  useEffect(() => {
    fetchThemeVideos(currentTheme).then(videos => {
      setThemeVideos(videos);
      setCurrentBg(0);
    });
  }, [currentTheme]);



  useEffect(() => {
    if (safeUser?.id) {
      getProfile(safeUser.id)
        .then(p => { setXp(p.xp || 0); setLevel(p.level || 1); })
        .catch(() => {});
      fetchLogs(safeUser.id)
        .then(data => setLogs(Array.isArray(data) ? data.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)) : []))
        .catch(err => {
          console.error('Failed to load reading logs:', err);
          setLogs([]);
        });
    }
  }, [safeUser]);

  useEffect(() => {
    if (!safeUser?.token) return;
    const { unsubscribe } = connectWs(safeUser.token, (msg) => {
      if (msg.channel !== 'reading_room') return;
      if (msg.type === 'chat') setMessages(prev => (msg.id && prev.some(m => m.id === msg.id) ? prev : [...prev, { ...msg, created_at: msg.created_at || new Date().toISOString() }]));
      if (msg.type === 'presence') setPresence(msg.payload || []);
      if (msg.type === 'signal') setIncomingSignal(msg);
      if (msg.type === 'soundscape') {
        const ss = soundscapes.find(s => s.id === msg.payload);
        if (ss) setCurrentSoundscape(ss);
      }
      if (msg.type === 'room_stats') setRoomTotalPages(msg.payload?.total_pages || 0);
    });
    joinChannel('reading_room');
    return () => unsubscribe?.();
  }, [safeUser]);

  const submitSession = async () => {
    if (!safeUser?.id || !draft.book || !draft.targetPages) return;
    const duration = mode === 'work' ? (workDuration - Math.floor(timeLeft / 60)) : 0;
    const payload = {
      user_id: safeUser.id,
      book_name: draft.book,
      pages_read: Number(draft.pages) || 0,
      target_pages: Number(draft.targetPages),
      reflection: draft.notes || '',
      duration_minutes: duration > 0 ? duration : 10,
    };
    const saved = await createLog(payload);
    setLogs(l => [{ ...payload, id: saved.id, created_at: new Date().toISOString() }, ...l]);
    draft.clear();
    if (saved.xp_earned) { setXp(prev => prev + saved.xp_earned); setLevel(1 + Math.floor((xp + saved.xp_earned) / 1000)); }
    sendMessage("reading_room", { type: 'log_added', payload: payload.pages_read });
  };

  const handleSoundscapeChange = (id) => {
    const ss = soundscapes.find(s => s.id === id);
    setCurrentSoundscape(ss);
    if (audioRef.current) {
      audioRef.current.src = ss.url;
      audioRef.current.play().catch(e => console.log("Audio play blocked", e));
    }
    sendMessage("reading_room", { type: 'soundscape', payload: id });
  };

  useEffect(() => { if (audioRef.current) audioRef.current.volume = volume; }, [volume]);
  useEffect(() => { setVideoError(false); }, [currentBg, selectedBgCategory]);

  // Combined backgrounds including custom assets, theme videos, and default video lists
  const allCategorizedBgs = React.useMemo(() => {
    // Clean dynamic names (remove timestamp numbers) and distribute to categories
    const cleanStaticBgs = staticBackgrounds.map(bg => {
      let cleanName = bg.name.replace(/\s\d+$/, ''); // Remove trailing timestamp numbers
      return { ...bg, name: cleanName };
    });

    const lofiCozyBgs = [...defaultCategorizedBackgrounds["Lofi & Cozy"]];
    const animePixelBgs = [...defaultCategorizedBackgrounds["Anime & Pixel"]];
    const spaceBgs = [...defaultCategorizedBackgrounds["Space & Sci-Fi"]];
    const galleryBgs = [];

    cleanStaticBgs.forEach(bg => {
      if (bg.name === 'Focus Room') return;

      const normName = bg.name.toLowerCase();
      if (normName.includes("moonbase library with earth view")) return;

      if (normName.includes("cat writing in attic greenhouse") ||
          normName.includes("home library with sleeping cat") ||
          normName.includes("cup of tea reading book")) {
        lofiCozyBgs.push(bg);
      } else if (normName.includes("cute duck reading book")) {
        animePixelBgs.push(bg);
      } else if (normName.includes("earth starry night")) {
        spaceBgs.push(bg);
      } else if (
                 normName.includes("friends studying") ||
                 normName.includes("guy studying") ||
                 normName.includes("cozy night study") ||
                 normName.includes("lofi boy study") ||
                 normName.includes("library nook reading") ||
                 normName.includes("greenhouse library")) {
        lofiCozyBgs.push(bg);
      } else {
        galleryBgs.push(bg);
      }
    });

    return {
      "Lofi & Cozy": lofiCozyBgs,
      "Anime & Pixel": animePixelBgs,
      "Space & Sci-Fi": spaceBgs,
      "Gallery": galleryBgs
    };
  }, []);

  const backgroundsToUse = React.useMemo(() => {
    let rawList = [];
    if (selectedBgCategory === "All") {
      rawList = Object.values(allCategorizedBgs).flat();
    } else {
      rawList = allCategorizedBgs[selectedBgCategory] || [];
    }

    // Sort: GIFs first, then Videos, then Static Images at the bottom
    return [...rawList].sort((a, b) => {
      const isAGif = a.url?.includes('.gif');
      const isBGif = b.url?.includes('.gif');
      if (isAGif && !isBGif) return -1;
      if (!isAGif && isBGif) return 1;

      const isAVideo = a.type === 'video';
      const isBVideo = b.type === 'video';
      if (isAVideo && !isBVideo) return -1;
      if (!isAVideo && isBVideo) return 1;

      return 0; // Keep original order
    });
  }, [selectedBgCategory, allCategorizedBgs]);

  const activeBg = backgroundsToUse[currentBg] || backgroundsToUse[0] || { name: 'Study Room', url: focusRoomBg, type: 'image' };
  const currentBgSource = activeBg.url;
  const isVideoSource = activeBg.type === 'video' && !videoError;

  const handleShuffleBg = () => {
    // Flatten all categories to get the complete list of backgrounds
    const allBgs = Object.values(allCategorizedBgs).flat();
    if (allBgs.length <= 1) return;
    
    // Find the currently active background object to avoid picking it again
    const activeBg = backgroundsToUse[currentBg] || backgroundsToUse[0];
    
    // Filter all video backgrounds across all categories, excluding the currently active one
    const videoBgs = allBgs.filter(bg => bg.type === 'video' && bg.url !== activeBg?.url);
    
    let chosenBg;
    if (videoBgs.length > 0) {
      // Pick a random video from ALL categories
      chosenBg = videoBgs[Math.floor(Math.random() * videoBgs.length)];
    } else {
      // Fallback to shuffling anything from ALL categories, excluding the active one
      const otherBgs = allBgs.filter(bg => bg.url !== activeBg?.url);
      chosenBg = otherBgs[Math.floor(Math.random() * otherBgs.length)] || allBgs[0];
    }
    
    // Switch to "All" category so index coordinates match the full backgrounds list
    setSelectedBgCategory("All");
    setVideoError(false);
    
    // Compute sorted "All" list matching how backgroundsToUse is memoized for "All"
    const sortedAllBgs = [...allBgs].sort((a, b) => {
      const isAGif = a.url?.includes('.gif');
      const isBGif = b.url?.includes('.gif');
      if (isAGif && !isBGif) return -1;
      if (!isAGif && isBGif) return 1;

      const isAVideo = a.type === 'video';
      const isBVideo = b.type === 'video';
      if (isAVideo && !isBVideo) return -1;
      if (!isAVideo && isBVideo) return 1;

      return 0;
    });
    
    const nextIndex = sortedAllBgs.findIndex(bg => bg.url === chosenBg.url);
    if (nextIndex !== -1) {
      setCurrentBg(nextIndex);
    }
  };

  return (
    <div ref={containerRef} className="relative h-screen w-full overflow-hidden transition-all duration-1000 isolate">
      <audio ref={audioRef} src={currentSoundscape?.url} loop autoPlay={!!currentSoundscape} />
      
      {/* Dynamic Background */}
      <div className="absolute inset-0 -z-10 bg-[#020617]">
        <div 
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000"
          style={{ backgroundImage: `url(${guaranteedFallback})`, opacity: 0.3 }}
        />

        {isVideoSource ? (
          <video 
            key={currentBgSource} autoPlay loop muted playsInline
            onError={() => setVideoError(true)}
            className="absolute inset-0 h-full w-full object-cover brightness-[0.7] transition-opacity duration-1000"
          >
            <source src={currentBgSource} type="video/mp4" />
          </video>
        ) : (
          <img 
            key={currentBgSource}
            src={currentBgSource || guaranteedFallback}
            alt="Focus Background"
            referrerPolicy="no-referrer"
            className="absolute inset-0 h-full w-full object-cover brightness-[0.7] transition-all duration-1000" 
          />
        )}
        
        <div className="absolute inset-0 bg-[#020617]/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-transparent opacity-60" />
      </div>

      {/* Header */}
      <div className={cn("absolute top-8 left-8 right-8 z-50 flex items-center justify-between transition-all duration-700", isZenMode && "opacity-0 pointer-events-none -translate-y-4")}>
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <h2 className="text-3xl font-serif font-black text-white tracking-tight">FocusSpace</h2>
            <div className="flex items-center gap-2 mt-1">
              <Sparkles size={14} className="text-indigo-400" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Level {level} Explorer</span>
            </div>
          </div>
          <div className="h-8 w-px bg-white/10" />
          <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded-2xl backdrop-blur-md">
            <Trophy size={16} className="text-amber-500" />
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 leading-none mb-1 uppercase tracking-tighter">Current XP</span>
              <span className="text-xs font-black text-white leading-none">{xp} / {(level * 1000)}</span>
            </div>
            <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden ml-2">
              <motion.div className="h-full bg-indigo-500" initial={{ width: 0 }} animate={{ width: `${(xp % 1000) / 10}%` }} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-black/20 backdrop-blur-xl border border-white/10 p-1.5 rounded-2xl">
            <ControlButton icon={isZenMode ? Minimize2 : Maximize2} onClick={toggleZenMode} tooltip="Full Screen Mode" />
            
            <ControlButton 
              icon={Palette} 
              active={showPalettePanel}
              onClick={() => { setShowPalettePanel(!showPalettePanel); setIsSidebarOpen(false); }} 
              tooltip="Themes & Backgrounds" 
            />

            <ControlButton 
              icon={Music} 
              active={showMusicWidget}
              onClick={() => setShowMusicWidget(!showMusicWidget)} 
              tooltip="Audio & Spotify Hub" 
            />

            <ControlButton icon={Video} onClick={() => setShowVideo(true)} tooltip="Video Meet" />
            
            <ControlButton icon={Shuffle} onClick={handleShuffleBg} tooltip="Shuffle Background" />

            <ControlButton icon={MessageSquare} onClick={() => { setIsSidebarOpen(!isSidebarOpen); setShowPalettePanel(false); }} active={isSidebarOpen} tooltip="Chat & Presence" />
          </div>
        </div>
      </div>

      {/* Timer Card on Top */}
      {!isZenMode && (
        <div className="absolute top-28 left-8 right-8 z-40 flex justify-center pointer-events-none transition-all duration-700">
          <div className="pointer-events-auto">
            <PomodoroTimer />
          </div>
        </div>
      )}

      {/* Main Focus Area */}
      <div
        className={cn(
          "h-full w-full flex items-center justify-center p-8 transition-[padding] duration-300",
          isRightPanelOpen && "lg:pr-[480px]"
        )}
      >
        <AnimatePresence>
          {isZenMode && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="flex flex-col items-center gap-12">
              <PomodoroTimer />
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Sidebars */}
      <AnimatePresence>
        {isSidebarOpen && !isZenMode && (
          <>
            {/* Left Presence Panel */}
            <motion.div 
              initial={{ x: -300, opacity: 0 }} 
              animate={{ x: 0, opacity: 1 }} 
              exit={{ x: -300, opacity: 0 }} 
              className="absolute left-8 top-32 bottom-20 w-64 bg-black/40 backdrop-blur-2xl border border-white/10 rounded-[24px] p-4 shadow-xl overflow-y-auto z-40 scrollbar-thin scrollbar-thumb-white/10"
            >
              <PresenceList presence={presence} />
            </motion.div>

            {/* Right Chat Sidebar */}
            <motion.div 
              initial={{ x: 400, opacity: 0 }} 
              animate={{ x: 0, opacity: 1 }} 
              exit={{ x: 400, opacity: 0 }} 
              className="absolute right-8 top-32 bottom-8 w-[400px] max-w-[calc(100vw-4rem)] flex flex-col z-40"
            >
              <div className="flex-1 min-h-0 bg-black/40 backdrop-blur-2xl border border-white/10 rounded-[32px] p-4 shadow-2xl overflow-hidden flex flex-col">
                <ChatBox channel="reading_room" user={safeUser} messages={messages} onSend={(text, replyTo) => sendMessage("reading_room", { body: text, reply_to_id: replyTo?.id ?? null })} onDelete={(m) => { if (m?.id && m.user?.id === safeUser.id) { setMessages(prev => prev.filter(x => x.id !== m.id)); sendDelete('reading_room', m.id); } }} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <motion.div 
        ref={boxRef} 
        drag 
        dragMomentum={false}
        dragElastic={0.15}
        dragTransition={{ bounceStiffness: 600, bounceDamping: 30 }}
        onDragEnd={(_, info) => {
          const panelWidth = isMinimized ? 192 : 320;
          const panelHeight = isMinimized ? 88 : 520;
          const reservedRight = isRightPanelOpen && window.innerWidth >= 1024 ? 480 : 0;
          
          // Calculate safe boundaries
          const minX = 24;
          const maxX = Math.max(minX, window.innerWidth - reservedRight - panelWidth - 32);
          const minY = 120;
          const maxY = Math.max(minY, window.innerHeight - panelHeight - 32);

          // Apply constraints to new position
          setSessionPanelPosition(prev => ({
            x: Math.max(minX, Math.min(prev.x + info.offset.x, maxX)),
            y: Math.max(minY, Math.min(prev.y + info.offset.y, maxY)),
          }));
        }}
        initial={{ x: sessionPanelPosition.x, y: sessionPanelPosition.y, opacity: 1 }}
        animate={{
          x: sessionPanelPosition.x,
          y: sessionPanelPosition.y,
          opacity: isZenMode ? 0 : 1,
          scale: isZenMode ? 0.95 : 1,
        }}
        transition={{ type: 'spring', stiffness: 350, damping: 35 }}
        className={cn(
          "fixed z-40 cursor-grab active:cursor-grabbing hover:shadow-2xl",
          isMinimized ? "w-48" : "w-80",
          isZenMode && "pointer-events-none"
        )}
        style={{ 
          pointerEvents: isZenMode ? 'none' : 'auto',
          top: 0,
          left: 0,
        }}
      >
        <SessionPanel draft={draft} onSubmit={submitSession} isMinimized={isMinimized} onMinimize={() => setIsMinimized(!isMinimized)} logs={logs} user={safeUser} onLogsUpdate={(updated) => setLogs(updated.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)))} />
      </motion.div>

      <AnimatePresence>{isZenMode && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute bottom-12 left-1/2 -translate-x-1/2 text-white/20 text-[10px] font-bold uppercase tracking-[0.5em]">Press ESC or click anywhere to exit Full Screen Mode</motion.div>}</AnimatePresence>

      {/* Themes & Background Panel */}
      <AnimatePresence>
        {showPalettePanel && !isZenMode && (
          <motion.div 
            initial={{ x: 400 }} 
            animate={{ x: 0 }} 
            exit={{ x: 400 }} 
            className="absolute right-8 top-32 bottom-8 w-[400px] max-w-[calc(100vw-4rem)] flex flex-col gap-6 z-40"
          >
            <div className="flex-1 min-h-0 bg-black/40 backdrop-blur-2xl border border-white/10 rounded-[32px] p-6 shadow-2xl overflow-hidden flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Palette size={18} className="text-indigo-400" />
                  Space Themes
                </h3>
                <button 
                  onClick={() => setShowPalettePanel(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Category Filter Pills */}
              <div className="flex flex-wrap gap-2 mb-6">
                {["All", ...Object.keys(allCategorizedBgs)].map(cat => (
                  <button
                    key={cat}
                    onClick={() => {
                      setSelectedBgCategory(cat);
                      setCurrentBg(0);
                    }}
                    className={cn(
                      "px-3 py-1.5 text-xs font-bold rounded-lg border transition-all duration-300",
                      selectedBgCategory === cat
                        ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-900/40"
                        : "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Background Cards Grid */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-4 custom-scrollbar">
                <div className="grid grid-cols-2 gap-3">
                  {backgroundsToUse.map((bg, idx) => {
                    const isActive = activeBg.name === bg.name;
                    return (
                      <button
                        key={bg.name + idx}
                        onClick={() => { setCurrentBg(idx); setVideoError(false); }}
                        className={cn(
                          "group relative aspect-video rounded-xl overflow-hidden border transition-all duration-300 text-left",
                          isActive 
                            ? "border-indigo-500 ring-2 ring-indigo-500/50 shadow-lg shadow-indigo-500/20" 
                            : "border-white/10 hover:border-white/30"
                        )}
                      >
                        {bg.type === 'video' ? (
                          <video 
                            src={bg.url} 
                            muted 
                            className="absolute inset-0 h-full w-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-500" 
                          />
                        ) : (
                          <img 
                            src={bg.url} 
                            alt={bg.name}
                            referrerPolicy="no-referrer"
                            className="absolute inset-0 h-full w-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-500" 
                          />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                        <div className="absolute bottom-2 left-2 right-2">
                          <p className="text-[11px] font-bold text-white truncate">{bg.name}</p>
                          <p className="text-[9px] text-slate-400 font-medium uppercase tracking-widest mt-0.5">
                            {bg.type}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {showVideo && <VideoMeeting user={safeUser} incomingSignal={incomingSignal} onClose={() => setShowVideo(false)} />}
      
      {showMusicWidget && !isZenMode && (
        <MusicWidget 
          audioRef={audioRef} 
          currentSoundscape={currentSoundscape} 
          setCurrentSoundscape={setCurrentSoundscape} 
          onClose={() => setShowMusicWidget(false)} 
        />
      )}
    </div>
  );
}

function ControlButton({ icon: Icon, onClick, active, tooltip, disabled }) {
  return (
    <button 
      onClick={disabled ? undefined : onClick} 
      title={disabled ? "Disabled" : tooltip} 
      disabled={disabled}
      className={cn(
        "p-3 rounded-xl transition-all duration-300", 
        active ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/40" : "text-slate-400 hover:text-white hover:bg-white/5",
        disabled && "opacity-40 cursor-not-allowed hover:bg-transparent hover:text-slate-400"
      )}
    >
      <Icon size={20} />
    </button>
  );
}
