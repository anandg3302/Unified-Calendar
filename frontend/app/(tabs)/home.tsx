import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { parseISO, format, isValid } from 'date-fns';
import { useCalendarStore } from '../../stores/calendarStore';
import { useTaskStore } from '../../stores/taskStore';

type EventItem = {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  location?: string;
  description?: string;
};

// ✅ Custom type for calendar press event
type DateObject = {
  dateString: string;
  day: number;
  month: number;
  year: number;
  timestamp: number;
};

const GOLD = '#FFD700';
const DARK = '#0A0A0A';
const TEXT = '#FFFFFF';
const MUTED = '#EAEAEA99';
const CARD_BG = '#1E1E1E';

export default function HomeScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const { events, isLoading, fetchEvents, startPolling, stopPolling } = useCalendarStore();
  const { tasks, load: loadTasks } = useTaskStore();

  useEffect(() => {
    fetchEvents();
    loadTasks();
    // Start automatic polling for real-time updates (every 5 minutes - webhooks provide instant updates)
    startPolling(); // Uses default 300 seconds (5 minutes)
    
    // Cleanup: stop polling when component unmounts
    return () => {
      stopPolling();
    };
  }, [fetchEvents, loadTasks, startPolling, stopPolling]);

  const filteredEvents = useMemo(() => {
    // First filter out events with invalid dates or missing required data
    const validEvents = events.filter((e) => {
      if (!e.start_time) return false;
      try {
        const startDate = parseISO(e.start_time);
        return isValid(startDate);
      } catch {
        return false;
      }
    });

    // Then apply search filter if query exists
    if (!query.trim()) return validEvents.slice(0, 20);
    const q = query.trim().toLowerCase();
    return validEvents.filter(
      (e) =>
        (e.title || 'Untitled Event').toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q) ||
        e.location?.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [events, query]);

  const filteredTasks = useMemo(() => {
    if (!query.trim()) return tasks.slice(0, 20);
    const q = query.trim().toLowerCase();
    return tasks.filter((t) => t.title.toLowerCase().includes(q)).slice(0, 20);
  }, [tasks, query]);

  const onAdd = async () => {
    if (Platform.OS !== 'web') {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch { }
    }
    router.push('/create-event');
  };

  const renderEventCard = ({
    item,
    index,
  }: {
    item: EventItem;
    index: number;
  }) => {
    // Safely parse dates with error handling
    let day: string = '--';
    let month: string = '---';
    let time: string = 'Time TBD';

    try {
      if (item.start_time) {
        const start = parseISO(item.start_time);
        if (isValid(start)) {
          day = format(start, 'dd');
          month = format(start, 'MMM');
          
          if (item.end_time) {
            const end = parseISO(item.end_time);
            if (isValid(end)) {
              time = `${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`;
            } else {
              time = format(start, 'h:mm a');
            }
          } else {
            time = format(start, 'h:mm a');
          }
        }
      }
    } catch (error) {
      console.warn('Error parsing event dates:', item.id, error);
    }

    const eventTitle = item.title?.trim() || 'Untitled Event';

    return (
      <Animated.View
        entering={FadeInDown.delay(index * 60).springify().damping(14)}
        style={styles.eventCard}
      >
        <View style={styles.eventDatePill}>
          <Text style={styles.eventDay}>{day}</Text>
          <Text style={styles.eventMonth}>{month.toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.eventTitle} numberOfLines={1}>
            {eventTitle}
          </Text>
          <Text style={styles.eventSub}>{time}</Text>
          {!!item.location && (
            <Text style={styles.eventLocation} numberOfLines={1}>
              {item.location}
            </Text>
          )}
        </View>
        <View style={styles.sourceDot} />
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
        <Text style={styles.appTitle}>Unified Calendar</Text>
        <Pressable style={styles.avatarBtn}>
          <Text style={styles.avatarTxt}>AG</Text>
        </Pressable>
      </Animated.View>

      {/* Search bar */}
      <Animated.View entering={FadeInDown.duration(250)} style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={MUTED} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search events or tasks…"
          placeholderTextColor={MUTED}
          value={query}
          onChangeText={setQuery}
        />
      </Animated.View>

      {/* Upcoming events */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Upcoming</Text>
        <Pressable style={styles.sectionAction}>
          <Text style={styles.sectionActionText}>See all</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={{ height: 140, flexDirection: 'row', paddingHorizontal: 16 }}>
          <View style={styles.skelCard} />
          <View style={[styles.skelCard, { marginLeft: 12 }]} />
          <View style={[styles.skelCard, { marginLeft: 12 }]} />
        </View>
      ) : filteredEvents.length === 0 ? (
        <View style={{ paddingHorizontal: 16, paddingVertical: 24 }}>
          <Text style={{ color: MUTED, textAlign: 'center', fontSize: 14 }}>
            No upcoming events found
          </Text>
        </View>
      ) : (
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          data={filteredEvents}
          keyExtractor={(i) => i.id}
          renderItem={renderEventCard}
        />
      )}

      {/* Tasks */}
      <View style={styles.sectionHeaderAlt}>
        <Text style={styles.sectionTitle}>My Tasks</Text>
      </View>
      <View style={{ paddingHorizontal: 16 }}>
        {filteredTasks.length === 0 ? (
          <Text style={{ color: MUTED }}>No tasks yet</Text>
        ) : (
          filteredTasks.slice(0, 6).map((t) => (
            <View key={t.id} style={styles.taskRow}>
              <View style={styles.taskDot} />
              <Text style={styles.taskTitle} numberOfLines={1}>{t.title}</Text>
              <Text style={styles.taskMeta}>· {new Date(t.createdAt).toLocaleDateString()}</Text>
            </View>
          ))
        )}
      </View>

      {/* Bottom Navigation */}
      <View style={styles.navBar}>
        <Pressable style={styles.addFab} onPress={onAdd}>
          <Ionicons name="add" size={26} color={DARK} />
        </Pressable>
      </View>
    </View>
  );
}

