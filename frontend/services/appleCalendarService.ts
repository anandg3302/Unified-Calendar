/**
 * Apple Calendar Service
 * 
 * This service handles Apple Calendar operations for React Native.
 * It provides methods for:
 * - Fetching Apple Calendar events
 * - Creating Apple Calendar events
 * - Updating Apple Calendar events
 * - Deleting Apple Calendar events
 * - Managing Apple Calendar connections
 * 
 * @author AI Assistant
 * @date 2024
 */

import axios from 'axios';
import localStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Types for Apple Calendar operations
export interface AppleEvent {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  location?: string;
  calendar_source: 'apple';
  calendar_id?: string;
  calendar_name?: string;
  is_invite: boolean;
  invite_status?: string;
  created_at: string;
  updated_at?: string;
}

export interface AppleCalendar {
  id: string;
  name: string;
  url: string;
  display_name: string;
  color: string;
  is_active: boolean;
}

export interface CreateAppleEventData {
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  location?: string;
  calendar_id?: string;
}

export interface UpdateAppleEventData {
  title?: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  location?: string;
}

class AppleCalendarService {
  private readonly API_BASE_URL: string;

  constructor() {
    this.API_BASE_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL || 'https://unified-calendar-zflg.onrender.com';
  }

  /**
   * Get authentication headers
   * @returns {Promise<{Authorization: string, 'Content-Type': string}>} Headers
   */
  private async getAuthHeaders(): Promise<{Authorization: string, 'Content-Type': string}> {
    const token = await localStorage.getItem('auth_token');
    
    if (!token) {
      throw new Error('No authentication token found');
    }

    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Check if Apple Calendar is connected
   * @returns {Promise<boolean>} True if connected, false otherwise
   */
  async isConnected(): Promise<boolean> {
    try {
      const headers = await this.getAuthHeaders();
      
      const response = await axios.get(
        `${this.API_BASE_URL}/api/apple/calendar/calendars`,
        { headers }
      );

      return response.status === 200;
    } catch (error) {
      console.error('Error checking Apple Calendar connection:', error);
      return false;
    }
  }

  /**
   * Get Apple Calendar list
   * @returns {Promise<AppleCalendar[]>} List of Apple calendars
   */
  async getCalendars(): Promise<AppleCalendar[]> {
    try {
      const headers = await this.getAuthHeaders();
      
      const response = await axios.get(
        `${this.API_BASE_URL}/api/apple/calendar/calendars`,
        { headers }
      );

      if (response.status === 200) {
        return response.data.calendars || [];
      }

      return [];
    } catch (error) {
      console.error('Error fetching Apple calendars:', error);
      return [];
    }
  }

  /**
   * Get Apple Calendar events
   * @param {Object} options - Query options
   * @param {string} options.start_date - Start date (ISO string)
   * @param {string} options.end_date - End date (ISO string)
   * @param {string} options.calendar_id - Specific calendar ID
   * @returns {Promise<AppleEvent[]>} List of Apple events
   */
  async getEvents(options: {
    start_date?: string;
    end_date?: string;
    calendar_id?: string;
  } = {}): Promise<AppleEvent[]> {
    try {
      const headers = await this.getAuthHeaders();
      
      const params = new URLSearchParams();
      if (options.start_date) params.append('start_date', options.start_date);
      if (options.end_date) params.append('end_date', options.end_date);
      if (options.calendar_id) params.append('calendar_id', options.calendar_id);

      const response = await axios.get(
        `${this.API_BASE_URL}/api/apple/calendar/events?${params.toString()}`,
        { headers }
      );

      if (response.status === 200) {
        return response.data.events || [];
      }

      return [];
    } catch (error) {
      console.error('Error fetching Apple events:', error);
      return [];
    }
  }

  /**
   * Create a new Apple Calendar event
   * @param {CreateAppleEventData} eventData - Event data
   * @returns {Promise<{success: boolean, event_id?: string, error?: string}>} Creation result
   */
  async createEvent(eventData: CreateAppleEventData): Promise<{
    success: boolean;
    event_id?: string;
    error?: string;
  }> {
    try {
      const headers = await this.getAuthHeaders();
      
      const response = await axios.post(
        `${this.API_BASE_URL}/api/apple/calendar/events`,
        eventData,
        { headers }
      );

      if (response.status === 200 || response.status === 201) {
        return {
          success: true,
          event_id: response.data.event_id
        };
      } else {
        return {
          success: false,
          error: response.data?.detail || 'Failed to create event'
        };
      }
    } catch (error: any) {
      console.error('Error creating Apple event:', error);
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Failed to create event'
      };
    }
  }

