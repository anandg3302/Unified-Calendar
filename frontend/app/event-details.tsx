import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useCalendarStore } from '../stores/calendarStore';
import { format, parseISO } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';

const CALENDAR_COLORS = {
  google: '#4285F4',
  apple: '#FF3B30',
  outlook: '#0078D4'
};

export default function EventDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { events, deleteEvent, respondToInvite } = useCalendarStore();
  const [isLoading, setIsLoading] = useState(false);
  
  const event = events.find(e => e.id === id);

  if (!event) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Event not found</Text>
      </View>
    );
  }

  const handleDelete = () => {
    Alert.alert(
      'Delete Event',
      'Are you sure you want to delete this event?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              await deleteEvent(event.id);
              router.back();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete event');
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleEdit = () => {
    router.push(`/edit-event?id=${event.id}`);
  };

  const handleInviteResponse = async (status: string) => {
    try {
      setIsLoading(true);
      await respondToInvite(event.id, status);
      Alert.alert('Success', `Invite ${status}`);
    } catch (error) {
      Alert.alert('Error', `Failed to ${status} invite`);
    } finally {
      setIsLoading(false);
    }
  };

  const calendarColor = CALENDAR_COLORS[event.calendar_source as keyof typeof CALENDAR_COLORS];

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        {/* Event Header */}
        <View style={[styles.header, { backgroundColor: calendarColor + '20' }]}>
          <View style={[styles.colorBar, { backgroundColor: calendarColor }]} />
          <Text style={styles.title}>{event.title}</Text>
          <Text style={styles.source}>
            {event.calendar_source.charAt(0).toUpperCase() + event.calendar_source.slice(1)} Calendar
          </Text>
        </View>

        {/* Event Details */}
        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={24} color="#666" />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Date</Text>
              <Text style={styles.detailValue}>
                {format(parseISO(event.start_time), 'EEEE, MMMM d, yyyy')}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={24} color="#666" />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Time</Text>
              <Text style={styles.detailValue}>
                {format(parseISO(event.start_time), 'HH:mm')} - {format(parseISO(event.end_time), 'HH:mm')}
              </Text>
            </View>
          </View>

          {event.location && (
            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={24} color="#666" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Location</Text>
                <Text style={styles.detailValue}>{event.location}</Text>
              </View>
            </View>
          )}

          {event.description && (
            <View style={styles.detailRow}>
              <Ionicons name="document-text-outline" size={24} color="#666" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Description</Text>
                <Text style={styles.detailValue}>{event.description}</Text>
              </View>
            </View>
          )}

          {event.is_invite && (
            <View style={styles.detailRow}>
              <Ionicons name="mail-outline" size={24} color="#666" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Invite Status</Text>
                <View style={[
                  styles.inviteStatusBadge,
                  event.invite_status === 'accepted' && styles.inviteStatusAccepted,
                  event.invite_status === 'declined' && styles.inviteStatusDeclined
                ]}>
                  <Text style={styles.inviteStatusText}>
                    {event.invite_status?.charAt(0).toUpperCase() + (event.invite_status?.slice(1) || '')}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Invite Actions */}
        {event.is_invite && event.invite_status === 'pending' && (
          <View style={styles.inviteActions}>
            <TouchableOpacity
              style={[styles.inviteButton, styles.acceptButton]}
              onPress={() => handleInviteResponse('accepted')}
              disabled={isLoading}
            >
              <Ionicons name="checkmark" size={20} color="#fff" />
              <Text style={styles.inviteButtonText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.inviteButton, styles.declineButton]}
              onPress={() => handleInviteResponse('declined')}
              disabled={isLoading}
            >
              <Ionicons name="close" size={20} color="#fff" />
              <Text style={styles.inviteButtonText}>Decline</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={handleEdit}
          disabled={isLoading}
        >
          <Ionicons name="create-outline" size={20} color="#4285F4" />
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={handleDelete}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#F44336" />
          ) : (
            <>
              <Ionicons name="trash-outline" size={20} color="#F44336" />
              <Text style={styles.deleteButtonText}>Delete</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  content: {
    flex: 1
  },
  header: {
    padding: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24
  },
  colorBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 16
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8
  },
  source: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500'
  },
  detailsContainer: {
    backgroundColor: '#fff',
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16
  },
  detailRow: {
    flexDirection: 'row',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  detailContent: {
    flex: 1,
    marginLeft: 16
  },
  detailLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500'
  },
  inviteStatusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#FFA500'
  },
  inviteStatusAccepted: {
    backgroundColor: '#4CAF50'
  },
  inviteStatusDeclined: {
    backgroundColor: '#F44336'
  },
  inviteStatusText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600'
  },
  inviteActions: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    gap: 12
  },
  inviteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8
  },
  acceptButton: {
    backgroundColor: '#4CAF50'
  },
  declineButton: {
    backgroundColor: '#F44336'
  },
  inviteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: 12
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8
  },
  editButton: {
    borderColor: '#4285F4',
    backgroundColor: '#fff'
  },
  editButtonText: {
    color: '#4285F4',
    fontSize: 16,
    fontWeight: '600'
  },
  deleteButton: {
    borderColor: '#F44336',
    backgroundColor: '#fff'
  },
  deleteButtonText: {
    color: '#F44336',
    fontSize: 16,
    fontWeight: '600'
  },
  errorText: {
    textAlign: 'center',
    marginTop: 32,
    fontSize: 16,
    color: '#999'
  }
});
