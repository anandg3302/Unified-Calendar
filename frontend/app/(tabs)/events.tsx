import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, TouchableWithoutFeedback, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCalendarStore } from '../../stores/calendarStore';
import { parseISO, isToday, isFuture, isPast, format, isSameMonth, addMonths, subMonths, getDay } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { Alert as RNAlert } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import {
  Provider as PaperProvider,
  MD3LightTheme as DefaultTheme,
  ActivityIndicator,
  Snackbar
} from 'react-native-paper';

const CALENDAR_COLORS = {
  google: '#4285F4',
  apple: '#FF3B30',
  outlook: '#0078D4',
  microsoft: '#0078D4',
  local: '#34C759'
};

const FILTER_COLORS = {
  upcoming: ['#6366F1', '#8B5CF6'],
  invites: ['#EC4899', '#F43F5E'],
  past: ['#6B7280', '#9CA3AF'],
  all: ['#10B981', '#059669']
};

export default function EventsScreen() {
  const router = useRouter();
  const { events: calendarEvents, isLoading, fetchEvents } = useCalendarStore();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past' | 'invites'>('upcoming');
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [snackbar, setSnackbar] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' });

  const theme = useMemo(() => ({
    ...DefaultTheme,
    colors: { ...DefaultTheme.colors, primary: '#6366F1' },
    roundness: 20
  }), []);

  useEffect(() => {
    fetchEvents();
    const { startPolling, stopPolling } = useCalendarStore.getState();
    startPolling(30);
    
    return () => {
      stopPolling();
    };
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchEvents();
      return () => { };
    }, [fetchEvents])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchEvents();
    setRefreshing(false);
  };

  const getFilteredEvents = () => {
    if (!Array.isArray(calendarEvents) || calendarEvents.length === 0) {
      return [];
    }

    const now = new Date();

    const normalizedEvents = calendarEvents.map(event => {
      let isInvite = event.is_invite === true || event.is_invite === 'true';
      let inviteStatus = event.invite_status;
      
      if (event.calendar_source === 'google' && event.attendees) {
        const attendees = Array.isArray(event.attendees) ? event.attendees : [];
        const pendingAttendee = attendees.find((a: any) => 
          a.responseStatus === 'needsAction' || a.responseStatus === 'tentative'
        );
        
        if (pendingAttendee) {
          isInvite = true;
          inviteStatus = 'pending';
        } else {
          const organizerEmail = event.organizer?.email;
          const creatorEmail = event.creator?.email;
          if (organizerEmail && creatorEmail && organizerEmail !== creatorEmail && attendees.length > 0) {
            isInvite = true;
            if (!inviteStatus) {
              inviteStatus = 'pending';
            }
          }
        }
      }
      
      if ((event.calendar_source === 'microsoft' || event.calendar_source === 'outlook') && event.attendees) {
        const attendees = Array.isArray(event.attendees) ? event.attendees : [];
        const pendingAttendee = attendees.find((a: any) => 
          a.status?.response === 'notResponded' || a.status?.response === 'tentativelyAccepted'
        );
        
        if (pendingAttendee && !isInvite) {
          isInvite = true;
          inviteStatus = 'pending';
        }
      }
      
      if (isInvite && !inviteStatus) {
        inviteStatus = 'pending';
      }
      
      return {
        ...event,
        is_invite: isInvite,
        invite_status: inviteStatus
      };
    }).filter(event => {
      try {
        const startDate = parseISO(event.start_time);
        const endDate = parseISO(event.end_time);
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          return false;
        }
        return true;
      } catch {
        return false;
      }
    });

    let filtered: typeof normalizedEvents = normalizedEvents;

    switch (filter) {
      case 'upcoming':
        filtered = normalizedEvents.filter(event => {
          try {
            const startDate = parseISO(event.start_time);
            const isInFuture = startDate > now;
            const isTodayAndNotEnded = isToday(startDate) && parseISO(event.end_time) > now;
            return isInFuture || isTodayAndNotEnded;
          } catch {
            return false;
          }
        }).filter(event => {
          try {
            return isSameMonth(parseISO(event.start_time), selectedMonth);
          } catch {
            return false;
          }
        });
        break;

      case 'past':
        filtered = normalizedEvents.filter(event => {
          try {
            const endDate = parseISO(event.end_time);
            return endDate < now;
          } catch {
            return false;
          }
        }).filter(event => {
          try {
            return isSameMonth(parseISO(event.start_time), selectedMonth);
          } catch {
            return false;
          }
        });
        break;

      case 'invites':
        filtered = normalizedEvents.filter(event => {
          const isInvite = event.is_invite === true || event.is_invite === 'true';
          let isPending = false;
          if (event.calendar_source === 'google' && Array.isArray(event.attendees)) {
            const hasPendingResponse = event.attendees.some((a: any) => 
              a.responseStatus === 'needsAction' || a.responseStatus === 'tentative'
            );
            isPending = hasPendingResponse;
          }
          
          if ((event.calendar_source === 'microsoft' || event.calendar_source === 'outlook') && Array.isArray(event.attendees)) {
            const hasPendingResponse = event.attendees.some((a: any) => 
              a.status?.response === 'notResponded' || a.status?.response === 'tentativelyAccepted'
            );
            isPending = isPending || hasPendingResponse;
          }
          
          if (!isPending) {
            isPending = event.invite_status === 'pending' || 
                       (!event.invite_status && isInvite);
          }
          
          return isInvite && isPending;
        });
        break;

      case 'all':
      default:
        filtered = normalizedEvents.filter(event => {
          try {
            return isSameMonth(parseISO(event.start_time), selectedMonth);
          } catch {
            return false;
          }
        });
        break;
    }

    filtered.sort((a, b) => {
      try {
        const dateA = parseISO(a.start_time);
        const dateB = parseISO(b.start_time);
        return dateA.getTime() - dateB.getTime();
      } catch {
        return 0;
      }
    });

    return filtered;
  };

  const filteredEvents = getFilteredEvents();
  
  const filterOptions = [
    { key: 'upcoming' as const, label: 'Upcoming', icon: 'calendar-outline', emoji: '📅' },
    { key: 'invites' as const, label: 'Invites', icon: 'mail-outline', emoji: '✉️' },
    { key: 'past' as const, label: 'Past', icon: 'time-outline', emoji: '⏰' },
    { key: 'all' as const, label: 'All', icon: 'list-outline', emoji: '📋' },
  ];


  return (
    <PaperProvider theme={theme}>
      <View style={styles.container}>
        {/* Gradient Background */}
        <LinearGradient
          colors={['#667EEA', '#764BA2', '#F093FB']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        
        {/* Animated Background Elements */}
        <View style={styles.backgroundDecorations}>
          <Animated.View 
            entering={FadeIn.duration(1000)}
            style={[styles.decorCircle, { top: -50, right: -50, width: 200, height: 200 }]}
          />
          <Animated.View 
            entering={FadeIn.duration(1200)}
            style={[styles.decorCircle, { bottom: -100, left: -50, width: 250, height: 250 }]}
          />
        </View>

        <SafeAreaView style={styles.safeArea} edges={['top']}>
          {/* Header */}
          <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Events</Text>
              <Text style={styles.headerSubtitle}>
                {filteredEvents.length} {filteredEvents.length === 1 ? 'event' : 'events'} found
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.searchButton}
              onPress={() => {}}
              activeOpacity={0.7}
            >
              <BlurView intensity={80} tint="light" style={styles.blurButton}>
                <Ionicons name="search-outline" size={22} color="#667EEA" />
              </BlurView>
            </TouchableOpacity>
          </Animated.View>

          {/* Filter Chips */}
          <Animated.View entering={FadeInDown.duration(500).delay(100)}>
            <ScrollView
              horizontal
              style={styles.filtersContainer}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filtersContent}
            >
              {filterOptions.map((option, index) => {
                const isSelected = filter === option.key;
                const colors = FILTER_COLORS[option.key];
                
                return (
                  <Animated.View
                    key={option.key}
                    entering={FadeInDown.duration(400).delay(150 + index * 100)}
                  >
                    <TouchableOpacity
                      onPress={() => setFilter(option.key)}
                      activeOpacity={0.8}
                    >
                      {isSelected ? (
                        <LinearGradient
                          colors={colors}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.filterChipSelected}
                        >
                          <Text style={styles.filterEmoji}>{option.emoji}</Text>
                          <Text style={styles.filterChipTextSelected}>{option.label}</Text>
                          {filteredEvents.length > 0 && (
                            <View style={styles.filterBadge}>
                              <Text style={styles.filterBadgeText}>{filteredEvents.length}</Text>
                            </View>
                          )}
                        </LinearGradient>
                      ) : (
                        <BlurView intensity={60} tint="light" style={styles.filterChip}>
                          <Text style={styles.filterEmoji}>{option.emoji}</Text>
                          <Text style={styles.filterChipText}>{option.label}</Text>
                        </BlurView>
                      )}
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}
            </ScrollView>
          </Animated.View>

          {/* Month Selector */}
          {filter !== 'invites' && (
            <Animated.View entering={FadeInDown.duration(500).delay(200)} style={styles.monthBar}>
              <TouchableOpacity 
                onPress={() => setSelectedMonth(prev => subMonths(prev, 1))}
                style={styles.monthButton}
                activeOpacity={0.7}
              >
                <BlurView intensity={60} tint="light" style={styles.monthButtonBlur}>
                  <Ionicons name="chevron-back" size={20} color="#667EEA" />
                </BlurView>
              </TouchableOpacity>
              <BlurView intensity={80} tint="light" style={styles.monthSelector}>
                <Text style={styles.monthValue}>{format(selectedMonth, 'MMMM yyyy')}</Text>
                <Text style={styles.monthDay}>{format(selectedMonth, 'EEEE')}</Text>
              </BlurView>
              <TouchableOpacity 
                onPress={() => setSelectedMonth(prev => addMonths(prev, 1))}
                style={styles.monthButton}
                activeOpacity={0.7}
              >
                <BlurView intensity={60} tint="light" style={styles.monthButtonBlur}>
                  <Ionicons name="chevron-forward" size={20} color="#667EEA" />
                </BlurView>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Events List */}
          <ScrollView
            style={styles.eventsList}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
            contentContainerStyle={styles.eventsContent}
            showsVerticalScrollIndicator={false}
          >
            {isLoading && !refreshing ? (
              <View style={styles.loaderContainer}>
                <ActivityIndicator animating size="large" color="#fff" />
                <Text style={styles.loaderText}>Loading events...</Text>
              </View>
            ) : filteredEvents.length === 0 ? (
              <Animated.View entering={FadeIn.duration(500)} style={styles.emptyState}>
                <BlurView intensity={80} tint="light" style={styles.emptyIconContainer}>
                  <Ionicons 
                    name={
                      filter === 'invites' ? 'mail-open-outline' 
                      : filter === 'past' ? 'archive-outline' 
                      : 'calendar-outline'
                    } 
                    size={64} 
                    color="#667EEA" 
                  />
                </BlurView>
                <Text style={styles.emptyTitle}>
                  {filter === 'invites' 
                    ? 'No Pending Invites ✨' 
                    : filter === 'past' 
                      ? 'No Past Events 📚'
                      : filter === 'upcoming'
                        ? 'No Upcoming Events 🎯'
                        : 'No Events Found 🔍'
                  }
                </Text>
                <Text style={styles.emptyText}>
                  {filter === 'invites' 
                    ? 'You\'re all caught up! No pending invites.' 
                    : filter === 'past' 
                      ? `No past events in ${format(selectedMonth, 'MMMM yyyy')}`
                      : filter === 'upcoming'
                        ? `No upcoming events in ${format(selectedMonth, 'MMMM yyyy')}`
                        : `No events found in ${format(selectedMonth, 'MMMM yyyy')}`
                  }
                </Text>
              </Animated.View>
            ) : (
              filteredEvents.map((event, index) => {
                const eventDate = parseISO(event.start_time);
                const color = CALENDAR_COLORS[event.calendar_source as keyof typeof CALENDAR_COLORS] || '#667EEA';
                const isInvite = event.is_invite && event.invite_status === 'pending';
                const isTodayEvent = isToday(eventDate);
                
                return (
                  <Animated.View
                    key={event.id}
                    entering={FadeInDown.duration(400).delay(100 + index * 50)}
                  >
                    <TouchableWithoutFeedback 
                      onPress={() => router.push(`/event-details?id=${event.id}`)}
                    >
                      <Animated.View style={styles.eventCardWrapper}>
                        <BlurView intensity={90} tint="light" style={styles.eventCard}>
                          {/* Gradient Border Indicator */}
                          <LinearGradient
                            colors={[color, color + '80']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 0, y: 1 }}
                            style={styles.cardIndicator}
                          />
                          
                          <View style={styles.cardContent}>
                            {/* Date Section */}
                            <View style={styles.dateSection}>
                              <LinearGradient
                                colors={[color + '20', color + '10']}
                                style={styles.datePill}
                              >
                                <Text style={[styles.datePillDay, { color }]}>
                                  {format(eventDate, 'd')}
                                </Text>
                                <Text style={styles.datePillMonth}>
                                  {format(eventDate, 'MMM').toUpperCase()}
                                </Text>
                                {isTodayEvent && (
                                  <LinearGradient
                                    colors={['#10B981', '#059669']}
                                    style={styles.todayBadge}
                                  >
                                    <Text style={styles.todayBadgeText}>TODAY</Text>
                                  </LinearGradient>
                                )}
                              </LinearGradient>
                              
                              <View style={styles.timeSection}>
                                <View style={styles.timeRow}>
                                  <Ionicons name="time-outline" size={14} color="#667EEA" />
                                  <Text style={styles.timeText}>
                                    {format(eventDate, 'h:mm aa')} - {format(parseISO(event.end_time), 'h:mm aa')}
                                  </Text>
                                </View>
                                {event.location && (
                                  <View style={[styles.timeRow, { marginTop: 4 }]}>
                                    <Ionicons name="location-outline" size={14} color="#667EEA" />
                                    <Text style={styles.location} numberOfLines={1}>{event.location}</Text>
                                  </View>
                                )}
                              </View>
                            </View>

                            {/* Event Details */}
                            <View style={styles.eventDetails}>
                              <View style={styles.eventHeader}>
                                <Text style={styles.eventTitle} numberOfLines={2}>
                                  {event.title}
                                </Text>
                                {isInvite && (
                                  <LinearGradient
                                    colors={['#EC4899', '#F43F5E']}
                                    style={styles.inviteBadge}
                                  >
                                    <Text style={styles.inviteBadgeText}>✉️ Invite</Text>
                                  </LinearGradient>
                                )}
                              </View>
                              
                              {event.description ? (
                                <Text style={styles.description} numberOfLines={2}>
                                  {event.description}
                                </Text>
                              ) : null}

                              {/* Footer */}
                              <View style={styles.cardFooter}>
                                <View style={styles.sourceTag}>
                                  <View style={[styles.sourceDot, { backgroundColor: color }]} />
                                  <Text style={styles.sourceText}>
                                    {event.calendar_source.charAt(0).toUpperCase() + event.calendar_source.slice(1)}
                                  </Text>
                                </View>
                                
                                <View style={styles.cardActions}>
                                  <TouchableOpacity
                                    onPress={(e) => {
                                      e.stopPropagation();
                                      router.push(`/edit-event?id=${event.id}`);
                                    }}
                                    style={styles.actionButton}
                                    activeOpacity={0.7}
                                  >
                                    <BlurView intensity={60} tint="light" style={styles.actionButtonBlur}>
                                      <Ionicons name="create-outline" size={18} color="#667EEA" />
                                    </BlurView>
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    onPress={(e) => {
                                      e.stopPropagation();
                                      RNAlert.alert('Delete Event', 'Are you sure?', [
                                        { text: 'Cancel', style: 'cancel' },
                                        {
                                          text: 'Delete', 
                                          style: 'destructive', 
                                          onPress: async () => {
                                            try {
                                              await useCalendarStore.getState().deleteEvent(event.id);
                                              setSnackbar({ visible: true, message: 'Deleted! ✨' });
                                            } catch { }
                                          }
                                        }
                                      ]);
                                    }}
                                    style={[styles.actionButton, { marginLeft: 8 }]}
                                    activeOpacity={0.7}
                                  >
                                    <BlurView intensity={60} tint="light" style={styles.actionButtonBlur}>
                                      <Ionicons name="trash-outline" size={18} color="#EF4444" />
                                    </BlurView>
                                  </TouchableOpacity>
                                </View>
                              </View>
                            </View>
                          </View>
                        </BlurView>
                      </Animated.View>
                    </TouchableWithoutFeedback>
                  </Animated.View>
                );
              })
            )}
          </ScrollView>

          {/* Floating Action Button */}
          <Animated.View entering={FadeIn.duration(600).delay(300)}>
            <TouchableOpacity
              style={styles.fab}
              onPress={() => router.push('/create-event')}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#667EEA', '#764BA2']}
                style={styles.fabGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="add" size={32} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          <Snackbar 
            visible={snackbar.visible} 
            onDismiss={() => setSnackbar({ visible: false, message: '' })} 
            duration={2000}
            style={styles.snackbar}
          >
            {snackbar.message}
          </Snackbar>
        </SafeAreaView>
      </View>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundDecorations: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  decorCircle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    opacity: 0.3,
  },
  safeArea: {
    flex: 1,
  },
  // Header Styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -1,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  headerSubtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
    fontWeight: '500',
  },
  searchButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  blurButton: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 24,
  },
  // Filter Styles
  filtersContainer: {
    paddingVertical: 16,
  },
  filtersContent: {
    paddingHorizontal: 20,
    paddingRight: 20,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginRight: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  filterChipSelected: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  filterEmoji: {
    fontSize: 18,
    marginRight: 8,
  },
  filterChipText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  filterChipTextSelected: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  filterBadge: {
    marginLeft: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center',
  },
  filterBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  // Month Selector Styles
  monthBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  monthButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  monthButtonBlur: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
  },
  monthSelector: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  monthValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#667EEA',
    letterSpacing: -0.5,
  },
  monthDay: {
    fontSize: 13,
    color: '#667EEA',
    marginTop: 2,
    textTransform: 'uppercase',
    fontWeight: '600',
    opacity: 0.7,
  },
  // Events List Styles
  eventsList: {
    flex: 1,
  },
  eventsContent: {
    paddingVertical: 12,
    paddingBottom: 100,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loaderText: {
    marginTop: 16,
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  // Empty State Styles
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    overflow: 'hidden',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  emptyText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 24,
  },
  // Event Card Styles
  eventCardWrapper: {
    marginHorizontal: 20,
    marginVertical: 10,
  },
  eventCard: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  cardIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
  },
  cardContent: {
    flexDirection: 'row',
    padding: 20,
    paddingLeft: 24,
  },
  dateSection: {
    marginRight: 16,
    alignItems: 'center',
  },
  datePill: {
    width: 70,
    paddingVertical: 12,
    borderRadius: 18,
    alignItems: 'center',
    marginBottom: 12,
    overflow: 'hidden',
  },
  datePillDay: {
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 32,
  },
  datePillMonth: {
    fontSize: 11,
    color: '#667EEA',
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  todayBadge: {
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
  todayBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  timeSection: {
    alignItems: 'flex-start',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  timeText: {
    marginLeft: 6,
    fontSize: 13,
    color: '#667EEA',
    fontWeight: '600',
  },
  location: {
    marginLeft: 6,
    fontSize: 13,
    color: '#667EEA',
    fontWeight: '600',
    flex: 1,
    opacity: 0.8,
  },
  eventDetails: {
    flex: 1,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  eventTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    flex: 1,
    lineHeight: 26,
    letterSpacing: -0.5,
  },
  inviteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginLeft: 10,
    overflow: 'hidden',
  },
  inviteBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  description: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 22,
    marginBottom: 14,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(102, 126, 234, 0.2)',
  },
  sourceTag: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sourceDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  sourceText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#667EEA',
    textTransform: 'capitalize',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  actionButtonBlur: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  // FAB Styles
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 32,
    width: 64,
    height: 64,
    borderRadius: 32,
    shadowColor: '#667EEA',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  snackbar: {
    marginBottom: 20,
    borderRadius: 12,
  }
});
