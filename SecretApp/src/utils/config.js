// export const API_URL = 'http://localhost:3000';
import { API_URL as ENV_API_URL, SOCKET_URL as ENV_SOCKET_URL } from '@env';

// Force re-read of updated env variables
export const API_URL = ENV_API_URL;
export const SOCKET_URL = ENV_SOCKET_URL;

// For Render Deployment (Updates after deployment):
// export const API_URL = 'https://secretcall-backend.onrender.com';
// export const SOCKET_URL = 'https://secretcall-backend.onrender.com';
