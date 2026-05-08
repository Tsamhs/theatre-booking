import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api';
import { COLORS } from '../theme/colors';

const GR_DAYS   = ['Κυρ', 'Δευ', 'Τρί', 'Τετ', 'Πέμ', 'Παρ', 'Σάβ'];
const GR_MONTHS = ['Ιαν', 'Φεβ', 'Μάρ', 'Απρ', 'Μάι', 'Ιούν', 'Ιούλ', 'Αύγ', 'Σεπ', 'Οκτ', 'Νοε', 'Δεκ'];

// ── Date/time helpers ────────────────────────────────────────────────────────

// Parses a DATETIME string from MariaDB (e.g. "2026-04-30T19:20:00.000Z"
// or a JS Date object serialised by Express) into { date, time }.
// Deliberately avoids Date() constructor to sidestep timezone issues.
function parseDateTime(raw) {
  const s = (raw instanceof Date ? raw.toISOString() : String(raw ?? ''));
  // Split on 'T' or ' '
  const sep   = s.includes('T') ? 'T' : ' ';
  const parts  = s.split(sep);
  const date   = parts[0] ?? '';                  // "2026-04-30"
  const time   = (parts[1] ?? '').substring(0, 5); // "19:20"
  return { date, time };
}

function generateDays(count = 14) {
  const today = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d   = new Date(today);
    d.setDate(today.getDate() + i);
    // Build local ISO date without timezone conversion
    const yyyy = d.getFullYear();
    const mm   = String(d.getMonth() + 1).padStart(2, '0');
    const dd   = String(d.getDate()).padStart(2, '0');
    return {
      iso:     `${yyyy}-${mm}-${dd}`,
      dayName: i === 0 ? 'Σήμερα' : GR_DAYS[d.getDay()],
      date:    d.getDate(),
      month:   GR_MONTHS[d.getMonth()],
    };
  });
}

// ── Day chip ─────────────────────────────────────────────────────────────────
function DayChip({ day, selected, hasShowtimes, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={s.dayChipWrap} activeOpacity={0.8}>
      {selected ? (
        <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={s.dayChip}>
          <Text style={[s.dayName, { color: '#fff' }]}>{day.dayName}</Text>
          <Text style={[s.dayNum,  { color: '#fff' }]}>{day.date}</Text>
          <Text style={[s.dayMonth,{ color: 'rgba(255,255,255,0.8)' }]}>{day.month}</Text>
        </LinearGradient>
      ) : (
        <View style={[s.dayChip, s.dayChipInactive, !hasShowtimes && s.dayChipEmpty]}>
          <Text style={[s.dayName, !hasShowtimes && { color: COLORS.textDim }]}>{day.dayName}</Text>
          <Text style={[s.dayNum,  !hasShowtimes && { color: COLORS.textDim }]}>{day.date}</Text>
          <Text style={[s.dayMonth,{ color: COLORS.textDim }]}>{day.month}</Text>
          {hasShowtimes && <View style={s.dayDot} />}
        </View>
      )}
    </TouchableOpacity>
  );
}

