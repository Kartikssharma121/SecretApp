import React, { useEffect, useState, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    StatusBar,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import useSocket from '../hooks/useSocket';
import { addMessage } from '../store/socketSlice';
import { selectCurrentUser } from '../store/authSlice';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomAlert from '../components/CustomAlert';

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
    const [alertConfig, setAlertConfig] = useState({ visible: false });
    const flatListRef = useRef(null);

    const showAlert = (title, message, buttons) =>
        setAlertConfig({ visible: true, title, message, buttons });
    const hideAlert = () => setAlertConfig({ visible: false });

    useEffect(() => {
        if (isSocketConnected && socket.socket) {
            socket.joinQueue(type, preferences);
        }

        socket.onPartnerDisconnected((data) => {
            showAlert(
                'Disconnected',
                'Stranger disconnected',
                [
                    { text: 'Close', onPress: () => { hideAlert(); safeGoBack(); } },
                    {
                        text: 'Find New',
                        onPress: () => {
                            hideAlert();
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

    useEffect(() => {
        if (matchData && matchData.type === 'chat') {
            setIsSearching(false);
            setPartnerId(matchData.partnerId);
            setMatchId(matchData.matchId);
        }
    }, [matchData]);

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
            socket.sendMessage(messageText.trim(), partnerId, matchId);
            setMessageText('');
        }
    };

    const handleDisconnect = () => {
        showAlert('Disconnect', 'Are you sure you want to disconnect?', [
            { text: 'Cancel', style: 'cancel', onPress: hideAlert },
            {
                text: 'Disconnect',
                style: 'destructive',
                onPress: () => {
                    hideAlert();
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
                    styles.messageWrapper,
                    isMyMessage ? styles.myMessageWrapper : styles.theirMessageWrapper,
                ]}>
                {!isMyMessage && (
                    <View style={styles.avatarCircle}>
                        <Text style={styles.avatarText}>S</Text>
                    </View>
                )}
                <View style={[
                    styles.messageBubble,
                    isMyMessage ? styles.myMessage : styles.theirMessage,
                ]}>
                    <Text style={[styles.messageText, !isMyMessage && styles.theirMessageText]}>
                        {item.message}
                    </Text>
                    <Text style={[styles.messageTime, !isMyMessage && styles.theirMessageTime]}>
                        {new Date(item.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                        })}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <LinearGradient colors={['#241b2f', '#120f17']} style={styles.gradientContainer}>
            <SafeAreaView style={styles.safeArea}>
                <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
                <KeyboardAvoidingView
                    style={styles.container}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    keyboardVerticalOffset={0}>

                    {isSearching ? (
                        /* ── Searching State ── */
                        <View style={styles.searchingContainer}>
                            <View style={styles.searchingIconWrap}>
                                <Text style={styles.searchingIcon}>🔍</Text>
                            </View>
                            <Text style={styles.searchingText}>Finding a Stranger…</Text>
                            <Text style={styles.searchingSubtext}>
                                {queueStatus?.status === 'waiting' ? 'Waiting in queue' : 'Matching...'}
                            </Text>
                            <ActivityIndicator color="#d0a0c8" size="large" style={styles.loader} />
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
                        /* ── Chat State ── */
                        <View style={styles.chatContainer}>
                            {/* Header */}
                            <View style={styles.header}>
                                <View style={styles.strangerInfo}>
                                    <View style={styles.strangerAvatar}>
                                        <Text style={styles.strangerAvatarText}>S</Text>
                                    </View>
                                    <View>
                                        <Text style={styles.strangerText}>Stranger</Text>
                                        <Text style={styles.statusText}>● Online</Text>
                                    </View>
                                </View>
                                <View style={styles.headerButtons}>
                                    <TouchableOpacity style={styles.headerButton} onPress={handleFindNew}>
                                        <Text style={styles.headerButtonText}>Next</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.headerButton, styles.disconnectButton]}
                                        onPress={handleDisconnect}>
                                        <Text style={styles.headerButtonText}>End</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Messages */}
                            <FlatList
                                ref={flatListRef}
                                data={messages}
                                renderItem={renderMessage}
                                keyExtractor={(item) => item._id}
                                contentContainerStyle={styles.messagesList}
                                onContentSizeChange={() =>
                                    flatListRef.current?.scrollToEnd({ animated: true })
                                }
                                showsVerticalScrollIndicator={false}
                            />

                            {/* Typing indicator */}
                            {isPartnerTyping && (
                                <View style={styles.typingContainer}>
                                    <Text style={styles.typingText}>Stranger is typing…</Text>
                                </View>
                            )}

                            {/* Input Bar */}
                            <View style={styles.inputContainer}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Type a message…"
                                    placeholderTextColor="#6a6a8a"
                                    value={messageText}
                                    onChangeText={setMessageText}
                                    multiline
                                    maxLength={500}
                                />
                                <TouchableOpacity
                                    style={[styles.sendButton, !messageText.trim() && styles.sendButtonDisabled]}
                                    onPress={handleSendMessage}
                                    disabled={!messageText.trim()}>
                                    <Text style={styles.sendButtonText}>↑</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </KeyboardAvoidingView>
            </SafeAreaView>
            <CustomAlert
                visible={alertConfig.visible}
                title={alertConfig.title}
                message={alertConfig.message}
                buttons={alertConfig.buttons || []}
                onClose={hideAlert}
            />
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    gradientContainer: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
    },
    container: {
        flex: 1,
    },

    // ── Searching ──
    searchingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    searchingIconWrap: {
        width: 110,
        height: 110,
        borderRadius: 55,
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 28,
    },
    searchingIcon: {
        fontSize: 48,
    },
    searchingText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 8,
        letterSpacing: 0.3,
    },
    searchingSubtext: {
        fontSize: 15,
        color: '#a0a0b8',
        marginBottom: 36,
    },
    loader: {
        marginBottom: 40,
    },
    cancelButton: {
        backgroundColor: 'rgba(255,255,255,0.07)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        borderRadius: 16,
        paddingHorizontal: 44,
        paddingVertical: 14,
    },
    cancelButtonText: {
        color: '#d0a0c8',
        fontSize: 16,
        fontWeight: '600',
    },

    // ── Chat ──
    chatContainer: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.07)',
        backgroundColor: 'rgba(255,255,255,0.03)',
    },
    strangerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    strangerAvatar: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: 'rgba(180, 80, 160, 0.4)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    strangerAvatarText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 18,
    },
    strangerText: {
        fontSize: 17,
        fontWeight: 'bold',
        color: '#fff',
    },
    statusText: {
        fontSize: 12,
        color: '#4cca88',
        marginTop: 1,
        fontWeight: '500',
    },
    headerButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    headerButton: {
        backgroundColor: 'rgba(255,255,255,0.07)',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    disconnectButton: {
        backgroundColor: 'rgba(220, 70, 100, 0.2)',
        borderColor: 'rgba(220, 70, 100, 0.35)',
    },
    headerButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 13,
    },

    // ── Messages ──
    messagesList: {
        padding: 16,
        paddingBottom: 8,
    },
    messageWrapper: {
        flexDirection: 'row',
        marginBottom: 14,
        alignItems: 'flex-end',
    },
    myMessageWrapper: {
        justifyContent: 'flex-end',
    },
    theirMessageWrapper: {
        justifyContent: 'flex-start',
        gap: 8,
    },
    avatarCircle: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: 'rgba(180, 80, 160, 0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 2,
    },
    avatarText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 13,
    },
    messageBubble: {
        maxWidth: '75%',
        padding: 12,
        borderRadius: 18,
    },
    myMessage: {
        backgroundColor: 'rgba(180, 100, 200, 0.55)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        borderBottomRightRadius: 4,
    },
    theirMessage: {
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        borderBottomLeftRadius: 4,
    },
    messageText: {
        color: '#fff',
        fontSize: 15,
        lineHeight: 21,
        marginBottom: 4,
    },
    theirMessageText: {
        color: '#e8e8ff',
    },
    messageTime: {
        color: 'rgba(255,255,255,0.55)',
        fontSize: 10,
        alignSelf: 'flex-end',
    },
    theirMessageTime: {
        color: 'rgba(255,255,255,0.4)',
    },

    // ── Typing ──
    typingContainer: {
        paddingHorizontal: 20,
        paddingBottom: 6,
    },
    typingText: {
        color: '#8a8aaa',
        fontSize: 12,
        fontStyle: 'italic',
    },

    // ── Input ──
    inputContainer: {
        flexDirection: 'row',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.07)',
        backgroundColor: 'rgba(255,255,255,0.03)',
        alignItems: 'flex-end',
        gap: 10,
    },
    input: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderRadius: 22,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 16,
        paddingVertical: 10,
        fontSize: 15,
        color: '#fff',
        maxHeight: 110,
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 6,
    },
    sendButtonDisabled: {
        opacity: 0.35,
    },
    sendButtonText: {
        color: '#1a1a2e',
        fontWeight: 'bold',
        fontSize: 20,
    },
});

export default ChatScreen;
