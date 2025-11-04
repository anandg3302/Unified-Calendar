import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { Platform } from 'react-native';


const API_URL =
  Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL ||
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  'https://unified-calendar-zflg.onrender.com';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  fetchGoogleEvents: () => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Store OAuth promise resolver for deep link handler
  const oauthPromiseRef = React.useRef<{
    resolve: (value: { token: string; user: any }) => void;
    reject: (error: Error) => void;
  } | null>(null);

  useEffect(() => {
    loadStoredAuth();

    // Add deep link listener
    const subscription = Linking.addEventListener('url', handleDeepLink);

    return () => subscription.remove(); // Clean up listener
  }, []);

  // Handle deep link from Google OAuth
  const handleDeepLink = async (event: { url: string }) => {
    const { url } = event;
    const params = Linking.parse(url);

    console.log('🔗 Deep link received:', url);
    console.log('🔗 Parsed params:', JSON.stringify(params.queryParams));

    // Only process OAuth callback URLs (frontend://oauth-callback)
    if (!url.includes('oauth-callback')) {
      console.log('⚠️ Ignoring non-OAuth deep link');
      return;
    }

    // Check for error in redirect
    if (params.queryParams?.error) {
      const errorMsg = params.queryParams.error_description as string || params.queryParams.error as string || 'OAuth error';
      console.error('❌ OAuth error from deep link:', errorMsg);
      if (oauthPromiseRef.current) {
        oauthPromiseRef.current.reject(new Error(errorMsg));
        oauthPromiseRef.current = null;
      }
      return;
    }

    // Handle successful OAuth redirect
    if (params.queryParams?.token && params.queryParams?.user) {
      try {
        // Close the in-app browser if still open (Android often needs this)
        try { await WebBrowser.dismissBrowser(); } catch (e) {}

        const accessToken = params.queryParams.token as string;
        let userStr = params.queryParams.user as string;

        // Decode URI component if needed
        try {
          userStr = decodeURIComponent(userStr);
        } catch (e) {
          // If already decoded, use as is
          console.log('User string already decoded or invalid encoding');
        }

        const userData = JSON.parse(userStr);

        console.log('✅ Parsed token and user data successfully');

        // If there's a pending OAuth promise, resolve it
        if (oauthPromiseRef.current) {
          console.log('✅ Resolving OAuth promise');
          oauthPromiseRef.current.resolve({ token: accessToken, user: userData });
          oauthPromiseRef.current = null;
        } else {
          // If no promise (app opened from deep link), just set the auth state
          console.log('⚠️ No OAuth promise found, setting auth state directly');
          await AsyncStorage.setItem('auth_token', accessToken);
          await AsyncStorage.setItem('user', JSON.stringify(userData));
          setToken(accessToken);
          setUser(userData);
        }

        // Always update storage and state (in case promise already resolved)
        await AsyncStorage.setItem('auth_token', accessToken);
        await AsyncStorage.setItem('user', JSON.stringify(userData));
        setToken(accessToken);
        setUser(userData);
        console.log('✅ Auth state updated from deep link');
        // Let the index.tsx handle navigation based on auth state
        // This ensures proper navigation flow
      } catch (error: any) {
        console.error('❌ Error processing deep link auth data:', error);
        console.error('❌ User string:', params.queryParams?.user);
        if (oauthPromiseRef.current) {
          oauthPromiseRef.current.reject(new Error(`Failed to process OAuth data: ${error.message}`));
          oauthPromiseRef.current = null;
        }
      }
    } else {
      console.warn('⚠️ Deep link missing token or user data');
      console.warn('⚠️ Token present:', !!params.queryParams?.token);
      console.warn('⚠️ User present:', !!params.queryParams?.user);
    }
  };

  // Load token and user from AsyncStorage on app start
  const loadStoredAuth = async () => {
    try {
      if (Platform.OS === 'web') {
        // Hydrate auth from localStorage on web (set by _layout.tsx after OAuth redirect)
        const tokenFromWeb = typeof window !== 'undefined' ? window.localStorage.getItem('token') : null;
        const userFromWeb = typeof window !== 'undefined' ? window.localStorage.getItem('user') : null;
        if (tokenFromWeb && userFromWeb) {
          try {
            const parsedUser = JSON.parse(userFromWeb);
            setToken(tokenFromWeb);
            setUser(parsedUser);
            return;
          } catch {}
        }
        // Fallback for web if nothing is stored
        setToken(null);
        setUser(null);
      } else {
        // Native: previously cleared auth on start; keep behavior
        setToken(null);
        setUser(null);
        await AsyncStorage.removeItem('auth_token').catch(() => {});
        await AsyncStorage.removeItem('user').catch(() => {});
      }
    } catch (error) {
      console.error('Error loading auth:', error);
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Login with email and password
  const login = async (email: string, password: string) => {
    try {
      const response = await axios.post(`${API_URL}/api/auth/login`, { email, password });
      const { access_token, user: userData } = response.data;

      await AsyncStorage.setItem('auth_token', access_token);
      await AsyncStorage.setItem('user', JSON.stringify(userData));

      setToken(access_token);
      setUser(userData);

      // Proactively fetch Google events after login
      try {
        await fetchGoogleEvents();
      } catch (e) {
        console.log('Google events fetch after login skipped:', (e as any)?.message || e);
      }

      // Let the index.tsx handle navigation based on auth state
    } catch (error: any) {
      console.log('❌ Login error:', {
        url: `${API_URL}/api/auth/login`,
        status: error?.response?.status,
        data: error?.response?.data,
        message: error?.message,
      });
      throw new Error(error?.response?.data?.detail || error?.message || 'Login failed');
    }
  };

  // Register with email, password, and name
  const register = async (email: string, password: string, name: string) => {
    try {
      const response = await axios.post(`${API_URL}/api/auth/register`, { email, password, name });
      const { access_token, user: userData } = response.data;

      await AsyncStorage.setItem('auth_token', access_token);
      await AsyncStorage.setItem('user', JSON.stringify(userData));

      setToken(access_token);
      setUser(userData);

      // Let the index.tsx handle navigation based on auth state
    } catch (error: any) {
      console.log('❌ Register error:', {
        url: `${API_URL}/api/auth/register`,
        status: error?.response?.status,
        data: error?.response?.data,
        message: error?.message,
      });
      throw new Error(error?.response?.data?.detail || error?.message || 'Registration failed');
    }
  };

  // Login using Google OAuth


  WebBrowser.maybeCompleteAuthSession(); // ✅ Call this once, outside function if possible

  const loginWithGoogle = async () => {
    try {
      // Build a deep link the app can handle, e.g., unifiedcalendar://oauth-callback
      const returnUrl = Linking.createURL('oauth-callback');
      const loginUrl = `${API_URL}/api/google/login?frontend_redirect_uri=${encodeURIComponent(returnUrl)}`;

      // 🔗 Open Google login in external browser and wait for deep link via listener
      console.log('🔗 Opening Google login with returnUrl:', returnUrl);
      const oauthResultPromise = new Promise<{ token: string; user: any }>((resolve, reject) => {
        oauthPromiseRef.current = { resolve, reject };
      });
      await WebBrowser.openBrowserAsync(loginUrl);
      const { token: accessToken, user: userData } = await oauthResultPromise;

      await AsyncStorage.setItem('auth_token', accessToken);
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      setToken(accessToken);
      setUser(userData);
      alert('✅ Google login successful!');
      // Load Google events immediately
      try {
        await fetchGoogleEvents();
      } catch (e) {
        console.log('Google events fetch after Google login skipped:', (e as any)?.message || e);
      }
    } catch (error: any) {
      console.error('❌ Google login error:', error);
      alert(`Google login error: ${error.message || 'Unknown error occurred'}`);
    }
  };

  // Fetch Google events (used after successful auth)
  const fetchGoogleEvents = async () => {
    const authToken = await AsyncStorage.getItem('auth_token');
    if (!authToken) throw new Error('Not authenticated');
    try {
      const res = await axios.get(`${API_URL}/api/google/events`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      console.log('✅ Fetched Google events successfully', res.data?.events?.length ?? 0);
    } catch (e: any) {
      console.log('⚠️ Could not fetch Google events:', e?.response?.data || e?.message || e);
      throw e;
    }
  };

  // Logout user
  const logout = async () => {
    await AsyncStorage.removeItem('auth_token');
    await AsyncStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };


  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        register,
        loginWithGoogle,
        fetchGoogleEvents,
        logout,
        isLoading
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to access AuthContext
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}

