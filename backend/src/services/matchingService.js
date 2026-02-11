const ActiveSession = require('../models/ActiveSession');
const User = require('../models/User');

class MatchingService {
    constructor() {
        this.waitingQueues = {
            call: [],
            chat: [],
        };
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
                return { success: false, message: 'Already in queue or active session' };
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

                // Get potential partner details
                const potentialUser = await User.findById(potential.userId);
                if (!potentialUser) continue;

                // Check gender preferences
                const currentUserPreference = preferences.gender;
                const potentialUserPreference = potential.preferences.gender;

                // Check if preferences match
                const currentMatch =
                    currentUserPreference === 'Any' ||
                    potentialUser.gender === currentUserPreference;

                const potentialMatch =
                    potentialUserPreference === 'Any' ||
                    userGender === potentialUserPreference;

                if (currentMatch && potentialMatch) {
                    // Match found! Remove from queue
                    queue.splice(i, 1);

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
