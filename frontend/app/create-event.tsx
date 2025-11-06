import React, { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useCalendarStore } from '../stores/calendarStore';
import { format } from 'date-fns';
import {
  Provider as PaperProvider,
  MD3LightTheme as DefaultTheme,
  Text,
  TextInput,
  Card,
  FAB,
  HelperText,
  Snackbar
} from 'react-native-paper';
import { DatePickerModal, TimePickerModal, registerTranslation, en } from 'react-native-paper-dates';

registerTranslation('en', en);

const CALENDAR_SOURCES = [
  { id: 'google', name: 'Google Calendar', color: '#4285F4' },
  { id: 'apple', name: 'Apple Calendar', color: '#FF3B30' },
  { id: 'microsoft', name: 'Microsoft Outlook', color: '#0078D4' }
];

export default function CreateEventScreen() {
  const router = useRouter();
  const { createEvent } = useCalendarStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [calendarSource, setCalendarSource] = useState<'google' | 'microsoft' | 'apple'>('google');

  const [date, setDate] = useState<Date>(new Date());
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date(Date.now() + 60 * 60 * 1000));

  const [openDate, setOpenDate] = useState(false);
  const [openStartTime, setOpenStartTime] = useState(false);
  const [openEndTime, setOpenEndTime] = useState(false);

  const [snackbar, setSnackbar] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' });
  const [isLoading, setIsLoading] = useState(false);

  const theme = useMemo(() => ({
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      primary: '#6200EE'
    },
    roundness: 12
  }), []);

  const dateLabel = useMemo(() => format(date, 'EEE, dd MMM yyyy'), [date]);
  const startTimeLabel = useMemo(() => format(startDate, 'h:mm aa'), [startDate]);
  const endTimeLabel = useMemo(() => format(endDate, 'h:mm aa'), [endDate]);

  const handleCreate = async () => {
    if (!title.trim()) {
      setSnackbar({ visible: true, message: 'Please enter an event title' });
      return;
    }
    if (!calendarSource) {
      setSnackbar({ visible: true, message: 'Please select a calendar source' });
      return;
    }
    if (endDate <= startDate) {
      setSnackbar({ visible: true, message: 'End time must be after start time' });
      return;
    }
    setIsLoading(true);
    try {
      await createEvent({
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        calendar_source: calendarSource,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        month: format(date, 'yyyy-MM')
      });
      setSnackbar({ visible: true, message: `Event created: ${title}` });
      router.back();
    } catch (e) {
      setSnackbar({ visible: true, message: 'Failed to create event' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PaperProvider theme={theme}>
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Card style={styles.card} mode="elevated">
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>Event Details</Text>
              <TextInput
                mode="outlined"
                label="Event Title"
                placeholder="Enter event title"
                value={title}
                onChangeText={setTitle}
                disabled={isLoading}
                style={styles.inputPaper}
              />
              <HelperText type="info" visible={!title}>Title is required</HelperText>

              <TextInput
                mode="outlined"
                label="Description"
                placeholder="Add description"
                value={description}
                onChangeText={setDescription}
                disabled={isLoading}
                style={styles.inputPaper}
                multiline
                numberOfLines={4}
              />

              <TextInput
                mode="outlined"
                label="Location"
                placeholder="Add location"
                value={location}
                onChangeText={setLocation}
                disabled={isLoading}
                style={styles.inputPaper}
              />
              <Text variant="titleMedium" style={[styles.sectionTitle, { marginTop: 8 }]}>Calendar Source</Text>
              <View style={styles.sourceRow}>
                {CALENDAR_SOURCES.map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    style={[
                      styles.sourceChip,
                      { borderColor: s.color },
                      calendarSource === (s.id as any) && styles.sourceChipActive
                    ]}
                    onPress={() => setCalendarSource(s.id as any)}
                    disabled={isLoading}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.sourceChipText, calendarSource === (s.id as any) && { color: '#000' }]}>
                      {s.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Card.Content>
          </Card>

          <Card style={styles.card} mode="elevated">
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>When</Text>
              <TextInput
                mode="outlined"
                label="Date"
                value={dateLabel}
                editable={false}
                right={<TextInput.Icon icon="calendar" onPress={() => setOpenDate(true)} />}
                style={styles.inputPaper}
              />
              <View style={styles.row}>
                <View style={styles.col}>
                  <TextInput
                    mode="outlined"
                    label="Start Time"
                    value={startTimeLabel}
                    editable={false}
                    right={<TextInput.Icon icon="clock" onPress={() => setOpenStartTime(true)} />}
                    style={styles.inputPaper}
                  />
                </View>
                <View style={styles.spacer} />
                <View style={styles.col}>
                  <TextInput
                    mode="outlined"
                    label="End Time"
                    value={endTimeLabel}
                    editable={false}
                    right={<TextInput.Icon icon="clock-outline" onPress={() => setOpenEndTime(true)} />}
                    style={styles.inputPaper}
                  />
                </View>
              </View>
            </Card.Content>
          </Card>
        </ScrollView>

        <FAB
          icon="check"
          label={isLoading ? 'Creating…' : 'Create Event'}
          onPress={handleCreate}
          style={styles.fab}
          mode="elevated"
          color="#fff"
          disabled={isLoading}
        />

        <DatePickerModal
          locale="en"
          mode="single"
          visible={openDate}
          onDismiss={() => setOpenDate(false)}
          date={date}
          onConfirm={({ date: picked }) => {
            if (!picked) return;
            setOpenDate(false);
            setDate(picked);
            const nextStart = new Date(startDate);
            nextStart.setFullYear(picked.getFullYear(), picked.getMonth(), picked.getDate());
            const nextEnd = new Date(endDate);
            nextEnd.setFullYear(picked.getFullYear(), picked.getMonth(), picked.getDate());
            if (nextEnd <= nextStart) {
              nextEnd.setTime(nextStart.getTime() + 60 * 60 * 1000);
            }
            setStartDate(nextStart);
            setEndDate(nextEnd);
          }}
          presentationStyle="pageSheet"
        />

        <TimePickerModal
          visible={openStartTime}
          onDismiss={() => setOpenStartTime(false)}
          onConfirm={({ hours, minutes }) => {
            setOpenStartTime(false);
            const nextStart = new Date(startDate);
            nextStart.setHours(hours, minutes, 0, 0);
            let nextEnd = new Date(endDate);
            if (nextEnd <= nextStart) {
              nextEnd = new Date(nextStart.getTime() + 60 * 60 * 1000);
            }
            setStartDate(nextStart);
            setEndDate(nextEnd);
          }}
          hours={startDate.getHours()}
          minutes={startDate.getMinutes()}
          label="Start time"
          locale="en"
          use24HourClock={false}
        />

        <TimePickerModal
          visible={openEndTime}
          onDismiss={() => setOpenEndTime(false)}
          onConfirm={({ hours, minutes }) => {
            setOpenEndTime(false);
            const nextEnd = new Date(endDate);
            nextEnd.setHours(hours, minutes, 0, 0);
            if (nextEnd <= startDate) {
              nextEnd.setTime(startDate.getTime() + 5 * 60 * 1000);
            }
            setEndDate(nextEnd);
          }}
          hours={endDate.getHours()}
          minutes={endDate.getMinutes()}
          label="End time"
          locale="en"
          use24HourClock={false}
        />

        <Snackbar
          visible={snackbar.visible}
          onDismiss={() => setSnackbar({ visible: false, message: '' })}
          duration={2500}
        >
          {snackbar.message}
        </Snackbar>
      </SafeAreaView>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A'
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120
  },
  card: {
    borderRadius: 12,
    marginBottom: 16
  },
  sectionTitle: {
    marginBottom: 8
  },
  inputPaper: {
    marginTop: 8,
    marginBottom: 8
  },
  sourceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8
  },
  sourceChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: '#121212'
  },
  sourceChipActive: {
    backgroundColor: '#FFD700',
    borderColor: '#FFD700'
  },
  sourceChipText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  col: {
    flex: 1
  },
  spacer: {
    width: 12
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 90
  }
});