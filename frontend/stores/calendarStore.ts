import { create } from 'zustand';
import axios from 'axios';
import localStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Alert } from 'react-native';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL || 'https://unified-calendar-zflg.onrender.com';

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  withCredentials: true,
});

// Attach token and log request
apiClient.interceptors.request.use((config) => {
  try {
    const webToken = (global as any)?.localStorage?.getItem?.('token');
    if (webToken) {
      config.headers = config.headers || {};
      (config.headers as any).Authorization = `Bearer ${webToken}`;
    }
  } catch {}
  console.log('Axios Request:', {
    url: config.url,
    method: config.method,
    headers: config.headers,
  });
  return config;
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
  calendar_source: 'google' | 'apple' | 'local' | 'microsoft' | 'outlook';
  location?: string;
  is_invite: boolean;
  invite_status?: string;
  created_at: string;
  attendees?: any[];
  organizer?: any;
  creator?: any;
  
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
  lastSynced: number;
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
  setupGoogleWatch: () => Promise<void>;
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
  selectedSources: ['google', 'apple', 'microsoft', 'local'],
  viewMode: 'month',
  selectedDate: new Date(),
  isLoading: false,
  appleConnected: false,
  pollingInterval: null,
  isPolling: false,
  lastSynced: Date.now(),

  fetchEvents: async () => {
    try {
      set({ isLoading: true });
      // Support both native ('auth_token') and web ('token') keys
      const token = (await localStorage.getItem('token')) || (await localStorage.getItem('auth_token'));
      console.log('🔑 fetchEvents token:', token ? 'present' : 'missing');
      const { selectedSources } = get();
      
      const response = await apiClient.get(`/api/events`, {
        params: {
          calendar_sources: selectedSources.join(',')
        },
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      // The backend may return either of these shapes:
      // 1) { events: [...] }  (older combined list, usually Google events)
      // 2) { local_events: [...], google_events: [...], apple_events: [...], microsoft_events: [...] }
      // We need to combine them into a single array
      const hasCombinedList = Array.isArray((response.data as any)?.events);
      const shapeOneEvents: any[] = hasCombinedList ? (response.data as any).events : [];
      const {
        local_events = [],
        google_events = [],
        apple_events = [],
        microsoft_events = []
      } = hasCombinedList ? {} as any : (response.data as any);

      // Normalize Google events to unified shape if backend returned raw Google format
      const normalizedGoogle = (google_events as any[]).map((e: any) => {
        // Handle both our new /api/google/events normalized shape and raw Google items
        if (e && e.start_time) return e; // already normalized
        const startObj = e?.start || {};
        const endObj = e?.end || {};
        const startIso = startObj.dateTime || startObj.date || null;
        const endIso = endObj.dateTime || endObj.date || null;
        return {
          id: e?.id || e?._id || Math.random().toString(36).slice(2),
          title: e?.summary || e?.title || '(No title)',
          description: e?.description || '',
          start_time: startIso,
          end_time: endIso,
          calendar_source: 'google',
          location: e?.location || undefined,
          is_invite: false,
          created_at: new Date().toISOString(),
        };
      });

      // If we got shape (1), attempt to detect source from entries and normalize similarly
      const normalizedFromCombined = (shapeOneEvents as any[]).map((e: any) => {
        if (e && e.start_time) return e;
        const startObj = e?.start || {};
        const endObj = e?.end || {};
        const startIso = startObj.dateTime || startObj.date || null;
        const endIso = endObj.dateTime || endObj.date || null;
        return {
          id: e?.id || e?._id || Math.random().toString(36).slice(2),
          title: e?.summary || e?.title || '(No title)',
          description: e?.description || '',
          start_time: startIso,
          end_time: endIso,
          calendar_source: e?.calendar_source || 'google',
          location: e?.location || undefined,
          is_invite: false,
          created_at: new Date().toISOString(),
        };
      });

      const allEvents = hasCombinedList
        ? normalizedFromCombined
        : [...local_events, ...normalizedGoogle, ...apple_events, ...microsoft_events];
      
      // Check if Apple Calendar is connected
      const appleConnected = apple_events.length > 0 || response.data.apple_connected === true;
      
      set({ events: allEvents, isLoading: false, appleConnected, lastSynced: Date.now() });
    } catch (error) {
      console.error('Error fetching events:', error);
      set({ isLoading: false });
    }
  },

  fetchCalendarSources: async () => {
    try {
      // Support both native ('auth_token') and web ('token') keys
      const token = (await localStorage.getItem('token')) || (await localStorage.getItem('auth_token'));
      console.log('🔑 fetchCalendarSources token:', token ? 'present' : 'missing');
      
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
    try {
      const stored = { provider: sourceId, calendarId: sourceId === 'google' ? 'primary' : undefined };
      (global as any)?.localStorage?.setItem?.('selectedCalendarSource', JSON.stringify(stored));
      console.log('🗂️ Stored selectedCalendarSource:', stored);
    } catch {}
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
     
      const token =
        (await localStorage.getItem('token')) ||
        (await localStorage.getItem('auth_token'));
      console.log('🔑 createEvent token:', token ? 'present' : 'missing');
      try {
        const sel = (global as any)?.localStorage?.getItem?.('selectedCalendarSource');
        console.log('🗂️ Selected source stored:', sel);
      } catch {}

      // ✅ If GOOGLE → send to Google Calendar API
      if (eventData.calendar_source === "google") {
        console.log("📌 Event Data Received:", eventData);

        const payload = {
          summary: eventData.title,
          description: eventData.description,
          start: { dateTime: eventData.start_time },
          end: { dateTime: eventData.end_time },
          location: eventData.location,
        };
        console.log("📌 Google add_event payload:", payload);
        const res = await apiClient.post(`/api/google/add_event`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✅ Google create response:', res.status, res.data);
        // Optimistic UI update
        try {
          const newEventId = (res.data && (res.data.id || res.data.event?.id)) || Math.random().toString(36).slice(2);
          const newEvent = {
            id: newEventId,
            title: eventData.title,
            description: eventData.description || '',
            start_time: eventData.start_time,
            end_time: eventData.end_time,
            calendar_source: 'google' as const,
            location: eventData.location,
            is_invite: false,
            created_at: new Date().toISOString(),
          };
          set({ events: [newEvent as any, ...get().events] });
        } catch {}

        await get().fetchEvents();
        return;
      }

      // ✅ If APPLE → send to Apple Calendar
      if (eventData.calendar_source === "apple") {
        console.log("📌 Creating event on Apple Calendar...");
        await get().createAppleEvent(eventData);
        return;
      }

      // ✅ LOCAL events — save normally
      const localRes = await apiClient.post(`/api/events`, eventData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Optimistic UI update for local
      try {
        const created = (localRes.data && (localRes.data.event || localRes.data)) || {};
        const newEvent = {
          id: created.id || Math.random().toString(36).slice(2),
          title: eventData.title,
          description: eventData.description || '',
          start_time: eventData.start_time,
          end_time: eventData.end_time,
          calendar_source: (eventData.calendar_source || 'local') as any,
          location: eventData.location,
          is_invite: false,
          created_at: new Date().toISOString(),
        };
        set({ events: [newEvent as any, ...get().events] });
      } catch {}

      await get().fetchEvents();
    } catch (error) {
      console.error("Error creating event:", error);
      throw error;
    }
  },

  updateEvent: async (eventId: string, eventData: any) => {
    try {
      const token =
        (await localStorage.getItem('token')) ||
        (await localStorage.getItem('auth_token'));
      console.log('🔑 updateEvent token:', token ? 'present' : 'missing');

      // ✅ GOOGLE update (route + payload mapping)
      if (eventData.calendar_source === "google") {
        const payload = {
          summary: eventData.title,
          description: eventData.description,
          start: { dateTime: eventData.start_time },
          end: { dateTime: eventData.end_time },
          location: eventData.location,
        };
        const res = await apiClient.put(`/api/google/update_event/${eventId}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log('✅ Google update response:', res.status, res.data);
        await get().fetchEvents();
        return;
      }

      // ✅ LOCAL update
      await apiClient.put(`/api/events/${eventId}`, eventData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      await get().fetchEvents();
    } catch (error) {
      console.error("Error updating event:", error);
      throw error;
    }
  },

  deleteEvent: async (eventId: string) => {
    try {
      const token =
        (await localStorage.getItem('token')) ||
        (await localStorage.getItem('auth_token'));

      const event = get().events.find((e) => e.id === eventId);

      // ✅ GOOGLE delete
      if (event?.calendar_source === "google") {
        const res = await apiClient.delete(`/api/google/delete_event/${eventId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log('✅ Google delete response:', res.status, res.data);
        await get().fetchEvents();
        return;
      }

      // ✅ LOCAL delete
      await apiClient.delete(`/api/events/${eventId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      await get().fetchEvents();
    } catch (error) {
      console.error("Error deleting event:", error);
      throw error;
    }
  },

  respondToInvite: async (eventId: string, status: string) => {
    try {
      const token = (await localStorage.getItem('token')) || (await localStorage.getItem('auth_token'));
      
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
      const token = (await localStorage.getItem('token')) || (await localStorage.getItem('auth_token'));
      
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
      const token = (await localStorage.getItem('token')) || (await localStorage.getItem('auth_token'));
      
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
      const token = (await localStorage.getItem('token')) || (await localStorage.getItem('auth_token'));
      
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
      const token = (await localStorage.getItem('token')) || (await localStorage.getItem('auth_token'));
      
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
      const token = (await localStorage.getItem('token')) || (await localStorage.getItem('auth_token'));
      
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

  startPolling: (intervalSeconds: number = 300) => {
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

  setupGoogleWatch: async () => {
    try {
      const token = await localStorage.getItem('token');
      
      if (!token) {
        console.warn('❌ Watch setup failed: No authentication token');
        return;
      }
      
      // Get the backend URL for webhook
      const webhookUrl = `${API_URL}/google/notify`;
      
      console.log('📡 Setting up Google Calendar watch channel...');
      console.log('📡 Webhook URL:', webhookUrl);
      
      const response = await apiClient.post('/api/google/watch', {
        webhook_url: webhookUrl
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      console.log('✅ Watch setup successful');
      console.log('✅ Channel ID:', response.data?.channel_id || response.data?.watch?.id);
      console.log('✅ Resource ID:', response.data?.resource_id || response.data?.watch?.resourceId);
      console.log('✅ Expiration:', response.data?.expiration || response.data?.watch?.expiration);
    } catch (error: any) {
      console.error('❌ Watch setup failed:', error?.response?.data || error?.message || error);
      if (error?.response?.status === 401) {
        console.error('❌ Authentication failed - token may be invalid');
      } else if (error?.response?.status === 400) {
        console.error('❌ Bad request - check webhook URL format');
      } else if (error?.response?.status === 500) {
        console.error('❌ Server error - check backend logs');
      }
      // Don't throw - allow polling to continue as fallback
    }
  },

  stopPolling: () => {
    try {
      const { pollingInterval } = get();
      
      if (pollingInterval) {
        console.log('Stopping event polling');
        clearInterval(pollingInterval);
        // Use setTimeout to ensure state update happens safely
        setTimeout(() => {
          try {
            set({ 
              pollingInterval: null, 
              isPolling: false 
            });
          } catch (setError) {
            console.warn('Error updating polling state:', setError);
          }
        }, 0);
      }
    } catch (error) {
      console.warn('Error in stopPolling:', error);
    }
  }
}));