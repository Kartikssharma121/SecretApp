import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useDispatch } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setCredentials } from '../store/authSlice';
import { navigationRef } from './NavigationService';
import { APP_VERSION } from '../utils/version';
import { API_URL } from '../utils/config';
import ForceUpdateModal from '../components/ForceUpdateModal';

import SplashScreen from '../screens/SplashScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import VerificationScreen from '../screens/VerificationScreen';
import LegalScreen from '../screens/LegalScreen';
import HomeScreen from '../screens/HomeScreen';
import VoiceCallScreen from '../screens/VoiceCallScreen';
import ChatScreen from '../screens/ChatScreen';

const Stack = createStackNavigator();

/**
 * Compare two semver strings like "1.2.3".
 * Returns true if `remote` is greater than `local` (i.e. update required).
 */
const isUpdateRequired = (localVersion, remoteMinVersion) => {
    const parse = (v) => v.split('.').map(Number);
    const [lMaj, lMin, lPatch] = parse(localVersion);
    const [rMaj, rMin, rPatch] = parse(remoteMinVersion);

    if (rMaj !== lMaj) return rMaj > lMaj;
    if (rMin !== lMin) return rMin > lMin;
    return rPatch > lPatch;
};

const AppNavigator = () => {
    const dispatch = useDispatch();
    const [isLoading, setIsLoading] = useState(true);
    const [initialRoute, setInitialRoute] = useState('Onboarding');
    const [forceUpdate, setForceUpdate] = useState(false);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            // Run auth check and version check in parallel
            const [, versionResult] = await Promise.allSettled([
                _checkAuthStorage(),
                _checkVersion(),
            ]);

            // If version check succeeded and update is required, block the app
            if (versionResult.status === 'fulfilled' && versionResult.value === true) {
                setForceUpdate(true);
            }
        } catch (error) {
            console.error('Initialization error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const _checkAuthStorage = async () => {
        const hasSeenOnboarding = await AsyncStorage.getItem('hasSeenOnboarding');
        const token = await AsyncStorage.getItem('token');
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        const userString = await AsyncStorage.getItem('user');

        if (token && userString) {
            const user = JSON.parse(userString);
            dispatch(setCredentials({ user, token, refreshToken }));
            setInitialRoute('Home');
        } else if (hasSeenOnboarding === 'true') {
            setInitialRoute('Login');
        } else {
            setInitialRoute('Onboarding');
        }
    };

    const _checkVersion = async () => {
        try {
            const response = await fetch(`${API_URL}/api/config/version`);
            if (!response.ok) return false;
            const data = await response.json();
            return isUpdateRequired(APP_VERSION, data.minVersion);
        } catch (error) {
            // If version check fails (no internet etc.), allow app to proceed
            console.warn('Version check failed, allowing app to proceed:', error.message);
            return false;
        }
    };

    if (isLoading) {
        return <SplashScreen />;
    }

    return (
        <>
            <NavigationContainer ref={navigationRef}>
                <Stack.Navigator
                    initialRouteName={initialRoute}
                    screenOptions={{
                        headerShown: false,
                        cardStyle: { backgroundColor: '#1a1a2e' },
                    }}>
                    <Stack.Screen name="Onboarding" component={OnboardingScreen} />
                    <Stack.Screen name="Login" component={LoginScreen} />
                    <Stack.Screen name="Register" component={RegisterScreen} />
                    <Stack.Screen name="Verification" component={VerificationScreen} />
                    <Stack.Screen name="Legal" component={LegalScreen} />
                    <Stack.Screen name="Home" component={HomeScreen} />
                    <Stack.Screen
                        name="VoiceCall"
                        component={VoiceCallScreen}
                        options={{ gestureEnabled: false }}
                    />
                    <Stack.Screen
                        name="Chat"
                        component={ChatScreen}
                        options={{ gestureEnabled: false }}
                    />
                </Stack.Navigator>
            </NavigationContainer>

            {/* Force update modal — renders on top of everything */}
            <ForceUpdateModal visible={forceUpdate} />
        </>
    );
};

export default AppNavigator;

