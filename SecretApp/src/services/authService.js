import api from './api';

export const authService = {
    // Register new user
    register: async (userData) => {
        try {
            const response = await api.post('/auth/register', userData);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Verify Email with OTP
    verifyEmail: async (email, otp) => {
        try {
            const response = await api.post('/auth/verify-email', { email, otp });
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Resend verification OTP
    resendOtp: async (email) => {
        try {
            const response = await api.post('/auth/resend-otp', { email });
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Login user
    login: async (credentials) => {
        try {
            const response = await api.post('/auth/login', credentials);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Get current user
    getMe: async (token) => {
        try {
            const response = await api.get('/auth/me'); // Token is added by interceptor now
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Refresh Token
    refreshToken: async (refreshToken) => {
        try {
            const response = await api.post('/auth/refresh-token', { refreshToken });
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Logout
    logout: async () => {
        try {
            const response = await api.post('/auth/logout');
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },
};

export default authService;
