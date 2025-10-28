import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';

const API_URL =
  Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL ||
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  'http://10.180.141.59:8000'; // Fallback to your computer's IP

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
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadStoredAuth();

    // Add deep link listener
    const subscription = Linking.addEventListener('url', handleDeepLink);

    return () => subscription.remove(); // Clean up listener
  }, []);

  // Handle deep link from Google OAuth
  const handleDeepLink = (event: { url: string }) => {
    const { url } = event;
    const params = Linking.parse(url);

    if (params.queryParams?.token && params.queryParams?.user) {
      const accessToken = params.queryParams.token as string;
      const userData = JSON.parse(params.queryParams.user as string);

      AsyncStorage.setItem('auth_token', accessToken);
      AsyncStorage.setItem('user', JSON.stringify(userData));
      setToken(accessToken);
      setUser(userData);

      // Let the index.tsx handle navigation based on auth state
      // This ensures proper navigation flow
    }
  };

  // Load token and user from AsyncStorage on app start
  const loadStoredAuth = async () => {
    try {
      // Don't auto-load stored authentication data
      // This ensures users always see the login page after scanning
      // Users will need to manually log in each time
      setToken(null);
      setUser(null);
    } catch (error) {
      console.error('Error loading auth:', error);
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
      
      // Let the index.tsx handle navigation based on auth state
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || error.message || 'Login failed');
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
      throw new Error(error.response?.data?.detail || error.message || 'Registration failed');
    }
  };

  // Login using Google OAuth
  const loginWithGoogle = async () => {
    try {
      const url = `${API_URL}/api/google/login`;
      const supported = await Linking.canOpenURL(url);
      if (!supported) throw new Error('Cannot open Google login URL');

      await Linking.openURL(url);
      // Deep link listener will handle token & user automatically
    } catch (error: any) {
      throw new Error(error.message || 'Google login failed');
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

