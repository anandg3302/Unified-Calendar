import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { useCalendarStore } from '../../stores/calendarStore';
import { parseISO, isToday, isFuture, isPast, format, isSameMonth } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { Edit3, Trash2 } from '../../components/icons';
import { Alert as RNAlert } from 'react-native';
import { useRouter } from 'expo-router';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Platform } from 'react-native';

const CALENDAR_COLORS = {
  google: '#4285F4',
  apple: '#FF3B30',
  outlook: '#0078D4',
  local: '#34C759'
};

export default function EventsScreen() {
  const router = useRouter();
  const { events: calendarEvents, isLoading, fetchEvents } = useCalendarStore();
   const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past' | 'invites'>('upcoming');
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());

  useEffect(() => {
    fetchEvents();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchEvents();
    setRefreshing(false);
  };

  const getFilteredEvents = () => {
    const now = new Date();
    
 switch (filter) {
  case 'upcoming':
    return Array.isArray(calendarEvents)
      ? calendarEvents
          .filter(event => isFuture(parseISO(event.start_time)) || isToday(parseISO(event.start_time)))
          .filter(event => isSameMonth(parseISO(event.start_time), selectedMonth))
      : [];
  case 'past':
    return Array.isArray(calendarEvents)
      ? calendarEvents
          .filter(event => isPast(parseISO(event.end_time)))
          .filter(event => isSameMonth(parseISO(event.start_time), selectedMonth))
      : [];
  case 'invites':
    return Array.isArray(calendarEvents)
      ? calendarEvents
          .filter(event => event.is_invite && event.invite_status === 'pending')
          .filter(event => isSameMonth(parseISO(event.start_time), selectedMonth))
      : [];
  default:
    return Array.isArray(calendarEvents)
      ? calendarEvents.filter(event => isSameMonth(parseISO(event.start_time), selectedMonth))
      : [];
}

  };

  const filteredEvents = getFilteredEvents();

  return (
    <View style={styles.container} className="">
      {/* Filter Tabs */}
      <ScrollView 
        horizontal 
        style={styles.filtersContainer}
        showsHorizontalScrollIndicator={false}
      >
        <TouchableOpacity
          style={[styles.filterTab, filter === 'upcoming' && styles.filterTabActive]}
          className={filter === 'upcoming' ? 'bg-orange-500' : 'bg-orange-50'}
          onPress={() => setFilter('upcoming')}
        >
          <Text style={[styles.filterTabText, filter === 'upcoming' && styles.filterTabTextActive]}>
            Upcoming
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'invites' && styles.filterTabActive]}
          className={filter === 'invites' ? 'bg-orange-500' : 'bg-orange-50'}
          onPress={() => setFilter('invites')}
        >
          <Text style={[styles.filterTabText, filter === 'invites' && styles.filterTabTextActive]}>
            Invites
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'past' && styles.filterTabActive]}
          className={filter === 'past' ? 'bg-orange-500' : 'bg-orange-50'}
          onPress={() => setFilter('past')}
        >
          <Text style={[styles.filterTabText, filter === 'past' && styles.filterTabTextActive]}>
            Past
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
          className={filter === 'all' ? 'bg-orange-500' : 'bg-orange-50'}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterTabText, filter === 'all' && styles.filterTabTextActive]}>
            All
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Month Selector */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' }}>
        <Text style={{ fontSize: 14, color: '#666', fontWeight: '600' }}>Month</Text>
        {Platform.OS === 'web' ? (
          <DatePicker
            selected={selectedMonth}
            onChange={(date: Date | null) => {
              if (!date) return;
              const normalized = new Date(date.getFullYear(), date.getMonth(), 1);
              setSelectedMonth(normalized);
            }}
            showMonthYearPicker
            dateFormat="MM/yyyy"
          />
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 16, color: '#333' }}>{format(selectedMonth, 'MMM yyyy')}</Text>
          </View>
        )}
      </View>

      {/* Events List */}
      <ScrollView
        style={styles.eventsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{ paddingVertical: 8 }}
      >
        {isLoading && !refreshing ? (
          <ActivityIndicator size="large" color="#4285F4" style={styles.loader} />
        ) : filteredEvents.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>
              {filter === 'invites' ? 'No pending invites' : 'No events found'}
            </Text>
          </View>
        ) : (
          filteredEvents.map(event => {
            const eventDate = parseISO(event.start_time);
            
            return (
              <TouchableOpacity
                key={event.id}
                style={[
                  styles.eventCard,
                  { borderLeftColor: CALENDAR_COLORS[event.calendar_source as keyof typeof CALENDAR_COLORS] }
                ]}
                className="hover:shadow-lg transition-all duration-200"
                onPress={() => router.push(`/event-details?id=${event.id}`)}
              >
                <View style={styles.eventHeader}>
                  <View style={styles.eventDateBadge}>
                    <Text style={styles.eventDateDay}>
                      {format(eventDate, 'd')}
                    </Text>
                    <Text style={styles.eventDateMonth}>
                      {format(eventDate, 'MMM')}
                    </Text>
                  </View>
                  
                  <View style={styles.eventInfo}>
                    <Text style={styles.eventTitle}>{event.title}</Text>
                    <Text style={styles.eventTime}>
                      {format(eventDate, 'HH:mm')} - {format(parseISO(event.end_time), 'HH:mm')}
                    </Text>
                    {event.description && (
                      <Text style={styles.eventDescription} numberOfLines={2}>
                        {event.description}
                      </Text>
                    )}
                    {event.location && (
                      <View style={styles.eventLocation}>
                        <Ionicons name="location-outline" size={14} color="#666" />
                        <Text style={styles.eventLocationText}>{event.location}</Text>
                      </View>
                    )}
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                      <TouchableOpacity onPress={() => router.push(`/edit-event?id=${event.id}`)} accessibilityLabel="Edit event">
                        <Edit3 size={18} color="#4b5563" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => RNAlert.alert('Delete', 'Delete this event?', [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: async () => {
                          try {
                            await useCalendarStore.getState().deleteEvent(event.id);
                          } catch {}
                        }}
                      ])} accessibilityLabel="Delete event">
                        <Trash2 size={18} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
                
                {/* Calendar Source Badge */}
                <View style={[
                  styles.sourceBadge,
                  { backgroundColor: CALENDAR_COLORS[event.calendar_source as keyof typeof CALENDAR_COLORS] }
                ]}>
                  <Text style={styles.sourceBadgeText}>
                    {event.calendar_source.charAt(0).toUpperCase() + event.calendar_source.slice(1)}
                  </Text>
                </View>
                
                {/* Invite Status */}
                {event.is_invite && (
                  <View style={[
                    styles.inviteBadge,
                    event.invite_status === 'accepted' && styles.inviteBadgeAccepted,
                    event.invite_status === 'declined' && styles.inviteBadgeDeclined
                  ]}>
                    <Text style={styles.inviteBadgeText}>
                      {event.invite_status === 'pending' && 'Pending'}
                      {event.invite_status === 'accepted' && '✓ Accepted'}
                      {event.invite_status === 'declined' && '✗ Declined'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/create-event')}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  filterTab: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#f0f0f0'
  },
  filterTabActive: {
    backgroundColor: '#4285F4'
  },
  filterTabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500'
  },
  filterTabTextActive: {
    color: '#fff',
    fontWeight: '600'
  },
  eventsList: {
    flex: 1
  },
  loader: {
    marginTop: 32
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: '#999'
  },
  eventCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  eventHeader: {
    flexDirection: 'row',
    marginBottom: 8
  },
  eventDateBadge: {
    width: 50,
    alignItems: 'center',
    marginRight: 12
  },
  eventDateDay: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333'
  },
  eventDateMonth: {
    fontSize: 12,
    color: '#666',
    textTransform: 'uppercase'
  },
  eventInfo: {
    flex: 1
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4
  },
  eventTime: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4
  },
  eventDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4
  },
  eventLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4
  },
  eventLocationText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4
  },
  sourceBadge: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4
  },
  sourceBadgeText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600'
  },
  inviteBadge: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#FFA500'
  },
  inviteBadgeAccepted: {
    backgroundColor: '#4CAF50'
  },
  inviteBadgeDeclined: {
    backgroundColor: '#F44336'
  },
  inviteBadgeText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600'
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4285F4',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5
  }
});