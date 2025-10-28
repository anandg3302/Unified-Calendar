import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar as MonthCalendar } from 'react-native-calendars';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

const GOLD = '#FFD700';
const BG = '#0A0A0A';
const CARD = '#1E1E1E';
const TEXT = '#FFFFFF';
const MUTED = '#EAEAEA99';

export default function CalendarScreen() {
  const [marked, setMarked] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<'month' | 'week'>('month');
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      try {
        const marks: Record<string, any> = {};
        const today = new Date().toISOString().slice(0, 10);
        marks[today] = {
          selected: true,
          selectedColor: GOLD,
          selectedTextColor: '#000',
          marked: true,
          dotColor: GOLD
        };
        if (!cancelled) setMarked(marks);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const headerTitle = useMemo(() => (view === 'month' ? 'Month View' : 'Week View'), [view]);

  return (
    <View style={styles.container}>
      <Animated.View entering={FadeIn.duration(200)} style={styles.header}>
        <Text style={styles.title}>Calendar</Text>
        <Pressable style={styles.viewToggle} onPress={() => setView((v) => (v === 'month' ? 'week' : 'month'))}>
          <Ionicons name="swap-horizontal" size={18} color={TEXT} />
          <Text style={styles.toggleText}>{headerTitle}</Text>
        </Pressable>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(250)} style={styles.card}>
        {isLoading ? (
          <ActivityIndicator color={GOLD} />
        ) : (
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
            onDayPress={(d) => setSelectedDay(d.dateString)}
          />
        )}
      </Animated.View>

      {!!selectedDay && (
        <Animated.View entering={FadeInDown.duration(200)} style={styles.eventsCard}>
          <Text style={styles.eventsTitle}>Events on {selectedDay}</Text>
          <Text style={styles.empty}>No events found</Text>
        </Animated.View>
      )}

      <Pressable style={styles.fab}>
        <Ionicons name="add" size={26} color="#000" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: TEXT, fontSize: 22, fontWeight: '800' },
  viewToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#111', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: '#2A2A2A' },
  toggleText: { color: TEXT },
  card: { margin: 16, padding: 12, backgroundColor: CARD, borderRadius: 22, borderWidth: 1, borderColor: '#2A2A2A' },
  eventsCard: { marginHorizontal: 16, marginTop: 6, padding: 12, backgroundColor: CARD, borderRadius: 22, borderWidth: 1, borderColor: '#2A2A2A' },
  eventsTitle: { color: TEXT, fontWeight: '800', marginBottom: 6 },
  empty: { color: MUTED },
  fab: { position: 'absolute', right: 18, bottom: 18, width: 56, height: 56, borderRadius: 28, backgroundColor: GOLD, alignItems: 'center', justifyContent: 'center' }
});