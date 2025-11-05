import React, { useState, useEffect } from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useCalendarStore } from '../stores/calendarStore';
import { format, parseISO } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 20,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  eventCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  eventTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  eventDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailIcon: {
    marginRight: 12,
    width: 24,
  },
  detailText: {
    fontSize: 15,
    color: '#374151',
    flex: 1,
  },
  warningBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  warningText: {
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
  },
  buttonContainer: {
    gap: 12,
  },
  deleteButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  deleteButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },
  cancelButton: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 18,
    fontWeight: '600',
  },
  errorText: {
    color: '#EF4444',
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
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
});

export default function DeleteEventScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { events, deleteEvent } = useCalendarStore();
  
  const event = events.find(e => e.id === id);
  
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!event && id) {
      // Event might not be loaded yet, wait a bit
      const timer = setTimeout(() => {
        if (!events.find(e => e.id === id)) {
          setError('Event not found');
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [event, id, events]);

  if (!event && !error) {
    return (
      <View style={styles.container}>
        <View style={[styles.content, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color="#EF4444" />
          <Text style={[styles.subtitle, { marginTop: 16 }]}>Loading event...</Text>
        </View>
      </View>
    );
  }

  if (error || !event) {
    return (
      <View style={styles.container}>
        <View style={[styles.content, { justifyContent: 'center', alignItems: 'center' }]}>
          <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
          <Text style={styles.errorText}>{error || 'Event not found'}</Text>
          <TouchableOpacity
            style={[styles.cancelButton, { marginTop: 24, paddingHorizontal: 24 }]}
            onPress={() => router.back()}
          >
            <Text style={styles.cancelButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);
    
    try {
      await deleteEvent(event.id);
      
      // Show success message
      Alert.alert(
        'Success',
        'Event deleted successfully!',
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate back to events screen
              router.replace('/(tabs)/events');
            }
          }
        ],
        { cancelable: false }
      );
    } catch (err: any) {
      console.error('Delete error:', err);
      const errorMessage = err?.message || 'Failed to delete event. Please try again.';
      setError(errorMessage);
      setIsDeleting(false);
      
      // Show alert for critical errors
      if (errorMessage.includes('Authentication') || errorMessage.includes('Network')) {
        Alert.alert('Delete Failed', errorMessage);
      }
    }
  };

  const handleCancel = () => {
    router.back();
  };

  const eventDate = parseISO(event.start_time);
  const endDate = parseISO(event.end_time);

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
            <Ionicons name="trash-outline" size={40} color="#EF4444" />
          </View>
          <Text style={styles.title}>Delete Event</Text>
          <Text style={styles.subtitle}>
            This action cannot be undone
          </Text>
        </Animated.View>

        {/* Event Details Card */}
        <Animated.View entering={FadeInDown.duration(400).delay(100)}>
          <BlurView intensity={80} tint="light" style={styles.eventCard}>
            <Text style={styles.eventTitle}>{event.title}</Text>
            
            <View style={styles.eventDetail}>
              <Ionicons name="time-outline" size={20} color="#6B7280" style={styles.detailIcon} />
              <Text style={styles.detailText}>
                {format(eventDate, 'MMM d, yyyy • h:mm aa')} - {format(endDate, 'h:mm aa')}
              </Text>
            </View>

            {event.location && (
              <View style={styles.eventDetail}>
                <Ionicons name="location-outline" size={20} color="#6B7280" style={styles.detailIcon} />
                <Text style={styles.detailText}>{event.location}</Text>
              </View>
            )}

            {event.description && (
              <View style={styles.eventDetail}>
                <Ionicons name="document-text-outline" size={20} color="#6B7280" style={styles.detailIcon} />
                <Text style={styles.detailText} numberOfLines={3}>{event.description}</Text>
              </View>
            )}

            <View style={styles.eventDetail}>
              <Ionicons name="calendar-outline" size={20} color="#6B7280" style={styles.detailIcon} />
              <Text style={styles.detailText}>
                Source: {event.calendar_source.charAt(0).toUpperCase() + event.calendar_source.slice(1)}
              </Text>
            </View>
          </BlurView>
        </Animated.View>

        {/* Warning Box */}
        <Animated.View entering={FadeInDown.duration(400).delay(200)}>
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              ⚠️ This will permanently delete this event. This action cannot be undone.
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
            style={styles.deleteButton}
            onPress={handleDelete}
            disabled={isDeleting}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#EF4444', '#DC2626']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.deleteButtonGradient}
            >
              {isDeleting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="trash" size={20} color="#fff" />
                  <Text style={styles.deleteButtonText}>Delete Event</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancel}
            disabled={isDeleting}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      {/* Loading Overlay */}
      {isDeleting && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#EF4444" />
          <Text style={[styles.subtitle, { marginTop: 16 }]}>Deleting event...</Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

