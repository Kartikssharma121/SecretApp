import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    isConnected: false,
    matchData: null,
    messages: [],
    isPartnerTyping: false,
    queueStatus: null,
};

const socketSlice = createSlice({
    name: 'socket',
    initialState,
    reducers: {
        setConnected: (state, action) => {
            state.isConnected = action.payload;
        },
        setMatchData: (state, action) => {
            state.matchData = action.payload;
        },
        clearMatchData: (state) => {
            state.matchData = null;
            state.messages = [];
            state.isPartnerTyping = false;
        },
        addMessage: (state, action) => {
            state.messages.push(action.payload);
        },
        updateMessageReaction: (state, action) => {
            const { messageId, reaction } = action.payload; // reaction: { userId, emoji }
            const message = state.messages.find((m) => m._id === messageId);
            if (message) {
                if (!message.reactions) {
                    message.reactions = [];
                }
                // Filter out any existing reaction from this user
                message.reactions = message.reactions.filter((r) => r.userId !== reaction.userId);
                // If there's a new emoji (i.e. not removed), add it
                if (reaction.emoji) {
                    message.reactions.push(reaction);
                }
            }
        },
        setMessages: (state, action) => {
            state.messages = action.payload;
        },
        setPartnerTyping: (state, action) => {
            state.isPartnerTyping = action.payload;
        },
        setQueueStatus: (state, action) => {
            state.queueStatus = action.payload;
        },
    },
});

export const {
    setConnected,
    setMatchData,
    clearMatchData,
    addMessage,
    updateMessageReaction,
    setMessages,
    setPartnerTyping,
    setQueueStatus,
} = socketSlice.actions;

export default socketSlice.reducer;
