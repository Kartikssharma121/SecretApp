import React, { useState, useEffect, useRef } from 'react';
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
    KeyboardAvoidingView,
    Platform,
    TouchableWithoutFeedback,
    Keyboard,
    Animated,
} from 'react-native';
import { useDispatch } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setCredentials } from '../store/authSlice';
import authService from '../services/authService';
import { maskEmail } from '../utils/emailHelper';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

const VerificationScreen = ({ route, navigation }) => {
    const { email } = route.params || {};
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [timer, setTimer] = useState(60);
    const [isFocused, setIsFocused] = useState(false);
    const dispatch = useDispatch();

    const inputRef = useRef(null);
    const cursorOpacity = useRef(new Animated.Value(1)).current;

    // Blinking cursor animation
    useEffect(() => {
        if (isFocused && otp.length < 6) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(cursorOpacity, {
                        toValue: 0,
                        duration: 500,
                        useNativeDriver: true,
                    }),
                    Animated.timing(cursorOpacity, {
                        toValue: 1,
                        duration: 500,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        } else {
            cursorOpacity.setValue(1);
        }
    }, [isFocused, otp.length]);

    // Timer logic
    useEffect(() => {
        let interval = null;
        if (timer > 0) {
            interval = setInterval(() => {
                setTimer((prevTimer) => prevTimer - 1);
            }, 1000);
        } else {
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [timer]);

    const handleVerify = async () => {
        if (!email) {
            Alert.alert('Error', 'Missing email parameter');
            return;
        }

        if (otp.length !== 6) {
            Alert.alert('Error', 'Please enter a valid 6-digit code');
            return;
        }

        setLoading(true);
        try {
            const data = await authService.verifyEmail(email, otp);

            // Save tokens to AsyncStorage
            await AsyncStorage.setItem('token', data.token);
            if (data.refreshToken) await AsyncStorage.setItem('refreshToken', data.refreshToken);
            await AsyncStorage.setItem('user', JSON.stringify(data));

            // Update Redux state
            dispatch(setCredentials({ user: data, token: data.token, refreshToken: data.refreshToken }));

            Alert.alert('Success', 'Email verified successfully!', [
                {
                    text: 'OK',
                    onPress: () => navigation.replace('Home')
                }
            ]);
        } catch (error) {
            Alert.alert('Verification Failed', error.message || 'The code entered is invalid or has expired');
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (!email) return;

        setResending(true);
        try {
            await authService.resendOtp(email);
            setTimer(60);
            Alert.alert('Code Sent', 'A new verification code has been sent to your email.');
        } catch (error) {
            Alert.alert('Failed to Resend', error.message || 'Please try again later.');
        } finally {
            setResending(false);
        }
    };

    const focusInput = () => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    };

    const renderOtpBoxes = () => {
        const boxes = [];
        for (let i = 0; i < 6; i++) {
            const char = otp[i] || '';
            const isCurrent = otp.length === i;
            const isFilled = otp.length > i;
            const isBoxFocused = isFocused && isCurrent;

            boxes.push(
                <View
                    key={i}
                    style={[
                        styles.otpBox,
                        isFilled && styles.otpBoxFilled,
                        isBoxFocused && styles.otpBoxFocused,
                    ]}
                >
                    <Text style={styles.otpText}>{char}</Text>
                    {isBoxFocused && (
                        <Animated.View style={[styles.cursor, { opacity: cursorOpacity }]} />
                    )}
                </View>
            );
        }
        return boxes;
    };

    return (
        <LinearGradient
            colors={['#241b2f', '#120f17']}
            style={styles.gradientContainer}
        >
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardAvoidingView}
                >
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <ScrollView
                            contentContainerStyle={styles.scrollContent}
                            showsVerticalScrollIndicator={false}
                        >
                            <TouchableOpacity 
                                style={styles.backButton}
                                onPress={() => navigation.navigate('Login')}
                            >
                                <View style={styles.backButtonContent}>
                                    <Text style={styles.backArrow}>←</Text>
                                    <Text style={styles.backButtonText}>Back to Login</Text>
                                </View>
                            </TouchableOpacity>

                            <View style={styles.headerContainer}>
                                <View style={styles.iconBackground}>
                                    <Text style={styles.emoji}>✉️</Text>
                                </View>
                                <Text style={styles.title}>Verify Email</Text>
                                <Text style={styles.subtitle}>
                                    We sent a 6-digit verification code to {'\n'}
                                    <Text style={styles.emailText}>{maskEmail(email)}</Text>
                                </Text>
                            </View>

                            <View style={styles.formContainer}>
                                <TouchableOpacity
                                    activeOpacity={1}
                                    onPress={focusInput}
                                    style={styles.otpContainer}
                                >
                                    {renderOtpBoxes()}
                                </TouchableOpacity>

                                {/* Hidden input to capture keystrokes */}
                                <TextInput
                                    ref={inputRef}
                                    value={otp}
                                    onChangeText={(text) => {
                                        const sanitized = text.replace(/[^0-9]/g, '');
                                        setOtp(sanitized);
                                    }}
                                    keyboardType="number-pad"
                                    maxLength={6}
                                    onFocus={() => setIsFocused(true)}
                                    onBlur={() => setIsFocused(false)}
                                    style={styles.hiddenInput}
                                    caretHidden={true}
                                />

                                <TouchableOpacity
                                    style={[styles.button, (loading || otp.length !== 6) && styles.buttonDisabled]}
                                    onPress={handleVerify}
                                    disabled={loading || otp.length !== 6}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="#1a1a2e" />
                                    ) : (
                                        <Text style={styles.buttonText}>Verify & Login</Text>
                                    )}
                                </TouchableOpacity>

                                <View style={styles.resendContainer}>
                                    {timer > 0 ? (
                                        <Text style={styles.timerText}>
                                            Resend code in <Text style={styles.timerCount}>{timer}s</Text>
                                        </Text>
                                    ) : (
                                        <TouchableOpacity
                                            onPress={handleResend}
                                            disabled={resending}
                                            style={styles.resendButton}
                                        >
                                            {resending ? (
                                                <ActivityIndicator size="small" color="#fff" />
                                            ) : (
                                                <Text style={styles.resendText}>Resend Code</Text>
                                            )}
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        </ScrollView>
                    </TouchableWithoutFeedback>
                </KeyboardAvoidingView>
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
    keyboardAvoidingView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
        paddingVertical: 20,
    },
    backButton: {
        position: 'absolute',
        top: 20,
        left: 20,
        zIndex: 10,
        padding: 8,
    },
    backButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    backArrow: {
        color: '#a0a0b8',
        fontSize: 20,
        lineHeight: 20,
    },
    backButtonText: {
        color: '#a0a0b8',
        fontSize: 16,
        fontWeight: '600',
    },
    headerContainer: {
        alignItems: 'center',
        marginBottom: 36,
        marginTop: 60,
    },
    iconBackground: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    emoji: {
        fontSize: 36,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 12,
        textAlign: 'center',
        letterSpacing: 0.5,
    },
    subtitle: {
        fontSize: 15,
        color: '#a0a0b8',
        textAlign: 'center',
        lineHeight: 24,
    },
    emailText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    formContainer: {
        width: '100%',
    },
    otpContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 32,
        paddingHorizontal: 4,
    },
    otpBox: {
        width: 44,
        height: 56,
        borderRadius: 14,
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    otpBoxFilled: {
        borderColor: 'rgba(255, 255, 255, 0.3)',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
    },
    otpBoxFocused: {
        borderColor: '#a78bfa',
        backgroundColor: 'rgba(167, 139, 250, 0.1)',
        shadowColor: '#a78bfa',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    otpText: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#fff',
    },
    cursor: {
        position: 'absolute',
        width: 2,
        height: 20,
        backgroundColor: '#a78bfa',
    },
    hiddenInput: {
        position: 'absolute',
        width: 1,
        height: 1,
        opacity: 0,
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
        opacity: 0.5,
    },
    buttonText: {
        color: '#1a1a2e',
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    resendContainer: {
        marginTop: 28,
        alignItems: 'center',
        height: 30,
        justifyContent: 'center',
    },
    timerText: {
        color: '#a0a0b8',
        fontSize: 15,
    },
    timerCount: {
        color: '#fff',
        fontWeight: 'bold',
    },
    resendButton: {
        paddingVertical: 5,
        paddingHorizontal: 15,
    },
    resendText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: 'bold',
        textDecorationLine: 'underline',
    },
});

export default VerificationScreen;
