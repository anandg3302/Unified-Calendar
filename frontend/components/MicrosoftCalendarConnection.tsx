import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';
import microsoftCalendarService from '../services/microsoftCalendarService';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 
                process.env.EXPO_PUBLIC_BACKEND_URL || 
                'http://10.180.141.59:8000';

interface MicrosoftCalendarConnectionProps {
  onConnected?: () => void;
  isConnected?: boolean;
}

export default function MicrosoftCalendarConnection({ 
  onConnected, 
  isConnected = false 
}: MicrosoftCalendarConnectionProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [connected, setConnected] = useState(isConnected);

  const handleConnect = async () => {
    try {
      setIsLoading(true);

      // Get auth token
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        Alert.alert('Error', 'Please log in first');
        return;
      }

      // Initiate OAuth flow
      const authUrl = `${API_URL}/api/microsoft/auth/login`;
      const canOpen = await Linking.canOpenURL(authUrl);

      if (canOpen) {
        await Linking.openURL(authUrl);
        
        // Set up deep link listener to handle callback
        const subscription = Linking.addEventListener('url', async (event) => {
          const { url } = event;
          
          if (url.includes('microsoft/callback')) {
            // User completed OAuth flow
            setConnected(true);
            if (onConnected) {
              onConnected();
            }
            Alert.alert('Success', 'Microsoft Calendar connected successfully');
            subscription.remove();
          }
        });
      } else {
        Alert.alert('Error', 'Cannot open Microsoft login URL');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to connect Microsoft Calendar');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    Alert.alert(
      'Disconnect Microsoft Calendar',
      'Are you sure you want to disconnect your Microsoft Calendar?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              const token = await AsyncStorage.getItem('auth_token');
              
              if (token) {
                const success = await microsoftCalendarService.disconnectMicrosoft(token);
                
                if (success) {
                  setConnected(false);
                  Alert.alert('Success', 'Microsoft Calendar disconnected');
                } else {
                  Alert.alert('Error', 'Failed to disconnect Microsoft Calendar');
                }
              }
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to disconnect');
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="logo-microsoft" size={32} color="#0078D4" />
        <Text style={styles.title}>Microsoft Calendar</Text>
      </View>

      <Text style={styles.description}>
        Connect your Microsoft Outlook calendar to view and manage your events
      </Text>

      {connected ? (
        <View style={styles.connectedContainer}>
          <View style={styles.statusContainer}>
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            <Text style={styles.statusText}>Connected</Text>
          </View>
          
          <TouchableOpacity
            style={styles.disconnectButton}
            onPress={handleDisconnect}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="unlink" size={20} color="#fff" />
                <Text style={styles.buttonText}>Disconnect</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.connectButton}
          onPress={handleConnect}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="link" size={20} color="#fff" />
              <Text style={styles.buttonText}>Connect Microsoft Calendar</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 12
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20
  },
  connectedContainer: {
    alignItems: 'center'
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
    marginLeft: 8
  },
  connectButton: {
    backgroundColor: '#0078D4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8
  },
  disconnectButton: {
    backgroundColor: '#F44336',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  }
});
