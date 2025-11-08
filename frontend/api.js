import Constants from 'expo-constants';
import axios from 'axios';

const isDev = (typeof __DEV__ !== 'undefined' && __DEV__) || process.env.NODE_ENV !== 'production';
const DEV_FALLBACK = 'http://localhost:8081';
const ENV_BASE = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;
const PROD_FALLBACK = 'https://unified-calendar-zflg.onrender.com';
const API_BASE = isDev ? (ENV_BASE || DEV_FALLBACK) : (ENV_BASE || PROD_FALLBACK);

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000, // 10 seconds
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor to add auth token if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // The request was made and the server responded with a status code
      console.error('API Error:', {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers,
      });

      // Handle specific status codes
      if (error.response.status === 401) {
        // Handle unauthorized access
        console.error('Authentication required');
        // Optionally redirect to login
        // router.push('/login');
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received:', error.request);
    } else {
      // Something happened in setting up the request
      console.error('Request error:', error.message);
    }
    return Promise.reject(error);
  }
);

// ──────────────────────
// Auth
// ──────────────────────
export const registerUser = async (email, password, name) => {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name }),
  });
  return res.json();
};

export const loginUser = async (email, password) => {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return res.json();
};

// ──────────────────────
// Google OAuth
// ──────────────────────
export const googleLogin = () => {
  // Redirect user to backend Google login
  const frontendRedirect = 'https://unified-calendar-4dqh.vercel.app/oauth-callback';
  window.location.href = `${API_BASE}/api/google/login?frontend_redirect_uri=${encodeURIComponent(frontendRedirect)}`;
};

// Optional: If you need to fetch Google Calendar events from frontend
export const fetchGoogleEvents = async () => {
  const res = await fetch(`${API_BASE}/api/google/callback`, {
    method: "GET",
    credentials: "include", // required if using cookies/session
  });
  return res.json();
};

// ──────────────────────
// Events
// ──────────────────────
export const fetchEvents = async (token) => {
  const res = await fetch(`${API_BASE}/api/events`, {
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
  });
  return res.json();
};

export const createEvent = async (eventData, token) => {
  const res = await fetch(`${API_BASE}/api/events`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify(eventData),
  });
  return res.json();
};

export const updateEvent = async (eventId, eventData, token) => {
  const res = await fetch(`${API_BASE}/api/events/${eventId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify(eventData),
  });
  return res.json();
};

export const deleteEvent = async (eventId, token) => {
  const res = await fetch(`${API_BASE}/api/events/${eventId}`, {
    method: "DELETE",
    headers: {
      "Authorization": `Bearer ${token}`,
    },
  });
  return res.json();
};

export { api as apiClient, API_BASE };
export default api;
