import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert,
    AppState,
} from 'react-native';
import { useSelector } from 'react-redux';
import useSocket from '../hooks/useSocket';
import useWebRTC from '../hooks/useWebRTC';

const VoiceCallScreen = ({ navigation, route }) => {
    const { preferences, type } = route.params;
    const matchData = useSelector((state) => state.socket.matchData);
    const queueStatus = useSelector((state) => state.socket.queueStatus);
    const isSocketConnected = useSelector((state) => state.socket.isConnected);

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
    const offerTimeoutRef = useRef(null);

    const { createOffer, toggleMute, endCall, isMuted, isConnected } = useWebRTC(
        socket,
        partnerId
    );

    // Join queue when socket is connected
    useEffect(() => {
        if (!isSocketConnected || !socket.socket) return;

        socket.joinQueue(type, preferences);

        // Cancel the offer-wait timeout as soon as a real offer arrives
        const handleOffer = () => {
            if (offerTimeoutRef.current) {
                clearTimeout(offerTimeoutRef.current);
                offerTimeoutRef.current = null;
            }
        };

        // Listen for partner disconnected
        const handleDisconnect = (data) => {
            Alert.alert(
                'Disconnected',
                'Stranger disconnected',
                [
                    {
                        text: 'OK',
                        onPress: safeGoBack,
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
        };

        socket.onOffer(handleOffer);
        socket.onPartnerDisconnected(handleDisconnect);

        return () => {
            socket.offOffer?.(handleOffer);
            socket.offPartnerDisconnected?.(handleDisconnect);
            if (!matchData) {
                socket.leaveQueue(type);
            }
        };
    }, [isSocketConnected]);

    // Handle match found
    useEffect(() => {
        if (matchData && matchData.type === 'call') {
            setIsSearching(false);
            setPartnerId(matchData.partnerId);
            setMatchId(matchData.matchId);

            // Determine who creates the offer using the backend flag to avoid glares
            if (matchData.isInitiator) {
                setTimeout(() => {
                    createOffer().catch(err => console.error('Create offer error:', err));
                }, 1000); // Small delay to let partner prepare
            } else {
                console.log('Waiting for partner to send offer...');
                // Safety timeout: if initiator never sends an offer (ghost user), find new
                offerTimeoutRef.current = setTimeout(async () => {
                    console.warn('Offer timeout — partner never sent offer, finding new match...');
                    endCall();

                    // Sync with DB before re-queuing
                    await socket.disconnectPartner();

                    // Small delay to let backend finish session cleanup before re-queuing
                    setTimeout(() => {
                        socket.joinQueue(type, preferences);
                    }, 800);

                    setIsSearching(true);
                    setPartnerId(null);
                    setMatchId(null);
                }, 10000); // 10 seconds
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
        Alert.alert('End Call', 'Are you sure you want to end the call?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'End',
                style: 'destructive',
                onPress: () => {
                    endCall();
                    socket.disconnectPartner();
                    safeGoBack();
                },
            },
        ]);
    };

    const handleFindNew = () => {
        endCall();
        socket.disconnectPartner();
        socket.joinQueue(type, preferences);
        setIsSearching(true);
        setPartnerId(null);
        setMatchId(null);
    };

    // End call if app goes to background (mobile critical)
    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextAppState) => {
            if (nextAppState !== 'active') {
                console.log('App moved to background. Ending call...');
                endCall();
                socket.disconnectPartner();
                safeGoBack();
            }
        });

        return () => {
            subscription.remove();
        };
    }, [endCall, socket, safeGoBack]);

    return (
        <View style={styles.container}>
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
                <View style={styles.callContainer}>
                    <Text style={styles.statusText}>
                        {isConnected ? '🟢 Connected' : '🟡 Connecting...'}
                    </Text>

                    <View style={styles.callInfo}>
                        <Text style={styles.callIcon}>📞</Text>
                        <Text style={styles.strangerText}>Stranger</Text>
                        <Text style={styles.callStatus}>
                            {isConnected ? 'In Call' : 'Connecting...'}
                        </Text>
                    </View>

                    <View style={styles.controls}>
                        <TouchableOpacity
                            style={[styles.controlButton, isMuted && styles.controlButtonActive]}
                            onPress={toggleMute}>
                            <Text style={styles.controlIcon}>{isMuted ? '🔇' : '🎤'}</Text>
                            <Text style={styles.controlText}>
                                {isMuted ? 'Unmute' : 'Mute'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.controlButton, styles.endButton]}
                            onPress={handleEndCall}>
                            <Text style={styles.controlIcon}>📵</Text>
                            <Text style={styles.controlText}>End Call</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.controlButton}
                            onPress={handleFindNew}>
                            <Text style={styles.controlIcon}>🔄</Text>
                            <Text style={styles.controlText}>Next</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </View>
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
    callContainer: {
        flex: 1,
        paddingTop: 60,
    },
    statusText: {
        fontSize: 16,
        color: '#fff',
        textAlign: 'center',
        marginBottom: 40,
    },
    callInfo: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    callIcon: {
        fontSize: 100,
        marginBottom: 30,
    },
    strangerText: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 10,
    },
    callStatus: {
        fontSize: 16,
        color: '#999',
    },
    controls: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    controlButton: {
        backgroundColor: '#16213e',
        borderRadius: 15,
        padding: 20,
        alignItems: 'center',
        minWidth: 100,
    },
    controlButtonActive: {
        backgroundColor: '#e94560',
    },
    endButton: {
        backgroundColor: '#d32f2f',
    },
    controlIcon: {
        fontSize: 30,
        marginBottom: 8,
    },
    controlText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
});

export default VoiceCallScreen;
