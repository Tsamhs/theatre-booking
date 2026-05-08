import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Dimensions, ActivityIndicator, StatusBar, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api';
import { COLORS } from '../theme/colors';

const { width: W, height: H } = Dimensions.get('window');
const HERO_H = Math.min(H * 0.48, 400);

function gradientForIndex(i) {
  return COLORS.gradientCinema[i % COLORS.gradientCinema.length];
}

// Extract unique cinemas from filtered shows for a movie
function extractCinemas(shows) {
  const seen = new Map();
  shows.forEach(show => {
    const key = show.theatre_name || show.theatre_id;
    if (key && !seen.has(key)) {
      seen.set(key, {
        showId:   show.show_id,
        name:     show.theatre_name || 'Κινηματογράφος',
        location: show.theatre_location || show.location || '',
      });
    }
  });
  return Array.from(seen.values());
}

function CinemaCard({ cinema, onBook }) {
  return (
    <View style={s.cinemaCard}>
      <LinearGradient colors={[COLORS.surfaceAlt, COLORS.surface]} style={s.cinemaGrad}>
        <View style={s.cinemaLeft}>
          <View style={s.cinemaIconWrap}>
            <Ionicons name="business" size={22} color={COLORS.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.cinemaName}>{cinema.name}</Text>
            {!!cinema.location && (
              <View style={s.cinemaLocRow}>
                <Ionicons name="location-outline" size={12} color={COLORS.textDim} />
                <Text style={s.cinemaLoc}>{cinema.location}</Text>
              </View>
            )}
          </View>
        </View>
        <TouchableOpacity onPress={onBook} style={s.bookBtn}>
          <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={s.bookBtnGrad}>
            <Text style={s.bookBtnText}>Αγορά</Text>
            <Ionicons name="arrow-forward" size={14} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
}

function InfoChip({ icon, label }) {
  return (
    <View style={s.infoChip}>
      <Ionicons name={icon} size={14} color={COLORS.textSecondary} />
      <Text style={s.infoChipText}>{label}</Text>
    </View>
  );
}

export default function MovieDetailScreen({ navigation, route }) {
  const { movieTitle, showId } = route.params;
  const [movieShows, setMovieShows] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/shows');
        const filtered = (Array.isArray(data) ? data : [])
          .filter(s => s.title === movieTitle);
        setMovieShows(filtered);
      } catch (_) {
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [movieTitle]);

  const movie   = movieShows[0] || null;
  const cinemas = extractCinemas(movieShows);
  const grad    = gradientForIndex(movieShows[0]?._gi ?? 0);

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" />
      <ScrollView bounces={false} showsVerticalScrollIndicator={false}>

        {/* ── HERO ── */}
        <View style={{ height: HERO_H }}>
          {movie?.poster_url
            ? <Image source={{ uri: movie.poster_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            : <LinearGradient colors={grad.length ? grad : COLORS.gradientCinema[0]} style={StyleSheet.absoluteFill} />
          }
          <Ionicons name="film" size={200} color="rgba(255,255,255,0.04)" style={s.heroBg} />
          <LinearGradient
            colors={['transparent', COLORS.background]}
            style={[StyleSheet.absoluteFill, { top: HERO_H * 0.42 }]}
          />

          {/* Back button */}
          <SafeAreaView style={s.backArea}>
            <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </TouchableOpacity>
          </SafeAreaView>

          {/* Bottom info overlay */}
          <View style={s.heroBottom}>
            <View style={s.heroChips}>
              {!!movie?.age_rating && (
                <View style={s.redChip}>
                  <Text style={s.redChipText}>{movie.age_rating}</Text>
                </View>
              )}
              {!!movie?.duration && (
                <View style={s.grayChip}>
                  <Ionicons name="time-outline" size={12} color={COLORS.textSecondary} />
                  <Text style={s.grayChipText}>{movie.duration}'</Text>
                </View>
              )}
            </View>
            <Text style={s.heroTitle}>{movieTitle}</Text>
          </View>
        </View>

        {/* ── DESCRIPTION ── */}
        {!!movie?.description && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>Περιγραφή</Text>
            <Text style={s.descText}>{movie.description}</Text>
          </View>
        )}

        {/* ── INFO CHIPS ── */}
        {movie && (
          <View style={s.infoRow}>
            {!!movie.age_rating && <InfoChip icon="shield-checkmark-outline" label={`Ηλικία ${movie.age_rating}`} />}
            {!!movie.duration && <InfoChip icon="time-outline" label={`${movie.duration} λεπτά`} />}
            {cinemas.length > 0 && <InfoChip icon="business-outline" label={`${cinemas.length} κινηματογράφοι`} />}
          </View>
        )}

        {/* ── CINEMAS ── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>
            Διαθέσιμος σε {cinemas.length} κινηματογράφο{cinemas.length !== 1 ? 'υς' : ''}
          </Text>
          {cinemas.length === 0 && !error && (
            <Text style={s.noShowsText}>Δεν βρέθηκαν προβολές αυτή τη στιγμή.</Text>
          )}
          {error && (
            <Text style={s.noShowsText}>Σφάλμα φόρτωσης. Δοκιμάστε ξανά.</Text>
          )}
          {cinemas.map((cinema, i) => (
            <CinemaCard
              key={cinema.showId ?? i}
              cinema={cinema}
              onBook={() => navigation.navigate('Showtime', {
                showId:     cinema.showId,
                movieTitle,
                cinemaName: cinema.name,
              })}
            />
          ))}
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:         { flex: 1, backgroundColor: COLORS.background },
  centered:     { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
  heroBg:       { position: 'absolute', right: -30, top: '10%' },
  backArea:     { position: 'absolute', top: 0, left: 0 },
  backBtn:      { margin: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  heroBottom:   { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20 },
  heroChips:    { flexDirection: 'row', gap: 8, marginBottom: 10 },
  heroTitle:    { color: '#fff', fontSize: 26, fontWeight: '800', lineHeight: 32 },
  redChip:      { backgroundColor: COLORS.primary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  redChipText:  { color: '#fff', fontSize: 11, fontWeight: '700' },
  grayChip:     { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  grayChipText: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '600' },
  section:      { paddingHorizontal: 20, paddingTop: 24 },
  sectionLabel: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 12 },
  descText:     { color: COLORS.text, fontSize: 14, lineHeight: 22 },
  infoRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20, paddingTop: 20 },
  infoChip:     { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.surfaceAlt, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: COLORS.border },
  infoChipText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '500' },
  cinemaCard:   { marginBottom: 10, borderRadius: 14, overflow: 'hidden' },
  cinemaGrad:   { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14 },
  cinemaLeft:   { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  cinemaIconWrap:{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(229,9,20,0.12)', justifyContent: 'center', alignItems: 'center' },
  cinemaName:   { color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 3 },
  cinemaLocRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  cinemaLoc:    { color: COLORS.textDim, fontSize: 12 },
  bookBtn:      {},
  bookBtnGrad:  { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24 },
  bookBtnText:  { color: '#fff', fontSize: 13, fontWeight: '700' },
  noShowsText:  { color: COLORS.textSecondary, fontSize: 14 },
});
