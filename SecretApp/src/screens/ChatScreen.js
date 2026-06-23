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
    Modal,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import useSocket from '../hooks/useSocket';
import { addMessage, updateMessageReaction, clearMatchData } from '../store/socketSlice';
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
    const isChatActiveRef = useRef(false);
    const [replyToMessage, setReplyToMessage] = useState(null);
    const [selectedMessage, setSelectedMessage] = useState(null);

    const showAlert = (title, message, buttons) =>
        setAlertConfig({ visible: true, title, message, buttons });
    const hideAlert = () => setAlertConfig({ visible: false });

    useEffect(() => {
        const unsubscribe = navigation.addListener('beforeRemove', (e) => {
            if (!isChatActiveRef.current) {
                return;
            }

            e.preventDefault();

            showAlert(
                'Disconnect',
                'Are you sure you want to go back? The chat will be disconnected.',
                [
                    { text: 'Cancel', style: 'cancel', onPress: hideAlert },
                    {
                        text: 'Disconnect',
                        style: 'destructive',
                        onPress: () => {
                            hideAlert();
                            isChatActiveRef.current = false;
                            socket.disconnectPartner();
                            navigation.dispatch(e.data.action);
                        },
                    },
                ]
            );
        });

        return unsubscribe;
    }, [navigation, socket]);

    useEffect(() => {
        if (isSocketConnected && socket.socket) {
            socket.joinQueue(type, preferences);
        }

        socket.onPartnerDisconnected((data) => {
            isChatActiveRef.current = false;
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
                                setReplyToMessage(null);
                                setSelectedMessage(null);
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
        return () => {
            dispatch(clearMatchData());
        };
    }, [dispatch]);

    useEffect(() => {
        if (matchData && matchData.type === 'chat') {
            setIsSearching(false);
            setPartnerId(matchData.partnerId);
            setMatchId(matchData.matchId);
            isChatActiveRef.current = true;
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
            const replyToData = replyToMessage ? {
                messageId: replyToMessage._id,
                text: replyToMessage.message,
                senderId: replyToMessage.senderId,
            } : null;

            const newMessage = {
                _id: Date.now().toString(),
                matchId,
                senderId: userId,
                receiverId: partnerId,
                message: messageText.trim(),
                timestamp: new Date(),
                seen: false,
                replyTo: replyToData,
            };
            dispatch(addMessage(newMessage));
            socket.sendMessage(messageText.trim(), partnerId, matchId, replyToData);
            setMessageText('');
            setReplyToMessage(null);
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
                    isChatActiveRef.current = false;
                    socket.disconnectPartner();
                    safeGoBack();
                },
            },
        ]);
    };

    const handleFindNew = () => {
        isChatActiveRef.current = false;
        socket.disconnectPartner();
        socket.joinQueue(type, preferences);
        setIsSearching(true);
        setPartnerId(null);
        setMatchId(null);
        setReplyToMessage(null);
        setSelectedMessage(null);
    };

    const handleReactToMessage = (message, emoji) => {
        if (!message) return;

        const existingReaction = message.reactions?.find((r) => r.userId === userId);
        const newEmoji = existingReaction?.emoji === emoji ? null : emoji;

        dispatch(updateMessageReaction({
            messageId: message._id,
            reaction: { userId, emoji: newEmoji },
        }));

        socket.sendReaction(message._id, newEmoji, partnerId);
        setSelectedMessage(null);
    };

    const renderMessage = ({ item }) => {
        const isMyMessage = item.senderId === userId;
        const hasReactions = item.reactions && item.reactions.length > 0;
        return (
            <View
                style={[
                    styles.messageWrapper,
                    isMyMessage ? styles.myMessageWrapper : styles.theirMessageWrapper,
                    hasReactions && styles.messageWrapperWithReactions,
                ]}>
                {!isMyMessage && (
                    <View style={styles.avatarCircle}>
                        <Text style={styles.avatarText}>S</Text>
                    </View>
                )}
                <View style={styles.bubbleContainer}>
                    <TouchableOpacity
                        activeOpacity={0.85}
                        onLongPress={() => setSelectedMessage(item)}
                        style={[
                            styles.messageBubble,
                            isMyMessage ? styles.myMessage : styles.theirMessage,
                        ]}>
                        {item.replyTo && item.replyTo.text && (
                            <View style={[
                                styles.messageReplyQuote,
                                isMyMessage ? styles.myMessageReplyQuote : styles.theirMessageReplyQuote
                            ]}>
                                <Text style={styles.messageReplySender}>
                                    {item.replyTo.senderId === userId ? 'You' : 'Stranger'}
                                </Text>
                                <Text style={styles.messageReplyText} numberOfLines={2}>
                                    {item.replyTo.text}
                                </Text>
                            </View>
                        )}
                        <Text style={[styles.messageText, !isMyMessage && styles.theirMessageText]}>
                            {item.message}
                        </Text>
                        <Text style={[styles.messageTime, !isMyMessage && styles.theirMessageTime]}>
                            {new Date(item.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                            })}
                        </Text>
                    </TouchableOpacity>
                    {hasReactions && (
                        <View style={[
                            styles.reactionPill,
                            isMyMessage ? styles.myReactionPill : styles.theirReactionPill
                        ]}>
                            <Text style={styles.reactionText}>
                                {item.reactions.map((r) => r.emoji).join('')}
                            </Text>
                        </View>
                    )}
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

                            {/* Reply Preview */}
                            {replyToMessage && (
                                <View style={styles.replyPreviewContainer}>
                                    <View style={styles.replyPreviewBar}>
                                        <View style={styles.replyPreviewLeftBorder} />
                                        <View style={styles.replyPreviewContent}>
                                            <Text style={styles.replyPreviewSender}>
                                                Reply to {replyToMessage.senderId === userId ? 'You' : 'Stranger'}
                                            </Text>
                                            <Text style={styles.replyPreviewText} numberOfLines={1}>
                                                {replyToMessage.message}
                                            </Text>
                                        </View>
                                        <TouchableOpacity
                                            style={styles.replyPreviewCloseButton}
                                            onPress={() => setReplyToMessage(null)}>
                                            <Text style={styles.replyPreviewCloseText}>✕</Text>
                                        </TouchableOpacity>
                                    </View>
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
            {/* Message Options / Reactions Modal */}
            <Modal
                visible={!!selectedMessage}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setSelectedMessage(null)}
            >
                <TouchableOpacity
                    style={styles.modalBackdrop}
                    activeOpacity={1}
                    onPress={() => setSelectedMessage(null)}
                >
                    <View style={styles.reactionModalContent}>
                        {/* Reaction emojis row */}
                        <View style={styles.reactionEmojisRow}>
                            {['👍', '❤️', '😂', '😮', '😢', '🙏'].map((emoji) => {
                                const userReaction = selectedMessage?.reactions?.find((r) => r.userId === userId);
                                const isSelected = userReaction?.emoji === emoji;
                                return (
                                    <TouchableOpacity
                                        key={emoji}
                                        style={[
                                            styles.reactionEmojiButton,
                                            isSelected && styles.reactionEmojiButtonSelected
                                        ]}
                                        onPress={() => handleReactToMessage(selectedMessage, emoji)}
                                    >
                                        <Text style={styles.reactionEmojiText}>{emoji}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Options list */}
                        <View style={styles.optionsList}>
                            <TouchableOpacity
                                style={styles.optionItem}
                                onPress={() => {
                                    setReplyToMessage(selectedMessage);
                                    setSelectedMessage(null);
                                }}
                            >
                                <Text style={styles.optionIcon}>💬</Text>
                                <Text style={styles.optionText}>Reply</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.optionItem, styles.optionItemLast]}
                                onPress={() => setSelectedMessage(null)}
                            >
                                <Text style={styles.optionIcon}>✕</Text>
                                <Text style={[styles.optionText, styles.cancelOptionText]}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>
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
    replyPreviewContainer: {
        paddingHorizontal: 14,
        paddingTop: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
    },
    replyPreviewBar: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 10,
        overflow: 'hidden',
        alignItems: 'center',
        paddingRight: 10,
    },
    replyPreviewLeftBorder: {
        width: 4,
        height: '100%',
        backgroundColor: '#b45080',
    },
    replyPreviewContent: {
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    replyPreviewSender: {
        color: '#d0a0c8',
        fontSize: 13,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    replyPreviewText: {
        color: '#a0a0b8',
        fontSize: 13,
    },
    replyPreviewCloseButton: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.08)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    replyPreviewCloseText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    messageReplyQuote: {
        borderLeftWidth: 3,
        borderRadius: 4,
        padding: 6,
        marginBottom: 6,
    },
    myMessageReplyQuote: {
        borderLeftColor: '#fff',
        backgroundColor: 'rgba(0, 0, 0, 0.15)',
    },
    theirMessageReplyQuote: {
        borderLeftColor: '#b45080',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    messageReplySender: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#d0a0c8',
        marginBottom: 2,
    },
    messageReplyText: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.7)',
    },
    messageWrapperWithReactions: {
        marginBottom: 22,
    },
    bubbleContainer: {
        position: 'relative',
        maxWidth: '75%',
    },
    reactionPill: {
        position: 'absolute',
        bottom: -8,
        backgroundColor: '#241b2f',
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: 12,
        paddingHorizontal: 6,
        paddingVertical: 1,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.35,
        shadowRadius: 2.2,
        elevation: 3,
    },
    myReactionPill: {
        right: 8,
    },
    theirReactionPill: {
        left: 8,
    },
    reactionText: {
        fontSize: 12,
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    reactionModalContent: {
        width: '90%',
        maxWidth: 320,
        backgroundColor: '#1c1524',
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.45,
        shadowRadius: 16,
        elevation: 10,
    },
    reactionEmojisRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        borderRadius: 18,
        paddingVertical: 10,
        paddingHorizontal: 8,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    reactionEmojiButton: {
        width: 38,
        height: 38,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 19,
    },
    reactionEmojiButtonSelected: {
        backgroundColor: 'rgba(180, 100, 200, 0.35)',
        borderWidth: 1,
        borderColor: 'rgba(180, 100, 200, 0.6)',
    },
    reactionEmojiText: {
        fontSize: 24,
    },
    optionsList: {
        width: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 16,
        overflow: 'hidden',
    },
    optionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    },
    optionItemLast: {
        borderBottomWidth: 0,
    },
    optionIcon: {
        fontSize: 16,
        marginRight: 12,
        color: '#fff',
    },
    optionText: {
        fontSize: 15,
        color: '#fff',
        fontWeight: '600',
    },
    cancelOptionText: {
        color: '#a0a0b8',
    },
});

export default ChatScreen;
