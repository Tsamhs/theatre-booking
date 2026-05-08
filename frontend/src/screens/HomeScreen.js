import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, FlatList, TouchableOpacity,
  StyleSheet, Dimensions, ActivityIndicator, StatusBar, Platform, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';
import { COLORS } from '../theme/colors';

const { width: W, height: H } = Dimensions.get('window');
const HERO_H = Math.min(H * 0.60, 480);

const POSTER_GRADIENTS = COLORS.gradientCinema;

function gradientForIndex(i) {
  return POSTER_GRADIENTS[i % POSTER_GRADIENTS.length];
}

// Deduplicate shows → unique movies
function uniqueMovies(shows) {
  const seen = new Map();
  shows.forEach((show, i) => {
    if (!seen.has(show.title)) {
      seen.set(show.title, { ...show, _gi: i });
    }
  });
  return Array.from(seen.values());
}

const OFFERS = [
  {
    id: '1', icon: 'heart', title: 'Couple Tuesday',
    sub: '2 εισιτήρια + 2 ποτά κάθε Τρίτη', tag: '-20%',
    grad: [COLORS.primary, COLORS.primaryDark],
  },
  {
    id: '2', icon: 'people', title: 'Family Pack',
    sub: '4 άτομα, 4 ποτά, 2 μεγάλα popcorn', tag: '-25%',
    grad: ['#D97706', '#92400E'],
  },
  {
    id: '3', icon: 'school', title: 'Student Offer',
    sub: 'Προσκόμιση φοιτητικής ταυτότητας', tag: '-30%',
    grad: ['#1D4ED8', '#1E3A8A'],
  },
];

// ── Sub-components ───────────────────────────────────────────────────────────

