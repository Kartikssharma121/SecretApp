const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Match = require('../models/Match');
const Message = require('../models/Message');
const matchingService = require('../services/matchingService');

// Store socket user mappings
const userSockets = new Map(); // userId -> socketId
const socketUsers = new Map(); // socketId -> userId
const activeMatches = new Map(); // userId -> { partnerId, matchId, type }

const socketAuth = async (socket, next) => {
    try {
        const token = socket.handshake.auth.token;

        if (!token) {
            return next(new Error('Authentication error: No token provided'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');

        if (!user) {
            return next(new Error('Authentication error: User not found'));
        }

        socket.userId = user._id.toString();
        socket.user = user;
        next();
    } catch (error) {
        next(new Error('Authentication error: Invalid token'));
    }
};

const initializeSocket = (io) => {
    // Give matching service access to live socket map & clear stale sessions
    matchingService.setIO(io);
    matchingService.clearStaleSessions();

    // Socket authentication middleware
    io.use(socketAuth);

    io.on('connection', (socket) => {
        const userId = socket.userId;
        console.log(`User connected: ${userId} - Socket: ${socket.id}`);

        // Prevent dual login: Disconnect old socket if it exists
        const existingSocketId = userSockets.get(userId);
        if (existingSocketId && existingSocketId !== socket.id) {
            console.log(`[Socket] Disconnecting old socket for user ${userId}`);
            const oldSocket = io.sockets.sockets.get(existingSocketId);
            oldSocket?.disconnect(true);
        }

        // Store mapping
        userSockets.set(userId, socket.id);
        socketUsers.set(socket.id, userId);

        // Update user online status
        User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: Date.now() })
            .then(() => console.log(`User ${userId} is now online`))
            .catch((err) => console.error('Error updating online status:', err));

        // JOIN QUEUE
        socket.on('joinQueue', async (data) => {
            try {
                const { type, preferences } = data; // type: 'call' or 'chat'

                console.log(`User ${userId} joining ${type} queue with preferences:`, preferences);

                // Add to queue
                const result = await matchingService.addToQueue(
                    userId,
                    socket.id,
                    type,
                    preferences
                );

                if (!result.success) {
                    socket.emit('error', { message: result.message });
                    return;
                }

                // Try to find a match immediately
                const match = await matchingService.findMatch(userId, type, preferences);

                if (match) {
                    // Match found!
                    console.log(`Match found: ${userId} <-> ${match.partnerId}`);

                    // GHOST MATCH PROTECTION: Verify both sockets are still alive before DB record
                    const currentSocketAlive = io.sockets.sockets.has(socket.id);
                    const partnerSocketAlive = io.sockets.sockets.has(match.partnerSocketId);

                    if (!currentSocketAlive || !partnerSocketAlive) {
                        console.warn(`[Match] Aborting ghost match - Socket(s) died: current=${currentSocketAlive}, partner=${partnerSocketAlive}`);
                        await matchingService.cleanupUserSessions(userId);
                        await matchingService.cleanupUserSessions(match.partnerId);
                        return;
                    }

                    // Create match record
                    const matchRecord = await Match.create({
                        user1: userId,
                        user2: match.partnerId,
                        type,
                        startedAt: Date.now(),
                    });

                    // Store active match
                    activeMatches.set(userId, {
                        partnerId: match.partnerId,
                        matchId: matchRecord._id,
                        type,
                    });
                    activeMatches.set(match.partnerId, {
                        partnerId: userId,
                        matchId: matchRecord._id,
                        type,
                    });

                    // Notify both users
                    const partnerSocket = io.sockets.sockets.get(match.partnerSocketId);

                    socket.emit('matchFound', {
                        matchId: matchRecord._id,
                        partnerId: match.partnerId,
                        type,
                        isInitiator: true, // The one who joined second initiates the WebRTC offer
                    });

                    if (partnerSocket) {
                        partnerSocket.emit('matchFound', {
                            matchId: matchRecord._id,
                            partnerId: userId,
                            type,
                            isInitiator: false, // The one waiting waits for the offer
                        });
                    }
                } else {
                    // No match yet, waiting in queue
                    socket.emit('queueStatus', { status: 'waiting', type });
                }
            } catch (error) {
                console.error('Join queue error:', error);
                socket.emit('error', { message: 'Failed to join queue' });
            }
        });

        // LEAVE QUEUE
        socket.on('leaveQueue', async (data) => {
            try {
                const { type } = data;
                await matchingService.removeFromQueue(userId, type);
                socket.emit('queueStatus', { status: 'left', type });
            } catch (error) {
                console.error('Leave queue error:', error);
            }
        });

        // WEBRTC SIGNALING - OFFER
        socket.on('offer', async (data) => {
            try {
                const { offer, partnerId } = data;

                // Security check: only allow signaling with active partner
                const matchData = activeMatches.get(userId);
                if (!matchData || matchData.partnerId !== partnerId) {
                    console.warn(`[Security] Blocked unauthorized offer from ${userId} to ${partnerId}`);
                    return;
                }

                const partnerSocketId = userSockets.get(partnerId);
                if (partnerSocketId) {
                    io.to(partnerSocketId).emit('offer', {
                        offer,
                        senderId: userId,
                    });
                }
            } catch (error) {
                console.error('Offer error:', error);
            }
        });

        // WEBRTC SIGNALING - ANSWER
        socket.on('answer', async (data) => {
            try {
                const { answer, partnerId } = data;

                // Security check
                const matchData = activeMatches.get(userId);
                if (!matchData || matchData.partnerId !== partnerId) {
                    console.warn(`[Security] Blocked unauthorized answer from ${userId} to ${partnerId}`);
                    return;
                }

                const partnerSocketId = userSockets.get(partnerId);
                if (partnerSocketId) {
                    io.to(partnerSocketId).emit('answer', {
                        answer,
                        senderId: userId,
                    });
                }
            } catch (error) {
                console.error('Answer error:', error);
            }
        });

        // WEBRTC SIGNALING - ICE CANDIDATE
        socket.on('iceCandidate', async (data) => {
            try {
                const { candidate, partnerId } = data;

                // Security check
                const matchData = activeMatches.get(userId);
                if (!matchData || matchData.partnerId !== partnerId) {
                    console.warn(`[Security] Blocked unauthorized ICE candidate from ${userId} to ${partnerId}`);
                    return;
                }

                const partnerSocketId = userSockets.get(partnerId);
                if (partnerSocketId) {
                    io.to(partnerSocketId).emit('iceCandidate', {
                        candidate,
                        senderId: userId,
                    });
                }
            } catch (error) {
                console.error('ICE candidate error:', error);
            }
        });

        // CHAT MESSAGE
        socket.on('message', async (data) => {
            try {
                const { message, receiverId, matchId } = data;

                // Security check
                const matchData = activeMatches.get(userId);
                if (!matchData || matchData.partnerId !== receiverId || matchData.matchId.toString() !== matchId.toString()) {
                    console.warn(`[Security] Blocked unauthorized message from ${userId} to ${receiverId}`);
                    return;
                }

                // Save message to database
                const newMessage = await Message.create({
                    matchId,
                    senderId: userId,
                    receiverId,
                    message,
                    timestamp: Date.now(),
                    seen: false,
                });

                // Send to receiver
                const receiverSocketId = userSockets.get(receiverId);
                if (receiverSocketId) {
                    io.to(receiverSocketId).emit('message', {
                        _id: newMessage._id,
                        matchId,
                        senderId: userId,
                        receiverId,
                        message,
                        timestamp: newMessage.timestamp,
                        seen: false,
                    });
                }

                // Confirm to sender
                socket.emit('messageSent', {
                    _id: newMessage._id,
                    matchId,
                    senderId: userId,
                    receiverId,
                    message,
                    timestamp: newMessage.timestamp,
                    seen: false,
                });
            } catch (error) {
                console.error('Message error:', error);
                socket.emit('error', { message: 'Failed to send message' });
            }
        });

        // TYPING INDICATOR
        socket.on('typing', (data) => {
            try {
                const { partnerId, isTyping } = data;

                // Security check
                const matchData = activeMatches.get(userId);
                if (!matchData || matchData.partnerId !== partnerId) {
                    return;
                }

                const partnerSocketId = userSockets.get(partnerId);
                if (partnerSocketId) {
                    io.to(partnerSocketId).emit('typing', {
                        senderId: userId,
                        isTyping,
                    });
                }
            } catch (error) {
                console.error('Typing error:', error);
            }
        });

        // DISCONNECT PARTNER
        socket.on('disconnectPartner', async (data) => {
            try {
                const matchData = activeMatches.get(userId);

                if (matchData) {
                    const { partnerId, matchId, type } = matchData;

                    // Update match record
                    const match = await Match.findById(matchId);
                    if (match) {
                        match.endedAt = Date.now();
                        match.duration = Math.floor((match.endedAt - match.startedAt) / 1000);
                        match.reconnectAllowedUntil = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes
                        await match.save();
                    }

                    // Notify partner
                    const partnerSocketId = userSockets.get(partnerId);
                    if (partnerSocketId) {
                        io.to(partnerSocketId).emit('partnerDisconnected', {
                            partnerId: userId,
                            matchId,
                            canReconnect: false, // cancelled match — no reconnect
                        });
                    }

                    // Clean up BOTH sides of the active match
                    activeMatches.delete(userId);
                    activeMatches.delete(partnerId);

                    // Clean up both sessions so neither user is stuck
                    await matchingService.cleanupUserSessions(userId);
                    await matchingService.cleanupUserSessions(partnerId);

                    socket.emit('disconnected', { matchId });
                }
            } catch (error) {
                console.error('Disconnect partner error:', error);
            }
        });

        // RECONNECT TO PARTNER
        socket.on('reconnectPartner', async (data) => {
            try {
                const { matchId } = data;

                // Find match
                const match = await Match.findById(matchId);

                if (!match) {
                    socket.emit('error', { message: 'Match not found' });
                    return;
                }

                // Check if reconnect is allowed
                if (!match.reconnectAllowedUntil || new Date() > match.reconnectAllowedUntil) {
                    socket.emit('error', { message: 'Reconnect window expired' });
                    return;
                }

                // Determine partner
                const partnerId =
                    match.user1.toString() === userId ? match.user2.toString() : match.user1.toString();

                // Check if either user is already in an active match
                if (activeMatches.has(userId) || activeMatches.has(partnerId)) {
                    socket.emit('error', { message: 'User already in active match' });
                    return;
                }

                // Check if partner is online
                const partnerSocketId = userSockets.get(partnerId);
                if (!partnerSocketId) {
                    socket.emit('error', { message: 'Partner is not online' });
                    return;
                }

                // Reconnect both
                activeMatches.set(userId, {
                    partnerId,
                    matchId: match._id,
                    type: match.type,
                });
                activeMatches.set(partnerId, {
                    partnerId: userId,
                    matchId: match._id,
                    type: match.type,
                });

                // Update match
                match.endedAt = null;
                match.reconnectAllowedUntil = null;
                await match.save();

                // Notify both
                socket.emit('reconnected', {
                    matchId: match._id,
                    partnerId,
                    type: match.type,
                });

                io.to(partnerSocketId).emit('reconnected', {
                    matchId: match._id,
                    partnerId: userId,
                    type: match.type,
                });
            } catch (error) {
                console.error('Reconnect error:', error);
                socket.emit('error', { message: 'Failed to reconnect' });
            }
        });

        // DISCONNECT
        socket.on('disconnect', async () => {
            console.log(`User disconnected: ${userId} - Socket: ${socket.id}`);

            try {
                // Update user status
                await User.findByIdAndUpdate(userId, {
                    isOnline: false,
                    lastSeen: Date.now(),
                });

                // Check if user was in an active match
                const matchData = activeMatches.get(userId);
                if (matchData) {
                    const { partnerId, matchId } = matchData;

                    // Update match
                    const match = await Match.findById(matchId);
                    if (match && !match.endedAt) {
                        match.endedAt = Date.now();
                        match.duration = Math.floor((match.endedAt - match.startedAt) / 1000);
                        match.reconnectAllowedUntil = new Date(Date.now() + 2 * 60 * 1000);
                        await match.save();
                    }

                    // Notify partner
                    const partnerSocketId = userSockets.get(partnerId);
                    if (partnerSocketId) {
                        io.to(partnerSocketId).emit('partnerDisconnected', {
                            partnerId: userId,
                            matchId,
                            canReconnect: true,
                        });
                    }

                    activeMatches.delete(userId);
                    activeMatches.delete(partnerId);
                }

                // Clean up sessions
                await matchingService.cleanupUserSessions(userId);

                // Remove mappings
                userSockets.delete(userId);
                socketUsers.delete(socket.id);
            } catch (error) {
                console.error('Disconnect cleanup error:', error);
            }
        });
    });
};

module.exports = initializeSocket;
