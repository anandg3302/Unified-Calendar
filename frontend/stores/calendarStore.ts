import { create } from 'zustand';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Alert } from 'react-native';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL || 'https://unified-calendar-zflg.onrender.com';

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10000, // Set a timeout for requests
});

// Log request details
apiClient.interceptors.request.use((config) => {
  console.log('Axios Request:', config);
  return config; // Ensure the config object is returned
});

// Enhanced Axios error handling and added logging.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    try {
      console.error('Axios error:', {
        message: error?.message || 'Unknown error',
        config: error?.config,
        response: error?.response,
        request: error?.request,
      });

      // Display a user-friendly error message only if we're not already handling it elsewhere
      if (error?.response) {
        const status = error.response.status;
        const message = error.response.data?.message || error.response.data?.detail || 'Unknown error';
        // Only show alert if this is not a handled error (like 422 validation errors)
        if (status !== 422 && status !== 404) {
          Alert.alert('Error', `Server responded with status ${status}: ${message}`);
        }
      } else if (error?.request) {
        Alert.alert('Network Error', 'No response received from the server. Please check your connection.');
      } else {
        Alert.alert('Error', `Unexpected error: ${error?.message || 'Unknown error'}`);
      }
    } catch (interceptorError) {
      console.error('Error in response interceptor:', interceptorError);
    }

    return Promise.reject(error);
  }
);

// Validate API_URL
if (!API_URL) {
  console.warn('API_URL is not defined. Please check your environment configuration.');
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  calendar_source: 'google' | 'apple' | 'local';
  location?: string;
  is_invite: boolean;
  invite_status?: string;
  created_at: string;
  // Apple-specific fields
  apple_event_id?: string;
  calendar_id?: string;
  calendar_name?: string;
}

export interface CalendarSource {
  id: string;
  name: string;
  type: string;
  color: string;
  is_active: boolean;
}

interface CalendarState {
  events: CalendarEvent[];
  calendarSources: CalendarSource[];
  selectedSources: string[];
  viewMode: 'day' | 'week' | 'month';
  selectedDate: Date;
  isLoading: boolean;
  appleConnected: boolean;
  pollingInterval: NodeJS.Timeout | null;
  isPolling: boolean;
  fetchEvents: () => Promise<void>;
  fetchCalendarSources: () => Promise<void>;
  toggleSource: (sourceId: string) => void;
  setViewMode: (mode: 'day' | 'week' | 'month') => void;
  setSelectedDate: (date: Date) => void;
  createEvent: (eventData: any) => Promise<void>;
  updateEvent: (eventId: string, eventData: any) => Promise<void>;
  deleteEvent: (eventId: string) => Promise<void>;
  respondToInvite: (eventId: string, status: string) => Promise<void>;
  startPolling: (intervalSeconds?: number) => void;
  stopPolling: () => void;
  // Apple Calendar methods
  connectAppleCalendar: (credentials: {appleId: string, appSpecificPassword: string}) => Promise<boolean>;
  syncAppleEvents: () => Promise<void>;
  createAppleEvent: (eventData: any) => Promise<void>;
  updateAppleEvent: (eventId: string, eventData: any) => Promise<void>;
  deleteAppleEvent: (eventId: string) => Promise<void>;
}

