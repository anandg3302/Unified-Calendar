/**
 * Apple Authentication Service
 * 
 * This service handles Sign in with Apple authentication for React Native.
 * It provides methods for:
 * - Sign in with Apple
 * - Token validation
 * - User information extraction
 * - Apple Calendar connection setup
 * 
 * @author AI Assistant
 * @date 2024
 */

import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { Platform, Alert } from 'react-native';
import localStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';

// Types for Apple authentication
export interface AppleUser {
  user: string;
  email?: string;
  fullName?: {
    givenName?: string;
    familyName?: string;
  };
  identityToken?: string;
  authorizationCode?: string;
  realUserStatus?: AppleAuthentication.AppleAuthenticationUserDetectionStatus;
}

export interface AppleAuthResult {
  success: boolean;
  user?: AppleUser;
  error?: string;
}

export interface AppleCalendarCredentials {
  appleId: string;
  appSpecificPassword: string;
}

class AppleAuthService {
  private readonly API_BASE_URL: string;
  private readonly APPLE_CLIENT_ID: string;

  constructor() {
    this.API_BASE_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL || 'https://unified-calendar-zflg.onrender.com';
    this.APPLE_CLIENT_ID = Constants.expoConfig?.extra?.EXPO_PUBLIC_APPLE_CLIENT_ID || process.env.EXPO_PUBLIC_APPLE_CLIENT_ID || '';
  }

  /**
   * Check if Sign in with Apple is available on the device
   * @returns {Promise<boolean>} True if available, false otherwise
   */
  async isAvailable(): Promise<boolean> {
    try {
      if (Platform.OS !== 'ios') {
        return false;
      }
      
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      return isAvailable;
    } catch (error) {
      console.error('Error checking Apple authentication availability:', error);
      return false;
    }
  }

  /**
   * Sign in with Apple
   * @returns {Promise<AppleAuthResult>} Authentication result
   */
  async signInWithApple(): Promise<AppleAuthResult> {
    try {
      const isAvailable = await this.isAvailable();
      if (!isAvailable) {
        return {
          success: false,
          error: 'Sign in with Apple is not available on this device'
        };
      }

      // Request Apple authentication
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      // Extract user information
      const appleUser: AppleUser = {
        user: credential.user,
        email: credential.email || undefined,
        fullName: credential.fullName || undefined,
        identityToken: credential.identityToken || undefined,
        authorizationCode: credential.authorizationCode || undefined,
        realUserStatus: credential.realUserStatus,
      };

      // Store Apple user data
      await this.storeAppleUserData(appleUser);

      // Send to backend for validation and storage
      const backendResult = await this.validateWithBackend(appleUser);
      
      if (backendResult.success) {
        return {
          success: true,
          user: appleUser
        };
      } else {
        return {
          success: false,
          error: backendResult.error || 'Backend validation failed'
        };
      }

    } catch (error: any) {
      console.error('Apple sign in error:', error);
      
      if (error.code === 'ERR_CANCELED') {
        return {
          success: false,
          error: 'User canceled the sign in process'
        };
      }

      return {
        success: false,
        error: error.message || 'Apple sign in failed'
      };
    }
  }

  /**
   * Validate Apple authentication with backend
   * @param {AppleUser} appleUser - Apple user data
   * @returns {Promise<{success: boolean, error?: string}>} Validation result
   */
  private async validateWithBackend(appleUser: AppleUser): Promise<{success: boolean, error?: string}> {
    try {
      const token = await localStorage.getItem('auth_token');
      
      if (!token) {
        return {
          success: false,
          error: 'No authentication token found'
        };
      }

      const response = await axios.post(
        `${this.API_BASE_URL}/api/apple/auth/signin`,
        {
          identity_token: appleUser.identityToken,
          authorization_code: appleUser.authorizationCode,
          user_identifier: appleUser.user
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.status === 200) {
        return { success: true };
      } else {
        return {
          success: false,
          error: response.data?.detail || 'Backend validation failed'
        };
      }

    } catch (error: any) {
      console.error('Backend validation error:', error);
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Backend validation failed'
      };
    }
  }

  /**
   * Store Apple user data locally
   * @param {AppleUser} appleUser - Apple user data
   */
  private async storeAppleUserData(appleUser: AppleUser): Promise<void> {
    try {
      await localStorage.setItem('apple_user_data', JSON.stringify(appleUser));
    } catch (error) {
      console.error('Error storing Apple user data:', error);
    }
  }

