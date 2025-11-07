import React, { useEffect } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function OAuthCallback() {
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    const run = async () => {
      try {
        const token = typeof params.token === 'string' ? params.token : Array.isArray(params.token) ? params.token[0] : undefined;
        let userStr = typeof params.user === 'string' ? params.user : Array.isArray(params.user) ? params.user[0] : undefined;

        console.log('✅ OAuth callback hit');
        console.log('🔎 Raw params:', params);

        if (!token || !userStr) {
          console.warn('❌ Missing token or user in query params');
          // Navigate home even if missing to avoid dead end
          router.replace('/');
          return;
        }

        // Decode and parse user JSON
        try {
          userStr = decodeURIComponent(userStr);
        } catch {}
        let user: any = undefined;
        try {
          user = JSON.parse(userStr);
        } catch (e) {
          console.warn('⚠️ Failed to parse user JSON, using raw string');
          user = userStr;
        }

        // Persist in web localStorage
        try {
          window.localStorage.setItem('token', token);
          window.localStorage.setItem('user', JSON.stringify(user));
          console.log('✅ Saved token + user to localStorage');
        } catch {}

        // Persist in native storage (no-op on web)
        try {
          await AsyncStorage.setItem('auth_token', token);
          await AsyncStorage.setItem('user', JSON.stringify(user));
          console.log('✅ Saved token + user to AsyncStorage');
        } catch {}

        // Navigate to home/dashboard
        router.replace('/');
      } catch (e) {
        console.error('❌ OAuth callback error:', e);
        router.replace('/');
      }
    };
    run();
  }, [params, router]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" />
      <Text style={{ marginTop: 12 }}>Completing sign-in…</Text>
    </View>
  );
}
