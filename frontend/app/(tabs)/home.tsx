import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

const BG = '#0A0A0A';
const CARD = '#1E1E1E';
const TEXT = '#FFFFFF';
const MUTED = '#EAEAEA99';
const GOLD = '#FFD700';

export default function HomeScreen() {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#0f172a", "#1e293b", "#0b1021"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(400)} style={styles.hero}>
          <LinearGradient colors={["#6366F1", "#8B5CF6"]} style={styles.heroGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View style={styles.heroTop}>
              <Text style={styles.welcome}>Welcome back</Text>
              <Ionicons name="sparkles" size={20} color={GOLD} />
            </View>
            <Text style={styles.headline}>Unified Calendar</Text>
            <Text style={styles.subline}>Plan smarter. Everything in one place.</Text>
            <TouchableOpacity style={styles.primaryCta} activeOpacity={0.85} onPress={() => router.push('/create-event')}>
              <BlurView tint="light" intensity={40} style={styles.primaryCtaBlur}>
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.primaryCtaText}>Create Event</Text>
              </BlurView>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>

        <Animated.View entering={FadeIn.duration(500).delay(100)} style={styles.quickRow}>
          <TouchableOpacity style={styles.quick} onPress={() => router.push('/(tabs)/calendar')} activeOpacity={0.85}>
            <BlurView intensity={60} tint="light" style={styles.quickBlur}>
              <Ionicons name="calendar" size={18} color={GOLD} />
              <Text style={styles.quickText}>Calendar</Text>
            </BlurView>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quick} onPress={() => router.push('/(tabs)/events')} activeOpacity={0.85}>
            <BlurView intensity={60} tint="light" style={styles.quickBlur}>
              <Ionicons name="list" size={18} color={GOLD} />
              <Text style={styles.quickText}>Events</Text>
            </BlurView>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quick} onPress={() => router.push('/(tabs)/profile')} activeOpacity={0.85}>
            <BlurView intensity={60} tint="light" style={styles.quickBlur}>
              <Ionicons name="person" size={18} color={GOLD} />
              <Text style={styles.quickText}>Profile</Text>
            </BlurView>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(500).delay(150)} style={styles.grid}>
          <TouchableOpacity style={styles.card} onPress={() => router.push('/(tabs)/calendar')} activeOpacity={0.9}>
            <LinearGradient colors={["#0ea5e9", "#22d3ee"]} style={styles.cardGrad}>
              <Ionicons name="today" size={22} color="#fff" />
              <Text style={styles.cardTitle}>This month</Text>
              <Text style={styles.cardText}>See what’s ahead</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={styles.card} onPress={() => router.push('/(tabs)/events')} activeOpacity={0.9}>
            <LinearGradient colors={["#f59e0b", "#f97316"]} style={styles.cardGrad}>
              <Ionicons name="flash" size={22} color="#fff" />
              <Text style={styles.cardTitle}>Upcoming</Text>
              <Text style={styles.cardText}>Next events</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cardWide} onPress={() => router.push('/create-event')} activeOpacity={0.9}>
            <LinearGradient colors={["#10b981", "#34d399"]} style={styles.cardGradWide}>
              <Ionicons name="add-circle" size={22} color="#fff" />
              <View style={{ marginLeft: 10 }}>
                <Text style={styles.cardTitle}>Quick Create</Text>
                <Text style={styles.cardText}>Add an event in seconds</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  content: { padding: 16, paddingBottom: 32 },
  hero: { borderRadius: 20, overflow: 'hidden' },
  heroGradient: { padding: 18, borderRadius: 20 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  welcome: { color: '#EDE9FE', fontSize: 14, fontWeight: '700', opacity: 0.95 },
  headline: { color: TEXT, fontSize: 26, fontWeight: '900', marginTop: 8, letterSpacing: -0.5 },
  subline: { color: '#EEF2FF', opacity: 0.9, marginTop: 4 },
  primaryCta: { marginTop: 14, width: 160, borderRadius: 14, overflow: 'hidden' },
  primaryCtaBlur: { paddingVertical: 10, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14 },
  primaryCtaText: { color: '#fff', fontWeight: '800' },

  quickRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  quick: { flex: 1, height: 56, borderRadius: 16, overflow: 'hidden' },
  quickBlur: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  quickText: { color: TEXT, fontWeight: '700', marginTop: 4 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 16 },
  card: { width: '48%', borderRadius: 18, overflow: 'hidden' },
  cardGrad: { padding: 16, gap: 6 },
  cardWide: { width: '100%', borderRadius: 18, overflow: 'hidden' },
  cardGradWide: { padding: 16, flexDirection: 'row', alignItems: 'center' },
  cardTitle: { color: TEXT, fontWeight: '800' },
  cardText: { color: MUTED, fontSize: 12 },
});