  /**
   * Get stored Apple user data
   * @returns {Promise<AppleUser | null>} Stored Apple user data
   */
  async getStoredAppleUserData(): Promise<AppleUser | null> {
    try {
      const storedData = await localStorage.getItem('apple_user_data');
      return storedData ? JSON.parse(storedData) : null;
    } catch (error) {
      console.error('Error retrieving Apple user data:', error);
      return null;
    }
  }

  /**
   * Clear stored Apple user data
   */
  async clearAppleUserData(): Promise<void> {
    try {
      await localStorage.removeItem('apple_user_data');
    } catch (error) {
      console.error('Error clearing Apple user data:', error);
    }
  }

  /**
   * Connect to Apple Calendar using CalDAV credentials
   * @param {AppleCalendarCredentials} credentials - Apple Calendar credentials
   * @returns {Promise<{success: boolean, error?: string, calendars?: any[]}>} Connection result
   */
  async connectAppleCalendar(credentials: AppleCalendarCredentials): Promise<{
    success: boolean;
    error?: string;
    calendars?: any[];
  }> {
    try {
      const token = await localStorage.getItem('auth_token');
      
      if (!token) {
        return {
          success: false,
          error: 'No authentication token found'
        };
      }

      const response = await axios.post(
        `${this.API_BASE_URL}/api/apple/calendar/connect`,
        {
          apple_id: credentials.appleId,
          app_specific_password: credentials.appSpecificPassword
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.status === 200) {
        return {
          success: true,
          calendars: response.data.calendars
        };
      } else {
        return {
          success: false,
          error: response.data?.detail || 'Failed to connect to Apple Calendar'
        };
      }

    } catch (error: any) {
      console.error('Apple Calendar connection error:', error);
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Failed to connect to Apple Calendar'
      };
    }
  }

  /**
   * Get Apple Calendar connection instructions
   * @returns {Promise<{title: string, instructions: string[], note: string}>} Instructions
   */
  async getAppleCalendarInstructions(): Promise<{
    title: string;
    instructions: string[];
    note: string;
  }> {
    try {
      const response = await axios.get(
        `${this.API_BASE_URL}/api/apple/auth/instructions`
      );

      return response.data;
    } catch (error) {
      console.error('Error getting Apple Calendar instructions:', error);
      return {
        title: 'Create App-Specific Password for Apple Calendar',
        instructions: [
          '1. Go to appleid.apple.com and sign in with your Apple ID',
          '2. In the "Security" section, click "Generate Password" under "App-Specific Passwords"',
          '3. Enter a label for this password (e.g., "Calendar App")',
          '4. Click "Create" and copy the generated password',
          '5. Use this password in the app instead of your regular Apple ID password',
          '6. Keep this password secure and do not share it'
        ],
        note: 'App-specific passwords are required for CalDAV access to iCloud Calendar'
      };
    }
  }

  /**
   * Sync Apple Calendar events
   * @param {string} syncDirection - Sync direction ('from_apple', 'to_apple', 'bidirectional')
   * @param {number} dateRangeDays - Number of days to sync
   * @returns {Promise<{success: boolean, error?: string}>} Sync result
   */
  async syncAppleCalendar(
    syncDirection: string = 'from_apple',
    dateRangeDays: number = 30
  ): Promise<{success: boolean, error?: string}> {
    try {
      const token = await localStorage.getItem('auth_token');
      
      if (!token) {
        return {
          success: false,
          error: 'No authentication token found'
        };
      }

      const response = await axios.post(
        `${this.API_BASE_URL}/api/apple/calendar/sync`,
        {
          sync_direction: syncDirection,
          date_range_days: dateRangeDays
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.status === 200) {
        return { success: true };
      } else {
        return {
          success: false,
          error: response.data?.detail || 'Sync failed'
        };
      }

    } catch (error: any) {
      console.error('Apple Calendar sync error:', error);
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Sync failed'
      };
    }
  }

  /**
   * Show Apple Calendar setup instructions
   */
  async showAppleCalendarInstructions(): Promise<void> {
    try {
      const instructions = await this.getAppleCalendarInstructions();
      
      Alert.alert(
        instructions.title,
        `${instructions.instructions.join('\n\n')}\n\n${instructions.note}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error showing Apple Calendar instructions:', error);
      Alert.alert(
        'Apple Calendar Setup',
        'Please visit appleid.apple.com to create an app-specific password for calendar access.',
        [{ text: 'OK' }]
      );
    }
  }
}

// Export singleton instance
export const appleAuthService = new AppleAuthService();
export default appleAuthService;
