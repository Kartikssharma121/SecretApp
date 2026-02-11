import axios from 'axios/dist/browser/axios.cjs';
import { API_URL } from '../utils/config';

const api = axios.create({
    baseURL: API_URL + '/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add token to requests
api.interceptors.request.use(
    (config) => {
        // Token will be added in components using AsyncStorage
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;
