import React, { useEffect, useState, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { sendMessage } from '../services/ws';

const VideoMeeting = ({ user, incomingSignal, onClose }) => {
    const [meetingCode, setMeetingCode] = useState('');
    const [inputCode, setInputCode] = useState('');
    const [isInMeeting, setIsInMeeting] = useState(false);
    const [peers, setPeers] = useState({}); // { [userId]: { connection, stream, username } }
    const [error, setError] = useState('');
    const [localStream, setLocalStream] = useState(null);

    // Permission State
    const [isCreator, setIsCreator] = useState(false);
    const [pendingRequests, setPendingRequests] = useState([]); // Array of { id, username }
    const [waitingForApproval, setWaitingForApproval] = useState(false);

    const localVideoRef = useRef(null);

    // Refs to avoid closure staleness in callbacks
    const peersRef = useRef({});
    const meetingCodeRef = useRef('');
    const localStreamRef = useRef(null);

    const rtcConfig = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' }
        ]
    };

    useEffect(() => {
        meetingCodeRef.current = meetingCode;
    }, [meetingCode]);

    useEffect(() => {
        localStreamRef.current = localStream;
    }, [localStream]);

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

    const joinMeeting = async (code) => {
        try {
            // REMOVE OLD joinMeeting LOGIC
            // Main logic is now split between createMeeting and joinMeetingInput+enterMeeting

        } catch (err) {
            console.error("Failed to get media", err);
            alert("Could not access camera/microphone: " + err.message + "\nPlease check permissions or if another app is using the device.");
        }
    };

    const cleanupResources = () => {
        Object.values(peersRef.current).forEach(p => {
            p.connection.close();
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
    };

    const handleApprove = (requesterId) => {
        sendMessage("reading_room", {
            type: "signal",
            target_id: requesterId,
            payload: { signalType: "join_response", status: "allowed", meetingCode: meetingCode }
        });
        setPendingRequests(prev => prev.filter(r => r.id !== requesterId));
    };

    const handleDeny = (requesterId) => {
        sendMessage("reading_room", {
            type: "signal",
            target_id: requesterId,
            payload: { signalType: "join_response", status: "denied", meetingCode: meetingCode }
        });
        setPendingRequests(prev => prev.filter(r => r.id !== requesterId));
    };

    const leaveMeeting = () => {
        cleanupResources();
        if (onClose) onClose();
    };

    // Helper to create peer connection
    const createPeerConnection = (targetUserId, targetUsername, initiator = false) => {
        if (peersRef.current[targetUserId]) return peersRef.current[targetUserId].connection;

        const pc = new RTCPeerConnection(rtcConfig);

        // Add local tracks
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current));
        }

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                sendMessage("reading_room", {
                    type: "signal",
                    target_id: targetUserId,
                    payload: {
                        signalType: "ice-candidate",
                        candidate: event.candidate,
                        meetingCode: meetingCodeRef.current
                    }
                });
            }
        };

        pc.ontrack = (event) => {
            const remoteStream = event.streams[0];
            setPeers(prev => ({
                ...prev,
                [targetUserId]: {
                    ...prev[targetUserId],
                    stream: remoteStream
                }
            }));
        };

        peersRef.current[targetUserId] = {
            connection: pc,
            username: targetUsername,
            id: targetUserId
        };

        // Force update to render
        setPeers(prev => ({
            ...prev,
            [targetUserId]: { connection: pc, stream: null, username: targetUsername, id: targetUserId }
        }));

        return pc;
    };

    // Handle incoming signals
    useEffect(() => {
        // For waiting users: always listen to join_response
        // For creators: listen to join_request
        // For active meeters: listen to regular signals

        // Filter by code if we have one set
        if (!incomingSignal) return;

        const { payload, sender, incomingCode } = incomingSignal;
        const { signalType } = payload;

        if (meetingCode && incomingCode !== meetingCode) return;

        // Ignore self
        if (sender.id === user.id) return;

        const handleSignal = async () => {
            try {
                // --- HOST LOGIC ---
                if (signalType === 'join_request') {
                    // Only Creator handles requests
                    if (isCreator && incomingCode === meetingCode) {
                        console.log("Join request from:", sender.username);
                        setPendingRequests(prev => {
                            if (prev.find(r => r.id === sender.id)) return prev;
                            return [...prev, sender];
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
                    console.log("New peer joined:", sender.username);
                    const pc = createPeerConnection(sender.id, sender.username, true);
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);

                    sendMessage("reading_room", {
                        type: "signal",
                        target_id: sender.id,
                        payload: {
                            signalType: "offer",
                            sdp: offer,
                            meetingCode: meetingCode
                        }
                    });
                } else if (signalType === 'offer') {
                    console.log("Received offer from:", sender.username);
                    const pc = createPeerConnection(sender.id, sender.username, false);
                    await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);

                    sendMessage("reading_room", {
                        type: "signal",
                        target_id: sender.id,
                        payload: {
                            signalType: "answer",
                            sdp: answer,
                            meetingCode: meetingCode
                        }
                    });
                } else if (signalType === 'answer') {
                    console.log("Received answer from:", sender.username);
                    const pc = peersRef.current[sender.id]?.connection;
                    if (pc) {
                        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
                    }
                } else if (signalType === 'ice-candidate') {
                    const pc = peersRef.current[sender.id]?.connection;
                    if (pc && payload.candidate) {
                        await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
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
                <div className="bg-black/90 p-4 rounded-3xl border border-white/10 shadow-2xl flex flex-col gap-4 backdrop-blur-md max-w-2xl w-full mx-4 relative">
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
                        <button onClick={leaveMeeting} className="text-red-400 hover:text-white hover:bg-red-500/80 p-2 rounded-full transition duration-300">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                        </button>
                    </div>

                    {/* Video Grid */}
                    <div className={`grid gap-4 ${Object.keys(peers).length === 0 ? 'grid-cols-1' : 'grid-cols-2 md:grid-cols-3'}`}>
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
                        </div>

                        {/* Remote Peers */}
                        {Object.values(peers).map(peer => (
                            <div key={peer.id} className="relative w-full aspect-video bg-gray-900 rounded-2xl overflow-hidden shadow-lg border border-white/5">
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
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default VideoMeeting;
