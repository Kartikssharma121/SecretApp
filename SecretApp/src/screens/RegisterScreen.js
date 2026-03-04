import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { useDispatch } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setCredentials } from '../store/authSlice';
import authService from '../services/authService';

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
        <View style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.title}>Create Account</Text>
                <Text style={styles.subtitle}>Join Secret Call</Text>

                <TextInput
                    style={styles.input}
                    placeholder="Name"
                    placeholderTextColor="#999"
                    value={name}
                    onChangeText={setName}
                />

                <TextInput
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor="#999"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                />

                <TextInput
                    style={styles.input}
                    placeholder="Password (min 6 characters)"
                    placeholderTextColor="#999"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                />

                <View style={styles.genderContainer}>
                    <Text style={styles.label}>Gender:</Text>
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
                        <ActivityIndicator color="#fff" />
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
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1a1a2e',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 30,
    },
    title: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 10,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#999',
        marginBottom: 40,
        textAlign: 'center',
    },
    input: {
        backgroundColor: '#16213e',
        borderRadius: 10,
        padding: 15,
        marginBottom: 15,
        fontSize: 16,
        color: '#fff',
        borderWidth: 1,
        borderColor: '#0f3460',
    },
    genderContainer: {
        marginBottom: 15,
    },
    label: {
        color: '#fff',
        fontSize: 16,
        marginBottom: 10,
    },
    genderButtons: {
        flexDirection: 'row',
        gap: 10,
    },
    genderButton: {
        flex: 1,
        backgroundColor: '#16213e',
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
        fontSize: 16,
        fontWeight: '600',
    },
    genderButtonTextActive: {
        color: '#fff',
    },
    button: {
        backgroundColor: '#e94560',
        borderRadius: 10,
        padding: 15,
        marginTop: 10,
        alignItems: 'center',
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    linkButton: {
        marginTop: 20,
        alignItems: 'center',
    },
    linkText: {
        color: '#999',
        fontSize: 14,
    },
    linkBold: {
        color: '#e94560',
        fontWeight: 'bold',
    },
});

export default RegisterScreen;
