import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput,
  TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../theme/colors';
import api from '../services/api';

function ShowCard({ item, onPress }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.cardAccent} />
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>⏱  {item.duration} λεπτά</Text>
          {item.age_rating ? (
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingText}>{item.age_rating}</Text>
            </View>
          ) : null}
        </View>
        {item.description ? (
          <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
        ) : null}
      </View>
      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  );
}

export default function ShowsScreen({ route, navigation }) {
  const { theatreId, theatreName } = route.params;

  const [shows,    setShows]    = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search,   setSearch]   = useState('');
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  const fetchShows = useCallback(async () => {
    try {
      const { data } = await api.get(`/shows?theatreId=${theatreId}`);
      setShows(data);
      setFiltered(data);
      setError('');
    } catch {
      setError('Αδυναμία φόρτωσης παραστάσεων. Ελέγξτε τη σύνδεσή σας.');
    }
  }, [theatreId]);

  useEffect(() => {
    fetchShows().finally(() => setLoading(false));
  }, [fetchShows]);

  function handleSearch(text) {
    setSearch(text);
    const q = text.toLowerCase().trim();
    setFiltered(
      q ? shows.filter((s) => s.title.toLowerCase().includes(q)) : shows
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Παραστάσεις</Text>
          <Text style={styles.headerSub} numberOfLines={1}>{theatreName}</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchStrip}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍  Αναζήτηση παράστασης..."
          placeholderTextColor={COLORS.placeholder}
          value={search}
          onChangeText={handleSearch}
          clearButtonMode="while-editing"
        />
      </View>

      {/* Content */}
      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
      ) : error ? (
        <View style={styles.centerBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => { setLoading(true); fetchShows().finally(() => setLoading(false)); }}
          >
            <Text style={styles.retryText}>Δοκιμή ξανά</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.show_id)}
          renderItem={({ item }) => (
            <ShowCard
              item={item}
              onPress={() => navigation.navigate('ShowDetail', {
                showId:    item.show_id,
                showTitle: item.title,
              })}
            />
          )}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListEmptyComponent={
            <View style={styles.centerBox}>
              <Text style={styles.emptyText}>
                {search ? 'Δεν βρέθηκαν παραστάσεις.' : 'Δεν υπάρχουν διαθέσιμες παραστάσεις.'}
              </Text>
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
  headerText:  { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: COLORS.white },
  headerSub:   { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 2 },

  searchStrip: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  searchInput: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: COLORS.text,
  },

  loader:    { flex: 1, marginTop: 48 },
  centerBox: { flex: 1, alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  errorText: { color: COLORS.error, textAlign: 'center', fontSize: 14, marginBottom: 16 },
  emptyText: { color: COLORS.textSecondary, textAlign: 'center', fontSize: 15 },
  retryBtn:  { backgroundColor: COLORS.primary, borderRadius: 8, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: COLORS.white, fontWeight: '600' },

  list: { padding: 16, paddingBottom: 32 },

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
  cardAccent: { width: 4, alignSelf: 'stretch', backgroundColor: COLORS.accent },
  cardBody:   { flex: 1, padding: 14 },
  cardTitle:  { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  metaRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  metaText:   { fontSize: 13, color: COLORS.textSecondary },
  ratingBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  ratingText: { color: COLORS.white, fontSize: 11, fontWeight: '700' },
  cardDesc:   { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
  arrow:      { fontSize: 26, color: COLORS.border, paddingRight: 14 },
});
