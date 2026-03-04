const ActiveSession = require('../models/ActiveSession');
const User = require('../models/User');

class MatchingService {
    constructor() {
        this.waitingQueues = {
            call: [],
            chat: [],
        };
        this.io = null; // set after socket server starts
    }

    setIO(io) {
        this.io = io;
    }

    // Clear all stale sessions on server startup
    async clearStaleSessions() {
        try {
            const deleted = await ActiveSession.deleteMany({
                status: { $in: ['waiting', 'matched', 'in-call', 'in-chat'] },
            });
            console.log(`[MatchingService] Cleared ${deleted.deletedCount} stale sessions on startup`);
            this.waitingQueues = { call: [], chat: [] };
        } catch (error) {
            console.error('clearStaleSessions error:', error);
        }
    }

    // Add user to queue
    async addToQueue(userId, socketId, type, preferences) {
        try {
            // Check if user already in queue or active session
            const existingSession = await ActiveSession.findOne({
                userId,
                status: { $in: ['waiting', 'matched', 'in-call', 'in-chat'] },
            });

            if (existingSession) {
                // Force-clean the stale session so the user can re-queue (e.g. after offer timeout)
                console.log(`[MatchingService] Force-cleaning stale session for ${userId} before re-queue`);
                await ActiveSession.deleteMany({ userId });
                this.waitingQueues[type] = this.waitingQueues[type].filter(
                    (item) => item.userId.toString() !== userId.toString()
                );
            }

            // Fetch user to get gender for queue optimization
            const user = await User.findById(userId);
            if (!user) {
                return { success: false, message: 'User not found' };
            }

            // Create new session
            const session = await ActiveSession.create({
                userId,
                socketId,
                type,
                preferences,
                status: 'waiting',
            });

            // Add to in-memory queue for faster matching
            this.waitingQueues[type].push({
                sessionId: session._id,
                userId,
                socketId,
                preferences,
                gender: user.gender, // store gender here to avoid DB call in loop
            });

            return { success: true, session };
        } catch (error) {
            console.error('Add to queue error:', error);
            return { success: false, message: error.message };
        }
    }

    // Find match for user
    async findMatch(userId, type, preferences) {
        try {
            const user = await User.findById(userId);
            if (!user) return null;

            const userGender = user.gender;
            const queue = this.waitingQueues[type];

            // Find compatible match
            for (let i = 0; i < queue.length; i++) {
                const potential = queue[i];

                // Skip self
                if (potential.userId.toString() === userId.toString()) {
                    continue;
                }

                // Check gender preferences using stored gender
                const currentUserPreference = preferences.gender;
                const potentialUserPreference = potential.preferences.gender;

                // Check if preferences match
                const currentMatch =
                    currentUserPreference === 'Any' ||
                    potential.gender === currentUserPreference;

                const potentialMatch =
                    potentialUserPreference === 'Any' ||
                    userGender === potentialUserPreference;

                if (currentMatch && potentialMatch) {
                    // Verify partner socket is still alive before matching
                    const partnerSocketLive =
                        this.io && this.io.sockets.sockets.has(potential.socketId);

                    if (!partnerSocketLive) {
                        console.log(`[MatchingService] Skipping ghost entry for ${potential.userId} — socket ${potential.socketId} is gone`);
                        // Remove stale ghost from queue and DB
                        queue.splice(i, 1);
                        await ActiveSession.deleteOne({ userId: potential.userId, status: 'waiting' });
                        i--; // re-check this index
                        continue;
                    }

                    // ATOMIC DB LOCK: Only match if both users are still in 'waiting' status
                    const userUpdate = await ActiveSession.findOneAndUpdate(
                        { userId, status: 'waiting' },
                        { status: 'matched', matchedWith: potential.userId }
                    );

                    if (!userUpdate) {
                        // Current user was matched by someone else or left
                        return null;
                    }

                    const partnerUpdate = await ActiveSession.findOneAndUpdate(
                        { userId: potential.userId, status: 'waiting' },
                        { status: 'matched', matchedWith: userId }
                    );

                    if (!partnerUpdate) {
                        // Partner was matched by someone else or left
                        // Rollback current user's status to 'waiting'
                        await ActiveSession.findOneAndUpdate(
                            { userId, status: 'matched' },
                            { status: 'waiting', matchedWith: null }
                        );
                        // Remove stale partner from local queue view and continue loop
                        queue.splice(i, 1);
                        i--;
                        continue;
                    }

                    // Match found! Remove both from in-memory queue to keep it clean
                    queue.splice(i, 1);
                    this.waitingQueues[type] = queue.filter(
                        (item) => item.userId.toString() !== userId.toString()
                    );

                    return {
                        partnerId: potential.userId,
                        partnerSocketId: potential.socketId,
                        sessionId: potential.sessionId,
                    };
                }
            }

            return null;
        } catch (error) {
            console.error('Find match error:', error);
            return null;
        }
    }

    // Remove from queue
    async removeFromQueue(userId, type) {
        try {
            // Remove from database
            await ActiveSession.deleteOne({
                userId,
                type,
                status: 'waiting',
            });

            // Remove from in-memory queue
            const queue = this.waitingQueues[type];
            const index = queue.findIndex(
                (item) => item.userId.toString() === userId.toString()
            );

            if (index !== -1) {
                queue.splice(index, 1);
            }

            return { success: true };
        } catch (error) {
            console.error('Remove from queue error:', error);
            return { success: false, message: error.message };
        }
    }

    // Update session status
    async updateSessionStatus(userId, status, matchedWith = null) {
        try {
            const update = { status };
            if (matchedWith) {
                update.matchedWith = matchedWith;
            }

            await ActiveSession.findOneAndUpdate({ userId }, update);
        } catch (error) {
            console.error('Update session status error:', error);
        }
    }

    // Clean up user sessions
    async cleanupUserSessions(userId) {
        try {
            await ActiveSession.deleteMany({ userId });

            // Remove from all queues
            Object.keys(this.waitingQueues).forEach((type) => {
                this.waitingQueues[type] = this.waitingQueues[type].filter(
                    (item) => item.userId.toString() !== userId.toString()
                );
            });
        } catch (error) {
            console.error('Cleanup sessions error:', error);
        }
    }
}

module.exports = new MatchingService();
