import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Modal,
    StatusBar,
    PermissionsAndroid,
    Platform,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logout } from '../store/authSlice';
import authService from '../services/authService';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomAlert from '../components/CustomAlert';

const HomeScreen = ({ navigation }) => {
    const dispatch = useDispatch();
    const user = useSelector((state) => state.auth.user);
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [selectedType, setSelectedType] = useState(null);
    const [alertConfig, setAlertConfig] = useState({ visible: false });

    const showAlert = (title, message, buttons) =>
        setAlertConfig({ visible: true, title, message, buttons });
    const hideAlert = () => setAlertConfig({ visible: false });

    const handleLogout = () => {
        showAlert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel', onPress: hideAlert },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        hideAlert();
                        try { await authService.logout(); } catch (e) { console.error(e); }
                        await AsyncStorage.removeItem('token');
                        await AsyncStorage.removeItem('refreshToken');
                        await AsyncStorage.removeItem('user');
                        dispatch(logout());
                        navigation.replace('Login');
                    },
                },
            ]
        );
    };

    const handleOptionPress = (type) => {
        setSelectedType(type);
        setShowFilterModal(true);
    };

    const handleStartSession = async (preferences) => {
        setShowFilterModal(false);
        if (selectedType === 'call') {
            let hasPermission = true;
            if (Platform.OS === 'android') {
                try {
                    const granted = await PermissionsAndroid.request(
                        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
                        {
                            title: 'Microphone Permission',
                            message: 'SecretApp needs access to your microphone so you can make secret voice calls.',
                            buttonNeutral: 'Ask Me Later',
                            buttonNegative: 'Cancel',
                            buttonPositive: 'OK',
                        }
                    );
                    hasPermission = granted === PermissionsAndroid.RESULTS.GRANTED;
                } catch (err) {
                    console.warn(err);
                    hasPermission = false;
                }
            }
            if (hasPermission) {
                navigation.navigate('VoiceCall', { preferences, type: 'call' });
            } else {
                showAlert(
                    'Permission Required',
                    'Microphone permission is required to start a voice call. Please enable it in your device settings.',
                    [{ text: 'OK', onPress: hideAlert }]
                );
            }
        } else {
            navigation.navigate('Chat', { preferences, type: 'chat' });
        }
    };

    const firstName = user?.name?.split(' ')[0] || 'User';

    return (
        <LinearGradient colors={['#241b2f', '#120f17']} style={styles.gradientContainer}>
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.greetingSmall}>Welcome,</Text>
                        <Text style={styles.greeting}>{firstName}</Text>
                    </View>
                    <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                        <Text style={styles.logoutText}>Logout</Text>
                    </TouchableOpacity>
                </View>

                {/* Hero Section */}
                <View style={styles.heroSection}>
                    <Text style={styles.heroEmoji}>🔥</Text>
                    <Text style={styles.heroTitle}>Start a Secret Session</Text>
                    <Text style={styles.heroSubtitle}>Connect anonymously, talk freely</Text>
                </View>

                {/* Action Cards */}
                <View style={styles.cardsContainer}>
                    <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => handleOptionPress('call')}
                    >
                        <LinearGradient
                            colors={['rgba(180, 80, 140, 0.35)', 'rgba(100, 40, 120, 0.2)']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.card}
                        >
                            <View style={styles.cardIconContainer}>
                                <Text style={styles.cardIcon}>📞</Text>
                            </View>
                            <View style={styles.cardText}>
                                <Text style={styles.cardTitle}>Secret Voice Call</Text>
                                <Text style={styles.cardDescription}>
                                    Anonymous voice call with a random stranger
                                </Text>
                            </View>
                            <Text style={styles.cardArrow}>›</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => handleOptionPress('chat')}
                    >
                        <LinearGradient
                            colors={['rgba(80, 100, 200, 0.35)', 'rgba(40, 60, 150, 0.2)']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.card}
                        >
                            <View style={styles.cardIconContainer}>
                                <Text style={styles.cardIcon}>💬</Text>
                            </View>
                            <View style={styles.cardText}>
                                <Text style={styles.cardTitle}>Secret Chat</Text>
                                <Text style={styles.cardDescription}>
                                    Anonymous text chat with a random stranger
                                </Text>
                            </View>
                            <Text style={styles.cardArrow}>›</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {/* Stats / Footer Note */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>🌍 Connect with strangers. Stay anonymous.</Text>
                </View>

                <FilterModal
                    visible={showFilterModal}
                    onClose={() => setShowFilterModal(false)}
                    onStart={handleStartSession}
                />

                <CustomAlert
                    visible={alertConfig.visible}
                    title={alertConfig.title}
                    message={alertConfig.message}
                    buttons={alertConfig.buttons || []}
                    onClose={hideAlert}
                />
            </SafeAreaView>
        </LinearGradient>
    );
};