export const useCalendarStore = create<CalendarState>((set, get) => ({
  events: [],
  calendarSources: [],
  selectedSources: ['google', 'apple', 'microsoft'],
  viewMode: 'month',
  selectedDate: new Date(),
  isLoading: false,
  appleConnected: false,
  pollingInterval: null,
  isPolling: false,

  fetchEvents: async () => {
    try {
      set({ isLoading: true });
      const token = await AsyncStorage.getItem('auth_token');
      const { selectedSources } = get();
      
      const response = await apiClient.get(`/api/events`, {
        params: {
          calendar_sources: selectedSources.join(',')
        },
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      // Backend returns {local_events: [...], google_events: [...], apple_events: [...], microsoft_events: [...]}
      // We need to combine them into a single array
      const { local_events = [], google_events = [], apple_events = [], microsoft_events = [] } = response.data;
      const allEvents = [...local_events, ...google_events, ...apple_events, ...microsoft_events];
      
      // Check if Apple Calendar is connected
      const appleConnected = apple_events.length > 0 || response.data.apple_connected === true;
      
      set({ events: allEvents, isLoading: false, appleConnected });
    } catch (error) {
      console.error('Error fetching events:', error);
      set({ isLoading: false });
    }
  },

  fetchCalendarSources: async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      
      const response = await apiClient.get(`/api/calendar-sources`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      set({ calendarSources: response.data });
    } catch (error) {
      console.error('Error fetching calendar sources:', error);
    }
  },

  toggleSource: (sourceId: string) => {
    const { selectedSources } = get();
    const newSources = selectedSources.includes(sourceId)
      ? selectedSources.filter(id => id !== sourceId)
      : [...selectedSources, sourceId];
    
    set({ selectedSources: newSources });
    get().fetchEvents();
  },

  setViewMode: (mode: 'day' | 'week' | 'month') => {
    set({ viewMode: mode });
  },

  setSelectedDate: (date: Date) => {
    set({ selectedDate: date });
  },

  createEvent: async (eventData: any) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      
      await apiClient.post(`/api/events`, eventData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      await get().fetchEvents();
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  },

  updateEvent: async (eventId: string, eventData: any) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      
      await apiClient.put(`/api/events/${eventId}`, eventData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      await get().fetchEvents();
    } catch (error: any) {
      console.error('Error updating event:', error);
      
      // Show more specific error message for validation errors
      if (error.response?.status === 422) {
        Alert.alert('Validation Error', 'Please check that all required fields are filled correctly.');
      } else if (error.response?.status === 404) {
        Alert.alert('Event Not Found', 'The event you are trying to update no longer exists.');
      }
      
      throw error;
    }
  },

  deleteEvent: async (eventId: string) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      
      await apiClient.delete(`/api/events/${eventId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      await get().fetchEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      throw error;
    }
  },

  respondToInvite: async (eventId: string, status: string) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      
      await apiClient.patch(`/api/events/${eventId}/respond`, 
        { status },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      await get().fetchEvents();
    } catch (error) {
      console.error('Error responding to invite:', error);
      throw error;
    }
  },

  // Apple Calendar methods
  connectAppleCalendar: async (credentials: {appleId: string, appSpecificPassword: string}) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      
      const response = await apiClient.post('/api/apple/calendar/connect', credentials, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.status === 200) {
        set({ appleConnected: true });
        await get().fetchEvents(); // Refresh events after connection
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error connecting Apple Calendar:', error);
      return false;
    }
  },

  syncAppleEvents: async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      
      await apiClient.post('/api/apple/calendar/sync', {
        sync_direction: 'from_apple',
        date_range_days: 30
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      await get().fetchEvents(); // Refresh events after sync
    } catch (error) {
      console.error('Error syncing Apple events:', error);
      throw error;
    }
  },

  createAppleEvent: async (eventData: any) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      
      await apiClient.post('/api/apple/calendar/events', eventData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      await get().fetchEvents(); // Refresh events after creation
    } catch (error) {
      console.error('Error creating Apple event:', error);
      throw error;
    }
  },

  updateAppleEvent: async (eventId: string, eventData: any) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      
      await apiClient.put(`/api/apple/calendar/events/${eventId}`, eventData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      await get().fetchEvents(); // Refresh events after update
    } catch (error) {
      console.error('Error updating Apple event:', error);
      throw error;
    }
  },

  deleteAppleEvent: async (eventId: string) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      
      await apiClient.delete(`/api/apple/calendar/events/${eventId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      await get().fetchEvents(); // Refresh events after deletion
    } catch (error) {
      console.error('Error deleting Apple event:', error);
      throw error;
    }
  },

  startPolling: (intervalSeconds: number = 30) => {
    const { pollingInterval, isPolling } = get();
    
    // Don't start if already polling
    if (isPolling && pollingInterval) {
      console.log('Polling already active');
      return;
    }

    // Clear existing interval if any
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }

    console.log(`Starting event polling every ${intervalSeconds} seconds`);
    
    // Start polling
    const interval = setInterval(async () => {
      try {
        console.log('Polling for event updates...');
        await get().fetchEvents();
      } catch (error) {
        console.error('Error during polling:', error);
      }
    }, intervalSeconds * 1000);

    set({ 
      pollingInterval: interval as any,
      isPolling: true 
    });
  },

  stopPolling: () => {
    const { pollingInterval } = get();
    
    if (pollingInterval) {
      console.log('Stopping event polling');
      clearInterval(pollingInterval);
      set({ 
        pollingInterval: null, 
        isPolling: false 
      });
    }
  }
}));