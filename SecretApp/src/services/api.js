import axios from 'axios/dist/browser/axios.cjs';
import { API_URL } from '../utils/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as NavigationService from '../navigation/NavigationService';
import { store } from '../store/store';
import { setCredentials, logout } from '../store/authSlice';

const api = axios.create({
    baseURL: API_URL + '/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add token to requests
api.interceptors.request.use(
    async (config) => {
        const token = await AsyncStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

// Response interceptor
api.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            console.log('401 error intercepted for URL:', originalRequest.url);
            // Prevent infinite retry loop if refresh itself fails with 401
            if (originalRequest.url.includes('/auth/refresh-token')) {
                console.log('Refresh token request failed with 401, logging out...');
                // Refresh token expired or invalid, log out user
                await AsyncStorage.multiRemove(['token', 'refreshToken', 'user']);
                store.dispatch(logout());
                NavigationService.reset(['Login']);
                return Promise.reject(error);
            }

            if (isRefreshing) {
                console.log('Already refreshing, queuing request...');
                return new Promise(function (resolve, reject) {
                    failedQueue.push({ resolve, reject });
                }).then(token => {
                    originalRequest.headers.Authorization = 'Bearer ' + token;
                    return api(originalRequest);
                }).catch(err => {
                    return Promise.reject(err);
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const refreshToken = await AsyncStorage.getItem('refreshToken');
                console.log('Attempting to refresh with token:', refreshToken);

                if (!refreshToken) {
                    console.log('No refresh token found in storage');
                    await AsyncStorage.multiRemove(['token', 'refreshToken', 'user']);
                    store.dispatch(logout());
                    NavigationService.reset(['Login']);
                    return Promise.reject(error);
                }

                console.log('Sending post to /api/auth/refresh-token');
                const { data } = await axios.post(`${API_URL}/api/auth/refresh-token`, { refreshToken });
                console.log('Refresh response:', data);

                const newToken = data.token;
                const newRefreshToken = data.refreshToken;

                await AsyncStorage.setItem('token', newToken);
                if (newRefreshToken) await AsyncStorage.setItem('refreshToken', newRefreshToken);

                // Update Redux state so React components re-render with the new token
                store.dispatch(setCredentials({
                    user: store.getState().auth.user,
                    token: newToken,
                    refreshToken: newRefreshToken || refreshToken
                }));

                processQueue(null, newToken);
                originalRequest.headers.Authorization = 'Bearer ' + newToken;
                return api(originalRequest);
            } catch (refreshError) {
                console.log('Error during refresh request:', refreshError?.response?.data || refreshError.message);
                processQueue(refreshError, null);
                // Refresh token is likely expired
                await AsyncStorage.multiRemove(['token', 'refreshToken', 'user']);
                store.dispatch(logout());
                NavigationService.reset(['Login']);
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        console.log('Non-401 error intercepted:', error.message);
        return Promise.reject(error);
    }
);

export default api;
