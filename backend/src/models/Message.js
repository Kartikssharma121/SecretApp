const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    matchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Match',
        required: true,
    },
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    receiverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    message: {
        type: String,
        trim: true,
    },
    image: {
        type: String,
    },
    timestamp: {
        type: Date,
        default: Date.now,
    },
    seen: {
        type: Boolean,
        default: false,
    },
    replyTo: {
        messageId: {
            type: String,
        },
        text: {
            type: String,
        },
        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
    },
    reactions: [
        {
            userId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
            emoji: {
                type: String,
            },
        },
    ],
});

module.exports = mongoose.model('Message', messageSchema);
