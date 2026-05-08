import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api';
import { COLORS } from '../theme/colors';

function InfoRow({ label, value }) {
  return (
    <View style={s.infoRow}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue}>{value}</Text>
    </View>
  );
}

function Divider() {
  return <View style={s.divider} />;
}

// ── Success State ─────────────────────────────────────────────────────────────
function SuccessView({ reservationId, movieTitle, navigation }) {
  return (
    <View style={s.successRoot}>
      <LinearGradient colors={[COLORS.background, '#080F08']} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={s.successInner}>
        <View style={s.successIconWrap}>
          <LinearGradient colors={['#22C55E', '#16A34A']} style={s.successCircle}>
            <Ionicons name="checkmark" size={48} color="#fff" />
          </LinearGradient>
        </View>
        <Text style={s.successTitle}>Κράτηση Επιβεβαιώθηκε!</Text>
        <Text style={s.successMovie}>{movieTitle}</Text>
        {!!reservationId && (
          <View style={s.reservationIdBox}>
            <Text style={s.reservationIdLabel}>Κωδικός Κράτησης</Text>
            <Text style={s.reservationIdValue}>#{reservationId}</Text>
          </View>
        )}
        <View style={s.successActions}>
          <TouchableOpacity
            style={s.primaryAction}
            onPress={() => navigation.navigate('Main', { screen: 'Profile' })}
          >
            <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={s.primaryActionGrad}>
              <Ionicons name="ticket-outline" size={18} color="#fff" />
              <Text style={s.primaryActionText}>Οι Κρατήσεις μου</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.secondaryAction}
            onPress={() => navigation.navigate('Main', { screen: 'Home' })}
          >
            <Text style={s.secondaryActionText}>Αρχική Σελίδα</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function ConfirmationScreen({ navigation, route }) {
  const {
    showtimeId, selectedSeats, movieTitle, cinemaName,
    showDate, showTime, hallName, totalPrice, categoryId, numTickets,
  } = route.params;

  const [loading,       setLoading]       = useState(false);
  const [confirmed,     setConfirmed]     = useState(false);
  const [reservationId, setReservationId] = useState(null);
  const [error,         setError]         = useState('');

  const handleConfirm = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/reservations', {
        showtime_id: showtimeId,
        category_id: categoryId,
        num_tickets: numTickets,
      });
      setReservationId(data.reservationId ?? null);
      setConfirmed(true);
    } catch (e) {
      const msg = e?.response?.data?.message || 'Σφάλμα κατά την κράτηση. Παρακαλώ δοκιμάστε ξανά.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (confirmed) {
    return (
      <SuccessView
        reservationId={reservationId}
        movieTitle={movieTitle}
        navigation={navigation}
      />
    );
  }

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: COLORS.background }}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Επιβεβαίωση Κράτησης</Text>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Summary card */}
        <LinearGradient colors={[COLORS.surfaceAlt, COLORS.surface]} style={s.card}>
          {/* Movie hero strip */}
          <LinearGradient colors={COLORS.gradientRed} style={s.cardHero}>
            <Ionicons name="film" size={32} color="rgba(255,255,255,0.35)" />
            <Text style={s.cardHeroTitle} numberOfLines={1}>{movieTitle}</Text>
          </LinearGradient>

          <View style={s.cardBody}>
            <InfoRow label="Κινηματογράφος" value={cinemaName} />
            <Divider />
            <InfoRow label="Αίθουσα"        value={hallName} />
            <Divider />
            <InfoRow label="Ημερομηνία"     value={showDate} />
            <Divider />
            <InfoRow label="Ώρα"            value={showTime} />
            <Divider />
            <InfoRow
              label="Θέσεις"
              value={
                selectedSeats.length <= 6
                  ? selectedSeats.join(', ')
                  : `${selectedSeats.slice(0, 6).join(', ')} +${selectedSeats.length - 6}`
              }
            />
            <Divider />
            <InfoRow label="Αριθμός εισιτηρίων" value={`${numTickets}`} />
          </View>

          {/* Total row */}
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Σύνολο</Text>
            <Text style={s.totalValue}>€{(totalPrice ?? 0).toFixed(2)}</Text>
          </View>
        </LinearGradient>

        {/* Notice */}
        <View style={s.notice}>
          <Ionicons name="information-circle-outline" size={16} color={COLORS.textDim} />
          <Text style={s.noticeText}>
            Ελέγξτε τα στοιχεία πριν επιβεβαιώσετε. Η κράτηση δεν μπορεί να τροποποιηθεί.
          </Text>
        </View>

        {/* Error */}
        {!!error && (
          <View style={s.errorBox}>
            <Ionicons name="alert-circle-outline" size={18} color={COLORS.error} />
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Confirm button */}
      <View style={s.footer}>
        <SafeAreaView edges={['bottom']}>
          <TouchableOpacity onPress={handleConfirm} disabled={loading} style={s.confirmBtnWrap}>
            <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={s.confirmBtn}>
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                  <Text style={s.confirmBtnText}>Ολοκλήρωση Κράτησης</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root:               { flex: 1, backgroundColor: COLORS.background },
  header:             { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  backBtn:            { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.surfaceAlt, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  headerTitle:        { color: '#fff', fontSize: 17, fontWeight: '700' },
  scroll:             { padding: 20 },
  card:               { borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  cardHero:           { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  cardHeroTitle:      { color: '#fff', fontSize: 17, fontWeight: '700', flex: 1 },
  cardBody:           { paddingHorizontal: 16, paddingTop: 4 },
  infoRow:            { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  infoLabel:          { color: COLORS.textSecondary, fontSize: 13 },
  infoValue:          { color: '#fff', fontSize: 13, fontWeight: '600', maxWidth: '55%', textAlign: 'right' },
  divider:            { height: 1, backgroundColor: COLORS.border },
  totalRow:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: 4 },
  totalLabel:         { color: COLORS.textSecondary, fontSize: 14 },
  totalValue:         { color: COLORS.primary, fontSize: 24, fontWeight: '900' },
  notice:             { flexDirection: 'row', gap: 8, marginTop: 18, padding: 14, backgroundColor: COLORS.surfaceAlt, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  noticeText:         { color: COLORS.textDim, fontSize: 12, lineHeight: 18, flex: 1 },
  errorBox:           { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 14, padding: 14, backgroundColor: COLORS.errorBg, borderRadius: 12, borderWidth: 1, borderColor: COLORS.error + '44' },
  errorText:          { color: COLORS.error, fontSize: 13, flex: 1 },
  footer:             { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border, paddingHorizontal: 20, paddingTop: 14 },
  confirmBtnWrap:     {},
  confirmBtn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, borderRadius: 30 },
  confirmBtnText:     { color: '#fff', fontSize: 16, fontWeight: '700' },
  successRoot:        { flex: 1 },
  successInner:       { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  successIconWrap:    { marginBottom: 24 },
  successCircle:      { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center' },
  successTitle:       { color: '#fff', fontSize: 26, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  successMovie:       { color: COLORS.textSecondary, fontSize: 16, textAlign: 'center', marginBottom: 28 },
  reservationIdBox:   { alignItems: 'center', backgroundColor: COLORS.surfaceAlt, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 16, marginBottom: 32, borderWidth: 1, borderColor: COLORS.border },
  reservationIdLabel: { color: COLORS.textDim, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  reservationIdValue: { color: COLORS.gold, fontSize: 22, fontWeight: '800' },
  successActions:     { width: '100%', gap: 12 },
  primaryAction:      {},
  primaryActionGrad:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, borderRadius: 30 },
  primaryActionText:  { color: '#fff', fontSize: 15, fontWeight: '700' },
  secondaryAction:    { alignItems: 'center', paddingVertical: 14 },
  secondaryActionText:{ color: COLORS.textSecondary, fontSize: 14 },
});