function HeroSlide({ movie, onPress }) {
  const grad = gradientForIndex(movie._gi);
  return (
    <TouchableOpacity style={{ width: W, height: HERO_H }} onPress={() => onPress(movie)} activeOpacity={0.95}>
      {movie.poster_url
        ? <Image source={{ uri: movie.poster_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        : <LinearGradient colors={grad} style={StyleSheet.absoluteFill} />
      }
      {/* Decorative reel icon */}
      <Ionicons name="film" size={220} color="rgba(255,255,255,0.04)" style={s.reelBg} />
      {/* Bottom fade */}
      <LinearGradient
        colors={['transparent', 'rgba(9,9,14,0.6)', COLORS.background]}
        style={[StyleSheet.absoluteFill, { top: HERO_H * 0.38 }]}
      />
      {/* Info */}
      <View style={s.heroInfo}>
        <View style={s.heroChips}>
          <Chip red>{movie.age_rating || 'PG'}</Chip>
          {!!movie.duration && <Chip>{movie.duration}'</Chip>}
        </View>
        <Text style={s.heroTitle} numberOfLines={2}>{movie.title}</Text>
        {!!movie.description && (
          <Text style={s.heroDesc} numberOfLines={2}>{movie.description}</Text>
        )}
        <TouchableOpacity onPress={() => onPress(movie)} activeOpacity={0.85}>
          <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={s.heroCTA}>
            <Ionicons name="ticket-outline" size={17} color="#fff" />
            <Text style={s.heroCTAText}>Αγορά Εισιτηρίου</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

function SectionRow({ title, onMore, children }) {
  return (
    <View style={{ marginTop: 30 }}>
      <View style={s.rowHead}>
        <View style={s.rowTitleWrap}>
          <View style={s.rowAccent} />
          <Text style={s.rowTitle}>{title}</Text>
        </View>
        {onMore && (
          <TouchableOpacity onPress={onMore} style={s.moreBtn}>
            <Text style={s.moreText}>Όλες</Text>
            <Ionicons name="chevron-forward" size={14} color={COLORS.primary} />
          </TouchableOpacity>
        )}
      </View>
      {children}
    </View>
  );
}

function PosterCard({ movie, gradIndex, onPress, comingSoon }) {
  const grad = gradientForIndex(gradIndex);
  return (
    <TouchableOpacity
      style={s.card}
      onPress={() => !comingSoon && onPress && onPress(movie)}
      activeOpacity={comingSoon ? 1 : 0.82}
    >
      <View style={s.cardPoster}>
        {movie.poster_url
          ? <Image source={{ uri: movie.poster_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          : <LinearGradient colors={grad} style={StyleSheet.absoluteFill} />
        }
        {comingSoon && (
          <View style={s.cardSoonBadge}>
            <Text style={s.cardSoonText}>Σύντομα</Text>
          </View>
        )}
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.75)']} style={s.cardFade} />
        <View style={s.cardRating}>
          <Text style={s.cardRatingText}>{movie.age_rating || 'PG'}</Text>
        </View>
      </View>
      <View style={s.cardBody}>
        <Text style={s.cardTitle} numberOfLines={2}>{movie.title}</Text>
        {!!movie.duration && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
            <Ionicons name="time-outline" size={11} color={COLORS.textDim} />
            <Text style={s.cardDur}>{movie.duration}'</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

function OfferCard({ offer }) {
  return (
    <LinearGradient colors={offer.grad} style={s.offerCard}>
      <View style={s.offerIcon}>
        <Ionicons name={offer.icon} size={26} color="rgba(255,255,255,0.9)" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.offerTitle}>{offer.title}</Text>
        <Text style={s.offerSub} numberOfLines={1}>{offer.sub}</Text>
      </View>
      <View style={s.offerTag}>
        <Text style={s.offerTagText}>{offer.tag}</Text>
      </View>
    </LinearGradient>
  );
}

function Chip({ children, red }) {
  return (
    <View style={[s.chip, red && s.chipRed]}>
      <Text style={s.chipText}>{children}</Text>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function HomeScreen({ navigation }) {
  const [shows, setShows]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [heroIdx, setHeroIdx]   = useState(0);
  const listRef                 = useRef(null);
  const timerRef                = useRef(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/shows');
      setShows(Array.isArray(data) ? data : []);
    } catch (_) {}
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const movies     = uniqueMovies(shows);
  const featured   = movies.slice(0, 5);
  const nowPlaying = movies.slice(0, 10);
  const comingSoon = movies.length > 5 ? [...movies].reverse().slice(0, 5) : [];

  // Auto-scroll hero carousel
  useEffect(() => {
    if (featured.length < 2) return;
    timerRef.current = setInterval(() => {
      setHeroIdx(prev => {
        const next = (prev + 1) % featured.length;
        try { listRef.current?.scrollToIndex({ index: next, animated: true }); } catch (_) {}
        return next;
      });
    }, 5000);
    return () => clearInterval(timerRef.current);
  }, [featured.length]);

  const goToMovie = useCallback((movie) => {
    navigation.navigate('MovieDetail', { movieTitle: movie.title, showId: movie.show_id });
  }, [navigation]);

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>

        {/* ── HERO CAROUSEL ── */}
        <View style={{ height: HERO_H }}>
          <FlatList
            ref={listRef}
            data={featured}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, i) => `hero${i}`}
            onMomentumScrollEnd={e =>
              setHeroIdx(Math.round(e.nativeEvent.contentOffset.x / W))
            }
            renderItem={({ item }) => <HeroSlide movie={item} onPress={goToMovie} />}
            getItemLayout={(_, index) => ({ length: W, offset: W * index, index })}
          />
          {/* Logo overlay — style.pointerEvents (prop form deprecated on web) */}
          <View style={[s.logoWrap, { pointerEvents: 'none' }]}>
            <Text style={s.logo}>CINE<Text style={{ color: COLORS.primary }}>PLEX</Text></Text>
          </View>
          {/* Dot indicators */}
          {featured.length > 1 && (
            <View style={s.dots}>
              {featured.map((_, i) => (
                <View key={i} style={[s.dot, i === heroIdx && s.dotOn]} />
              ))}
            </View>
          )}
        </View>

        {/* ── NOW PLAYING ── */}
        <SectionRow title="Τώρα σε Προβολή" onMore={() => navigation.navigate('Movies')}>
          <FlatList
            data={nowPlaying}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 4 }}
            keyExtractor={(_, i) => `np${i}`}
            renderItem={({ item }) => (
              <PosterCard movie={item} gradIndex={item._gi} onPress={goToMovie} />
            )}
          />
        </SectionRow>

        {/* ── COMING SOON ── */}
        {comingSoon.length > 0 && (
          <SectionRow title="Προσεχώς">
            <FlatList
              data={comingSoon}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 4 }}
              keyExtractor={(_, i) => `cs${i}`}
              renderItem={({ item, index }) => (
                <PosterCard movie={item} gradIndex={(item._gi + 3) % 8} comingSoon />
              )}
            />
          </SectionRow>
        )}

        {/* ── OFFERS ── */}
        <SectionRow title="Προσφορές">
          <View style={{ paddingHorizontal: 16, gap: 10 }}>
            {OFFERS.map(o => <OfferCard key={o.id} offer={o} />)}
          </View>
        </SectionRow>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:       { flex: 1, backgroundColor: COLORS.background },
  centered:   { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
  logoWrap:   { position: 'absolute', top: 0, left: 0, paddingTop: Platform.OS === 'android' ? 40 : 14, paddingLeft: 20 },
  logo:       { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: 2 },
  reelBg:     { position: 'absolute', right: -30, top: '15%' },
  heroInfo:   { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20 },
  heroChips:  { flexDirection: 'row', gap: 8, marginBottom: 10 },
  heroTitle:  { color: '#fff', fontSize: 28, fontWeight: '800', letterSpacing: -0.5, lineHeight: 34, marginBottom: 8 },
  heroDesc:   { color: COLORS.textSecondary, fontSize: 13, lineHeight: 19, marginBottom: 16 },
  heroCTA:    { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', paddingHorizontal: 22, paddingVertical: 12, borderRadius: 30 },
  heroCTAText:{ color: '#fff', fontSize: 14, fontWeight: '700' },
  dots:       { position: 'absolute', bottom: 14, alignSelf: 'center', flexDirection: 'row', gap: 6 },
  dot:        { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.3)' },
  dotOn:      { width: 22, backgroundColor: COLORS.primary },
  rowHead:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 14 },
  rowTitleWrap:{ flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowAccent:  { width: 4, height: 20, borderRadius: 2, backgroundColor: COLORS.primary },
  rowTitle:   { color: '#fff', fontSize: 18, fontWeight: '700' },
  moreBtn:    { flexDirection: 'row', alignItems: 'center', gap: 2 },
  moreText:   { color: COLORS.primary, fontSize: 13, fontWeight: '600' },
  chip:       { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  chipRed:    { backgroundColor: COLORS.primary },
  chipText:   { color: '#fff', fontSize: 11, fontWeight: '700' },
  card:       { width: 130, marginRight: 12 },
  cardPoster: { height: 188, borderRadius: 12, overflow: 'hidden', backgroundColor: COLORS.card },
  cardFade:   { ...StyleSheet.absoluteFillObject },
  cardSoonBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3 },
  cardSoonText:  { color: COLORS.gold, fontSize: 10, fontWeight: '700' },
  cardRating: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  cardRatingText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  cardBody:   { marginTop: 8 },
  cardTitle:  { color: '#fff', fontSize: 12, fontWeight: '600', lineHeight: 17 },
  cardDur:    { color: COLORS.textDim, fontSize: 11 },
  offerCard:  { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 16, gap: 14 },
  offerIcon:  { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  offerTitle: { color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 2 },
  offerSub:   { color: 'rgba(255,255,255,0.72)', fontSize: 12 },
  offerTag:   { backgroundColor: 'rgba(0,0,0,0.28)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  offerTagText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
