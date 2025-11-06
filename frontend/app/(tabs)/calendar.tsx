import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar as MonthCalendar } from 'react-native-calendars';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { addDays, format, startOfWeek, parseISO, isSameDay, startOfDay } from 'date-fns';
import { useCalendarStore } from '../../stores/calendarStore';

const GOLD = '#FFD700';
const BG = '#0A0A0A';
const CARD = '#1E1E1E';
const TEXT = '#FFFFFF';
const MUTED = '#EAEAEA99';

const CALENDAR_COLORS = {
  google: '#4285F4',
  apple: '#FF3B30',
  outlook: '#0078D4',
  microsoft: '#0078D4',
  local: '#34C759'
};

export default function CalendarScreen() {
  const router = useRouter();
  const { events, fetchEvents, isLoading: eventsLoading, lastSynced } = useCalendarStore();
  const [marked, setMarked] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<'day' | 'week' | 'month'>('month');
  const [selectedDay, setSelectedDay] = useState<string | null>(format(new Date(), 'yyyy-MM-dd'));
  const [weekAnchor, setWeekAnchor] = useState<Date>(new Date());
  const [dayDate, setDayDate] = useState<Date>(new Date());

  useEffect(() => {
    fetchEvents();
    // Start automatic polling for real-time updates (every 5 minutes - webhooks provide instant updates)
    const { startPolling, stopPolling } = useCalendarStore.getState();
    startPolling(); // Uses default 300 seconds (5 minutes)
    
    return () => {
      stopPolling();
    };
  }, [fetchEvents]);

  // Re-render UI when store reports a new sync
  useEffect(() => {
    // No-op: relying on events array update to re-render; this effect ensures dependency on lastSynced
  }, [lastSynced]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      try {
        const marks: Record<string, any> = {};
        const today = new Date().toISOString().slice(0, 10);
        
        // Mark dates with events
        events.forEach(event => {
          if (!event.start_time) return; // Skip events without start_time
          try {
            // Use local date string to avoid UTC shifting issues that hide dots
            const eventDate = format(parseISO(event.start_time), 'yyyy-MM-dd');
            if (!marks[eventDate]) {
              marks[eventDate] = {
                marked: true,
                dotColor: CALENDAR_COLORS[event.calendar_source as keyof typeof CALENDAR_COLORS] || GOLD
              };
            }
          } catch (error) {
            console.warn('Invalid date format for event:', event.id, event.start_time);
          }
        });
        
        // Mark today and selected day
        if (marks[today]) {
          marks[today] = {
            ...marks[today],
            selected: selectedDay === today,
            selectedColor: GOLD,
            selectedTextColor: '#000'
          };
        } else {
          marks[today] = {
            selected: selectedDay === today,
            selectedColor: GOLD,
            selectedTextColor: '#000',
            marked: true,
            dotColor: GOLD
          };
        }
        
        if (selectedDay && selectedDay !== today && marks[selectedDay]) {
          marks[selectedDay].selected = true;
          marks[selectedDay].selectedColor = GOLD;
          marks[selectedDay].selectedTextColor = '#000';
        }
        
        if (!cancelled) setMarked(marks);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [events, selectedDay]);

  const headerTitle = useMemo(() => {
    switch(view) {
      case 'day': return 'Day View';
      case 'week': return 'Week View';
      case 'month': return 'Month View';
      default: return 'Month View';
    }
  }, [view]);

  const weekDays = useMemo(() => {
    const anchor = startOfWeek(weekAnchor, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(anchor, i));
  }, [weekAnchor]);

  const getDayEvents = useMemo(() => {
    if (!selectedDay) return [];
    try {
      const selectedDate = parseISO(selectedDay);
      return events.filter(event => {
        if (!event.start_time) return false; // Skip events without start_time
        try {
          const eventDate = parseISO(event.start_time);
          return isSameDay(eventDate, selectedDate);
        } catch (error) {
          console.warn('Invalid date format for event:', event.id, event.start_time);
          return false;
        }
      });
    } catch (error) {
      console.warn('Invalid selectedDay format:', selectedDay);
      return [];
    }
  }, [events, selectedDay]);

  const cycleView = () => {
    setView(current => {
      if (current === 'month') return 'week';
      if (current === 'week') return 'day';
      return 'month';
    });
  };

  return (
    <View style={styles.container}>
      <Animated.View entering={FadeIn.duration(200)} style={styles.header}>
        <Text style={styles.title}>Calendar</Text>
        <Pressable style={styles.viewToggle} onPress={cycleView}>
          <Ionicons name="swap-horizontal" size={18} color={TEXT} />
          <View style={{ width: 8 }} />
          <Text style={styles.toggleText}>{headerTitle}</Text>
        </Pressable>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(250)} style={styles.card}>
        {isLoading || eventsLoading ? (
          <ActivityIndicator color={GOLD} />
        ) : view === 'month' ? (
          <MonthCalendar
            theme={{
              backgroundColor: CARD,
              calendarBackground: CARD,
              textSectionTitleColor: MUTED,
              selectedDayBackgroundColor: GOLD,
              selectedDayTextColor: '#000',
              todayTextColor: GOLD,
              dayTextColor: TEXT,
              textDisabledColor: '#6B7280',
              arrowColor: GOLD,
              monthTextColor: TEXT
            }}
            hideExtraDays
            markedDates={marked}
            onDayPress={(d) => {
              setSelectedDay(d.dateString);
              setWeekAnchor(new Date(d.dateString));
              setDayDate(new Date(d.dateString));
            }}
          />
        ) : view === 'week' ? (
          <View>
            <View style={styles.weekHeader}>
              <Pressable onPress={() => setWeekAnchor((d) => addDays(d, -7))}>
                <Ionicons name="chevron-back" size={20} color={GOLD} />
              </Pressable>
              <Text style={styles.weekTitle}>{format(weekDays[0], 'MMM d')} - {format(weekDays[6], 'MMM d')}</Text>
              <Pressable onPress={() => setWeekAnchor((d) => addDays(d, 7))}>
                <Ionicons name="chevron-forward" size={20} color={GOLD} />
              </Pressable>
            </View>
            <View style={styles.weekRow}>
              {weekDays.map((d) => {
                const key = d.toISOString().slice(0, 10);
                const selected = selectedDay === key;
                return (
                  <TouchableOpacity key={key} style={[styles.dayCell, selected && styles.dayCellSelected]} onPress={() => {
                    setSelectedDay(key);
                    setDayDate(d);
                  }}>
                    <Text style={[styles.dayDow, selected && styles.dayTextSelected]}>{format(d, 'EEE')}</Text>
                    <Text style={[styles.dayNum, selected && styles.dayTextSelected]}>{format(d, 'd')}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : (
          <View>
            <View style={styles.dayHeader}>
              <Pressable onPress={() => {
                const prevDay = addDays(dayDate, -1);
                setDayDate(prevDay);
                setSelectedDay(prevDay.toISOString().slice(0, 10));
              }}>
                <Ionicons name="chevron-back" size={20} color={GOLD} />
              </Pressable>
              <Text style={styles.dayTitle}>{format(dayDate, 'EEEE, MMMM d, yyyy')}</Text>
              <Pressable onPress={() => {
                const nextDay = addDays(dayDate, 1);
                setDayDate(nextDay);
                setSelectedDay(nextDay.toISOString().slice(0, 10));
              }}>
                <Ionicons name="chevron-forward" size={20} color={GOLD} />
              </Pressable>
            </View>
            <Pressable 
              style={styles.dayCard}
              onPress={() => setSelectedDay(dayDate.toISOString().slice(0, 10))}
            >
              <Text style={styles.dayCardDate}>{format(dayDate, 'd')}</Text>
              <Text style={styles.dayCardMonth}>{format(dayDate, 'MMM')}</Text>
            </Pressable>
          </View>
        )}
      </Animated.View>

      {!!selectedDay && (
        <Animated.View entering={FadeInDown.duration(200)} style={styles.eventsCard}>
          <Text style={styles.eventsTitle}>
            Events on {(() => {
              try {
                return format(parseISO(selectedDay), 'MMMM d, yyyy');
              } catch {
                return selectedDay;
              }
            })()}
          </Text>
          {getDayEvents.length === 0 ? (
            <Text style={styles.empty}>No events found</Text>
          ) : (
            <ScrollView style={styles.eventsList} showsVerticalScrollIndicator={false}>
              {getDayEvents.map((event) => {
                if (!event.start_time) return null; // Skip events without start_time
                try {
                  const eventDate = parseISO(event.start_time);
                  const endDate = event.end_time ? parseISO(event.end_time) : null;
                  const color = CALENDAR_COLORS[event.calendar_source as keyof typeof CALENDAR_COLORS] || GOLD;
                  const isNewlyAccepted = event.is_invite && event.invite_status === 'accepted';
                  
                  return (
                    <TouchableOpacity
                      key={event.id}
                      style={[
                        styles.eventItem,
                        isNewlyAccepted && styles.newlyAcceptedEvent
                      ]}
                      onPress={() => router.push(`/event-details?id=${event.id}`)}
                    >
                      <View style={[styles.eventColorBar, { backgroundColor: color }]} />
                      <View style={styles.eventContent}>
                        <Text style={styles.eventTitle}>{event.title}</Text>
                        <Text style={styles.eventTime}>
                          {format(eventDate, 'h:mm aa')} {endDate ? `- ${format(endDate, 'h:mm aa')}` : ''}
                        </Text>
                        {event.location && (
                          <View style={styles.eventLocation}>
                            <Ionicons name="location-outline" size={14} color={MUTED} />
                            <Text style={styles.eventLocationText}>{event.location}</Text>
                          </View>
                        )}
                        <View style={styles.eventMeta}>
                          <View style={[styles.sourceChip, { backgroundColor: `${color}22`, borderColor: color }]}>
                            <Text style={[styles.sourceChipText, { color }]}>
                              {event.calendar_source.charAt(0).toUpperCase() + event.calendar_source.slice(1)}
                            </Text>
                          </View>
                          {isNewlyAccepted && (
                            <View style={styles.newBadge}>
                              <Text style={styles.newBadgeText}>New</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                } catch (error) {
                  console.warn('Error rendering event:', event.id, error);
                  return null;
                }
              })}
            </ScrollView>
          )}
        </Animated.View>
      )}

      <Pressable style={styles.fab} onPress={() => router.push('/create-event')}>
        <Ionicons name="add" size={26} color="#000" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: TEXT, fontSize: 22, fontWeight: '800' },
  viewToggle: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: '#2A2A2A' },
  toggleText: { color: TEXT },
  card: { margin: 16, padding: 12, backgroundColor: CARD, borderRadius: 22, borderWidth: 1, borderColor: '#2A2A2A' },
  weekHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  weekTitle: { color: TEXT, fontWeight: '700' },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayCell: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#2A2A2A', marginHorizontal: 2, backgroundColor: '#141414' },
  dayCellSelected: { backgroundColor: GOLD, borderColor: GOLD },
  dayDow: { color: MUTED, fontSize: 11 },
  dayNum: { color: TEXT, fontSize: 16, fontWeight: '800' },
  dayTextSelected: { color: '#000' },
  eventsCard: { marginHorizontal: 16, marginTop: 6, padding: 12, backgroundColor: CARD, borderRadius: 22, borderWidth: 1, borderColor: '#2A2A2A', maxHeight: 400 },
  eventsTitle: { color: TEXT, fontWeight: '800', marginBottom: 12 },
  empty: { color: MUTED, textAlign: 'center', marginTop: 12 },
  eventsList: { maxHeight: 350 },
  eventItem: { 
    flexDirection: 'row', 
    marginBottom: 12, 
    backgroundColor: '#141414', 
    borderRadius: 12, 
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2A2A2A'
  },
  newlyAcceptedEvent: {
    borderColor: '#4CAF50',
    borderWidth: 2,
    backgroundColor: '#4CAF5022'
  },
  eventColorBar: { width: 4 },
  eventContent: { flex: 1, padding: 12 },
  eventTitle: { color: TEXT, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  eventTime: { color: MUTED, fontSize: 13, marginBottom: 6 },
  eventLocation: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  eventLocationText: { color: MUTED, fontSize: 12, marginLeft: 4 },
  eventMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sourceChip: { 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 8, 
    borderWidth: 1 
  },
  sourceChipText: { fontSize: 11, fontWeight: '600' },
  newBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8
  },
  newBadgeText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '700'
  },
  dayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  dayTitle: { color: TEXT, fontWeight: '700', fontSize: 16 },
  dayCard: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: 24, 
    backgroundColor: '#141414', 
    borderRadius: 16, 
    borderWidth: 2,
    borderColor: GOLD
  },
  dayCardDate: { color: GOLD, fontSize: 48, fontWeight: '800' },
  dayCardMonth: { color: MUTED, fontSize: 16, marginTop: 4 },
  fab: { position: 'absolute', right: 18, bottom: 90, width: 56, height: 56, borderRadius: 28, backgroundColor: GOLD, alignItems: 'center', justifyContent: 'center' }
});

//