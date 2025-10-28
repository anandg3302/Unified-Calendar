import React, { useState, useEffect } from 'react';
import { Platform, Modal, View, TouchableOpacity, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CustomDateTimePickerProps {
  value: Date;
  mode?: 'date' | 'time' | 'datetime';
  is24Hour?: boolean;
  minimumDate?: Date;
  maximumDate?: Date;
  onChange: (event: any, selectedDate?: Date) => void;
  testID?: string;
}

export const CustomDateTimePicker: React.FC<CustomDateTimePickerProps> = ({
  value,
  mode = 'datetime',
  is24Hour = true,
  minimumDate,
  maximumDate,
  onChange,
  testID,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [selectedDate, setSelectedDate] = useState(value);
  const [selectedTime, setSelectedTime] = useState({
    hours: value.getHours(),
    minutes: value.getMinutes(),
  });

  useEffect(() => {
    setSelectedDate(value);
    setSelectedTime({
      hours: value.getHours(),
      minutes: value.getMinutes(),
    });
  }, [value]);

  const handleCancel = () => {
    setIsVisible(false);
    onChange({ type: 'dismissed' }, undefined);
  };

  const handleDone = () => {
    const newDate = new Date(selectedDate);
    newDate.setHours(selectedTime.hours, selectedTime.minutes, 0, 0);
    
    setIsVisible(false);
    onChange({ type: 'set' }, newDate);
  };

  const generateDays = () => {
    const days = [];
    const today = new Date();
    const startDate = minimumDate || new Date(today.getFullYear() - 1, 0, 1);
    const endDate = maximumDate || new Date(today.getFullYear() + 1, 11, 31);
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }
    return days;
  };

  const generateHours = () => {
    const hours = [];
    const maxHour = is24Hour ? 23 : 12;
    const minHour = is24Hour ? 0 : 1;
    
    for (let h = minHour; h <= maxHour; h++) {
      hours.push(h);
    }
    return hours;
  };

  const generateMinutes = () => {
    const minutes = [];
    for (let m = 0; m < 60; m += 5) {
      minutes.push(m);
    }
    return minutes;
  };

  const formatHour = (hour: number) => {
    if (is24Hour) return hour.toString().padStart(2, '0');
    if (hour === 0) return '12';
    if (hour > 12) return (hour - 12).toString();
    return hour.toString();
  };

  const formatAmPm = (hour: number) => {
    if (is24Hour) return '';
    return hour >= 12 ? 'PM' : 'AM';
  };

  const isDateSelected = (date: Date) => {
    return date.toDateString() === selectedDate.toDateString();
  };

  const isTimeSelected = (hour: number, minute: number) => {
    return hour === selectedTime.hours && minute === selectedTime.minutes;
  };

  if (!isVisible) {
    return null;
  }

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleCancel}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.title}>
              {mode === 'date' ? 'Select Date' : mode === 'time' ? 'Select Time' : 'Select Date & Time'}
            </Text>
            <TouchableOpacity onPress={handleDone} style={styles.doneButton}>
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {mode === 'date' || mode === 'datetime' ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Date</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScrollView}>
                  {generateDays().map((date, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.dateItem,
                        isDateSelected(date) && styles.selectedDateItem
                      ]}
                      onPress={() => setSelectedDate(date)}
                    >
                      <Text style={[
                        styles.dateText,
                        isDateSelected(date) && styles.selectedDateText
                      ]}>
                        {date.getDate()}
                      </Text>
                      <Text style={[
                        styles.monthText,
                        isDateSelected(date) && styles.selectedMonthText
                      ]}>
                        {date.toLocaleDateString('en', { month: 'short' })}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {mode === 'time' || mode === 'datetime' ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Time</Text>
                <View style={styles.timeContainer}>
                  <View style={styles.timeColumn}>
                    <Text style={styles.timeLabel}>Hour</Text>
                    <ScrollView style={styles.timeScrollView} showsVerticalScrollIndicator={false}>
                      {generateHours().map((hour) => (
                        <TouchableOpacity
                          key={hour}
                          style={[
                            styles.timeItem,
                            selectedTime.hours === hour && styles.selectedTimeItem
                          ]}
                          onPress={() => setSelectedTime(prev => ({ ...prev, hours: hour }))}
                        >
                          <Text style={[
                            styles.timeText,
                            selectedTime.hours === hour && styles.selectedTimeText
                          ]}>
                            {formatHour(hour)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  <View style={styles.timeColumn}>
                    <Text style={styles.timeLabel}>Minute</Text>
                    <ScrollView style={styles.timeScrollView} showsVerticalScrollIndicator={false}>
                      {generateMinutes().map((minute) => (
                        <TouchableOpacity
                          key={minute}
                          style={[
                            styles.timeItem,
                            selectedTime.minutes === minute && styles.selectedTimeItem
                          ]}
                          onPress={() => setSelectedTime(prev => ({ ...prev, minutes: minute }))}
                        >
                          <Text style={[
                            styles.timeText,
                            selectedTime.minutes === minute && styles.selectedTimeText
                          ]}>
                            {minute.toString().padStart(2, '0')}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  {!is24Hour && (
                    <View style={styles.timeColumn}>
                      <Text style={styles.timeLabel}>AM/PM</Text>
                      <View style={styles.amPmContainer}>
                        <TouchableOpacity
                          style={[
                            styles.amPmItem,
                            selectedTime.hours < 12 && styles.selectedAmPmItem
                          ]}
                          onPress={() => {
                            const newHour = selectedTime.hours >= 12 ? selectedTime.hours - 12 : selectedTime.hours;
                            setSelectedTime(prev => ({ ...prev, hours: newHour }));
                          }}
                        >
                          <Text style={[
                            styles.amPmText,
                            selectedTime.hours < 12 && styles.selectedAmPmText
                          ]}>
                            AM
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.amPmItem,
                            selectedTime.hours >= 12 && styles.selectedAmPmItem
                          ]}
                          onPress={() => {
                            const newHour = selectedTime.hours < 12 ? selectedTime.hours + 12 : selectedTime.hours;
                            setSelectedTime(prev => ({ ...prev, hours: newHour }));
                          }}
                        >
                          <Text style={[
                            styles.amPmText,
                            selectedTime.hours >= 12 && styles.selectedAmPmText
                          ]}>
                            PM
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  cancelText: {
    color: '#007AFF',
    fontSize: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  doneButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  doneText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#000',
  },
  dateScrollView: {
    flexDirection: 'row',
  },
  dateItem: {
    alignItems: 'center',
    padding: 12,
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    minWidth: 60,
  },
  selectedDateItem: {
    backgroundColor: '#007AFF',
  },
  dateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  selectedDateText: {
    color: '#fff',
  },
  monthText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  selectedMonthText: {
    color: '#fff',
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  timeColumn: {
    flex: 1,
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
    color: '#000',
  },
  timeScrollView: {
    height: 150,
    width: '100%',
  },
  timeItem: {
    padding: 12,
    alignItems: 'center',
    borderRadius: 8,
    marginVertical: 2,
  },
  selectedTimeItem: {
    backgroundColor: '#007AFF',
  },
  timeText: {
    fontSize: 16,
    color: '#000',
  },
  selectedTimeText: {
    color: '#fff',
    fontWeight: '600',
  },
  amPmContainer: {
    flexDirection: 'column',
  },
  amPmItem: {
    padding: 12,
    alignItems: 'center',
    borderRadius: 8,
    marginVertical: 2,
    minWidth: 60,
  },
  selectedAmPmItem: {
    backgroundColor: '#007AFF',
  },
  amPmText: {
    fontSize: 16,
    color: '#000',
  },
  selectedAmPmText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default CustomDateTimePicker;
