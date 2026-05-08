import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, Dimensions, ActivityIndicator, Platform, StatusBar, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';
import { COLORS } from '../theme/colors';

const { width: W } = Dimensions.get('window');
const GAP     = 12;
const PADDING = 16;
const CARD_W  = (W - PADDING * 2 - GAP) / 2;

function uniqueMovies(shows) {
  const seen = new Map();
  shows.forEach((show, i) => {
    if (!seen.has(show.title)) seen.set(show.title, { ...show, _gi: i });
  });
  return Array.from(seen.values());
}

function gradientForIndex(i) {
  return COLORS.gradientCinema[i % COLORS.gradientCinema.length];
}

function GridCard({ movie, onPress }) {
  const grad = gradientForIndex(movie._gi);
  const posterH = Math.round(CARD_W * 1.4);
  return (
    <TouchableOpacity style={[s.card, { width: CARD_W }]} onPress={onPress} activeOpacity={0.82}>
      <View style={[s.poster, { height: posterH }]}>
        {movie.poster_url
          ? <Image source={{ uri: movie.poster_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          : <LinearGradient colors={grad} style={StyleSheet.absoluteFill} />
        }
        <Ionicons name="film" size={40} color="rgba(255,255,255,0.06)" style={s.posterIcon} />
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.82)']} style={StyleSheet.absoluteFill} />
        <View style={s.ratingBadge}>
          <Text style={s.ratingText}>{movie.age_rating || 'PG'}</Text>
        </View>
      </View>
      <View style={s.cardInfo}>
        <Text style={s.cardTitle} numberOfLines={2}>{movie.title}</Text>
        <View style={s.cardMeta}>
          {!!movie.duration && (
            <>
              <Ionicons name="time-outline" size={11} color={COLORS.textDim} />
              <Text style={s.cardDur}>{movie.duration}'</Text>
            </>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function MoviesScreen({ navigation }) {
  const [shows,   setShows]   = useState([]);
  const [query,   setQuery]   = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/shows');
      setShows(uniqueMovies(Array.isArray(data) ? data : []));
    } catch (_) {}
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = shows.filter(m =>
    m.title.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <SafeAreaView edges={['top']} style={{ backgroundColor: COLORS.background }}>
        <View style={s.header}>
          <Text style={s.headerTitle}>Ταινίες</Text>
          <Text style={s.headerSub}>{shows.length} ταινίες σε προβολή</Text>
        </View>
        <View style={s.searchWrap}>
          <Ionicons name="search" size={17} color={COLORS.textDim} />
          <TextInput
            style={[s.searchInput, Platform.OS === 'web' && { outlineStyle: 'none' }]}
            placeholder="Αναζήτηση ταινίας..."
            placeholderTextColor={COLORS.textDim}
            value={query}
            onChangeText={setQuery}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={17} color={COLORS.textDim} />
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>

      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          numColumns={2}
          keyExtractor={(_, i) => `m${i}`}
          contentContainerStyle={s.grid}
          columnWrapperStyle={{ gap: GAP }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <GridCard
              movie={item}
              onPress={() => navigation.navigate('MovieDetail', {
                movieTitle: item.title,
                showId:     item.show_id,
              })}
            />
          )}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="film-outline" size={54} color={COLORS.textDim} />
              <Text style={s.emptyTitle}>Δεν βρέθηκαν ταινίες</Text>
              {query.length > 0 && (
                <TouchableOpacity onPress={() => setQuery('')} style={{ marginTop: 4 }}>
                  <Text style={s.emptyLink}>Εκκαθάριση αναζήτησης</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: COLORS.background },
  centered:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header:      { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 6 },
  headerTitle: { color: '#fff', fontSize: 26, fontWeight: '800' },
  headerSub:   { color: COLORS.textDim, fontSize: 12, marginTop: 2 },
  searchWrap:  { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 14, backgroundColor: COLORS.surfaceAlt, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, gap: 10, borderWidth: 1, borderColor: COLORS.border },
  searchInput: { flex: 1, color: '#fff', fontSize: 14 },
  grid:        { paddingHorizontal: PADDING, paddingTop: 4, paddingBottom: 100 },
  card:        { marginBottom: GAP, borderRadius: 14, overflow: 'hidden', backgroundColor: COLORS.card },
  poster:      { overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  posterIcon:  { position: 'absolute' },
  ratingBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3 },
  ratingText:  { color: '#fff', fontSize: 10, fontWeight: '700' },
  cardInfo:    { padding: 10 },
  cardTitle:   { color: '#fff', fontSize: 13, fontWeight: '700', lineHeight: 18, marginBottom: 5 },
  cardMeta:    { flexDirection: 'row', alignItems: 'center', gap: 5 },
  cardDur:     { color: COLORS.textDim, fontSize: 11 },
  empty:       { alignItems: 'center', marginTop: 80, gap: 12 },
  emptyTitle:  { color: COLORS.textSecondary, fontSize: 16 },
  emptyLink:   { color: COLORS.primary, fontSize: 14, fontWeight: '600' },
});
