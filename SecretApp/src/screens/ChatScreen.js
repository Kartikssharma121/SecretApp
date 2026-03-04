import React, { useEffect, useState, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import useSocket from '../hooks/useSocket';
import { addMessage } from '../store/socketSlice';
import { selectCurrentUser } from '../store/authSlice';

const ChatScreen = ({ navigation, route }) => {
    const { preferences, type } = route.params;
    const dispatch = useDispatch();
    const matchData = useSelector((state) => state.socket.matchData);
    const messages = useSelector((state) => state.socket.messages);
    const queueStatus = useSelector((state) => state.socket.queueStatus);
    const isSocketConnected = useSelector((state) => state.socket.isConnected);
    const isPartnerTyping = useSelector((state) => state.socket.isPartnerTyping);

    const user = useSelector(selectCurrentUser);
    const userId = user?._id;

    // Safe navigation helper
    const safeGoBack = () => {
        if (navigation.canGoBack()) {
            navigation.goBack();
        } else {
            navigation.navigate('Home');
        }
    };

    const socket = useSocket();
    const [isSearching, setIsSearching] = useState(true);
    const [partnerId, setPartnerId] = useState(null);
    const [matchId, setMatchId] = useState(null);
    const [messageText, setMessageText] = useState('');
    const flatListRef = useRef(null);

    // Join queue when socket is connected
    useEffect(() => {
        if (isSocketConnected && socket.socket) {
            socket.joinQueue(type, preferences);
        }

        // Listen for partner disconnected
        socket.onPartnerDisconnected((data) => {
            Alert.alert(
                'Disconnected',
                'Stranger disconnected',
                [
                    {
                        text: 'Close',
                        onPress: () => safeGoBack(),
                    },
                    {
                        text: 'Find New',
                        onPress: () => {
                            if (isSocketConnected) {
                                socket.joinQueue(type, preferences);
                                setIsSearching(true);
                                setPartnerId(null);
                                setMatchId(null);
                            }
                        },
                    },
                ]
            );
        });

        return () => {
            if (!matchData) {
                socket.leaveQueue(type);
            }
        };
    }, [isSocketConnected]);

    // Handle match found
    useEffect(() => {
        if (matchData && matchData.type === 'chat') {
            setIsSearching(false);
            setPartnerId(matchData.partnerId);
            setMatchId(matchData.matchId);
        }
    }, [matchData]);

    // Handle typing indicator
    useEffect(() => {
        let timeout;
        if (messageText && partnerId) {
            socket.sendTyping(partnerId, true);
            timeout = setTimeout(() => {
                socket.sendTyping(partnerId, false);
            }, 1000);
        } else if (partnerId) {
            socket.sendTyping(partnerId, false);
        }
        return () => clearTimeout(timeout);
    }, [messageText, partnerId]);

    const handleSendMessage = () => {
        if (messageText.trim() && partnerId && matchId) {
            // Add message to local state immediately
            const newMessage = {
                _id: Date.now().toString(),
                matchId,
                senderId: userId,
                receiverId: partnerId,
                message: messageText.trim(),
                timestamp: new Date(),
                seen: false,
            };
            dispatch(addMessage(newMessage));

            // Send via socket
            socket.sendMessage(messageText.trim(), partnerId, matchId);
            setMessageText('');
        }
    };

    const handleDisconnect = () => {
        Alert.alert('Disconnect', 'Are you sure you want to disconnect?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Disconnect',
                style: 'destructive',
                onPress: () => {
                    socket.disconnectPartner();
                    safeGoBack();
                },
            },
        ]);
    };

    const handleFindNew = () => {
        socket.disconnectPartner();
        socket.joinQueue(type, preferences);
        setIsSearching(true);
        setPartnerId(null);
        setMatchId(null);
    };

    const renderMessage = ({ item }) => {
        const isMyMessage = item.senderId === userId;
        return (
            <View
                style={[
                    styles.messageContainer,
                    isMyMessage ? styles.myMessage : styles.theirMessage,
                ]}>
                <Text style={styles.messageText}>{item.message}</Text>
                <Text style={styles.messageTime}>
                    {new Date(item.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                    })}
                </Text>
            </View>
        );
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={90}>
            {isSearching ? (
                <View style={styles.searchingContainer}>
                    <Text style={styles.searchingIcon}>🔍</Text>
                    <Text style={styles.searchingText}>Finding a stranger...</Text>
                    <Text style={styles.searchingSubtext}>
                        {queueStatus?.status === 'waiting' ? 'Waiting in queue' : 'Matching...'}
                    </Text>
                    <ActivityIndicator color="#e94560" size="large" style={styles.loader} />
                    <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => {
                            socket.leaveQueue(type);
                            safeGoBack();
                        }}>
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={styles.chatContainer}>
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.strangerText}>Stranger</Text>
                            <Text style={styles.statusText}>🟢 Online</Text>
                        </View>
                        <View style={styles.headerButtons}>
                            <TouchableOpacity
                                style={styles.headerButton}
                                onPress={handleFindNew}>
                                <Text style={styles.headerButtonText}>Next</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.headerButton, styles.disconnectButton]}
                                onPress={handleDisconnect}>
                                <Text style={styles.headerButtonText}>End</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        renderItem={renderMessage}
                        keyExtractor={(item) => item._id}
                        contentContainerStyle={styles.messagesList}
                        onContentSizeChange={() =>
                            flatListRef.current?.scrollToEnd({ animated: true })
                        }
                    />

                    {isPartnerTyping && (
                        <View style={styles.typingContainer}>
                            <Text style={styles.typingText}>Stranger is typing...</Text>
                        </View>
                    )}

                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            placeholder="Type a message..."
                            placeholderTextColor="#999"
                            value={messageText}
                            onChangeText={setMessageText}
                            multiline
                            maxLength={500}
                        />
                        <TouchableOpacity
                            style={[
                                styles.sendButton,
                                !messageText.trim() && styles.sendButtonDisabled,
                            ]}
                            onPress={handleSendMessage}
                            disabled={!messageText.trim()}>
                            <Text style={styles.sendButtonText}>Send</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1a1a2e',
    },
    searchingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 30,
    },
    searchingIcon: {
        fontSize: 80,
        marginBottom: 20,
    },
    searchingText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 10,
    },
    searchingSubtext: {
        fontSize: 16,
        color: '#999',
        marginBottom: 30,
    },
    loader: {
        marginBottom: 40,
    },
    cancelButton: {
        backgroundColor: '#e94560',
        borderRadius: 10,
        paddingHorizontal: 40,
        paddingVertical: 15,
    },
    cancelButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    chatContainer: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        paddingTop: 50,
        backgroundColor: '#16213e',
        borderBottomWidth: 1,
        borderBottomColor: '#0f3460',
    },
    strangerText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
    },
    statusText: {
        fontSize: 12,
        color: '#999',
        marginTop: 2,
    },
    headerButtons: {
        flexDirection: 'row',
        gap: 10,
    },
    headerButton: {
        backgroundColor: '#0f3460',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 8,
    },
    disconnectButton: {
        backgroundColor: '#e94560',
    },
    headerButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },
    messagesList: {
        padding: 15,
    },
    messageContainer: {
        maxWidth: '75%',
        marginBottom: 15,
        padding: 12,
        borderRadius: 15,
    },
    myMessage: {
        alignSelf: 'flex-end',
        backgroundColor: '#e94560',
    },
    theirMessage: {
        alignSelf: 'flex-start',
        backgroundColor: '#16213e',
    },
    messageText: {
        color: '#fff',
        fontSize: 16,
        marginBottom: 4,
    },
    messageTime: {
        color: '#fff',
        fontSize: 10,
        opacity: 0.7,
        alignSelf: 'flex-end',
    },
    typingContainer: {
        paddingHorizontal: 15,
        paddingVertical: 5,
    },
    typingText: {
        color: '#999',
        fontSize: 12,
        fontStyle: 'italic',
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 15,
        backgroundColor: '#16213e',
        borderTopWidth: 1,
        borderTopColor: '#0f3460',
        alignItems: 'center',
    },
    input: {
        flex: 1,
        backgroundColor: '#1a1a2e',
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 10,
        marginRight: 10,
        fontSize: 16,
        color: '#fff',
        maxHeight: 100,
    },
    sendButton: {
        backgroundColor: '#e94560',
        borderRadius: 20,
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    sendButtonDisabled: {
        opacity: 0.5,
    },
    sendButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
});

export default ChatScreen;
