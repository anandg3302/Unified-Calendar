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
import { Calendar as MiniCalendar } from 'react-native-calendars';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';

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
  const [events, setEvents] = useState<EventItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [marked, setMarked] = useState<Record<string, any>>({});

  const backendUrl =
    (process.env.EXPO_PUBLIC_BACKEND_URL as string) || 'http://localhost:8000';

  useEffect(() => {
    let cancelled = false;

    async function fetchEvents() {
      setIsLoading(true);
      try {
        const res = await fetch(`${backendUrl}/api/events`);
        const data = await res.json();
        if (cancelled) return;

        const list: EventItem[] = Array.isArray(data)
          ? data
          : [
              ...(data?.local_events || []),
              ...(data?.google_events || []),
              ...(data?.apple_events || []),
              ...(data?.microsoft_events || []),
            ];

        setEvents(list.slice(0, 10));

        // Mark dates on calendar
        const marks: Record<string, any> = {};
        list.forEach((e) => {
          const d = new Date(e.start_time).toISOString().slice(0, 10);
          marks[d] = { marked: true, dotColor: GOLD };
        });

        const today = new Date().toISOString().slice(0, 10);
        marks[today] = {
          ...(marks[today] || {}),
          selected: true,
          selectedColor: GOLD,
          selectedTextColor: '#000',
        };
        setMarked(marks);
      } catch (error) {
        console.warn('Error fetching events:', error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchEvents();
    return () => {
      cancelled = true;
    };
  }, [backendUrl]);

  const filtered = useMemo(() => {
    if (!query.trim()) return events;
    const q = query.trim().toLowerCase();
    return events.filter(
      (e) =>
        e.title?.toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q) ||
        e.location?.toLowerCase().includes(q)
    );
  }, [events, query]);

  const onAdd = async () => {
    if (Platform.OS !== 'web') {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {}
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
    const start = new Date(item.start_time);
    const end = new Date(item.end_time);
    const day = start.toLocaleDateString(undefined, { day: '2-digit' });
    const month = start.toLocaleDateString(undefined, { month: 'short' });
    const time = `${start.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    return (
      <Animated.View
        entering={FadeInDown.delay(index * 60).springify().damping(14)}
        style={styles.eventCard}
      >
        <View style={styles.eventDatePill}>
          <Text style={styles.eventDay}>{day}</Text>
          <Text style={styles.eventMonth}>{month}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.eventTitle} numberOfLines={1}>
            {item.title || 'Untitled Event'}
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
      ) : (
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          data={filtered}
          keyExtractor={(i) => i.id}
          renderItem={renderEventCard}
        />
      )}

      {/* Calendar */}
      <View style={styles.sectionHeaderAlt}>
        <Text style={styles.sectionTitle}>This Month</Text>
      </View>

      <View style={styles.calendarCard}>
        <MiniCalendar
          theme={{
            backgroundColor: CARD_BG,
            calendarBackground: CARD_BG,
            textSectionTitleColor: MUTED,
            selectedDayBackgroundColor: GOLD,
            selectedDayTextColor: '#000',
            todayTextColor: GOLD,
            dayTextColor: TEXT,
            textDisabledColor: '#6B7280',
            arrowColor: GOLD,
            monthTextColor: TEXT,
          }}
          hideExtraDays
          markedDates={marked}
          onDayPress={(d: DateObject) => {
            console.log('Selected date:', d.dateString);
          }}
        />
      </View>

      {/* Bottom Navigation */}
      <View style={styles.navBar}>
        <NavItem label="Home" icon="home" active />
        <NavItem label="Calendar" icon="calendar" />
        <Pressable style={styles.addFab} onPress={onAdd}>
          <Ionicons name="add" size={26} color={DARK} />
        </Pressable>
        <NavItem label="Tasks" icon="checkmark-done" />
        <NavItem label="Profile" icon="person" />
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
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 20,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    overflow: 'hidden',
  },
  navBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    height: 68,
    backgroundColor: '#0D0D0D',
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
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
