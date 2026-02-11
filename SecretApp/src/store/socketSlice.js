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
    setMessages,
    setPartnerTyping,
    setQueueStatus,
} = socketSlice.actions;

export default socketSlice.reducer;
