const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
    user1: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    user2: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    type: {
        type: String,
        enum: ['call', 'chat'],
        required: true,
    },
    startedAt: {
        type: Date,
        default: Date.now,
    },
    endedAt: {
        type: Date,
        default: null,
    },
    duration: {
        type: Number, // in seconds
        default: 0,
    },
    reconnectAllowedUntil: {
        type: Date,
        default: null,
    },
});

module.exports = mongoose.model('Match', matchSchema);
