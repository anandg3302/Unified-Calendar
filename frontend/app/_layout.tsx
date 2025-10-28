// These imports must be first to initialize gesture handler and reanimated correctly
import 'react-native-gesture-handler';
import 'react-native-reanimated';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from '../contexts/AuthContext';

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS === 'web') {
      // Import Tailwind CSS for web only
      require('./global.css');
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Poppins:wght@400;600;700&display=swap';
      document.head.appendChild(link);
    }
  }, []);
  return (
    <GestureHandlerRootView style={{ flex: 1 }} className="bg-gradient-to-br from-orange-50 to-orange-100">
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)/login" />
          <Stack.Screen name="(auth)/register" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen 
            name="event-details" 
            options={{ 
              headerShown: true, 
              title: 'Event Details',
              presentation: 'modal'
            }} 
          />
          <Stack.Screen 
            name="create-event" 
            options={{ 
              headerShown: true, 
              title: 'Create Event',
              presentation: 'modal'
            }} 
          />
          <Stack.Screen 
            name="edit-event" 
            options={{ 
              headerShown: true, 
              title: 'Edit Event',
              presentation: 'modal'
            }} 
          />
        </Stack>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}