  /**
   * Update an Apple Calendar event
   * @param {string} eventId - Event ID to update
   * @param {UpdateAppleEventData} eventData - Updated event data
   * @returns {Promise<{success: boolean, error?: string}>} Update result
   */
  async updateEvent(eventId: string, eventData: UpdateAppleEventData): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const headers = await this.getAuthHeaders();
      
      const response = await axios.put(
        `${this.API_BASE_URL}/api/apple/calendar/events/${eventId}`,
        eventData,
        { headers }
      );

      if (response.status === 200) {
        return { success: true };
      } else {
        return {
          success: false,
          error: response.data?.detail || 'Failed to update event'
        };
      }
    } catch (error: any) {
      console.error('Error updating Apple event:', error);
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Failed to update event'
      };
    }
  }

  /**
   * Delete an Apple Calendar event
   * @param {string} eventId - Event ID to delete
   * @returns {Promise<{success: boolean, error?: string}>} Deletion result
   */
  async deleteEvent(eventId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const headers = await this.getAuthHeaders();
      
      const response = await axios.delete(
        `${this.API_BASE_URL}/api/apple/calendar/events/${eventId}`,
        { headers }
      );

      if (response.status === 200) {
        return { success: true };
      } else {
        return {
          success: false,
          error: response.data?.detail || 'Failed to delete event'
        };
      }
    } catch (error: any) {
      console.error('Error deleting Apple event:', error);
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Failed to delete event'
      };
    }
  }

  /**
   * Sync Apple Calendar events
   * @param {string} syncDirection - Sync direction ('from_apple', 'to_apple', 'bidirectional')
   * @param {number} dateRangeDays - Number of days to sync
   * @returns {Promise<{success: boolean, error?: string}>} Sync result
   */
  async syncEvents(
    syncDirection: string = 'from_apple',
    dateRangeDays: number = 30
  ): Promise<{success: boolean, error?: string}> {
    try {
      const headers = await this.getAuthHeaders();
      
      const response = await axios.post(
        `${this.API_BASE_URL}/api/apple/calendar/sync`,
        {
          sync_direction: syncDirection,
          date_range_days: dateRangeDays
        },
        { headers }
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
      console.error('Error syncing Apple events:', error);
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Sync failed'
      };
    }
  }

  /**
   * Get events for a specific date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {string} calendarId - Optional calendar ID
   * @returns {Promise<AppleEvent[]>} List of events
   */
  async getEventsForDateRange(
    startDate: Date,
    endDate: Date,
    calendarId?: string
  ): Promise<AppleEvent[]> {
    return this.getEvents({
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      calendar_id: calendarId
    });
  }

  /**
   * Get events for today
   * @param {string} calendarId - Optional calendar ID
   * @returns {Promise<AppleEvent[]>} List of today's events
   */
  async getTodayEvents(calendarId?: string): Promise<AppleEvent[]> {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    return this.getEventsForDateRange(startOfDay, endOfDay, calendarId);
  }

  /**
   * Get upcoming events
   * @param {number} days - Number of days to look ahead
   * @param {string} calendarId - Optional calendar ID
   * @returns {Promise<AppleEvent[]>} List of upcoming events
   */
  async getUpcomingEvents(days: number = 7, calendarId?: string): Promise<AppleEvent[]> {
    const now = new Date();
    const futureDate = new Date(now.getTime() + (days * 24 * 60 * 60 * 1000));

    return this.getEventsForDateRange(now, futureDate, calendarId);
  }
}

// Export singleton instance
export const appleCalendarService = new AppleCalendarService();
export default appleCalendarService;
