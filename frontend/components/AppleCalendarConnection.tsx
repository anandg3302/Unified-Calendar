/**
 * Apple Calendar Connection Component
 * 
 * This component provides UI for connecting to Apple Calendar including:
 * - Sign in with Apple authentication
 * - Apple Calendar CalDAV connection setup
 * - Connection status display
 * - Instructions for app-specific password creation
 * 
 * @author AI Assistant
 * @date 2024
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  Modal,
  Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCalendarStore } from '../stores/calendarStore';
import appleAuthService, { AppleCalendarCredentials } from '../services/appleAuthService';

interface AppleCalendarConnectionProps {
  onConnectionSuccess?: () => void;
  onConnectionError?: (error: string) => void;
}

export const AppleCalendarConnection: React.FC<AppleCalendarConnectionProps> = ({
  onConnectionSuccess,
  onConnectionError
}) => {
  const { appleConnected, connectAppleCalendar } = useCalendarStore();
  const [isLoading, setIsLoading] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showCredentialsForm, setShowCredentialsForm] = useState(false);
  const [credentials, setCredentials] = useState<AppleCalendarCredentials>({
    appleId: '',
    appSpecificPassword: ''
  });
  const [isAppleAuthAvailable, setIsAppleAuthAvailable] = useState(false);

  useEffect(() => {
    checkAppleAuthAvailability();
  }, []);

  const checkAppleAuthAvailability = async () => {
    const available = await appleAuthService.isAvailable();
    setIsAppleAuthAvailable(available);
  };

  const handleSignInWithApple = async () => {
    setIsLoading(true);
    try {
      const result = await appleAuthService.signInWithApple();
      
      if (result.success) {
        Alert.alert(
          'Apple Sign In Successful',
          'You can now connect to your Apple Calendar using your app-specific password.',
          [
            {
              text: 'Connect Calendar',
              onPress: () => setShowCredentialsForm(true)
            },
            {
              text: 'Later',
              style: 'cancel'
            }
          ]
        );
      } else {
        Alert.alert('Apple Sign In Failed', result.error || 'Please try again');
        onConnectionError?.(result.error || 'Apple sign in failed');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Apple sign in failed');
      onConnectionError?.(error.message || 'Apple sign in failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectCalendar = async () => {
    if (!credentials.appleId || !credentials.appSpecificPassword) {
      Alert.alert('Error', 'Please enter both Apple ID and app-specific password');
      return;
    }

    setIsLoading(true);
    try {
      const success = await connectAppleCalendar(credentials);
      
      if (success) {
        Alert.alert(
          'Success',
          'Apple Calendar connected successfully!',
          [
            {
              text: 'OK',
              onPress: () => {
                setShowCredentialsForm(false);
                setCredentials({ appleId: '', appSpecificPassword: '' });
                onConnectionSuccess?.();
              }
            }
          ]
        );
      } else {
        Alert.alert(
          'Connection Failed',
          'Failed to connect to Apple Calendar. Please check your credentials and try again.'
        );
        onConnectionError?.('Failed to connect to Apple Calendar');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to connect to Apple Calendar');
      onConnectionError?.(error.message || 'Failed to connect to Apple Calendar');
    } finally {
      setIsLoading(false);
    }
  };

  const showAppSpecificPasswordInstructions = async () => {
    try {
      await appleAuthService.showAppleCalendarInstructions();
    } catch (error) {
      Alert.alert(
        'Instructions',
        'Please visit appleid.apple.com to create an app-specific password for calendar access.',
        [{ text: 'OK' }]
      );
    }
  };

  const openAppleIDWebsite = () => {
    Linking.openURL('https://appleid.apple.com');
  };

  if (appleConnected) {
    return (
      <View style={styles.connectedContainer}>
        <Ionicons name="checkmark-circle" size={24} color="#34C759" />
        <Text style={styles.connectedText}>Apple Calendar Connected</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="logo-apple" size={32} color="#000" />
        <Text style={styles.title}>Connect Apple Calendar</Text>
        <Text style={styles.subtitle}>
          Sync your iCloud Calendar events with the unified calendar
        </Text>
      </View>

      <View style={styles.stepsContainer}>
        <Text style={styles.stepsTitle}>Setup Steps:</Text>
        
        <View style={styles.step}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>1</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Sign in with Apple</Text>
            <Text style={styles.stepDescription}>
              Authenticate with your Apple ID
            </Text>
          </View>
        </View>

        <View style={styles.step}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>2</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Create App-Specific Password</Text>
            <Text style={styles.stepDescription}>
              Generate a password for calendar access
            </Text>
            <TouchableOpacity 
              style={styles.instructionsButton}
              onPress={showAppSpecificPasswordInstructions}
            >
              <Text style={styles.instructionsButtonText}>View Instructions</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.step}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>3</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Connect Calendar</Text>
            <Text style={styles.stepDescription}>
              Enter your credentials to sync events
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.actionsContainer}>
        {isAppleAuthAvailable ? (
          <TouchableOpacity
            style={[styles.button, styles.appleButton]}
            onPress={handleSignInWithApple}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="logo-apple" size={20} color="#fff" />
                <Text style={styles.buttonText}>Sign in with Apple</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.unavailableContainer}>
            <Ionicons name="warning" size={20} color="#FF9500" />
            <Text style={styles.unavailableText}>
              Sign in with Apple is only available on iOS devices
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, styles.credentialsButton]}
          onPress={() => setShowCredentialsForm(true)}
          disabled={isLoading}
        >
          <Ionicons name="calendar" size={20} color="#007AFF" />
          <Text style={[styles.buttonText, styles.credentialsButtonText]}>
            Connect with Credentials
          </Text>
        </TouchableOpacity>
      </View>

      {/* Credentials Form Modal */}
      <Modal
        visible={showCredentialsForm}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Apple Calendar Credentials</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowCredentialsForm(false)}
            >
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Apple ID</Text>
              <TextInput
                style={styles.input}
                placeholder="your.email@icloud.com"
                value={credentials.appleId}
                onChangeText={(text) => setCredentials(prev => ({ ...prev, appleId: text }))}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>App-Specific Password</Text>
              <TextInput
                style={styles.input}
                placeholder="abcd-efgh-ijkl-mnop"
                value={credentials.appSpecificPassword}
                onChangeText={(text) => setCredentials(prev => ({ ...prev, appSpecificPassword: text }))}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.helpButton}
                onPress={showAppSpecificPasswordInstructions}
              >
                <Ionicons name="help-circle" size={16} color="#007AFF" />
                <Text style={styles.helpButtonText}>How to create app-specific password</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.createPasswordButton}
              onPress={openAppleIDWebsite}
            >
              <Ionicons name="open-outline" size={16} color="#007AFF" />
              <Text style={styles.createPasswordButtonText}>
                Open Apple ID Website
              </Text>
            </TouchableOpacity>
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => setShowCredentialsForm(false)}
            >
              <Text style={[styles.buttonText, styles.cancelButtonText]}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.connectButton]}
              onPress={handleConnectCalendar}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Connect</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
  },
  connectedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F0F9F0',
    borderRadius: 8,
    margin: 16,
  },
  connectedText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#34C759',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  stepsContainer: {
    marginBottom: 24,
  },
  stepsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  step: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  stepDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  instructionsButton: {
    marginTop: 8,
  },
  instructionsButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  actionsContainer: {
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  appleButton: {
    backgroundColor: '#000',
  },
  credentialsButton: {
    backgroundColor: '#F0F8FF',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  credentialsButtonText: {
    color: '#007AFF',
  },
  unavailableContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF8F0',
    borderRadius: 8,
    gap: 8,
  },
  unavailableText: {
    color: '#FF9500',
    fontSize: 14,
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  helpButtonText: {
    color: '#007AFF',
    fontSize: 14,
  },
  createPasswordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#F0F8FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
    gap: 8,
    marginTop: 8,
  },
  createPasswordButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F0F0F0',
  },
  cancelButtonText: {
    color: '#000',
  },
  connectButton: {
    flex: 1,
    backgroundColor: '#007AFF',
  },
});

export default AppleCalendarConnection;
