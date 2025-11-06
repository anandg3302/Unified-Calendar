import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const BG = '#0A0A0A';
const CARD = '#1E1E1E';
const TEXT = '#FFFFFF';
const MUTED = '#EAEAEA99';

export default function TasksScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Tasks</Text>
        <Text style={styles.subtitle}>Coming soon</Text>
      </View>

      <View style={styles.card}> 
        <Text style={styles.cardTitle}>No tasks yet</Text>
        <Text style={styles.cardText}>This section will show your tasks.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG, padding: 16 },
  header: { paddingVertical: 8 },
  title: { color: TEXT, fontSize: 22, fontWeight: '800' },
  subtitle: { color: MUTED, marginTop: 4 },
  card: {
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 16,
    marginTop: 12,
  },
  cardTitle: { color: TEXT, fontWeight: '700', marginBottom: 6 },
  cardText: { color: MUTED, fontSize: 13 },
});
