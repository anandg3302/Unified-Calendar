import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { useCalendarStore } from '../stores/calendarStore';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1F1F1F',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#F87171',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  infoCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 20,
    padding: 24,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoIcon: {
    marginRight: 12,
    width: 24,
  },
  infoText: {
    fontSize: 15,
    color: '#D1D5DB',
    flex: 1,
  },
  warningBox: {
    backgroundColor: '#1F1F1F',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#F87171',
    borderLeftWidth: 4,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F87171',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#9CA3AF',
    lineHeight: 20,
  },
  buttonContainer: {
    gap: 16,
  },
  logoutButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#F87171',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  logoutButtonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },
  cancelButton: {
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#3A3A3A',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  errorText: {
    color: '#F87171',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 16,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10, 10, 10, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 16,
    fontWeight: '600',
  },
});

export default function LogoutScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setError(null);
    
    try {
      // Stop any ongoing polling safely using getState to avoid React hooks issues
      try {
        const { stopPolling } = useCalendarStore.getState();
        if (stopPolling) {
          stopPolling();
        }
      } catch (pollError) {
        console.warn('Error stopping polling:', pollError);
        // Continue with logout even if polling stop fails
      }
      
      // Clear auth state
      await logout();
      
      // Use requestAnimationFrame to ensure navigation happens after state updates complete
      // This prevents React errors during unmounting
      requestAnimationFrame(() => {
        setTimeout(() => {
          router.replace('/(auth)/login');
        }, 50);
      });
    } catch (err: any) {
      console.error('Logout error:', err);
      const errorMessage = err?.message || 'An error occurred while logging out. Please try again.';
      setError(errorMessage);
      setIsLoggingOut(false);
      
      // Show alert for critical errors
      Alert.alert(
        'Logout Failed',
        errorMessage,
        [
          {
            text: 'Try Again',
            onPress: () => setError(null),
          },
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => router.back(),
          }
        ]
      );
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Header */}
        <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="log-out-outline" size={50} color="#F87171" />
          </View>
          <Text style={styles.title}>Log Out</Text>
          <Text style={styles.subtitle}>
            Are you sure you want to log out? You'll need to sign in again to access your calendar.
          </Text>
        </Animated.View>

        {/* User Info Card */}
        {user && (
          <Animated.View entering={FadeInDown.duration(400).delay(100)}>
            <BlurView intensity={80} tint="dark" style={styles.infoCard}>
              <Text style={styles.infoTitle}>Account Information</Text>
              
              <View style={styles.infoItem}>
                <Ionicons name="person-outline" size={20} color="#9CA3AF" style={styles.infoIcon} />
                <Text style={styles.infoText}>{user.name || 'User'}</Text>
              </View>

              <View style={styles.infoItem}>
                <Ionicons name="mail-outline" size={20} color="#9CA3AF" style={styles.infoIcon} />
                <Text style={styles.infoText}>{user.email}</Text>
              </View>

              <View style={styles.infoItem}>
                <Ionicons name="calendar-outline" size={20} color="#9CA3AF" style={styles.infoIcon} />
                <Text style={styles.infoText}>Your events will be saved</Text>
              </View>
            </BlurView>
          </Animated.View>
        )}

        {/* Warning Box */}
        <Animated.View entering={FadeInDown.duration(400).delay(200)}>
          <View style={styles.warningBox}>
            <Text style={styles.warningTitle}>⚠️ What happens when you log out?</Text>
            <Text style={styles.warningText}>
              • You'll be signed out of your account{'\n'}
              • Your calendar events will remain saved{'\n'}
              • You'll need to sign in again to access your data{'\n'}
              • Any active sessions will be terminated
            </Text>
          </View>
        </Animated.View>

        {/* Error Message */}
        {error && (
          <Animated.View entering={FadeIn.duration(300)}>
            <Text style={styles.errorText}>{error}</Text>
          </Animated.View>
        )}

        {/* Buttons */}
        <Animated.View entering={FadeInDown.duration(400).delay(300)} style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            disabled={isLoggingOut}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#F87171', '#EF4444']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.logoutButtonGradient}
            >
              {isLoggingOut ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="log-out" size={20} color="#FFFFFF" />
                  <Text style={styles.logoutButtonText}>Log Out</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancel}
            disabled={isLoggingOut}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      {/* Loading Overlay */}
      {isLoggingOut && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#F87171" />
          <Text style={styles.loadingText}>Logging out...</Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