function NavItem({
  label,
  icon,
  active,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active?: boolean;
}) {
  return (
    <View style={styles.navItem}>
      <Ionicons name={icon} size={22} color={active ? GOLD : MUTED} />
      <Text style={[styles.navLabel, active && { color: GOLD }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: DARK },
  header: {
    paddingTop: 18,
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  appTitle: { color: TEXT, fontSize: 22, fontWeight: '800' },
  avatarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: CARD_BG,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  avatarTxt: { color: TEXT, fontSize: 12, fontWeight: '700' },
  searchWrap: {
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: CARD_BG,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: { flex: 1, color: TEXT, fontSize: 14 },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeaderAlt: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 10 },
  sectionTitle: { color: TEXT, fontSize: 18, fontWeight: '800' },
  sectionAction: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  sectionActionText: { color: GOLD, fontSize: 12, fontWeight: '700' },
  eventCard: {
    width: 260,
    height: 110,
    marginRight: 14,
    borderRadius: 20,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  eventDatePill: {
    width: 56,
    height: 72,
    borderRadius: 16,
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#1F1F1F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventDay: { color: GOLD, fontSize: 22, fontWeight: '800', lineHeight: 26 },
  eventMonth: {
    color: MUTED,
    fontSize: 12,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  eventTitle: { color: TEXT, fontSize: 16, fontWeight: '800', marginBottom: 4 },
  eventSub: { color: MUTED, fontSize: 12, marginBottom: 2 },
  eventLocation: { color: '#D1D5DB', fontSize: 12 },
  sourceDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: GOLD,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  calendarCard: {
    display: 'none'
  },
  taskRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1F1F1F' },
  taskDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: GOLD, marginRight: 10 },
  taskTitle: { color: TEXT, flex: 1, fontSize: 14, fontWeight: '700' },
  taskMeta: { color: MUTED, fontSize: 12, marginLeft: 8 },
  navBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 90, // Move above the system tab bar to prevent overlap
    height: 68,
    backgroundColor: '#0D0D0D',
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 6,
    minWidth: 56,
  },
  navLabel: { color: MUTED, fontSize: 10, marginTop: 4, fontWeight: '700' },
  addFab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
    borderWidth: 1,
    borderColor: '#F2C200',
  },
  skelCard: {
    width: 260,
    height: 110,
    borderRadius: 20,
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
});
