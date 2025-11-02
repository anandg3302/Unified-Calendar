/**
 * Microsoft Calendar Service
 * 
 * Handles Microsoft Outlook Calendar integration in the frontend
 */

import Constants from 'expo-constants';
import axios from 'axios';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 
                process.env.EXPO_PUBLIC_BACKEND_URL || 
                'https://unified-calendar-zflg.onrender.com';

export interface MicrosoftEvent {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  location?: string;
  calendar_source: 'Microsoft';
  microsoft_event_id?: string;
  microsoft_calendar_id?: string;
  created_at?: string;
  updated_at?: string;
  is_all_day?: boolean;
  is_invite?: boolean;
  attendees?: any[];
}

class MicrosoftCalendarService {
  private baseURL: string;

  constructor() {
    this.baseURL = API_URL;
  }

  private async getAuthHeaders(token: string) {
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Connect Microsoft Calendar
   */
  async connectMicrosoft(token: string): Promise<boolean> {
    try {
      const response = await axios.get(
        `${this.baseURL}/api/microsoft/auth/login`,
        { headers: await this.getAuthHeaders(token) }
      );
      return response.status === 200;
    } catch (error) {
      console.error('Error connecting Microsoft Calendar:', error);
      return false;
    }
  }

  /**
   * Disconnect Microsoft Calendar
   */
  async disconnectMicrosoft(token: string): Promise<boolean> {
    try {
      const response = await axios.get(
        `${this.baseURL}/api/microsoft/auth/disconnect`,
        { headers: await this.getAuthHeaders(token) }
      );
      return response.status === 200;
    } catch (error) {
      console.error('Error disconnecting Microsoft Calendar:', error);
      return false;
    }
  }

  /**
   * Get Microsoft Calendar events
   */
  async getEvents(token: string): Promise<MicrosoftEvent[]> {
    try {
      const response = await axios.get(
        `${this.baseURL}/api/microsoft/calendar/events`,
        { headers: await this.getAuthHeaders(token) }
      );

      if (response.data && response.data.events) {
        return response.data.events;
      }
      return [];
    } catch (error) {
      console.error('Error fetching Microsoft events:', error);
      return [];
    }
  }

  /**
   * Create Microsoft event
   */
  async createEvent(token: string, eventData: Partial<MicrosoftEvent>): Promise<MicrosoftEvent | null> {
    try {
      const response = await axios.post(
        `${this.baseURL}/api/microsoft/calendar/events`,
        eventData,
        { headers: await this.getAuthHeaders(token) }
      );

      if (response.data && response.data.event) {
        return response.data.event;
      }
      return null;
    } catch (error) {
      console.error('Error creating Microsoft event:', error);
      return null;
    }
  }

  /**
   * Update Microsoft event
   */
  async updateEvent(token: string, eventId: string, eventData: Partial<MicrosoftEvent>): Promise<MicrosoftEvent | null> {
    try {
      const response = await axios.put(
        `${this.baseURL}/api/microsoft/calendar/events/${eventId}`,
        eventData,
        { headers: await this.getAuthHeaders(token) }
      );

      if (response.data && response.data.event) {
        return response.data.event;
      }
      return null;
    } catch (error) {
      console.error('Error updating Microsoft event:', error);
      return null;
    }
  }

  /**
   * Delete Microsoft event
   */
  async deleteEvent(token: string, eventId: string): Promise<boolean> {
    try {
      const response = await axios.delete(
        `${this.baseURL}/api/microsoft/calendar/events/${eventId}`,
        { headers: await this.getAuthHeaders(token) }
      );
      return response.status === 200;
    } catch (error) {
      console.error('Error deleting Microsoft event:', error);
      return false;
    }
  }

  /**
   * Check if Microsoft Calendar is connected
   */
  async checkConnection(token: string): Promise<boolean> {
    try {
      const response = await axios.get(
        `${this.baseURL}/api/microsoft/calendar/events`,
        { headers: await this.getAuthHeaders(token) }
      );
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }
}

export default new MicrosoftCalendarService();
