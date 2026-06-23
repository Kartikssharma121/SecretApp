import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    AppState,
    Animated,
    StatusBar,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { clearMatchData } from '../store/socketSlice';
import useSocket from '../hooks/useSocket';
import useWebRTC from '../hooks/useWebRTC';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomAlert from '../components/CustomAlert';

// Animated pulsing ring component
const PulseRing = ({ delay = 0, size = 180, color = 'rgba(180,100,200,0.25)' }) => {
    const anim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.delay(delay),
                Animated.timing(anim, {
                    toValue: 1,
                    duration: 1800,
                    useNativeDriver: true,
                }),
                Animated.timing(anim, {
                    toValue: 0,
                    duration: 0,
                    useNativeDriver: true,
                }),
            ])
        );
        pulse.start();
        return () => pulse.stop();
    }, []);

    const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.2] });
    const opacity = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.6, 0.25, 0] });

    return (
        <Animated.View
            style={[
                styles.pulseRing,
                {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    backgroundColor: color,
                    transform: [{ scale }],
                    opacity,
                    position: 'absolute',
                },
            ]}
        />
    );
};

const VoiceCallScreen = ({ navigation, route }) => {
    const { preferences, type } = route.params;
    const matchData = useSelector((state) => state.socket.matchData);
    const dispatch = useDispatch();
    const queueStatus = useSelector((state) => state.socket.queueStatus);
    const isSocketConnected = useSelector((state) => state.socket.isConnected);

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
    const [callDuration, setCallDuration] = useState(0);
    const [alertConfig, setAlertConfig] = useState({ visible: false });
    const offerTimeoutRef = useRef(null);
    const callTimerRef = useRef(null);
    const isCallActiveRef = useRef(false);

    const showAlert = (title, message, buttons) =>
        setAlertConfig({ visible: true, title, message, buttons });
    const hideAlert = () => setAlertConfig({ visible: false });

    useEffect(() => {
        const unsubscribe = navigation.addListener('beforeRemove', (e) => {
            if (!isCallActiveRef.current) {
                return;
            }

            e.preventDefault();

            showAlert(
                'End Call',
                'Are you sure you want to go back? The call will be disconnected.',
                [
                    { text: 'Cancel', style: 'cancel', onPress: hideAlert },
                    {
                        text: 'End',
                        style: 'destructive',
                        onPress: () => {
                            hideAlert();
                            isCallActiveRef.current = false;
                            endCall();
                            socket.disconnectPartner();
                            navigation.dispatch(e.data.action);
                        },
                    },
                ]
            );
        });

        return unsubscribe;
    }, [navigation, socket, endCall]);

    const { toggleMute, endCall, isMuted, isConnected } = useWebRTC(
        socket,
        partnerId,
        matchData?.isInitiator || false
    );

    useEffect(() => {
        return () => {
            dispatch(clearMatchData());
        };
    }, [dispatch]);

    // Start timer when WebRTC is connected
    useEffect(() => {
        if (isConnected) {
            setCallDuration(0);
            callTimerRef.current = setInterval(() => {
                setCallDuration((prev) => prev + 1);
            }, 1000);
        } else {
            if (callTimerRef.current) {
                clearInterval(callTimerRef.current);
                callTimerRef.current = null;
            }
        }
        return () => {
            if (callTimerRef.current) clearInterval(callTimerRef.current);
        };
    }, [isConnected]);

    const formatTime = (secs) => {
        const m = Math.floor(secs / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    useEffect(() => {
        if (!isSocketConnected || !socket.socket) return;

        socket.joinQueue(type, preferences);

        const handleDisconnect = () => {
            isCallActiveRef.current = false;
            showAlert(
                'Disconnected',
                'Stranger disconnected',
                [
                    { text: 'OK', onPress: () => { hideAlert(); safeGoBack(); } },
                    {
                        text: 'Find New',
                        onPress: () => {
                            hideAlert();
                            if (isSocketConnected) {
                                socket.joinQueue(type, preferences);
                                setIsSearching(true);
                                setPartnerId(null);
                                setMatchId(null);
                                setCallDuration(0);
                            }
                        },
                    },
                ]
            );
        };

        socket.onPartnerDisconnected(handleDisconnect);

        return () => {
            socket.offPartnerDisconnected?.(handleDisconnect);
            if (!matchData) socket.leaveQueue(type);
        };
    }, [isSocketConnected]);

    useEffect(() => {
        if (isConnected && offerTimeoutRef.current) {
            clearTimeout(offerTimeoutRef.current);
            offerTimeoutRef.current = null;
        }
    }, [isConnected]);

    useEffect(() => {
        if (matchData && matchData.type === 'call') {
            setIsSearching(false);
            setPartnerId(matchData.partnerId);
            setMatchId(matchData.matchId);
            isCallActiveRef.current = true;

            if (!matchData.isInitiator) {
                offerTimeoutRef.current = setTimeout(async () => {
                    isCallActiveRef.current = false;
                    endCall();
                    await socket.disconnectPartner();
                    setTimeout(() => socket.joinQueue(type, preferences), 800);
                    setIsSearching(true);
                    setPartnerId(null);
                    setMatchId(null);
                    setCallDuration(0);
                }, 10000);
            }
        }
        return () => {
            if (offerTimeoutRef.current) {
                clearTimeout(offerTimeoutRef.current);
                offerTimeoutRef.current = null;
            }
        };
    }, [matchData]);

    const handleEndCall = () => {
        showAlert('End Call', 'Are you sure you want to end the call?', [
            { text: 'Cancel', style: 'cancel', onPress: hideAlert },
            {
                text: 'End',
                style: 'destructive',
                onPress: () => {
                    hideAlert();
                    isCallActiveRef.current = false;
                    endCall();
                    socket.disconnectPartner();
                    safeGoBack();
                },
            },
        ]);
    };

    const handleFindNew = () => {
        isCallActiveRef.current = false;
        endCall();
        socket.disconnectPartner();
        socket.joinQueue(type, preferences);
        setIsSearching(true);
        setPartnerId(null);
        setMatchId(null);
        setCallDuration(0);
    };

    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextAppState) => {
            if (nextAppState === 'background') {
                isCallActiveRef.current = false;
                endCall();
                socket.disconnectPartner();
                safeGoBack();
            }
        });
        return () => subscription.remove();
    }, [endCall, socket, safeGoBack]);

    return (
        <LinearGradient colors={['#241b2f', '#120f17']} style={styles.gradient}>
            <SafeAreaView style={styles.safeArea}>
                <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

                {isSearching ? (
                    /* ── Searching State ── */
                    <View style={styles.centerContainer}>
                        <View style={styles.pulseWrapper}>
                            <PulseRing delay={0} size={140} color="rgba(160,80,200,0.3)" />
                            <PulseRing delay={600} size={140} color="rgba(160,80,200,0.2)" />
                            <PulseRing delay={1200} size={140} color="rgba(160,80,200,0.1)" />
                            <View style={styles.searchAvatar}>
                                <Text style={styles.searchAvatarIcon}>🔍</Text>
                            </View>
                        </View>

                        <Text style={styles.searchTitle}>Finding a Stranger…</Text>
                        <Text style={styles.searchSubtitle}>
                            {queueStatus?.status === 'waiting' ? 'Waiting in queue' : 'Matching...'}
                        </Text>

                        <TouchableOpacity
                            style={styles.cancelBtn}
                            onPress={() => {
                                socket.leaveQueue(type);
                                safeGoBack();
                            }}>
                            <Text style={styles.cancelBtnText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    /* ── Call State ── */
                    <View style={styles.callScreen}>
                        {/* Top Label */}
                        <View style={styles.callHeader}>
                            <Text style={styles.callHeaderLabel}>Secret Voice Call</Text>
                            <View style={[styles.statusBadge, isConnected ? styles.statusConnected : styles.statusConnecting]}>
                                <Text style={styles.statusBadgeText}>
                                    {isConnected ? '● Connected' : '○ Connecting…'}
                                </Text>
                            </View>
                        </View>

                        {/* Avatar with pulsing rings */}
                        <View style={styles.avatarSection}>
                            {!isConnected && (
                                <>
                                    <PulseRing delay={0} size={140} color="rgba(160,80,200,0.25)" />
                                    <PulseRing delay={700} size={140} color="rgba(100,60,180,0.2)" />
                                </>
                            )}
                            <LinearGradient
                                colors={['#b45080', '#7030c0']}
                                style={styles.avatarCircle}>
                                <Text style={styles.avatarLetter}>S</Text>
                            </LinearGradient>

                            <Text style={styles.strangerName}>Stranger</Text>

                            <Text style={styles.callDuration}>
                                {isConnected ? formatTime(callDuration) : 'Connecting…'}
                            </Text>
                        </View>

                        {/* Control Buttons */}
                        <View style={styles.controls}>
                            {/* Mute */}
                            <View style={styles.controlItem}>
                                <TouchableOpacity
                                    style={[styles.controlBtn, isMuted && styles.controlBtnActive]}
                                    onPress={toggleMute}>
                                    <Text style={styles.controlBtnIcon}>{isMuted ? '🔇' : '🎤'}</Text>
                                </TouchableOpacity>
                                <Text style={styles.controlLabel}>{isMuted ? 'Unmute' : 'Mute'}</Text>
                            </View>

                            {/* End Call */}
                            <View style={styles.controlItem}>
                                <TouchableOpacity style={styles.endCallBtn} onPress={handleEndCall}>
                                    <Text style={styles.endCallIcon}>📵</Text>
                                </TouchableOpacity>
                                <Text style={styles.controlLabel}>End</Text>
                            </View>

                            {/* Next */}
                            <View style={styles.controlItem}>
                                <TouchableOpacity style={styles.controlBtn} onPress={handleFindNew}>
                                    <Text style={styles.controlBtnIcon}>⏭</Text>
                                </TouchableOpacity>
                                <Text style={styles.controlLabel}>Next</Text>
                            </View>
                        </View>
                    </View>
                )}
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
    gradient: { flex: 1 },
    safeArea: { flex: 1 },

    // ── Shared centering ──
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },

    // ── Searching ──
    pulseWrapper: {
        width: 140,
        height: 140,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 48,
    },
    pulseRing: {},
    searchAvatar: {
        width: 110,
        height: 110,
        borderRadius: 55,
        backgroundColor: 'rgba(255,255,255,0.07)',
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchAvatarIcon: { fontSize: 46 },
    searchTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 8,
        letterSpacing: 0.3,
    },
    searchSubtitle: {
        fontSize: 15,
        color: '#a0a0b8',
        marginBottom: 48,
    },
    cancelBtn: {
        backgroundColor: 'rgba(255,255,255,0.07)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        borderRadius: 18,
        paddingHorizontal: 48,
        paddingVertical: 14,
    },
    cancelBtnText: {
        color: '#d0a0c8',
        fontSize: 16,
        fontWeight: '600',
    },

    // ── Call Screen ──
    callScreen: {
        flex: 1,
        paddingHorizontal: 24,
    },
    callHeader: {
        alignItems: 'center',
        paddingTop: 16,
        paddingBottom: 12,
        gap: 10,
    },
    callHeaderLabel: {
        fontSize: 14,
        color: '#a0a0b8',
        fontWeight: '500',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    statusBadge: {
        paddingHorizontal: 16,
        paddingVertical: 5,
        borderRadius: 20,
        borderWidth: 1,
    },
    statusConnected: {
        backgroundColor: 'rgba(76, 202, 136, 0.12)',
        borderColor: 'rgba(76, 202, 136, 0.35)',
    },
    statusConnecting: {
        backgroundColor: 'rgba(255, 200, 80, 0.1)',
        borderColor: 'rgba(255, 200, 80, 0.3)',
    },
    statusBadgeText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
    },

    // ── Avatar ──
    avatarSection: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
    },
    avatarCircle: {
        width: 140,
        height: 140,
        borderRadius: 70,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#b45080',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 14,
    },
    avatarLetter: {
        fontSize: 60,
        color: '#fff',
        fontWeight: 'bold',
    },
    strangerName: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
        letterSpacing: 0.3,
    },
    callDuration: {
        fontSize: 18,
        color: '#a0a0b8',
        fontVariant: ['tabular-nums'],
        letterSpacing: 2,
    },

    // ── Controls ──
    controls: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingBottom: 40,
        paddingTop: 20,
    },
    controlItem: {
        alignItems: 'center',
        gap: 10,
    },
    controlBtn: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    controlBtnActive: {
        backgroundColor: 'rgba(220, 70, 100, 0.3)',
        borderColor: 'rgba(220, 70, 100, 0.5)',
    },
    controlBtnIcon: {
        fontSize: 28,
    },
    endCallBtn: {
        width: 84,
        height: 84,
        borderRadius: 42,
        backgroundColor: '#d32f2f',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#d32f2f',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.55,
        shadowRadius: 12,
        elevation: 10,
    },
    endCallIcon: {
        fontSize: 32,
    },
    controlLabel: {
        color: '#a0a0b8',
        fontSize: 12,
        fontWeight: '500',
    },
});

export default VoiceCallScreen;
