import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput,
  TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

// ── Theatre card component ─────────────────────────────────────────────────
function TheatreCard({ item, onPress }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.cardAccent} />
      <View style={styles.cardBody}>
        <Text style={styles.cardName}>{item.name}</Text>
        <Text style={styles.cardLocation}>📍  {item.location}</Text>
        {item.description ? (
          <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
        ) : null}
      </View>
      <Text style={styles.cardArrow}>›</Text>
    </TouchableOpacity>
  );
}

// ── Screen ─────────────────────────────────────────────────────────────────
export default function TheatresScreen({ navigation }) {
  const { user, logout } = useAuth();

  const [theatres,   setTheatres]   = useState([]);
  const [filtered,   setFiltered]   = useState([]);
  const [search,     setSearch]     = useState('');
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState('');

  // ── Data fetch ────────────────────────────────────────────────────
  const fetchTheatres = useCallback(async () => {
    try {
      const { data } = await api.get('/theatres');
      setTheatres(data);
      setFiltered(data);
      setError('');
    } catch {
      setError('Αδυναμία φόρτωσης. Ελέγξτε τη σύνδεσή σας.');
    }
  }, []);

  useEffect(() => {
    fetchTheatres().finally(() => setLoading(false));
  }, [fetchTheatres]);

  // ── Local search filter ───────────────────────────────────────────
  function handleSearch(text) {
    setSearch(text);
    const q = text.toLowerCase().trim();
    setFiltered(
      q
        ? theatres.filter(
            (t) =>
              t.name.toLowerCase().includes(q) ||
              t.location.toLowerCase().includes(q)
          )
        : theatres
    );
  }

  // ── Pull-to-refresh ───────────────────────────────────────────────
  async function handleRefresh() {
    setRefreshing(true);
    setSearch('');
    await fetchTheatres();
    setRefreshing(false);
  }

  // ── Logout confirmation ───────────────────────────────────────────
  function confirmLogout() {
    Alert.alert(
      'Αποσύνδεση',
      'Είστε σίγουροι ότι θέλετε να αποσυνδεθείτε;',
      [
        { text: 'Άκυρο',        style: 'cancel' },
        { text: 'Αποσύνδεση',   style: 'destructive', onPress: logout },
      ]
    );
  }

  // ── First name or email prefix for the greeting ───────────────────
  const firstName = user?.name?.split(' ')[0] ?? user?.email?.split('@')[0] ?? '';

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Θέατρα</Text>
          <Text style={styles.headerSub}>Γεια σου, {firstName} 👋</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('Profile')}
          >
            <Text style={styles.actionBtnText}>Κρατήσεις</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutBtn} onPress={confirmLogout}>
            <Text style={styles.logoutText}>Έξοδος</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search bar (inside the navy strip for visual continuity) */}
      <View style={styles.searchStrip}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍   Αναζήτηση θεάτρου ή τοποθεσίας..."
          placeholderTextColor={COLORS.placeholder}
          value={search}
          onChangeText={handleSearch}
          clearButtonMode="while-editing"   // iOS
          returnKeyType="search"
        />
      </View>

      {/* Content area */}
      {loading ? (
        <ActivityIndicator
          size="large"
          color={COLORS.primary}
          style={styles.loader}
        />
      ) : error ? (
        <View style={styles.centerBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => { setLoading(true); fetchTheatres().finally(() => setLoading(false)); }}
          >
            <Text style={styles.retryText}>Δοκιμή ξανά</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.theatre_id)}
          renderItem={({ item }) => (
            <TheatreCard
              item={item}
              onPress={() =>
                navigation.navigate('Shows', {
                  theatreId:   item.theatre_id,
                  theatreName: item.name,
                })
              }
            />
          )}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListEmptyComponent={
            <View style={styles.centerBox}>
              <Text style={styles.emptyIcon}>🎭</Text>
              <Text style={styles.emptyText}>
                {search
                  ? 'Δεν βρέθηκαν αποτελέσματα για αυτήν την αναζήτηση.'
                  : 'Δεν υπάρχουν διαθέσιμα θέατρα αυτή τη στιγμή.'}
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },

  /* ─ Header ─ */
  header: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerLeft:    { flex: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle:   { fontSize: 22, fontWeight: '700', color: COLORS.white },
  headerSub:     { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  actionBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  actionBtnText: { color: '#1A1A1A', fontSize: 13, fontWeight: '700' },
  logoutBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  logoutText: { color: COLORS.white, fontSize: 13, fontWeight: '600' },

  /* ─ Search ─ */
  searchStrip: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  searchInput: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: COLORS.text,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },

  /* ─ States ─ */
  loader:    { flex: 1, marginTop: 48 },
  centerBox: { flex: 1, alignItems: 'center', paddingTop: 64, paddingHorizontal: 32 },
  errorText: { color: COLORS.error, fontSize: 14, textAlign: 'center', marginBottom: 18 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { color: COLORS.textSecondary, fontSize: 15, textAlign: 'center', lineHeight: 22 },
  retryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 28,
    paddingVertical: 11,
  },
  retryText: { color: COLORS.white, fontWeight: '600', fontSize: 14 },

  /* ─ List ─ */
  list: { padding: 16, paddingBottom: 32 },

  /* ─ Card ─ */
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  cardAccent: {
    width: 4,
    alignSelf: 'stretch',
    backgroundColor: COLORS.accent,
  },
  cardBody: {
    flex: 1,
    padding: 16,
  },
  cardName:     { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  cardLocation: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 6 },
  cardDesc:     { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
  cardArrow:    { fontSize: 26, color: COLORS.border, paddingRight: 14 },
});
