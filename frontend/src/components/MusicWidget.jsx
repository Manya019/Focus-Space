import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Volume2, X, Music, Disc, Plus, Check, LogOut, RefreshCw, SkipBack, SkipForward } from 'lucide-react';
import { cn } from '../lib/utils';

export default function MusicWidget({ audioRef, currentSoundscape, setCurrentSoundscape, onClose }) {
  const [activeTab, setActiveTab] = useState('audio'); // 'audio' or 'spotify'
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  
  // Custom audio addition
  const [customName, setCustomName] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [customTracks, setCustomTracks] = useState([]);
  const [error, setError] = useState('');

  // Dragging state
  const widgetRef = useRef(null);
  const [position, setPosition] = useState({ x: window.innerWidth > 800 ? window.innerWidth - 380 : 20, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const initialPos = useRef({ x: 0, y: 0 });

  // Spotify Auth & Real Player State (Wrapped in try/catch for sandbox security)
  const [spotifyToken, setSpotifyToken] = useState(() => {
    try {
      return localStorage.getItem('spotify_access_token') || '';
    } catch (e) {
      console.warn("localStorage read blocked by environment:", e);
      return '';
    }
  });

  const [spotifyClientId, setSpotifyClientId] = useState(() => {
    try {
      return localStorage.getItem('spotify_client_id') || import.meta.env.VITE_SPOTIFY_CLIENT_ID || '35a82869dfbd47df83c9a0c7c34d4004';
    } catch (e) {
      return '35a82869dfbd47df83c9a0c7c34d4004';
    }
  });
  
  const [realSpotifyData, setRealSpotifyData] = useState(null);
  const [spotifyError, setSpotifyError] = useState('');

  const allTracks = [...customTracks];

  // PKCE Helper: Generate random string
  const generateRandomString = (length) => {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < length; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  };

  // PKCE Helper: Generate code challenge from verifier
  const generateCodeChallenge = async (codeVerifier) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode.apply(null, new Uint8Array(digest)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  };

  const getRedirectUri = () => {
    let origin = window.location.origin;
    if (origin.includes('localhost')) {
      origin = origin.replace('localhost', '127.0.0.1');
    }
    return origin + '/';
  };

  // Spotify OAuth Redirect login (Authorization Code Flow with PKCE)
  const handleSpotifyLogin = async () => {
    const CLIENT_ID = spotifyClientId; 
    const REDIRECT_URI = getRedirectUri(); 
    const AUTH_ENDPOINT = 'https://accounts.spotify.com/authorize';
    const SCOPES = ['user-read-currently-playing', 'user-read-playback-state', 'user-modify-playback-state'].join(' ');

    const codeVerifier = generateRandomString(64);
    try {
      localStorage.setItem('spotify_code_verifier', codeVerifier);
    } catch (e) {
      console.warn("Could not write code verifier to localStorage:", e);
    }

    const codeChallenge = await generateCodeChallenge(codeVerifier);

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: CLIENT_ID,
      scope: SCOPES,
      redirect_uri: REDIRECT_URI,
      code_challenge_method: 'S256',
      code_challenge: codeChallenge,
    });

    window.location.href = `${AUTH_ENDPOINT}?${params.toString()}`;
  };

  // Intercept Redirect Callback (PKCE Flow)
  useEffect(() => {
    const handleCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        
        if (code) {
          const codeVerifier = localStorage.getItem('spotify_code_verifier');
          if (codeVerifier) {
            const CLIENT_ID = localStorage.getItem('spotify_client_id') || import.meta.env.VITE_SPOTIFY_CLIENT_ID || '35a82869dfbd47df83c9a0c7c34d4004';
            const REDIRECT_URI = getRedirectUri();

            const response = await fetch('https://accounts.spotify.com/api/token', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: new URLSearchParams({
                client_id: CLIENT_ID,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: REDIRECT_URI,
                code_verifier: codeVerifier,
              }),
            });

            if (response.ok) {
              const data = await response.json();
              if (data.access_token) {
                setSpotifyToken(data.access_token);
                localStorage.setItem('spotify_access_token', data.access_token);
                if (data.refresh_token) {
                  localStorage.setItem('spotify_refresh_token', data.refresh_token);
                }
                setActiveTab('spotify');
              }
            } else {
              const errData = await response.json();
              console.error("Token exchange failed:", errData);
              setSpotifyError('Failed to connect with Spotify: ' + (errData.error_description || errData.error));
            }
          }
          // Clean the query parameters
          window.history.pushState("", document.title, window.location.pathname);
        }
      } catch (e) {
        console.warn("Could not process URL callback authorization code:", e);
      }
    };

    handleCallback();
  }, []);

  // Fetch real Spotify currently playing track
  const fetchRealSpotifyTrack = useCallback(async (token) => {
    if (!token) return;
    try {
      const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (response.status === 204) {
        // Active session, but nothing playing
        setRealSpotifyData({ isNothingPlaying: true });
        setSpotifyError('');
        return;
      }
      if (response.status === 401) {
        // Expired token
        setSpotifyError('Session expired. Please reconnect.');
        setSpotifyToken('');
        try {
          localStorage.removeItem('spotify_access_token');
        } catch (e) {
          // Ignore write restriction
        }
        setRealSpotifyData(null);
        return;
      }
      if (!response.ok) {
        throw new Error('Failed to fetch currently playing');
      }
      const data = await response.json();
      if (data && data.item) {
        setRealSpotifyData({
          song: data.item.name || 'Unknown Track',
          artist: data.item.artists?.map(a => a.name).join(', ') || 'Unknown Artist',
          albumArt: data.item.album?.images?.[0]?.url || '/lofi_album.png',
          progress: (data.progress_ms / (data.item.duration_ms || 1)) * 100,
          isPlaying: !!data.is_playing,
          duration: data.item.duration_ms || 0,
          progressMs: data.progress_ms || 0
        });
        setSpotifyError('');
      } else {
        setRealSpotifyData({ isNothingPlaying: true });
      }
    } catch (e) {
      console.error(e);
      setSpotifyError('Could not fetch Spotify status');
    }
  }, []);

  // Sync isPlaying state with audioRef
  useEffect(() => {
    if (audioRef && audioRef.current) {
      setIsPlaying(!audioRef.current.paused);
      setVolume(audioRef.current.volume);
    }
  }, [audioRef, currentSoundscape]);

  // Poll real Spotify API if connected
  useEffect(() => {
    if (!spotifyToken) return;
    fetchRealSpotifyTrack(spotifyToken);
    const interval = setInterval(() => {
      fetchRealSpotifyTrack(spotifyToken);
    }, 5000);
    return () => clearInterval(interval);
  }, [spotifyToken, fetchRealSpotifyTrack]);

  const handlePlayPause = () => {
    if (!audioRef || !audioRef.current) return;
    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => setIsPlaying(true))
            .catch(e => {
              console.warn('Playback block or source error', e);
              setIsPlaying(false);
            });
        } else {
          setIsPlaying(true);
        }
      }
    } catch (err) {
      console.error("Audio playback interaction failed:", err);
    }
  };

  const handleVolumeChange = (e) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    if (audioRef && audioRef.current) {
      audioRef.current.volume = newVol;
    }
  };

  const selectTrack = (track) => {
    setCurrentSoundscape(track);
    if (audioRef && audioRef.current) {
      try {
        audioRef.current.src = track.url;
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => setIsPlaying(true))
            .catch(e => {
              console.warn('Playback block or source error', e);
              setIsPlaying(false);
            });
        } else {
          setIsPlaying(true);
        }
      } catch (err) {
        console.error("Failed to select/play track:", err);
      }
    }
  };

  const addCustomTrack = (e) => {
    e.preventDefault();
    if (!customName || !customUrl) {
      setError('Please fill in both name and URL');
      return;
    }
    if (!customUrl.startsWith('http://') && !customUrl.startsWith('https://')) {
      setError('URL must start with http:// or https://');
      return;
    }
    setError('');
    const newTrack = {
      id: `custom_${Date.now()}`,
      name: customName,
      url: customUrl,
      isCustom: true
    };
    setCustomTracks(prev => [...prev, newTrack]);
    setCustomName('');
    setCustomUrl('');
    selectTrack(newTrack);
  };

  const disconnectSpotify = () => {
    setSpotifyToken('');
    try {
      localStorage.removeItem('spotify_access_token');
    } catch (e) {
      console.warn("localStorage write blocked by environment:", e);
    }
    setRealSpotifyData(null);
    setSpotifyError('');
  };

  const handleSpotifyPlayPause = async () => {
    if (!spotifyToken || !realSpotifyData) return;
    try {
      const isPlaying = realSpotifyData.isPlaying;
      const endpoint = isPlaying ? 'pause' : 'play';
      const response = await fetch(`https://api.spotify.com/v1/me/player/${endpoint}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${spotifyToken}`
        }
      });
      if (response.ok) {
        setRealSpotifyData(prev => prev ? { ...prev, isPlaying: !isPlaying } : null);
      } else {
        const err = await response.json().catch(() => ({}));
        console.error("Failed to toggle Spotify playback:", err);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSpotifySkip = async (direction) => {
    if (!spotifyToken) return;
    try {
      const response = await fetch(`https://api.spotify.com/v1/me/player/${direction}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${spotifyToken}`
        }
      });
      if (response.ok) {
        setTimeout(() => fetchRealSpotifyTrack(spotifyToken), 500);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <motion.div
      ref={widgetRef}
      drag
      dragMomentum={false}
      dragElastic={0.05}
      dragConstraints={{
        left: -window.innerWidth + 360,
        right: 20,
        top: -80,
        bottom: window.innerHeight - 560
      }}
      className="absolute right-8 top-28 w-80 glass-panel border border-white/10 rounded-3xl p-5 shadow-2xl z-50 select-none cursor-grab active:cursor-grabbing hover:shadow-indigo-500/10 hover:shadow-2xl animate-in fade-in zoom-in-95 duration-200"
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <Music size={18} className="text-indigo-400 animate-pulse" />
          <span className="text-white text-sm font-bold tracking-wide">Audio & Spotify Hub</span>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white transition p-1">
          <X size={16} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-white/5 p-1 rounded-xl gap-1 mb-4 border border-white/5">
        <button
          onClick={() => setActiveTab('audio')}
          className={cn(
            "flex-1 py-1.5 rounded-lg text-xs font-semibold tracking-wider transition duration-300 uppercase",
            activeTab === 'audio' ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-200"
          )}
        >
          Audio Sources
        </button>
        <button
          onClick={() => setActiveTab('spotify')}
          className={cn(
            "flex-1 py-1.5 rounded-lg text-xs font-semibold tracking-wider transition duration-300 uppercase flex items-center justify-center gap-1.5",
            activeTab === 'spotify' ? "bg-green-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-200"
          )}
        >
          <Disc size={12} className={cn(spotifyToken && "animate-spin")} />
          Spotify {spotifyToken ? 'Active' : ''}
        </button>
      </div>

      {/* Content Tabs */}
      {activeTab === 'audio' ? (
        <div className="flex flex-col gap-4">
          {/* Tracks List */}
          <div className="max-h-40 overflow-y-auto pr-1 flex flex-col gap-1.5 custom-scrollbar">
            {allTracks.map((track) => {
              const isActive = currentSoundscape?.id === track.id;
              return (
                <button
                  key={track.id}
                  onClick={() => selectTrack(track)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition duration-200 flex items-center justify-between border",
                    isActive 
                      ? "bg-indigo-600/20 border-indigo-500 text-indigo-200" 
                      : "bg-white/5 border-transparent text-slate-300 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <span className="truncate">{track.name}</span>
                  {isActive && <Check size={12} className="text-indigo-400 flex-shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Quick Audio Controller */}
          {currentSoundscape && (
            <div className="bg-white/5 p-3 rounded-2xl border border-white/5 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Now Playing</span>
                <span className="text-[10px] text-indigo-400 font-semibold truncate max-w-[120px]">{currentSoundscape.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePlayPause}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-full transition flex-shrink-0"
                >
                  {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                </button>
                <div className="flex-1 flex items-center gap-2">
                  <Volume2 size={12} className="text-slate-400" />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={handleVolumeChange}
                    className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Add Custom Track */}
          <form onSubmit={addCustomTrack} className="border-t border-white/5 pt-3 flex flex-col gap-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
              <Plus size={10} /> Add Custom Audio URL
            </span>
            <div className="flex flex-col gap-1.5">
              <input
                type="text"
                placeholder="Track Name (e.g. Lofi Chill)"
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Audio URL (Direct MP3 link)"
                  value={customUrl}
                  onChange={e => setCustomUrl(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 rounded-xl text-xs font-semibold transition"
                >
                  Add
                </button>
              </div>
            </div>
            {error && <span className="text-red-400 text-[10px] text-center">{error}</span>}
          </form>
        </div>
      ) : (
        /* Spotify Status Tab */
        <div className="flex flex-col gap-4">
          {spotifyToken ? (
            /* Connected to Real Spotify */
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Spotify Connected
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fetchRealSpotifyTrack(spotifyToken)}
                    className="p-1 hover:bg-white/5 text-slate-400 hover:text-white rounded-lg transition"
                    title="Refresh Now"
                  >
                    <RefreshCw size={12} />
                  </button>
                  <button
                    onClick={disconnectSpotify}
                    className="text-red-400 hover:text-red-300 p-1 hover:bg-red-500/10 rounded-lg transition flex items-center gap-1"
                    title="Disconnect"
                  >
                    <LogOut size={12} />
                  </button>
                </div>
              </div>

              {realSpotifyData ? (() => {
                const displayData = realSpotifyData.isNothingPlaying
                  ? {
                      song: 'Ready to Play',
                      artist: 'Start music on your Spotify app',
                      albumArt: 'https://images.unsplash.com/photo-1614680376593-902f74fa0d41?w=120&auto=format&fit=crop&q=60',
                      progress: 0,
                      isPlaying: false
                    }
                  : realSpotifyData;

                return (
                  <div className="bg-green-950/20 border border-green-500/20 p-4 rounded-2xl flex flex-col gap-3 relative overflow-hidden">
                    <div className="absolute top-2 right-2 flex items-center gap-1.5">
                      <span className={cn("w-1.5 h-1.5 rounded-full bg-green-500", displayData.isPlaying && "animate-ping")}></span>
                      <span className="text-[8px] font-bold text-green-400 uppercase tracking-widest">
                        {displayData.isPlaying ? 'Playing' : 'Paused'}
                      </span>
                    </div>

                    <div className="flex gap-3 items-center">
                      <img 
                        src={displayData.albumArt} 
                        alt="Spotify Album Cover" 
                        className="w-12 h-12 rounded-xl object-cover border border-white/10 shadow-lg"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-white text-xs font-bold truncate leading-tight">{displayData.song}</h4>
                        <p className="text-slate-400 text-[10px] truncate">{displayData.artist}</p>
                        <p className="text-[8px] text-green-400 mt-1 flex items-center gap-1 font-mono">
                          <Disc size={8} className={cn(displayData.isPlaying && "animate-spin")} /> on Spotify
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-green-500 transition-all duration-1000" 
                          style={{ width: `${displayData.progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Spotify Playback Controls */}
                    <div className="flex justify-center items-center gap-4 mt-1 border-t border-white/5 pt-3">
                      <button
                        onClick={() => handleSpotifySkip('previous')}
                        className="text-slate-400 hover:text-white p-1.5 transition rounded-lg hover:bg-white/5"
                        title="Previous Track"
                      >
                        <SkipBack size={16} />
                      </button>
                      <button
                        onClick={handleSpotifyPlayPause}
                        className="bg-green-600 hover:bg-green-500 text-white p-2.5 rounded-full transition shadow-lg shadow-green-500/25 flex items-center justify-center"
                        title={displayData.isPlaying ? "Pause" : "Play"}
                      >
                        {displayData.isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} className="ml-0.5" fill="currentColor" />}
                      </button>
                      <button
                        onClick={() => handleSpotifySkip('next')}
                        className="text-slate-400 hover:text-white p-1.5 transition rounded-lg hover:bg-white/5"
                        title="Next Track"
                      >
                        <SkipForward size={16} />
                      </button>
                    </div>
                  </div>
                );
              })() : (
                <div className="w-full h-24 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>
          ) : (
            /* Connect Spotify Authorization Form (Redirection Only) */
            <div className="flex flex-col gap-3 py-1">
              <div className="flex flex-col gap-2">
                <span className="text-[10px] uppercase font-bold text-green-400 tracking-wider">Connect Spotify Account</span>
                


                <button
                  type="button"
                  onClick={handleSpotifyLogin}
                  className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-lg shadow-green-500/20 flex items-center justify-center gap-2 mt-1"
                >
                  <Disc size={14} className="animate-spin" />
                  <span>Log in with Spotify</span>
                </button>
              </div>
            </div>
          )}
          {spotifyError && <span className="text-red-400 text-[10px] text-center font-medium mt-1">{spotifyError}</span>}
        </div>
      )}
    </motion.div>
  );
}
