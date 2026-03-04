import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Alert,
    Modal,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logout } from '../store/authSlice';
import authService from '../services/authService';

const HomeScreen = ({ navigation }) => {
    const dispatch = useDispatch();
    const user = useSelector((state) => state.auth.user);
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [selectedType, setSelectedType] = useState(null);

    const handleLogout = async () => {
        Alert.alert('Logout', 'Are you sure you want to logout?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Logout',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await authService.logout();
                    } catch (error) {
                        console.error('Logout error:', error);
                    }
                    await AsyncStorage.removeItem('token');
                    await AsyncStorage.removeItem('refreshToken');
                    await AsyncStorage.removeItem('user');
                    dispatch(logout());
                    navigation.replace('Login');
                },
            },
        ]);
    };

    const handleOptionPress = (type) => {
        setSelectedType(type);
        setShowFilterModal(true);
    };

    const handleStartSession = (preferences) => {
        setShowFilterModal(false);
        if (selectedType === 'call') {
            navigation.navigate('VoiceCall', { preferences, type: 'call' });
        } else {
            navigation.navigate('Chat', { preferences, type: 'chat' });
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.greeting}>Hello, {user?.name}!</Text>
                <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                <Text style={styles.title}>What would you like to do?</Text>

                <TouchableOpacity
                    style={[styles.card, styles.callCard]}
                    onPress={() => handleOptionPress('call')}>
                    <Text style={styles.cardIcon}>📞</Text>
                    <Text style={styles.cardTitle}>Secret Voice Call</Text>
                    <Text style={styles.cardDescription}>
                        Connect with a random stranger for an anonymous voice call
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.card, styles.chatCard]}
                    onPress={() => handleOptionPress('chat')}>
                    <Text style={styles.cardIcon}>💬</Text>
                    <Text style={styles.cardTitle}>Secret Chat</Text>
                    <Text style={styles.cardDescription}>
                        Chat with a random stranger anonymously
                    </Text>
                </TouchableOpacity>
            </View>

            <FilterModal
                visible={showFilterModal}
                onClose={() => setShowFilterModal(false)}
                onStart={handleStartSession}
            />
        </View>
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
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Choose Preferences</Text>

                    <Text style={styles.modalLabel}>Gender Preference:</Text>

                    <View style={styles.genderButtons}>
                        <TouchableOpacity
                            style={[
                                styles.genderButton,
                                genderPreference === 'Male' && styles.genderButtonActive,
                            ]}
                            onPress={() => setGenderPreference('Male')}>
                            <Text
                                style={[
                                    styles.genderButtonText,
                                    genderPreference === 'Male' && styles.genderButtonTextActive,
                                ]}>
                                Male
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.genderButton,
                                genderPreference === 'Female' && styles.genderButtonActive,
                            ]}
                            onPress={() => setGenderPreference('Female')}>
                            <Text
                                style={[
                                    styles.genderButtonText,
                                    genderPreference === 'Female' && styles.genderButtonTextActive,
                                ]}>
                                Female
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.genderButton,
                                genderPreference === 'Any' && styles.genderButtonActive,
                            ]}
                            onPress={() => setGenderPreference('Any')}>
                            <Text
                                style={[
                                    styles.genderButtonText,
                                    genderPreference === 'Any' && styles.genderButtonTextActive,
                                ]}>
                                Any
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity style={styles.startButton} onPress={handleStart}>
                        <Text style={styles.startButtonText}>Start</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1a1a2e',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        paddingTop: 50,
    },
    greeting: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
    },
    logoutButton: {
        backgroundColor: '#16213e',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 8,
    },
    logoutText: {
        color: '#e94560',
        fontWeight: '600',
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
        justifyContent: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 30,
        textAlign: 'center',
    },
    card: {
        borderRadius: 20,
        padding: 30,
        marginBottom: 20,
        alignItems: 'center',
    },
    callCard: {
        backgroundColor: '#e94560',
    },
    chatCard: {
        backgroundColor: '#0f3460',
    },
    cardIcon: {
        fontSize: 50,
        marginBottom: 15,
    },
    cardTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 10,
    },
    cardDescription: {
        fontSize: 14,
        color: '#fff',
        textAlign: 'center',
        opacity: 0.9,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    modalContent: {
        backgroundColor: '#16213e',
        borderRadius: 20,
        padding: 30,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 20,
        textAlign: 'center',
    },
    modalLabel: {
        fontSize: 16,
        color: '#fff',
        marginBottom: 15,
    },
    genderButtons: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 30,
    },
    genderButton: {
        flex: 1,
        backgroundColor: '#1a1a2e',
        borderRadius: 10,
        padding: 15,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#0f3460',
    },
    genderButtonActive: {
        backgroundColor: '#e94560',
        borderColor: '#e94560',
    },
    genderButtonText: {
        color: '#999',
        fontSize: 14,
        fontWeight: '600',
    },
    genderButtonTextActive: {
        color: '#fff',
    },
    startButton: {
        backgroundColor: '#e94560',
        borderRadius: 10,
        padding: 15,
        alignItems: 'center',
        marginBottom: 10,
    },
    startButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    cancelButton: {
        backgroundColor: '#1a1a2e',
        borderRadius: 10,
        padding: 15,
        alignItems: 'center',
    },
    cancelButtonText: {
        color: '#999',
        fontSize: 16,
    },
});

export default HomeScreen;
