import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
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
import CustomDateTimePicker from '../components/CustomDateTimePicker';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 8,
    fontSize: 16,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
  },
  dateText: {
    marginLeft: 8,
    fontSize: 16,
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007BFF',
    padding: 12,
    borderRadius: 4,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default function EditEventScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { events, updateEvent } = useCalendarStore();
  
  const event = events.find(e => e.id === id);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDescription(event.description || '');
      setLocation(event.location || '');
      setStartDate(parseISO(event.start_time));
      setEndDate(parseISO(event.end_time));
    }
  }, [event]);

  // Cleanup effect to handle DateTimePicker state properly
  useEffect(() => {
    return () => {
      // Clean up picker states when component unmounts
      setShowStartPicker(false);
      setShowEndPicker(false);
    };
  }, []);

  if (!event) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Event not found</Text>
      </View>
    );
  }

  const handleUpdate = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter an event title');
      return;
    }

    if (endDate <= startDate) {
      Alert.alert('Error', 'End time must be after start time');
      return;
    }

    setIsLoading(true);
    try {
      await updateEvent(event.id, {
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString()
      });
      
      Alert.alert('Success', 'Event updated successfully');
      router.back();
    } catch (error) {
      Alert.alert('Error', 'Failed to update event');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Title */}
        <View style={styles.field}>
          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="Event title"
            value={title}
            onChangeText={setTitle}
            editable={!isLoading}
          />
        </View>

        {/* Start Time */}
        <View style={styles.field}>
          <Text style={styles.label}>Start Time</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowStartPicker(true)}
            disabled={isLoading}
          >
            <Ionicons name="calendar-outline" size={20} color="#666" />
            <Text style={styles.dateText}>
              {format(startDate, 'MMM d, yyyy HH:mm')}
            </Text>
          </TouchableOpacity>
          {showStartPicker && (
            <CustomDateTimePicker
              testID="startDatePicker"
              value={startDate}
              mode="datetime"
              is24Hour={true}
              onChange={(event, selectedDate) => {
                setShowStartPicker(false);
                if (event.type === 'set' && selectedDate) {
                  setStartDate(selectedDate);
                  if (selectedDate >= endDate) {
                    setEndDate(new Date(selectedDate.getTime() + 60 * 60 * 1000));
                  }
                }
              }}
            />
          )}

        </View>

        {/* End Time */}
        <View style={styles.field}>
          <Text style={styles.label}>End Time</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowEndPicker(true)}
            disabled={isLoading}
          >
            <Ionicons name="calendar-outline" size={20} color="#666" />
            <Text style={styles.dateText}>
              {format(endDate, 'MMM d, yyyy HH:mm')}
            </Text>
          </TouchableOpacity>
          {showEndPicker && (
            <CustomDateTimePicker
              testID="endDatePicker"
              value={endDate}
              mode="datetime"
              is24Hour={true}
              minimumDate={startDate}
              onChange={(event, selectedDate) => {
                setShowEndPicker(false);
                if (event.type === 'set' && selectedDate) {
                  setEndDate(selectedDate);
                }
              }}
            />
          )}

        </View>

        {/* Location */}
        <View style={styles.field}>
          <Text style={styles.label}>Location</Text>
          <TextInput
            style={styles.input}
            placeholder="Add location"
            value={location}
            onChangeText={setLocation}
            editable={!isLoading}
          />
        </View>

        {/* Description */}
        <View style={styles.field}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={styles.input}
            placeholder="Event description"
            value={description}
            onChangeText={setDescription}
            editable={!isLoading}
          />
        </View>

        {/* Update Button */}
        <View style={styles.field}>
          <TouchableOpacity
            style={styles.button}
            onPress={handleUpdate}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Update Event</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