const FilterModal = ({ visible, onClose, onStart }) => {
    const [genderPreference, setGenderPreference] = useState('Any');

    const handleStart = () => {
        onStart({ gender: genderPreference });
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <LinearGradient
                    colors={['#2e1f42', '#1a1028']}
                    style={styles.modalContent}
                >
                    <Text style={styles.modalTitle}>Choose Preferences</Text>
                    <Text style={styles.modalLabel}>Gender Preference</Text>

                    <View style={styles.genderButtons}>
                        {['Male', 'Female', 'Any'].map((option) => (
                            <TouchableOpacity
                                key={option}
                                style={[
                                    styles.genderButton,
                                    genderPreference === option && styles.genderButtonActive,
                                ]}
                                onPress={() => setGenderPreference(option)}>
                                <Text
                                    style={[
                                        styles.genderButtonText,
                                        genderPreference === option && styles.genderButtonTextActive,
                                    ]}>
                                    {option}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <TouchableOpacity style={styles.startButton} onPress={handleStart}>
                        <Text style={styles.startButtonText}>Start Session</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                </LinearGradient>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    gradientContainer: {
        flex: 1,
    },
    container: {
        flex: 1,
        paddingHorizontal: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 16,
        paddingBottom: 8,
    },
    greetingSmall: {
        fontSize: 13,
        color: '#a0a0b8',
        marginBottom: 2,
    },
    greeting: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#fff',
        letterSpacing: 0.3,
    },
    logoutButton: {
        backgroundColor: 'rgba(255,255,255,0.07)',
        paddingHorizontal: 16,
        paddingVertical: 9,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    logoutText: {
        color: '#d0a0c8',
        fontWeight: '600',
        fontSize: 13,
    },
    heroSection: {
        alignItems: 'center',
        paddingVertical: 36,
    },
    heroEmoji: {
        fontSize: 56,
        marginBottom: 12,
    },
    heroTitle: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 8,
        letterSpacing: 0.3,
        textAlign: 'center',
    },
    heroSubtitle: {
        fontSize: 15,
        color: '#a0a0b8',
        textAlign: 'center',
    },
    cardsContainer: {
        flex: 1,
        gap: 16,
    },
    card: {
        borderRadius: 20,
        padding: 22,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    cardIconContainer: {
        width: 58,
        height: 58,
        backgroundColor: 'rgba(255,255,255,0.07)',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    cardIcon: {
        fontSize: 28,
    },
    cardText: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 17,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4,
    },
    cardDescription: {
        fontSize: 13,
        color: '#a0a0b8',
        lineHeight: 19,
    },
    cardArrow: {
        fontSize: 28,
        color: 'rgba(255,255,255,0.3)',
        fontWeight: '300',
        marginLeft: 8,
    },
    footer: {
        paddingVertical: 20,
        alignItems: 'center',
    },
    footerText: {
        color: '#6a6a8a',
        fontSize: 13,
    },
    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.75)',
        justifyContent: 'flex-end',
        paddingHorizontal: 0,
    },
    modalContent: {
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        padding: 28,
        paddingBottom: 40,
        borderTopWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4,
        textAlign: 'center',
    },
    modalLabel: {
        fontSize: 13,
        color: '#a0a0b8',
        marginTop: 4,
        marginBottom: 20,
        textAlign: 'center',
    },
    genderButtons: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 28,
    },
    genderButton: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 14,
        padding: 14,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    genderButtonActive: {
        backgroundColor: 'rgba(255,255,255,0.18)',
        borderColor: 'rgba(255,255,255,0.35)',
    },
    genderButtonText: {
        color: '#8a8a9e',
        fontSize: 14,
        fontWeight: '600',
    },
    genderButtonTextActive: {
        color: '#fff',
    },
    startButton: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 8,
    },
    startButtonText: {
        color: '#1a1a2e',
        fontSize: 17,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    cancelButton: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 16,
        padding: 15,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    cancelButtonText: {
        color: '#a0a0b8',
        fontSize: 15,
    },
});

export default HomeScreen;
