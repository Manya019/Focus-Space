import React, { useEffect, useState, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { X } from 'lucide-react';
import { getWsPeerId, sendMessage } from '../services/ws';
import { cn } from '../lib/utils';

const VideoMeeting = ({ user, incomingSignal, onClose }) => {
    const [meetingCode, setMeetingCode] = useState('');
    const [inputCode, setInputCode] = useState('');
    const [isInMeeting, setIsInMeeting] = useState(false);
    const [peers, setPeers] = useState({}); // { [userId]: { connection, stream, username } }
    const [error, setError] = useState('');
    const [localStream, setLocalStream] = useState(null);
    const [iceServers, setIceServers] = useState([
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' }
    ]);

    // Permission State
    const [isCreator, setIsCreator] = useState(false);
    const [pendingRequests, setPendingRequests] = useState([]); // Array of { id, username }
    const [waitingForApproval, setWaitingForApproval] = useState(false);

    // Audio & Video controls state
    const [isMicEnabled, setIsMicEnabled] = useState(true);
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);

    // Google Meet style states (pinning and fullscreen display)
    const [pinnedUserId, setPinnedUserId] = useState(null);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState('Waiting for peer');

    const localVideoRef = useRef(null);
    const localPeerId = useRef(getWsPeerId());

    // Refs to avoid closure staleness in callbacks
    const peersRef = useRef({});
    const meetingCodeRef = useRef('');
    const localStreamRef = useRef(null);

    const rtcConfig = { iceServers };

    useEffect(() => {
        const loadMeteredIceServers = async () => {
            const apiKey = import.meta.env.VITE_METERED_API_KEY;
            const appName = import.meta.env.VITE_METERED_APP_NAME;
            const region = import.meta.env.VITE_METERED_REGION;

            if (!apiKey || !appName) return;

            try {
                const params = new URLSearchParams({ apiKey });
                if (region) params.set('region', region);

                const response = await fetch(`https://${appName}.metered.live/api/v1/turn/credentials?${params.toString()}`);
                if (!response.ok) throw new Error(`Metered TURN request failed: ${response.status}`);

                const meteredIceServers = await response.json();
                if (Array.isArray(meteredIceServers) && meteredIceServers.length > 0) {
                    setIceServers(meteredIceServers);
                    console.log('Metered TURN credentials loaded');
                }
            } catch (err) {
                console.warn('Failed to load Metered TURN credentials; using STUN fallback:', err);
            }
        };

        loadMeteredIceServers();
    }, []);

    useEffect(() => {
        meetingCodeRef.current = meetingCode;
    }, [meetingCode]);

    useEffect(() => {
        localStreamRef.current = localStream;
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [isInMeeting, waitingForApproval, pinnedUserId, localStream]);

    const generateCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

    const initializeMedia = async () => {
        try {
            let stream;
            try {
                stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            } catch (err) {
                if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
                    console.warn("Video unavailable, falling back to audio only", err);
                    alert("Camera might be in use by another app. Trying audio only.");
                    stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
                } else {
                    throw err;
                }
            }
            setLocalStream(stream);
            setIsMicEnabled(true);
            setIsVideoEnabled(stream.getVideoTracks().length > 0);
            if (localVideoRef.current) localVideoRef.current.srcObject = stream;
            return stream;
        } catch (err) {
            console.error("Failed to get media", err);
            alert("Could not access camera/microphone: " + err.message);
            return null;
        }
    };

    const createMeeting = async () => {
        const code = generateCode();
        setMeetingCode(code);
        setIsCreator(true);

        const stream = await initializeMedia();
        if (stream) setIsInMeeting(true);
    };

    const joinMeetingInput = async () => {
        if (!inputCode) {
            setError('Please enter a code');
            return;
        }
        const code = inputCode.trim().toUpperCase();
        if (code.length !== 6) {
            setError('Invalid code. Must be 6 characters.');
            return;
        }
        setError('');
        setMeetingCode(code);

        // 1. Initialize Media (Preview)
        const stream = await initializeMedia();
        if (!stream) return;

        // 2. Set Waiting State
        setWaitingForApproval(true);

        // 3. Send Request
        sendMessage("reading_room", {
            type: "signal",
            payload: { signalType: "join_request", meetingCode: code }
        });
    };

    // Called only AFTER approval
    const enterMeeting = (code) => {
        setIsInMeeting(true);
        // Broadcast presence
        sendMessage("reading_room", {
            type: "signal",
            payload: { signalType: "join_announce", meetingCode: code }
        });
    };

    const cleanupResources = () => {
        Object.values(peersRef.current).forEach(p => {
            if (p.connection) {
                p.connection.close();
            }
        });
        setPeers({});
        peersRef.current = {};

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
            setLocalStream(null);
        }

        setIsInMeeting(false);
        setWaitingForApproval(false); // Reset waiting
        setIsCreator(false);
        setPendingRequests([]);
        setMeetingCode('');
        setIsMicEnabled(true);
        setIsVideoEnabled(true);
        setPinnedUserId(null);
        setIsFullScreen(false);
        setIsMinimized(false);
        setConnectionStatus('Waiting for peer');
    };

    const handleApprove = (requesterId) => {
        sendMessage("reading_room", {
            type: "signal",
            target_peer_id: requesterId,
            payload: { signalType: "join_response", status: "allowed", meetingCode: meetingCode }
        });
        setPendingRequests(prev => prev.filter(r => r.id !== requesterId));
    };

    const handleDeny = (requesterId) => {
        sendMessage("reading_room", {
            type: "signal",
            target_peer_id: requesterId,
            payload: { signalType: "join_response", status: "denied", meetingCode: meetingCode }
        });
        setPendingRequests(prev => prev.filter(r => r.id !== requesterId));
    };

    const leaveMeeting = () => {
        cleanupResources();
        if (onClose) onClose();
    };

    const toggleMic = () => {
        if (localStream) {
            const audioTrack = localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMicEnabled(audioTrack.enabled);
            }
        }
    };

    const toggleVideo = () => {
        if (localStream) {
            const videoTrack = localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsVideoEnabled(videoTrack.enabled);
            }
        }
    };

    // Process ice candidates queued before remote description is set
    const processQueuedCandidates = async (pc) => {
        if (pc.iceCandidatesQueue) {
            for (const cand of pc.iceCandidatesQueue) {
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(cand));
                } catch (e) {
                    console.error("Error processing queued ice candidate:", e);
                }
            }
            pc.iceCandidatesQueue = [];
        }
    };

    // Helper to create peer connection
    const createPeerConnection = (targetPeerId, targetUsername, initiator = false) => {
        if (peersRef.current[targetPeerId]) return peersRef.current[targetPeerId].connection;

        const pc = new RTCPeerConnection(rtcConfig);
        pc.iceCandidatesQueue = [];

        // Add local tracks
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current));
        }

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                sendMessage("reading_room", {
                    type: "signal",
                    target_peer_id: targetPeerId,
                    payload: {
                        signalType: "ice-candidate",
                        candidate: event.candidate,
                        meetingCode: meetingCodeRef.current
                    }
                });
            }
        };

        pc.onconnectionstatechange = () => {
            console.log(`Peer ${targetUsername || targetPeerId} connection state:`, pc.connectionState);
            setConnectionStatus(pc.connectionState);
        };

        pc.oniceconnectionstatechange = () => {
            console.log(`Peer ${targetUsername || targetPeerId} ICE state:`, pc.iceConnectionState);
            if (pc.iceConnectionState === 'failed') {
                setConnectionStatus('ICE failed');
            }
        };

        pc.ontrack = (event) => {
            const remoteStream = event.streams[0];
            setConnectionStatus('connected');
            setPeers(prev => ({
                ...prev,
                [targetPeerId]: {
                    ...prev[targetPeerId],
                    stream: remoteStream
                }
            }));
        };

        peersRef.current[targetPeerId] = {
            connection: pc,
            username: targetUsername,
            id: targetPeerId
        };

        // Force update to render
        setPeers(prev => ({
            ...prev,
            [targetPeerId]: { connection: pc, stream: null, username: targetUsername, id: targetPeerId }
        }));

        return pc;
    };

    // Handle incoming signals
    useEffect(() => {
        if (!incomingSignal) return;

        const { payload, user: sender } = incomingSignal;
        if (!payload) return;
        const { signalType, meetingCode: incomingCode } = payload;

        if (meetingCode && incomingCode !== meetingCode) return;

        // Ignore self
        const senderPeerId = sender?.peer_id || sender?.id;

        if (senderPeerId && senderPeerId === localPeerId.current) return;

        const handleSignal = async () => {
            try {
                // --- HOST LOGIC ---
                if (signalType === 'join_request') {
                    // Only Creator handles requests
                    if (isCreator && incomingCode === meetingCode) {
                        console.log("Join request from:", sender?.username);
                        setPendingRequests(prev => {
                            if (prev.find(r => r.id === senderPeerId)) return prev;
                            return [...prev, { ...sender, id: senderPeerId }];
                        });
                    }
                    return;
                }

                // --- JOINER LOGIC ---
                if (signalType === 'join_response') {
                    if (waitingForApproval) {
                        if (payload.status === 'allowed') {
                            setWaitingForApproval(false);
                            enterMeeting(meetingCode);
                        } else {
                            setWaitingForApproval(false);
                            alert("Host denied your request to join.");
                            cleanupResources();
                            if (onClose) onClose();
                        }
                    }
                    return;
                }

                // --- ACTIVE MEETING LOGIC ---
                if (!isInMeeting) return;

                if (signalType === 'join_announce') {
                    // New peer joined, existing peer initiates offer
                    console.log("New peer joined:", sender?.username);
                    const pc = createPeerConnection(senderPeerId, sender.username, true);
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);

                    sendMessage("reading_room", {
                        type: "signal",
                        target_peer_id: senderPeerId,
                        payload: {
                            signalType: "offer",
                            sdp: offer,
                            meetingCode: meetingCode
                        }
                    });
                } else if (signalType === 'offer') {
                    console.log("Received offer from:", sender?.username);
                    const pc = createPeerConnection(senderPeerId, sender.username, false);
                    await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);

                    sendMessage("reading_room", {
                        type: "signal",
                        target_peer_id: senderPeerId,
                        payload: {
                            signalType: "answer",
                            sdp: answer,
                            meetingCode: meetingCode
                        }
                    });

                    await processQueuedCandidates(pc);
                } else if (signalType === 'answer') {
                    console.log("Received answer from:", sender?.username);
                    const pc = peersRef.current[senderPeerId]?.connection;
                    if (pc) {
                        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
                        await processQueuedCandidates(pc);
                    }
                } else if (signalType === 'ice-candidate') {
                    const pc = peersRef.current[senderPeerId]?.connection;
                    if (pc && payload.candidate) {
                        try {
                            if (pc.remoteDescription && pc.remoteDescription.type) {
                                await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
                            } else {
                                pc.iceCandidatesQueue.push(payload.candidate);
                            }
                        } catch (e) {
                            console.error("Error adding ice candidate:", e);
                        }
                    }
                }
            } catch (err) {
                console.error("Signal handling error:", err);
            }
        };

        handleSignal();

    }, [incomingSignal, isInMeeting, meetingCode, user.id, isCreator, waitingForApproval]);

    useEffect(() => {
        return () => cleanupResources();
    }, []);

    if (isMinimized && (isInMeeting || waitingForApproval)) {
        return (
            <div className="fixed right-5 bottom-5 z-[9999] w-80 max-w-[calc(100vw-2.5rem)] bg-black/90 border border-white/10 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-xl">
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                    <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">{meetingCode || 'Meeting'}</p>
                        <p className="text-[10px] text-slate-400 truncate">{waitingForApproval ? 'Waiting for host' : connectionStatus}</p>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setIsMinimized(false)}
                            className="p-2 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition"
                            title="Expand meeting"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M9 21H3v-6"/><path d="M14 10 3 21"/></svg>
                        </button>
                        <button
                            onClick={leaveMeeting}
                            className="p-2 rounded-full text-red-300 hover:text-white hover:bg-red-600 transition"
                            title="Leave meeting"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2 p-3">
                    <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-900 border border-white/10">
                        <video
                            ref={localVideoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover transform scale-x-[-1]"
                        />
                        <span className="absolute left-2 bottom-1.5 text-[10px] text-white bg-black/60 px-2 py-0.5 rounded-full">You</span>
                    </div>
                    {Object.values(peers).slice(0, 1).map(peer => (
                        <div key={peer.id} className="relative aspect-video rounded-2xl overflow-hidden bg-slate-900 border border-white/10">
                            <video
                                autoPlay
                                playsInline
                                ref={el => {
                                    if (el && peer.stream) el.srcObject = peer.stream;
                                }}
                                className="w-full h-full object-cover"
                            />
                            <span className="absolute left-2 bottom-1.5 text-[10px] text-white bg-black/60 px-2 py-0.5 rounded-full truncate max-w-[110px]">{peer.username || 'Peer'}</span>
                        </div>
                    ))}
                    {Object.keys(peers).length === 0 && (
                        <div className="aspect-video rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-center text-[10px] text-slate-500">
                            No peer yet
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            {!isInMeeting && !waitingForApproval ? (
                <div className="bg-black/80 p-6 rounded-2xl border border-white/10 w-80 shadow-2xl relative">
                    <button
                        onClick={onClose}
                        className="absolute top-2 right-2 text-white/50 hover:text-white"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                    <div className="flex flex-col items-center mb-4">
                        <div className="p-3 bg-indigo-600/20 rounded-full mb-3">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-indigo-400">
                                <path d="M23 7l-7 5 7 5V7z" />
                                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                            </svg>
                        </div>
                        <h3 className="text-white text-lg font-semibold">Video Call</h3>
                    </div>

                    <button
                        onClick={createMeeting}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl mb-4 transition shadow-lg shadow-indigo-500/20 font-medium flex items-center justify-center gap-2"
                    >
                        <span>New Meeting</span>
                    </button>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-white/10"></div>
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-[#1a1a1a] px-2 text-white/40">Or join with code</span>
                        </div>
                    </div>

                    <div className="flex gap-2 mt-4">
                        <div className="flex-1">
                            <input
                                type="text"
                                placeholder="CODE"
                                value={inputCode}
                                onChange={e => {
                                    setInputCode(e.target.value.toUpperCase());
                                    setError('');
                                }}
                                className={`w-full bg-white/5 border ${error ? 'border-red-500' : 'border-white/10'} rounded-xl px-4 py-2 text-white text-center tracking-widest focus:outline-none focus:border-indigo-500 transition placeholder:text-white/20`}
                            />
                            {error && <p className="text-red-400 text-xs mt-1 text-center">{error}</p>}
                        </div>
                        <button
                            onClick={joinMeetingInput}
                            className="bg-white/10 hover:bg-white/20 text-white px-4 rounded-xl transition border border-white/10 font-medium h-[42px]"
                        >
                            Join
                        </button>
                    </div>
                </div>
            ) : waitingForApproval ? (
                <div className="bg-black/80 p-8 rounded-2xl border border-white/10 w-80 shadow-2xl flex flex-col items-center text-center">
                    <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <h3 className="text-white font-bold text-lg mb-2">Waiting for Host</h3>
                    <p className="text-white/60 text-sm mb-6">The meeting host needs to approve your join request.</p>
                    <button onClick={leaveMeeting} className="text-red-400 hover:text-red-300 text-sm font-medium">
                        Cancel Request
                    </button>
                </div>
            ) : (
                <div className={cn(
                    "bg-black/90 p-4 shadow-2xl flex flex-col gap-4 backdrop-blur-md transition-all duration-300 relative select-none",
                    isFullScreen 
                        ? "fixed inset-0 w-screen h-screen rounded-none z-[9999]" 
                        : "rounded-3xl border border-white/10 max-w-4xl w-full mx-4"
                )}>
                    {/* Pending Requests Overlay for Host */}
                    {isCreator && pendingRequests.length > 0 && (
                        <div className="absolute top-16 right-4 left-4 bg-gray-800/90 backdrop-blur-md p-3 rounded-xl border border-white/10 z-20 shadow-xl animate-in fade-in slide-in-from-top-2">
                            <h4 className="text-white text-xs uppercase tracking-wider font-bold mb-2">Join Requests ({pendingRequests.length})</h4>
                            <div className="flex flex-col gap-2">
                                {pendingRequests.map(req => (
                                    <div key={req.id} className="flex items-center justify-between bg-white/5 p-2 rounded-lg">
                                        <span className="text-white text-sm font-medium">{req.username}</span>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleDeny(req.id)} className="text-red-400 hover:bg-red-500/10 p-1 px-2 rounded text-xs transition">Deny</button>
                                            <button onClick={() => handleApprove(req.id)} className="bg-green-600 hover:bg-green-500 text-white p-1 px-3 rounded text-xs font-bold transition shadow-lg shadow-green-500/20">Accept</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Header */}
                    <div className="flex justify-between items-center px-2">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 bg-white/5 py-1.5 px-3 rounded-full border border-white/5">
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-lg shadow-green-500/50"></span>
                                <span className="text-white text-sm font-mono font-bold tracking-wider">{meetingCode}</span>
                                {isCreator && <span className="text-[10px] bg-indigo-500 text-white px-1 rounded ml-1">HOST</span>}
                            </div>
                            <span className="text-white/30 text-xs">Share this code</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setIsMinimized(true)}
                                className="text-slate-400 hover:text-white p-2 rounded-full hover:bg-white/5 transition"
                                title="Minimize meeting"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/><path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/></svg>
                            </button>
                            {/* Fullscreen Expand / Collapse Button */}
                            <button
                                onClick={() => setIsFullScreen(!isFullScreen)}
                                className="text-slate-400 hover:text-white p-2 rounded-full hover:bg-white/5 transition"
                                title={isFullScreen ? "Exit Fullscreen" : "Fullscreen View"}
                            >
                                {isFullScreen ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7"/></svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3m11-11l6-6m-6 6v-5m0 5h5m-11 6l-6 6m6-6v5m0-5h-5"/></svg>
                                )}
                            </button>
                            <button onClick={leaveMeeting} className="text-red-400 hover:text-white hover:bg-red-500/80 p-2 rounded-full transition duration-300">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                            </button>
                        </div>
                    </div>

                    {/* Dominant / Pinned View or Regular Grid View */}
                    {pinnedUserId ? (
                        <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-0 overflow-hidden">
                            {/* Pinned main video */}
                            <div className="flex-1 relative bg-gray-950 rounded-2xl overflow-hidden border border-indigo-500/20 group">
                                {pinnedUserId === 'local' ? (
                                    <video
                                        ref={localVideoRef}
                                        autoPlay
                                        playsInline
                                        muted
                                        className="w-full h-full object-contain transform scale-x-[-1]"
                                    />
                                ) : (
                                    <video
                                        autoPlay
                                        playsInline
                                        ref={el => {
                                            const peer = peers[pinnedUserId];
                                            if (el && peer && peer.stream) el.srcObject = peer.stream;
                                        }}
                                        className="w-full h-full object-contain"
                                    />
                                )}
                                <div className="absolute bottom-3 left-3 bg-black/60 px-3 py-1.5 rounded-lg backdrop-blur-sm flex items-center gap-2 border border-white/5">
                                    <span className="text-xs text-white font-medium">
                                        {pinnedUserId === 'local' ? 'You' : peers[pinnedUserId]?.username}
                                    </span>
                                    <span className="text-[10px] bg-indigo-500 text-white px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Pinned</span>
                                </div>
                                <button
                                    onClick={() => setPinnedUserId(null)}
                                    className="absolute top-3 right-3 p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full transition shadow-lg opacity-0 group-hover:opacity-100"
                                    title="Unpin video"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="21" y1="10" x2="3" y2="10"/>
                                        <line x1="21" y1="6" x2="3" y2="6"/>
                                        <line x1="21" y1="14" x2="3" y2="14"/>
                                        <line x1="21" y1="18" x2="3" y2="18"/>
                                    </svg>
                                </button>
                            </div>

                            {/* Sidebar other thumbnails */}
                            <div className="w-full md:w-56 flex md:flex-col gap-3 overflow-x-auto md:overflow-y-auto pr-1 flex-shrink-0">
                                {/* Local preview thumbnail (if not pinned) */}
                                {pinnedUserId !== 'local' && (
                                    <div 
                                        className="relative w-40 md:w-full aspect-video bg-gray-900 rounded-xl overflow-hidden border border-white/5 group cursor-pointer hover:border-indigo-500/50 transition flex-shrink-0"
                                        onClick={() => setPinnedUserId('local')}
                                    >
                                        <video
                                            ref={localVideoRef}
                                            autoPlay
                                            playsInline
                                            muted
                                            className="w-full h-full object-cover transform scale-x-[-1]"
                                        />
                                        <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-0.5 rounded text-[10px] text-white">You</div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setPinnedUserId('local'); }}
                                            className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-indigo-600 text-white rounded-lg transition opacity-0 group-hover:opacity-100"
                                            title="Pin video"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                                        </button>
                                    </div>
                                )}

                                {/* Other peers thumbnails */}
                                {Object.values(peers).map(peer => {
                                    if (pinnedUserId === peer.id) return null;
                                    return (
                                        <div 
                                            key={peer.id}
                                            className="relative w-40 md:w-full aspect-video bg-gray-900 rounded-xl overflow-hidden border border-white/5 group cursor-pointer hover:border-indigo-500/50 transition flex-shrink-0"
                                            onClick={() => setPinnedUserId(peer.id)}
                                        >
                                            <video
                                                autoPlay
                                                playsInline
                                                ref={el => {
                                                    if (el && peer.stream) el.srcObject = peer.stream;
                                                }}
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-0.5 rounded text-[10px] text-white truncate max-w-[100px]">{peer.username}</div>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setPinnedUserId(peer.id); }}
                                                className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-indigo-600 text-white rounded-lg transition opacity-0 group-hover:opacity-100"
                                                title="Pin video"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        /* Default Grid View */
                        <div className={cn(
                            "grid gap-4 flex-1",
                            isFullScreen ? "max-h-[calc(100vh-140px)]" : "",
                            Object.keys(peers).length === 0 
                                ? 'grid-cols-1' 
                                : Object.keys(peers).length === 1 
                                    ? 'grid-cols-1 md:grid-cols-2' 
                                    : 'grid-cols-2 md:grid-cols-3'
                        )}>
                            {/* Local Video */}
                            <div className="relative w-full aspect-video bg-gray-900 rounded-2xl overflow-hidden shadow-lg border border-white/5 group">
                                <video
                                    ref={localVideoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className="w-full h-full object-cover transform scale-x-[-1]"
                                />
                                <div className="absolute bottom-3 left-3 bg-black/60 px-2 py-1 rounded-md backdrop-blur-sm">
                                    <span className="text-xs text-white font-medium">You</span>
                                </div>
                                <button
                                    onClick={() => setPinnedUserId('local')}
                                    className="absolute top-3 right-3 p-2 bg-black/70 hover:bg-indigo-600 text-white rounded-xl transition opacity-0 group-hover:opacity-100 shadow-md"
                                    title="Pin video"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                                </button>
                            </div>

                            {/* Remote Peers */}
                            {Object.values(peers).map(peer => (
                                <div key={peer.id} className="relative w-full aspect-video bg-gray-900 rounded-2xl overflow-hidden shadow-lg border border-white/5 group">
                                    <video
                                        autoPlay
                                        playsInline
                                        ref={el => {
                                            if (el && peer.stream) el.srcObject = peer.stream;
                                        }}
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute bottom-3 left-3 bg-black/60 px-2 py-1 rounded-md backdrop-blur-sm">
                                        <span className="text-xs text-white font-medium">{peer.username}</span>
                                    </div>
                                    <button
                                        onClick={() => setPinnedUserId(peer.id)}
                                        className="absolute top-3 right-3 p-2 bg-black/70 hover:bg-indigo-600 text-white rounded-xl transition opacity-0 group-hover:opacity-100 shadow-md"
                                        title="Pin video"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Media Controls & Disconnect */}
                    <div className="flex justify-center gap-4 mt-2 border-t border-white/5 pt-4">
                        <button
                            onClick={toggleMic}
                            className={`p-3 rounded-full transition duration-300 ${isMicEnabled ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-red-600 text-white hover:bg-red-700'}`}
                            title={isMicEnabled ? "Mute Microphone" : "Unmute Microphone"}
                        >
                            {isMicEnabled ? (
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                                    <line x1="12" y1="19" x2="12" y2="23"/>
                                    <line x1="8" y1="23" x2="16" y2="23"/>
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="1" y1="1" x2="23" y2="23"/>
                                    <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/>
                                    <path d="M17 17A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/>
                                    <line x1="12" y1="19" x2="12" y2="23"/>
                                    <line x1="8" y1="23" x2="16" y2="23"/>
                                </svg>
                            )}
                        </button>

                        <button
                            onClick={toggleVideo}
                            className={`p-3 rounded-full transition duration-300 ${isVideoEnabled ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-red-600 text-white hover:bg-red-700'}`}
                            title={isVideoEnabled ? "Turn Camera Off" : "Turn Camera On"}
                        >
                            {isVideoEnabled ? (
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M23 7l-7 5 7 5V7z"/>
                                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10"/>
                                    <line x1="1" y1="1" x2="23" y2="23"/>
                                </svg>
                            )}
                        </button>

                        <button
                            onClick={leaveMeeting}
                            className="bg-red-600 hover:bg-red-700 text-white p-3 rounded-full transition duration-300"
                            title="Disconnect Call"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"/>
                                <line x1="23" y1="1" x2="1" y2="23"/>
                            </svg>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VideoMeeting;
