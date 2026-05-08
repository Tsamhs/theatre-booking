import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import api from '../services/api';

// ── Date helpers ──────────────────────────────────────────────────────────────
function toDateKey(isoString) {
  const d = new Date(isoString);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseDateKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

const DAY_NAMES  = ['Κυρ', 'Δευ', 'Τρί', 'Τετ', 'Πέμ', 'Παρ', 'Σάβ'];
const MON_NAMES  = ['Ιαν', 'Φεβ', 'Μαρ', 'Απρ', 'Μαΐ', 'Ιουν', 'Ιουλ', 'Αυγ', 'Σεπ', 'Οκτ', 'Νοε', 'Δεκ'];

function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' });
}

// ── Sub-components ────────────────────────────────────────────────────────────
function DateCard({ dateKey, isSelected, onPress }) {
  const d = parseDateKey(dateKey);
  const today = new Date();
  const isToday = toDateKey(today.toISOString()) === dateKey;

  return (
    <TouchableOpacity onPress={onPress} style={styles.dateCard} activeOpacity={0.75}>
      <LinearGradient
        colors={isSelected ? ['#1565C0', '#1E88E5'] : [COLORS.card, COLORS.cardAlt]}
        style={styles.dateCardInner}
      >
        <Text style={[styles.dateDayName, isSelected && styles.dateTextSel]}>
          {isToday ? 'Σήμερα' : DAY_NAMES[d.getDay()]}
        </Text>
        <Text style={[styles.dateDayNum, isSelected && styles.dateTextSel]}>
          {d.getDate()}
        </Text>
        <Text style={[styles.dateMon, isSelected && styles.dateTextSelMuted]}>
          {MON_NAMES[d.getMonth()]}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

function TimeSlot({ showtime, isSelected, onPress }) {
  const soldOut = showtime.available_seats === 0;
  return (
    <TouchableOpacity
      onPress={!soldOut ? onPress : null}
      style={[styles.timeSlot, isSelected && styles.timeSlotSel, soldOut && styles.timeSlotOff]}
      activeOpacity={soldOut ? 1 : 0.75}
    >
      <Text style={[styles.timeText, isSelected && styles.timeTextSel]}>
        {fmtTime(showtime.start_datetime)}
      </Text>
      <Text style={[styles.seatsText, soldOut && { color: COLORS.error }]}>
        {soldOut ? 'SOLD OUT' : `${showtime.available_seats} θέσεις`}
      </Text>
    </TouchableOpacity>
  );
}

function CategoryCard({ cat, isSelected, onPress }) {
  const soldOut = cat.available_seats === 0;
  return (
    <TouchableOpacity
      style={[styles.catCard, isSelected && styles.catCardSel, soldOut && styles.catCardOff]}
      onPress={soldOut ? null : onPress}
      activeOpacity={soldOut ? 1 : 0.75}
    >
      <Text style={[styles.catName, isSelected && styles.catNameSel]}>{cat.name}</Text>
      <Text style={[styles.catPrice, isSelected && styles.catPriceSel]}>
        {parseFloat(cat.price).toFixed(2)} €
      </Text>
      <Text style={styles.catSeats}>
        {soldOut ? 'Εξαντλήθηκε' : `${cat.available_seats} διαθ.`}
      </Text>
    </TouchableOpacity>
  );
}

function Row({ label, value, highlight }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, highlight && styles.rowValueHL]}>{value}</Text>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function BookingScreen({ route, navigation }) {
  const { show } = route.params;

  // ── Step 1: unique sorted dates from showtimes ──────────────────
  const availableDates = useMemo(() => {
    const keys = [...new Set((show.showtimes ?? []).map(st => toDateKey(st.start_datetime)))];
    return keys.sort();
  }, [show]);

  const [selectedDate,     setSelectedDate]     = useState(availableDates[0] ?? null);
  const [selectedShowtime, setSelectedShowtime] = useState(null);
  const [selectedCat,      setSelectedCat]      = useState(null);
  const [numTickets,        setNumTickets]       = useState(1);
  const [loading,           setLoading]          = useState(false);
  const [error,             setError]            = useState('');
  const [success,           setSuccess]          = useState(null);

  // ── Step 2: time slots for selected date ────────────────────────
  const timeSlots = useMemo(() => {
    if (!selectedDate) return [];
    return (show.showtimes ?? []).filter(
      st => toDateKey(st.start_datetime) === selectedDate
    );
  }, [show, selectedDate]);

  // Reset downstream selections when date changes
  function handleSelectDate(key) {
    setSelectedDate(key);
    setSelectedShowtime(null);
    setSelectedCat(null);
    setNumTickets(1);
    setError('');
  }

  function handleSelectShowtime(st) {
    setSelectedShowtime(st);
    const firstAvail = (st.ticketCategories ?? []).find(c => c.available_seats > 0);
    setSelectedCat(firstAvail ?? null);
    setNumTickets(1);
    setError('');
  }

  function handleSelectCat(cat) {
    setSelectedCat(cat);
    setNumTickets(1);
    setError('');
  }

  const maxTickets  = Math.min(10, selectedCat?.available_seats ?? 0);
  const totalPrice  = selectedCat
    ? (parseFloat(selectedCat.price) * numTickets).toFixed(2)
    : '0.00';

  const canConfirm  = selectedShowtime && selectedCat && numTickets >= 1;

  async function handleConfirm() {
    if (!canConfirm) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/reservations', {
        showtime_id: selectedShowtime.showtime_id,
        category_id: selectedCat.category_id,
        num_tickets: numTickets,
      });
      setSuccess({ reservationId: data.reservationId, totalPrice: data.totalPrice });
    } catch (err) {
      const msg       = err.response?.data?.message ?? 'Αποτυχία κράτησης. Δοκιμάστε ξανά.';
      const available = err.response?.data?.available;
      setError(available != null ? `${msg} (Διαθέσιμες: ${available})` : msg);
    } finally {
      setLoading(false);
    }
  }

  // ── Success receipt ─────────────────────────────────────────────
  if (success) {
    return (
      <View style={styles.root}>
        <LinearGradient colors={['#0D1B3E', '#0A0D1A']} style={styles.successHero}>
          <SafeAreaView edges={['top']} />
        </LinearGradient>
        <ScrollView contentContainerStyle={styles.successWrap}>
          <View style={styles.successIconWrap}>
            <LinearGradient colors={['#1565C0', '#1E88E5']} style={styles.successIconCircle}>
              <Ionicons name="checkmark" size={40} color={COLORS.white} />
            </LinearGradient>
          </View>
          <Text style={styles.successTitle}>Κράτηση Επιβεβαιώθηκε!</Text>
          <Text style={styles.successSub}>{show.title}</Text>

          <View style={styles.receipt}>
            <Row label="Κωδικός κράτησης" value={`#${success.reservationId}`} />
            <Row label="Εισιτήρια"         value={`${numTickets}x ${selectedCat.name}`} />
            <Row label="Ημερομηνία"
              value={parseDateKey(selectedDate).toLocaleDateString('el-GR', {
                weekday: 'long', day: 'numeric', month: 'long',
              })}
            />
            <Row label="Ώρα"      value={fmtTime(selectedShowtime.start_datetime)} />
            {selectedShowtime.hall && <Row label="Αίθουσα" value={selectedShowtime.hall} />}
            <Row label="Κινηματογράφος" value={show.theatre_name} />
            <View style={styles.divider} />
            <Row label="Σύνολο" value={`${parseFloat(success.totalPrice).toFixed(2)} €`} highlight />
          </View>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.navigate('Profile')}
          >
            <LinearGradient colors={['#1565C0', '#1E88E5']} style={styles.primaryBtnInner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Text style={styles.primaryBtnText}>Οι Κρατήσεις μου</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.navigate('Home')}>
            <Text style={styles.secondaryBtnText}>Αρχική Σελίδα</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ── Booking form ────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      {/* Header */}
      <LinearGradient colors={['#0D1B3E', '#0A0D1A']} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={26} color={COLORS.text} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle} numberOfLines={1}>{show.title}</Text>
              <Text style={styles.headerSub}>{show.theatre_name}</Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.form}>

        {/* ── Step 1: Date ── */}
        <Text style={styles.stepLabel}>
          <Text style={styles.stepNum}>1 </Text>Επιλογή Ημερομηνίας
        </Text>
        {availableDates.length === 0 ? (
          <Text style={styles.noData}>Δεν υπάρχουν διαθέσιμες ημερομηνίες.</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateRow}>
            {availableDates.map(key => (
              <DateCard
                key={key}
                dateKey={key}
                isSelected={selectedDate === key}
                onPress={() => handleSelectDate(key)}
              />
            ))}
          </ScrollView>
        )}

        {/* ── Step 2: Time slot ── */}
        {selectedDate && (
          <>
            <Text style={styles.stepLabel}>
              <Text style={styles.stepNum}>2 </Text>Επιλογή Ώρας
            </Text>
            <View style={styles.timeSlotsGrid}>
              {timeSlots.map(st => (
                <TimeSlot
                  key={st.showtime_id}
                  showtime={st}
                  isSelected={selectedShowtime?.showtime_id === st.showtime_id}
                  onPress={() => handleSelectShowtime(st)}
                />
              ))}
            </View>
          </>
        )}

        {/* ── Step 3: Category ── */}
        {selectedShowtime && (
          <>
            <Text style={styles.stepLabel}>
              <Text style={styles.stepNum}>3 </Text>Κατηγορία Εισιτηρίου
            </Text>
            <View style={styles.catsGrid}>
              {(selectedShowtime.ticketCategories ?? []).map(cat => (
                <CategoryCard
                  key={cat.category_id}
                  cat={cat}
                  isSelected={selectedCat?.category_id === cat.category_id}
                  onPress={() => handleSelectCat(cat)}
                />
              ))}
            </View>
          </>
        )}

        {/* ── Step 4: Ticket count ── */}
        {selectedCat && (
          <>
            <Text style={styles.stepLabel}>
              <Text style={styles.stepNum}>4 </Text>Αριθμός Εισιτηρίων
            </Text>
            <View style={styles.counterRow}>
              <TouchableOpacity
                style={[styles.counterBtn, numTickets <= 1 && styles.counterBtnOff]}
                onPress={() => setNumTickets(n => Math.max(1, n - 1))}
                disabled={numTickets <= 1}
              >
                <Ionicons name="remove" size={22} color={COLORS.white} />
              </TouchableOpacity>

              <Text style={styles.counterVal}>{numTickets}</Text>

              <TouchableOpacity
                style={[styles.counterBtn, numTickets >= maxTickets && styles.counterBtnOff]}
                onPress={() => setNumTickets(n => Math.min(maxTickets, n + 1))}
                disabled={numTickets >= maxTickets}
              >
                <Ionicons name="add" size={22} color={COLORS.white} />
              </TouchableOpacity>

              <Text style={styles.maxText}>(max {maxTickets})</Text>
            </View>

            {/* Total price */}
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Συνολικό Κόστος</Text>
              <Text style={styles.priceValue}>{totalPrice} €</Text>
            </View>
          </>
        )}

        {/* Error */}
        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={16} color={COLORS.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Confirm */}
        <TouchableOpacity
          style={[styles.confirmBtn, !canConfirm && styles.confirmBtnOff]}
          onPress={handleConfirm}
          disabled={!canConfirm || loading}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={canConfirm ? ['#1565C0', '#1E88E5'] : [COLORS.card, COLORS.card]}
            style={styles.confirmBtnInner}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {loading
              ? <ActivityIndicator color={COLORS.white} />
              : (
                <>
                  <Ionicons name="ticket" size={18} color={COLORS.white} />
                  <Text style={styles.confirmBtnText}>Επιβεβαίωση Κράτησης</Text>
                </>
              )
            }
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: COLORS.background },
  header: { paddingBottom: 16 },
  headerRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 8, gap: 8,
  },
  backBtn:     { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  headerSub:   { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },

  form: { padding: 20 },

  stepLabel: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 12, marginTop: 20 },
  stepNum:   { color: COLORS.primary },
  noData:    { color: COLORS.textSecondary, fontSize: 14, marginBottom: 12 },

  /* ─ Date picker ─ */
  dateRow:     { marginHorizontal: -4 },
  dateCard:    { marginHorizontal: 4 },
  dateCardInner: {
    width: 68, borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: COLORS.border,
  },
  dateDayName:    { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },
  dateDayNum:     { fontSize: 24, fontWeight: '800', color: COLORS.text },
  dateMon:        { fontSize: 11, color: COLORS.textSecondary },
  dateTextSel:    { color: COLORS.white },
  dateTextSelMuted: { color: 'rgba(255,255,255,0.7)' },

  /* ─ Time slots ─ */
  timeSlotsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4,
  },
  timeSlot: {
    backgroundColor: COLORS.card,
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
    alignItems: 'center', minWidth: 90,
    borderWidth: 1, borderColor: COLORS.border,
  },
  timeSlotSel: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  timeSlotOff: { opacity: 0.4 },
  timeText:    { fontSize: 16, fontWeight: '700', color: COLORS.text },
  timeTextSel: { color: COLORS.white },
  seatsText:   { fontSize: 11, color: COLORS.textSecondary, marginTop: 3 },

  /* ─ Category cards ─ */
  catsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  catCard: {
    flex: 1, minWidth: 120,
    backgroundColor: COLORS.card,
    borderRadius: 12, padding: 14, alignItems: 'center',
    borderWidth: 2, borderColor: COLORS.border,
  },
  catCardSel: { borderColor: COLORS.primary, backgroundColor: 'rgba(30,136,229,0.1)' },
  catCardOff: { opacity: 0.4 },
  catName:    { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  catNameSel: { color: COLORS.primaryLight },
  catPrice:   { fontSize: 20, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  catPriceSel:{ color: COLORS.primary },
  catSeats:   { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },

  /* ─ Ticket counter ─ */
  counterRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  counterBtn: {
    backgroundColor: COLORS.primary,
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
  },
  counterBtnOff: { backgroundColor: COLORS.border },
  counterVal:    { fontSize: 30, fontWeight: '800', color: COLORS.text, minWidth: 36, textAlign: 'center' },
  maxText:       { fontSize: 13, color: COLORS.textDim },

  /* ─ Price ─ */
  priceRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: COLORS.card, borderRadius: 14, padding: 18, marginTop: 16,
    borderWidth: 1, borderColor: COLORS.border,
  },
  priceLabel: { fontSize: 15, color: COLORS.textSecondary, fontWeight: '600' },
  priceValue: { fontSize: 28, fontWeight: '800', color: COLORS.primary },

  /* ─ Error ─ */
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.errorBg,
    borderRadius: 10, padding: 14, marginTop: 12,
    borderLeftWidth: 3, borderLeftColor: COLORS.error,
  },
  errorText: { color: COLORS.error, fontSize: 13, flex: 1 },

  /* ─ Confirm button ─ */
  confirmBtn:      { borderRadius: 14, overflow: 'hidden', marginTop: 20 },
  confirmBtnOff:   { opacity: 0.5 },
  confirmBtnInner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 17,
  },
  confirmBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },

  /* ─ Success ─ */
  successHero: { height: 80 },
  successWrap: { alignItems: 'center', padding: 24 },
  successIconWrap:   { marginTop: 8, marginBottom: 24 },
  successIconCircle: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center' },
  successTitle: { fontSize: 24, fontWeight: '800', color: COLORS.text, marginBottom: 8, textAlign: 'center' },
  successSub:   { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 24 },

  receipt: {
    width: '100%', backgroundColor: COLORS.card, borderRadius: 16,
    padding: 20, marginBottom: 28, borderWidth: 1, borderColor: COLORS.border,
  },
  row:          { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  rowLabel:     { fontSize: 13, color: COLORS.textSecondary },
  rowValue:     { fontSize: 13, color: COLORS.text, fontWeight: '600', flex: 1, textAlign: 'right', marginLeft: 8 },
  rowValueHL:   { fontSize: 20, color: COLORS.primary, fontWeight: '800' },
  divider:      { height: 1, backgroundColor: COLORS.border, marginVertical: 8 },

  primaryBtn:      { width: '100%', borderRadius: 14, overflow: 'hidden', marginBottom: 12 },
  primaryBtnInner: { paddingVertical: 16, alignItems: 'center' },
  primaryBtnText:  { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  secondaryBtn:     { paddingVertical: 12 },
  secondaryBtnText: { color: COLORS.textSecondary, fontSize: 15, textAlign: 'center' },
});
