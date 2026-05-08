import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

// ── Cinema card ───────────────────────────────────────────────────────────────
function CinemaCard({ item, index, onPress }) {
  const gradient = COLORS.gradientCinema[index % COLORS.gradientCinema.length];
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.cardWrap}>
      <LinearGradient colors={gradient} style={styles.card} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        {/* Background icon watermark */}
        <Ionicons
          name="film"
          size={100}
          color="rgba(255,255,255,0.08)"
          style={styles.cardWatermark}
        />

        <View style={styles.cardTop}>
          <View style={styles.cinemaIconWrap}>
            <Ionicons name="business" size={22} color={COLORS.white} />
          </View>
          <View style={styles.locationWrap}>
            <Ionicons name="location" size={13} color="rgba(255,255,255,0.7)" />
            <Text style={styles.locationText} numberOfLines={1}>{item.location}</Text>
          </View>
        </View>

        <Text style={styles.cinemaName}>{item.name}</Text>
        {item.description ? (
          <Text style={styles.cinemaDesc} numberOfLines={2}>{item.description}</Text>
        ) : null}

        <TouchableOpacity style={styles.cardBtn} onPress={onPress} activeOpacity={0.8}>
          <Text style={styles.cardBtnText}>Δείτε Ταινίες</Text>
          <Ionicons name="arrow-forward" size={14} color={COLORS.white} />
        </TouchableOpacity>
      </LinearGradient>
    </TouchableOpacity>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function DashboardScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [theatres,   setTheatres]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');

  const fetchTheatres = useCallback(async () => {
    try {
      const { data } = await api.get('/theatres');
      setTheatres(data);
      setError('');
    } catch {
      setError('Αδυναμία σύνδεσης με τον server.');
    }
  }, []);

  useEffect(() => {
    fetchTheatres().finally(() => setLoading(false));
  }, [fetchTheatres]);

  const firstName = user?.name?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'Επισκέπτη';

  function confirmLogout() {
    Alert.alert('Αποσύνδεση', 'Θέλετε σίγουρα να αποσυνδεθείτε;', [
      { text: 'Άκυρο',       style: 'cancel' },
      { text: 'Αποσύνδεση', style: 'destructive', onPress: logout },
    ]);
  }

  return (
    <View style={styles.root}>
      {/* Hero header */}
      <LinearGradient
        colors={['#0D1B3E', '#0A0D1A']}
        style={styles.hero}
      >
        <SafeAreaView edges={['top']}>
          <View style={styles.heroInner}>
            <View>
              <Text style={styles.heroGreeting}>Καλωσήρθες, {firstName}!</Text>
              <Text style={styles.heroSub}>Κάνε κράτηση για την αγαπημένη σου παράσταση</Text>
            </View>
            <TouchableOpacity onPress={confirmLogout} style={styles.logoutBtn}>
              <Ionicons name="log-out-outline" size={22} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Search hint */}
          <TouchableOpacity
            style={styles.searchBar}
            onPress={() => navigation.navigate('Movies')}
            activeOpacity={0.8}
          >
            <Ionicons name="search" size={18} color={COLORS.placeholder} />
            <Text style={styles.searchText}>Αναζήτηση ταινίας...</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </LinearGradient>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>
          <Ionicons name="business" size={16} color={COLORS.primary} />
          {'  '}Κινηματογράφοι
        </Text>

        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              onPress={() => { setLoading(true); fetchTheatres().finally(() => setLoading(false)); }}
              style={styles.retryBtn}
            >
              <Text style={styles.retryText}>Δοκιμή ξανά</Text>
            </TouchableOpacity>
          </View>
        ) : theatres.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="business-outline" size={48} color={COLORS.textDim} />
            <Text style={styles.emptyText}>Δεν βρέθηκαν κινηματογράφοι</Text>
          </View>
        ) : (
          theatres.map((item, index) => (
            <CinemaCard
              key={item.theatre_id}
              item={item}
              index={index}
              onPress={() =>
                navigation.navigate('Movies', {
                  theatreId:   item.theatre_id,
                  theatreName: item.name,
                })
              }
            />
          ))
        )}

        {/* Bottom spacer for tab bar */}
        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: COLORS.background },
  content: { flex: 1 },

  hero: { paddingBottom: 20 },
  heroInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  heroGreeting: { fontSize: 22, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  heroSub:      { fontSize: 13, color: COLORS.textSecondary, maxWidth: 240 },
  logoutBtn:    { padding: 8 },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    marginHorizontal: 20,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchText: { color: COLORS.placeholder, fontSize: 14 },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 16,
  },

  cardWrap: { marginHorizontal: 20, marginBottom: 16 },
  card: {
    borderRadius: 18,
    padding: 20,
    overflow: 'hidden',
    minHeight: 160,
    justifyContent: 'space-between',
  },
  cardWatermark: { position: 'absolute', right: -10, top: -10 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cinemaIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  locationWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },

  cinemaName: { fontSize: 22, fontWeight: '800', color: COLORS.white, marginTop: 12 },
  cinemaDesc: { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 4, lineHeight: 18 },

  cardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  cardBtnText: { color: COLORS.white, fontSize: 13, fontWeight: '700' },

  errorBox:  { alignItems: 'center', padding: 32 },
  errorText: { color: COLORS.error, fontSize: 14, textAlign: 'center', marginBottom: 16 },
  retryBtn:  { backgroundColor: COLORS.primary, borderRadius: 8, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: COLORS.white, fontWeight: '600' },
  emptyBox:  { alignItems: 'center', paddingTop: 48, gap: 12 },
  emptyText: { color: COLORS.textSecondary, fontSize: 15 },
});
