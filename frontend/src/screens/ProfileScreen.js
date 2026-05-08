import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator,
  Alert, RefreshControl, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('el-GR', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}
function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' });
}

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status, isPast }) {
  const cfg = status === 'cancelled'
    ? { label: 'Ακυρώθηκε',     bg: '#FFEBEE', color: '#C62828' }
    : isPast
    ? { label: 'Ολοκληρώθηκε', bg: '#F3F3F3', color: '#757575' }
    : { label: 'Επιβεβαιωμένη', bg: '#E8F5E9', color: '#2E7D32' };

  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

// ── Reservation card ──────────────────────────────────────────────────────────
function ReservationCard({ item, onCancel }) {
  const isPast    = new Date(item.start_datetime) <= new Date();
  const canCancel = item.status === 'confirmed' && !isPast;

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.cardTopLeft}>
          <Text style={styles.showTitle} numberOfLines={1}>{item.show_title}</Text>
          <Text style={styles.theatreName}>🏛  {item.theatre_name}</Text>
        </View>
        <StatusBadge status={item.status} isPast={isPast} />
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.metaText}>
          📅  {fmtDate(item.start_datetime)}  ·  🕐  {fmtTime(item.start_datetime)}
        </Text>
        {item.hall ? <Text style={styles.metaText}>🪑  {item.hall}</Text> : null}
        <Text style={styles.metaText}>
          🎫  {item.num_tickets}x {item.category_name ?? 'Εισιτήριο'}
          {'  ·  '}{parseFloat(item.total_price).toFixed(2)} €
        </Text>
        <Text style={styles.codeText}>Κωδικός: #{item.reservation_id}</Text>
      </View>

      {canCancel && (
        <TouchableOpacity style={styles.cancelBtn} onPress={() => onCancel(item)}>
          <Text style={styles.cancelBtnText}>Ακύρωση κράτησης</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function ProfileScreen({ navigation }) {
  const { logout } = useAuth();

  const [reservations, setReservations] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [error,        setError]        = useState('');

  const fetchReservations = useCallback(async () => {
    try {
      const { data } = await api.get('/user/reservations');
      setReservations(data);
      setError('');
    } catch {
      setError('Αδυναμία φόρτωσης κρατήσεων.');
    }
  }, []);

  // Reload every time this screen is focused (e.g. after a new booking)
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchReservations().finally(() => setLoading(false));
    }, [fetchReservations])
  );

  async function handleRefresh() {
    setRefreshing(true);
    await fetchReservations();
    setRefreshing(false);
  }

  function confirmCancel(reservation) {
    if (Platform.OS === 'web') {
      if (window.confirm(`Θέλετε σίγουρα να ακυρώσετε την κράτηση για "${reservation.show_title}";`)) {
        doCancel(reservation.reservation_id);
      }
      return;
    }
    Alert.alert(
      'Ακύρωση Κράτησης',
      `Θέλετε σίγουρα να ακυρώσετε την κράτηση για "${reservation.show_title}";`,
      [
        { text: 'Πίσω',      style: 'cancel' },
        { text: 'Ακύρωση',  style: 'destructive',
          onPress: () => doCancel(reservation.reservation_id) },
      ]
    );
  }

  async function doCancel(id) {
    try {
      await api.delete(`/reservations/${id}`);
      // Refresh list — DB has already restored the seat counts
      await fetchReservations();
    } catch (err) {
      Alert.alert('Σφάλμα', err.response?.data?.message ?? 'Αποτυχία ακύρωσης.');
    }
  }

  function confirmLogout() {
    if (Platform.OS === 'web') {
      // Alert.alert χρησιμοποιεί window.confirm στο browser — δεν είναι αξιόπιστο
      // Καλούμε logout άμεσα στο web
      logout();
    } else {
      Alert.alert('Αποσύνδεση', 'Θέλετε σίγουρα να αποσυνδεθείτε;', [
        { text: 'Άκυρο',       style: 'cancel' },
        { text: 'Αποσύνδεση', style: 'destructive', onPress: logout },
      ]);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Οι Κρατήσεις μου</Text>
        <TouchableOpacity style={styles.logoutBtn} onPress={confirmLogout}>
          <Text style={styles.logoutText}>Έξοδος</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
      ) : error ? (
        <View style={styles.centerBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => { setLoading(true); fetchReservations().finally(() => setLoading(false)); }}
          >
            <Text style={styles.retryText}>Δοκιμή ξανά</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={reservations}
          keyExtractor={(item) => String(item.reservation_id)}
          renderItem={({ item }) => (
            <ReservationCard item={item} onCancel={confirmCancel} />
          )}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[COLORS.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.centerBox}>
              <Text style={styles.emptyIcon}>🎟️</Text>
              <Text style={styles.emptyTitle}>Δεν έχετε κρατήσεις ακόμα</Text>
              <Text style={styles.emptyText}>Κάντε την πρώτη σας κράτηση!</Text>
              <TouchableOpacity
                style={styles.browseBtn}
                onPress={() => navigation.navigate('Home')}
              >
                <Text style={styles.browseBtnText}>Προβολή Θεάτρων</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
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
  logoutBtn:   {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  logoutText:  { color: COLORS.white, fontSize: 13, fontWeight: '600' },

  loader:    { flex: 1, marginTop: 48 },
  centerBox: { flex: 1, alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  errorText: { color: COLORS.error, textAlign: 'center', fontSize: 14, marginBottom: 16 },
  retryBtn:  { backgroundColor: COLORS.primary, borderRadius: 8, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: COLORS.white, fontWeight: '600' },
  emptyIcon:  { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  emptyText:  { color: COLORS.textSecondary, fontSize: 14, textAlign: 'center', marginBottom: 20 },
  browseBtn:  { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 },
  browseBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 14 },

  list: { padding: 16, paddingBottom: 40 },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    overflow: 'hidden',
    boxShadow: '0 1px 8px rgba(0,0,0,0.18)',
    elevation: 2,
  },
  cardTop:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 16, paddingBottom: 8 },
  cardTopLeft: { flex: 1, marginRight: 12 },
  showTitle:   { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 3 },
  theatreName: { fontSize: 13, color: COLORS.textSecondary },

  badge:     { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  badgeText: { fontSize: 12, fontWeight: '700' },

  cardBody:  { paddingHorizontal: 16, paddingBottom: 12 },
  metaText:  { fontSize: 13, color: COLORS.textSecondary, marginBottom: 3 },
  codeText:  { fontSize: 12, color: COLORS.placeholder, marginTop: 6 },

  cancelBtn:     { borderTopWidth: 1, borderTopColor: COLORS.border, paddingVertical: 12, alignItems: 'center' },
  cancelBtnText: { color: COLORS.error, fontSize: 14, fontWeight: '600' },
});
