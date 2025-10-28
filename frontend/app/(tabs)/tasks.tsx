import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const GOLD = '#FFD700';
const BG = '#0A0A0A';
const TEXT = '#FFFFFF';
const MUTED = '#EAEAEA99';

export default function TasksScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tasks</Text>
      <Text style={styles.muted}>No tasks yet</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG, padding: 16 },
  title: { color: TEXT, fontSize: 22, fontWeight: '800', marginBottom: 6 },
  muted: { color: MUTED }
});


