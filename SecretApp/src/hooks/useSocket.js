import { useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import io from 'socket.io-client';
import { SOCKET_URL } from '../utils/config';
import {
    setConnected,
    setMatchData,
    clearMatchData,
    addMessage,
    updateMessageReaction,
    setPartnerTyping,
    setQueueStatus,
} from '../store/socketSlice';
import { selectCurrentToken } from '../store/authSlice';
import api from '../services/api';

export const useSocket = () => {
    const dispatch = useDispatch();
    const token = useSelector(selectCurrentToken);
    const socketRef = useRef(null);

    useEffect(() => {
        if (!token) return;

        // Connect to Socket.IO server
        socketRef.current = io(SOCKET_URL, {
            auth: { token },
            transports: ['websocket'],
            withCredentials: true,
        });

        const socket = socketRef.current;

        // Connection events
        socket.on('connect', () => {
            console.log('Socket connected:', socket.id);
            dispatch(setConnected(true));
        });

        socket.on('disconnect', () => {
            console.log('Socket disconnected');
            dispatch(setConnected(false));
        });

        socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error.message);
            dispatch(setConnected(false));

            // If the connection failed due to auth, trigger a refresh via HTTP
            if (error.message?.includes('Authentication err') || error.message?.includes('Invalid token')) {
                console.log('Socket token expired. Triggering HTTP interceptor for silent refresh...');
                api.get('/auth/me').catch(err => console.log('Silent token refresh via API failed:', err.message));
            }
        });

        // Match found event
        socket.on('matchFound', (data) => {
            console.log('Match found:', data);
            dispatch(setMatchData(data));
        });

        // Queue status event
        socket.on('queueStatus', (data) => {
            console.log('Queue status:', data);
            dispatch(setQueueStatus(data));
        });

        // Partner disconnected event
        socket.on('partnerDisconnected', (data) => {
            console.log('Partner disconnected:', data);
        });

        // Reconnected event
        socket.on('reconnected', (data) => {
            console.log('Reconnected to partner:', data);
            dispatch(setMatchData(data));
        });

        // Message received event
        socket.on('message', (data) => {
            console.log('Message received:', data);
            dispatch(addMessage(data));
        });

        // Message reaction event
        socket.on('messageReaction', (data) => {
            console.log('Reaction received:', data);
            dispatch(updateMessageReaction({
                messageId: data.messageId,
                reaction: data.reaction ? data.reaction : { userId: data.senderId, emoji: null }
            }));
        });

        // Message sent confirmation
        socket.on('messageSent', (data) => {
            console.log('Message sent confirmation:', data);
        });

        // Typing indicator event
        socket.on('typing', (data) => {
            console.log('Partner typing:', data);
            dispatch(setPartnerTyping(data.isTyping));
        });

        // Error event
        socket.on('error', (data) => {
            console.error('Socket error:', data);
        });

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, [token, dispatch]);

    // Join queue
    const joinQueue = useCallback((type, preferences) => {
        if (socketRef.current) {
            socketRef.current.emit('joinQueue', { type, preferences });
        }
    }, []);

    // Leave queue
    const leaveQueue = useCallback((type) => {
        if (socketRef.current) {
            socketRef.current.emit('leaveQueue', { type });
        }
    }, []);

    // Send message
    const sendMessage = useCallback((message, receiverId, matchId, replyTo) => {
        if (socketRef.current) {
            socketRef.current.emit('message', { message, receiverId, matchId, replyTo });
        }
    }, []);

    // Send typing indicator
    const sendTyping = useCallback((partnerId, isTyping) => {
        if (socketRef.current) {
            socketRef.current.emit('typing', { partnerId, isTyping });
        }
    }, []);

    // Disconnect from partner
    const disconnectPartner = useCallback(() => {
        if (socketRef.current) {
            socketRef.current.emit('disconnectPartner', {});
            dispatch(clearMatchData());
        }
    }, [dispatch]);

    // Reconnect to partner
    const reconnectToPartner = useCallback((matchId) => {
        if (socketRef.current) {
            socketRef.current.emit('reconnectPartner', { matchId });
        }
    }, []);

    // Emit WebRTC events
    const sendOffer = useCallback((offer, partnerId) => {
        if (socketRef.current) {
            socketRef.current.emit('offer', { offer, partnerId });
        }
    }, []);

    const sendAnswer = useCallback((answer, partnerId) => {
        if (socketRef.current) {
            socketRef.current.emit('answer', { answer, partnerId });
        }
    }, []);

    const sendIceCandidate = useCallback((candidate, partnerId) => {
        if (socketRef.current) {
            socketRef.current.emit('iceCandidate', { candidate, partnerId });
        }
    }, []);

    // Listen to WebRTC events
    const onOffer = useCallback((callback) => {
        if (socketRef.current) {
            socketRef.current.on('offer', callback);
        }
    }, []);

    const onAnswer = useCallback((callback) => {
        if (socketRef.current) {
            socketRef.current.on('answer', callback);
        }
    }, []);

    const onIceCandidate = useCallback((callback) => {
        if (socketRef.current) {
            socketRef.current.on('iceCandidate', callback);
        }
    }, []);

    const onPartnerDisconnected = useCallback((callback) => {
        if (socketRef.current) {
            socketRef.current.on('partnerDisconnected', callback);
        }
    }, []);

    const offOffer = useCallback((callback) => {
        if (socketRef.current) {
            socketRef.current.off('offer', callback);
        }
    }, []);

    const offAnswer = useCallback((callback) => {
        if (socketRef.current) {
            socketRef.current.off('answer', callback);
        }
    }, []);

    const offIceCandidate = useCallback((callback) => {
        if (socketRef.current) {
            socketRef.current.off('iceCandidate', callback);
        }
    }, []);

    const offPartnerDisconnected = useCallback((callback) => {
        if (socketRef.current) {
            socketRef.current.off('partnerDisconnected', callback);
        }
    }, []);

    // Send reaction
    const sendReaction = useCallback((messageId, emoji, receiverId) => {
        if (socketRef.current) {
            socketRef.current.emit('messageReaction', { messageId, emoji, receiverId });
        }
    }, []);

    return {
        socket: socketRef.current,
        joinQueue,
        leaveQueue,
        sendMessage,
        sendTyping,
        disconnectPartner,
        reconnectToPartner,
        sendOffer,
        sendAnswer,
        sendIceCandidate,
        onOffer,
        onAnswer,
        onIceCandidate,
        onPartnerDisconnected,
        offOffer,
        offAnswer,
        offIceCandidate,
        offPartnerDisconnected,
        sendReaction,
    };
};

export default useSocket;
