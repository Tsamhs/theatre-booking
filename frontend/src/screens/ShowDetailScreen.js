import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../theme/colors';
import api from '../services/api';

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('el-GR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}
function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' });
}

// ── Showtime card ─────────────────────────────────────────────────────────────
function ShowtimeCard({ showtime, show, onPress }) {
  const soldOut = showtime.available_seats === 0;

  return (
    <TouchableOpacity
      style={[styles.stCard, soldOut && styles.stCardDisabled]}
      onPress={soldOut ? null : onPress}
      activeOpacity={soldOut ? 1 : 0.75}
    >
      {/* Date / time / hall */}
      <View style={styles.stTop}>
        <View style={styles.stInfo}>
          <Text style={styles.stDate}>{fmtDate(showtime.start_datetime)}</Text>
          <Text style={styles.stTime}>
            🕐  {fmtTime(showtime.start_datetime)} — {fmtTime(showtime.end_datetime)}
          </Text>
          {showtime.hall ? <Text style={styles.stHall}>🏛  {showtime.hall}</Text> : null}
        </View>

        {/* Available seats pill */}
        <View style={[styles.seatsPill, soldOut && styles.seatsPillSoldOut]}>
          {soldOut ? (
            <Text style={styles.soldOutText}>SOLD{'\n'}OUT</Text>
          ) : (
            <>
              <Text style={styles.seatsNum}>{showtime.available_seats}</Text>
              <Text style={styles.seatsLbl}>θέσεις</Text>
            </>
          )}
        </View>
      </View>

      {/* Ticket categories */}
      {showtime.ticketCategories.length > 0 && (
        <View style={styles.catsRow}>
          {showtime.ticketCategories.map((c) => (
            <View key={c.category_id} style={styles.catChip}>
              <Text style={styles.catName}>{c.name}</Text>
              <Text style={styles.catPrice}>{parseFloat(c.price).toFixed(2)} €</Text>
            </View>
          ))}
        </View>
      )}

      {!soldOut && (
        <View style={styles.stCta}>
          <Text style={styles.stCtaText}>Επιλογή και Κράτηση  →</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function ShowDetailScreen({ route, navigation }) {
  const { showId } = route.params;

  const [show,    setShow]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const fetchShow = useCallback(async () => {
    try {
      const { data } = await api.get(`/shows/${showId}`);
      setShow(data);
      setError('');
    } catch {
      setError('Αδυναμία φόρτωσης παράστασης.');
    }
  }, [showId]);

  useEffect(() => {
    fetchShow().finally(() => setLoading(false));
  }, [fetchShow]);

  const header = (title) => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Text style={styles.backText}>‹</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        {header('Παράσταση')}
        <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
      </SafeAreaView>
    );
  }

  if (error || !show) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        {header('Παράσταση')}
        <View style={styles.centerBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => { setLoading(true); fetchShow().finally(() => setLoading(false)); }}
          >
            <Text style={styles.retryText}>Δοκιμή ξανά</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {header(show.title)}

      <ScrollView contentContainerStyle={styles.container}>
        {/* Show info card */}
        <View style={styles.infoCard}>
          <Text style={styles.showTitle}>{show.title}</Text>
          <Text style={styles.showMeta}>🏛  {show.theatre_name}  ·  📍 {show.location}</Text>

          <View style={styles.pillsRow}>
            <View style={styles.pill}>
              <Text style={styles.pillLabel}>Διάρκεια</Text>
              <Text style={styles.pillValue}>{show.duration} λεπτά</Text>
            </View>
            {show.age_rating && (
              <View style={[styles.pill, { backgroundColor: '#FFF3E0' }]}>
                <Text style={styles.pillLabel}>Κατηγορία</Text>
                <Text style={styles.pillValue}>{show.age_rating}</Text>
              </View>
            )}
          </View>

          {show.description ? (
            <Text style={styles.showDesc}>{show.description}</Text>
          ) : null}
        </View>

        {/* Showtimes section */}
        <Text style={styles.sectionTitle}>
          Διαθέσιμες Παραστάσεις ({show.showtimes.length})
        </Text>

        {show.showtimes.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>
              Δεν υπάρχουν προγραμματισμένες παραστάσεις αυτή τη στιγμή.
            </Text>
          </View>
        ) : (
          show.showtimes.map((st) => (
            <ShowtimeCard
              key={st.showtime_id}
              showtime={st}
              show={show}
              onPress={() =>
                navigation.navigate('Booking', { showtime: st, show })
              }
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },

  header: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn:     { padding: 4, marginRight: 8 },
  backText:    { fontSize: 32, color: COLORS.white, lineHeight: 36 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: COLORS.white },

  loader:    { flex: 1, marginTop: 48 },
  centerBox: { flex: 1, alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  errorText: { color: COLORS.error, textAlign: 'center', fontSize: 14, marginBottom: 16 },
  retryBtn:  { backgroundColor: COLORS.primary, borderRadius: 8, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: COLORS.white, fontWeight: '600' },

  container:    { padding: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 12, marginLeft: 2 },
  emptyBox:     { alignItems: 'center', paddingVertical: 32 },
  emptyText:    { color: COLORS.textSecondary, fontSize: 15, textAlign: 'center' },

  /* ─ Show info card ─ */
  infoCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  showTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text, marginBottom: 6 },
  showMeta:  { fontSize: 13, color: COLORS.textSecondary, marginBottom: 14 },
  pillsRow:  { flexDirection: 'row', gap: 10, marginBottom: 14 },
  pill: {
    backgroundColor: '#EEF2FF',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
  },
  pillLabel: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },
  pillValue: { fontSize: 14, color: COLORS.primary, fontWeight: '700', marginTop: 2 },
  showDesc:  { fontSize: 14, color: COLORS.textSecondary, lineHeight: 21 },

  /* ─ Showtime card ─ */
  stCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  stCardDisabled: { opacity: 0.5 },

  stTop:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  stInfo: { flex: 1, marginRight: 12 },
  stDate: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 3 },
  stTime: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 3 },
  stHall: { fontSize: 13, color: COLORS.textSecondary },

  seatsPill: {
    backgroundColor: '#E8F5E9',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    minWidth: 62,
  },
  seatsPillSoldOut: { backgroundColor: '#FFEBEE' },
  seatsNum:     { fontSize: 20, fontWeight: '800', color: COLORS.success },
  seatsLbl:     { fontSize: 10, color: COLORS.success, fontWeight: '600' },
  soldOutText:  { fontSize: 11, fontWeight: '800', color: COLORS.error, textAlign: 'center', lineHeight: 14 },

  catsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  catChip: {
    backgroundColor: '#F0F4FF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  catName:  { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  catPrice: { fontSize: 13, color: COLORS.primary, fontWeight: '800' },

  stCta:     { marginTop: 12, alignItems: 'flex-end' },
  stCtaText: { color: COLORS.primary, fontWeight: '700', fontSize: 14 },
});
