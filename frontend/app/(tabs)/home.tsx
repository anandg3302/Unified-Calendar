import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const BG = '#0A0A0A';
const CARD = '#1E1E1E';
const TEXT = '#FFFFFF';
const MUTED = '#EAEAEA99';
const GOLD = '#FFD700';

export default function HomeScreen() {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Home</Text>
        <Text style={styles.subtitle}>Welcome back</Text>
      </View>

      <View style={styles.grid}>
        <TouchableOpacity style={styles.card} onPress={() => router.push('/(tabs)/calendar')}>
          <Ionicons name="calendar" size={22} color={GOLD} />
          <Text style={styles.cardTitle}>Calendar</Text>
          <Text style={styles.cardText}>View your events</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.card} onPress={() => router.push('/(tabs)/events')}>
          <Ionicons name="list" size={22} color={GOLD} />
          <Text style={styles.cardTitle}>Events</Text>
          <Text style={styles.cardText}>Browse all events</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.card} onPress={() => router.push('/create-event')}>
          <Ionicons name="add" size={22} color={GOLD} />
          <Text style={styles.cardTitle}>Create</Text>
          <Text style={styles.cardText}>Add a new event</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.card} onPress={() => router.push('/(tabs)/profile')}>
          <Ionicons name="person" size={22} color={GOLD} />
          <Text style={styles.cardTitle}>Profile</Text>
          <Text style={styles.cardText}>Manage your account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG, padding: 16 },
  header: { paddingVertical: 8 },
  title: { color: TEXT, fontSize: 22, fontWeight: '800' },
  subtitle: { color: MUTED, marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 },
  card: {
    width: '48%',
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 14,
    gap: 6,
  },
  cardTitle: { color: TEXT, fontWeight: '700' },
  cardText: { color: MUTED, fontSize: 12 },
});
