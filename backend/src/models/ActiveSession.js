const mongoose = require('mongoose');

const activeSessionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    socketId: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: ['waiting', 'matched', 'in-call', 'in-chat'],
        default: 'waiting',
    },
    matchedWith: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },
    preferences: {
        gender: {
            type: String,
            enum: ['Male', 'Female', 'Any'],
            default: 'Any',
        },
        ageRange: {
            min: Number,
            max: Number,
        },
    },
    type: {
        type: String,
        enum: ['call', 'chat'],
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    expiresAt: {
        type: Date,
        default: () => new Date(+new Date() + 10 * 60 * 1000), // 10 minutes
    },
});

// Create index for automatic document expiration
activeSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('ActiveSession', activeSessionSchema);
