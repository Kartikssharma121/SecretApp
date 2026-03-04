import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    StatusBar,
    ScrollView,
} from 'react-native';
import { useDispatch } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setCredentials } from '../store/authSlice';
import authService from '../services/authService';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

const RegisterScreen = ({ navigation }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [gender, setGender] = useState('');
    const [loading, setLoading] = useState(false);
    const dispatch = useDispatch();

    const handleRegister = async () => {
        if (!name || !email || !password || !gender) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        if (password.length < 6) {
            Alert.alert('Error', 'Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        try {
            const data = await authService.register({ name, email, password, gender });

            // Save tokens to AsyncStorage
            await AsyncStorage.setItem('token', data.token);
            if (data.refreshToken) await AsyncStorage.setItem('refreshToken', data.refreshToken);
            await AsyncStorage.setItem('user', JSON.stringify(data));

            // Update Redux state
            dispatch(setCredentials({ user: data, token: data.token, refreshToken: data.refreshToken }));

            // Navigate to Home
            navigation.replace('Home');
        } catch (error) {
            Alert.alert('Registration Failed', error.message || 'Please try again');
        } finally {
            setLoading(false);
        }
    };

    return (
        <LinearGradient
            colors={['#241b2f', '#120f17']}
            style={styles.gradientContainer}
        >
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.headerContainer}>
                        <Text style={styles.emoji}>✨</Text>
                        <Text style={styles.title}>Create Account</Text>
                        <Text style={styles.subtitle}>Join Secret Call and stay anonymous</Text>
                    </View>

                    <View style={styles.formContainer}>
                        <View style={styles.inputWrapper}>
                            <TextInput
                                style={styles.input}
                                placeholder="Name"
                                placeholderTextColor="#8a8a9e"
                                value={name}
                                onChangeText={setName}
                            />
                        </View>

                        <View style={styles.inputWrapper}>
                            <TextInput
                                style={styles.input}
                                placeholder="Email"
                                placeholderTextColor="#8a8a9e"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>

                        <View style={styles.inputWrapper}>
                            <TextInput
                                style={styles.input}
                                placeholder="Password (min 6 characters)"
                                placeholderTextColor="#8a8a9e"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                            />
                        </View>

                        <View style={styles.genderContainer}>
                            <Text style={styles.label}>Gender</Text>
                            <View style={styles.genderButtons}>
                                <TouchableOpacity
                                    style={[
                                        styles.genderButton,
                                        gender === 'Male' && styles.genderButtonActive,
                                    ]}
                                    onPress={() => setGender('Male')}>
                                    <Text
                                        style={[
                                            styles.genderButtonText,
                                            gender === 'Male' && styles.genderButtonTextActive,
                                        ]}>
                                        Male
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[
                                        styles.genderButton,
                                        gender === 'Female' && styles.genderButtonActive,
                                    ]}
                                    onPress={() => setGender('Female')}>
                                    <Text
                                        style={[
                                            styles.genderButtonText,
                                            gender === 'Female' && styles.genderButtonTextActive,
                                        ]}>
                                        Female
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.button, loading && styles.buttonDisabled]}
                            onPress={handleRegister}
                            disabled={loading}>
                            {loading ? (
                                <ActivityIndicator color="#1a1a2e" />
                            ) : (
                                <Text style={styles.buttonText}>Register</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => navigation.navigate('Login')}
                            style={styles.linkButton}>
                            <Text style={styles.linkText}>
                                Already have an account? <Text style={styles.linkBold}>Login</Text>
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    gradientContainer: {
        flex: 1,
    },
    container: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
        paddingVertical: 20,
    },
    headerContainer: {
        alignItems: 'center',
        marginBottom: 32,
    },
    emoji: {
        fontSize: 50,
        marginBottom: 10,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 8,
        textAlign: 'center',
        letterSpacing: 0.5,
    },
    subtitle: {
        fontSize: 15,
        color: '#a0a0b8',
        textAlign: 'center',
        lineHeight: 22,
    },
    formContainer: {
        width: '100%',
    },
    inputWrapper: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        overflow: 'hidden',
    },
    input: {
        padding: 16,
        fontSize: 16,
        color: '#fff',
    },
    genderContainer: {
        marginBottom: 24,
        marginTop: 8,
    },
    label: {
        color: '#a0a0b8',
        fontSize: 14,
        marginBottom: 10,
        marginLeft: 4,
        fontWeight: '500',
    },
    genderButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    genderButton: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    genderButtonActive: {
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    genderButtonText: {
        color: '#8a8a9e',
        fontSize: 16,
        fontWeight: '600',
    },
    genderButtonTextActive: {
        color: '#fff',
    },
    button: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginTop: 8,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 8,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        color: '#1a1a2e',
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    linkButton: {
        marginTop: 24,
        alignItems: 'center',
    },
    linkText: {
        color: '#a0a0b8',
        fontSize: 15,
    },
    linkBold: {
        color: '#fff',
        fontWeight: 'bold',
    },
});

export default RegisterScreen;