// ── Time slot card ────────────────────────────────────────────────────────────
function TimeSlot({ showtime, onPress }) {
  const { time } = parseDateTime(showtime.start_datetime);
  const available = (showtime.available_seats ?? 0) > 0;
  return (
    <TouchableOpacity
      onPress={() => available && onPress(showtime)}
      style={[s.timeSlot, !available && s.timeSlotFull]}
      disabled={!available}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={available ? [COLORS.surfaceAlt, COLORS.surface] : [COLORS.surface, COLORS.surface]}
        style={s.timeSlotGrad}
      >
        <Text style={[s.timeText, !available && s.timeTextDim]}>{time}</Text>
        {!!showtime.hall && (
          <Text style={s.hallText}>{showtime.hall}</Text>
        )}
        <View style={[s.seatsWrap, !available && { opacity: 0.4 }]}>
          <Ionicons name="person" size={10} color={available ? COLORS.textSecondary : COLORS.textDim} />
          <Text style={[s.seatsText, !available && { color: COLORS.textDim }]}>
            {available ? `${showtime.available_seats}` : 'Πλήρης'}
          </Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function ShowtimeScreen({ navigation, route }) {
  const { showId, movieTitle, cinemaName } = route.params;
  const [show,         setShow]         = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/shows/${showId}`);
        setShow(data);
        const dates = getUniqueDates(data.showtimes || []);
        if (dates.length > 0) setSelectedDate(dates[0]);
      } catch (_) {
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [showId]);

  const allDays   = generateDays(14);
  const showtimes = show?.showtimes || [];

  function getUniqueDates(sts) {
    return Array.from(new Set(sts.map(st => parseDateTime(st.start_datetime).date))).sort();
  }

  const showtimeDates = new Set(showtimes.map(st => parseDateTime(st.start_datetime).date));

  const timesForDate = selectedDate
    ? [...showtimes]
        .filter(st => parseDateTime(st.start_datetime).date === selectedDate)
        .sort((a, b) => parseDateTime(a.start_datetime).time.localeCompare(
                        parseDateTime(b.start_datetime).time))
    : [];

  const handleTimeSelect = useCallback((showtime) => {
    // Categories are nested per-showtime, not at the top-level show object
    const cats  = showtime.ticketCategories || [];
    const price = cats[0]?.price ?? 9.50;
    const catId = cats[0]?.category_id ?? null;
    const { date, time } = parseDateTime(showtime.start_datetime);
    navigation.navigate('SeatSelection', {
      showtimeId:     showtime.showtime_id,
      movieTitle,
      cinemaName,
      showDate:       date,
      showTime:       time,
      hallName:       showtime.hall || 'Αίθουσα 1',
      availableSeats: showtime.available_seats ?? 80,
      ticketPrice:    price,
      categoryId:     catId,
    });
  }, [show, selectedDate, movieTitle, cinemaName, navigation]);

  const selectedDayMeta = allDays.find(d => d.iso === selectedDate);

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
      <SafeAreaView edges={['top']} style={{ backgroundColor: COLORS.background }}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={s.headerInfo}>
            <Text style={s.headerTitle} numberOfLines={1}>{movieTitle}</Text>
            <Text style={s.headerSub} numberOfLines={1}>{cinemaName}</Text>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── DATE PICKER ── */}
        <View style={s.sectionHead}>
          <View style={s.sectionAccent} />
          <Text style={s.sectionTitle}>Επιλογή Ημερομηνίας</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.daysRow}>
          {allDays.map(day => (
            <DayChip
              key={day.iso}
              day={day}
              selected={selectedDate === day.iso}
              hasShowtimes={showtimeDates.has(day.iso)}
              onPress={() => setSelectedDate(day.iso)}
            />
          ))}
        </ScrollView>

        {/* ── TIME SLOTS ── */}
        <View style={[s.sectionHead, { marginTop: 28 }]}>
          <View style={s.sectionAccent} />
          <Text style={s.sectionTitle}>Ώρες Προβολής</Text>
          {selectedDayMeta && (
            <Text style={s.selectedDateLabel}>
              {selectedDayMeta.dayName} {selectedDayMeta.date} {selectedDayMeta.month}
            </Text>
          )}
        </View>

        {error ? (
          <View style={s.msgBox}>
            <Ionicons name="alert-circle-outline" size={36} color={COLORS.textDim} />
            <Text style={s.msgText}>Σφάλμα φόρτωσης. Δοκιμάστε ξανά.</Text>
          </View>
        ) : !selectedDate ? (
          <View style={s.msgBox}>
            <Text style={s.msgText}>Επιλέξτε ημερομηνία από πάνω.</Text>
          </View>
        ) : timesForDate.length === 0 ? (
          <View style={s.msgBox}>
            <Ionicons name="calendar-outline" size={36} color={COLORS.textDim} />
            <Text style={s.msgText}>Δεν υπάρχουν προβολές για αυτή την ημερομηνία.</Text>
          </View>
        ) : (
          <View style={s.timesGrid}>
            {timesForDate.map(st => (
              <TimeSlot key={st.showtime_id} showtime={st} onPress={handleTimeSelect} />
            ))}
          </View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:              { flex: 1, backgroundColor: COLORS.background },
  centered:          { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
  header:            { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  backBtn:           { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.surfaceAlt, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  headerInfo:        { flex: 1 },
  headerTitle:       { color: '#fff', fontSize: 16, fontWeight: '700' },
  headerSub:         { color: COLORS.textDim, fontSize: 12, marginTop: 2 },
  sectionHead:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginTop: 20, marginBottom: 14, gap: 10 },
  sectionAccent:     { width: 4, height: 18, borderRadius: 2, backgroundColor: COLORS.primary },
  sectionTitle:      { color: '#fff', fontSize: 17, fontWeight: '700', flex: 1 },
  selectedDateLabel: { color: COLORS.primary, fontSize: 13, fontWeight: '600' },
  daysRow:           { paddingHorizontal: 16, gap: 8, paddingBottom: 4 },
  dayChipWrap:       {},
  dayChip:           { width: 68, paddingVertical: 12, borderRadius: 14, alignItems: 'center', gap: 2 },
  dayChipInactive:   { backgroundColor: COLORS.surfaceAlt, borderWidth: 1, borderColor: COLORS.border },
  dayChipEmpty:      { opacity: 0.45 },
  dayName:           { color: COLORS.textSecondary, fontSize: 11, fontWeight: '600' },
  dayNum:            { color: '#fff', fontSize: 20, fontWeight: '800' },
  dayMonth:          { fontSize: 11 },
  dayDot:            { width: 5, height: 5, borderRadius: 3, backgroundColor: COLORS.primary, marginTop: 3 },
  timesGrid:         { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 10 },
  timeSlot:          { borderRadius: 12, overflow: 'hidden' },
  timeSlotFull:      { opacity: 0.5 },
  timeSlotGrad:      { paddingHorizontal: 18, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, minWidth: 100 },
  timeText:          { color: '#fff', fontSize: 18, fontWeight: '800' },
  timeTextDim:       { color: COLORS.textDim },
  hallText:          { color: COLORS.textDim, fontSize: 11, marginTop: 3 },
  seatsWrap:         { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  seatsText:         { color: COLORS.textSecondary, fontSize: 11 },
  msgBox:            { alignItems: 'center', padding: 40, gap: 12 },
  msgText:           { color: COLORS.textSecondary, fontSize: 14, textAlign: 'center' },
});
