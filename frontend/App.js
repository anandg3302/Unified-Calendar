import React, { useEffect, useState } from 'react';
import { View, Text, Button, Image, StyleSheet } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

WebBrowser.maybeCompleteAuthSession();

const Stack = createNativeStackNavigator();

// 👇 Login Screen
function LoginScreen({ navigation }) {
  const redirectUri = makeRedirectUri({ useProxy: true });
  console.log("🔗 Redirect URI:", redirectUri);
  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: '866885922961-aiv71fp9f1i1sprpv83viu1frced4j0m.apps.googleusercontent.com',
    webClientId: '866885922961-aiv71fp9f1i1sprpv83viu1frced4j0m.apps.googleusercontent.com',
    redirectUri,
    scopes: ['openid', 'profile', 'email'],
  });

  useEffect(() => {
    if (!response) return;
    console.log('🔎 Auth response:', JSON.stringify(response, null, 2));
    if (response?.type === 'success' && response.authentication?.accessToken) {
      const { authentication } = response;
      fetchUserInfo(authentication.accessToken);
    } else if (response?.type === 'error') {
      console.log('❌ Auth error:', response.error, response.params);
    } else if (response?.type === 'cancel' || response?.type === 'dismiss') {
      console.log('ℹ️ User cancelled/dismissed Google login');
    }
  }, [response]);

  const fetchUserInfo = async (token) => {
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const user = await res.json();
      navigation.replace('Home', { user }); // 👈 navigate to Home after login
    } catch (error) {
      console.error('Error fetching user info:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Unified Calendar</Text>
      <Button
        title="Sign in with Google"
        disabled={!request}
        onPress={() => promptAsync({ useProxy: true, preferEphemeralSession: true, showInRecents: true })}
      />
    </View>
  );
}

// 👇 Home Screen
function HomeScreen({ route }) {
  const { user } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hello, {user.name} 👋</Text>
      <Image source={{ uri: user.picture }} style={styles.image} />
      <Text style={styles.email}>{user.email}</Text>
      <Text style={styles.success}>✅ Login Successful!</Text>
    </View>
  );
}

// 👇 Main App Component
export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: 'My Calendar' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f7f9fc',
  },
  title: {
    fontSize: 24,
    marginBottom: 30,
    fontWeight: 'bold',
    color: '#222',
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginVertical: 15,
  },
  email: {
    fontSize: 16,
    color: '#666',
  },
  success: {
    fontSize: 18,
    color: 'green',
    marginTop: 20,
  },
});
