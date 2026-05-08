import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Dimensions, StatusBar, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../theme/colors';

const { width: W } = Dimensions.get('window');

const ROWS         = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
const SEATS_PER_ROW = 12;
const VIP_ROWS     = ['A', 'B'];
const AISLE_AFTER  = 6; // gap between seat 6 and 7

const SEAT_SIZE = W < 380 ? 26 : W < 500 ? 29 : 32;
const SEAT_GAP  = 4;
const AISLE_W   = 16;

// Deterministic seat-taken check based on showtime + position
function isTaken(showtimeId, row, seatNum, availableSeats) {
  const total       = ROWS.length * SEATS_PER_ROW;
  const taken       = Math.max(0, total - (availableSeats ?? total));
  const takenRatio  = taken / total;
  const hash        = Math.abs((showtimeId * 13 + row.charCodeAt(0) * 7 + seatNum * 3) % 100);
  return hash < Math.floor(takenRatio * 100);
}

function LegendItem({ color, label, vip }) {
  return (
    <View style={s.legendItem}>
      <View style={[s.legendBox, { backgroundColor: color }, vip && { borderWidth: 1.5, borderColor: COLORS.gold }]} />
      <Text style={s.legendLabel}>{label}</Text>
    </View>
  );
}

export default function SeatSelectionScreen({ navigation, route }) {
  const {
    showtimeId, movieTitle, cinemaName, showDate, showTime,
    hallName, availableSeats, ticketPrice, categoryId,
  } = route.params;

  const [selected, setSelected] = useState([]); // e.g. ['A3', 'B7']

  const toggleSeat = (key, taken) => {
    if (taken) return;
    setSelected(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const total = selected.length * (ticketPrice ?? 9.5);

  const mapWidth =
    SEATS_PER_ROW * (SEAT_SIZE + SEAT_GAP) + AISLE_W + 32; // 32 = row label

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" />

      {/* ── HEADER ── */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: COLORS.background }}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={s.headerInfo}>
            <Text style={s.headerTitle} numberOfLines={1}>{movieTitle}</Text>
            <Text style={s.headerSub}>{showDate} • {showTime} • {hallName}</Text>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

        {/* ── SCREEN INDICATOR ── */}
        <View style={s.screenArea}>
          <LinearGradient
            colors={['rgba(229,9,20,0.25)', 'transparent']}
            style={s.screenGlow}
          />
          <View style={s.screenBar}>
            <Text style={s.screenLabel}>ΟΘΟΝΗ</Text>
          </View>
          <View style={s.screenShadow} />
        </View>

        {/* ── SEAT MAP ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.seatMapScroll}>
          <View style={{ width: mapWidth }}>
            {ROWS.map(row => {
              const isVip = VIP_ROWS.includes(row);
              return (
                <View key={row} style={s.seatRow}>
                  <Text style={s.rowLabel}>{row}</Text>
                  <View style={s.seatsInRow}>
                    {Array.from({ length: SEATS_PER_ROW }, (_, idx) => {
                      const seatNum = idx + 1;
                      const key     = `${row}${seatNum}`;
                      const taken   = isTaken(showtimeId, row, seatNum, availableSeats);
                      const sel     = selected.includes(key);
                      const showAisle = seatNum === AISLE_AFTER + 1;

                      return (
                        <React.Fragment key={key}>
                          {showAisle && <View style={{ width: AISLE_W }} />}
                          <TouchableOpacity
                            onPress={() => toggleSeat(key, taken)}
                            disabled={taken}
                            style={[
                              s.seat,
                              { width: SEAT_SIZE, height: SEAT_SIZE, borderRadius: SEAT_SIZE * 0.28 },
                              taken && s.seatTaken,
                              !taken && !sel && !isVip && s.seatFree,
                              !taken && !sel && isVip  && s.seatVip,
                              sel    && s.seatSelected,
                            ]}
                          >
                            {sel && (
                              <Ionicons name="checkmark" size={SEAT_SIZE * 0.52} color="#fff" />
                            )}
                          </TouchableOpacity>
                        </React.Fragment>
                      );
                    })}
                  </View>
                  {isVip && <Text style={s.vipTag}>VIP</Text>}
                </View>
              );
            })}
          </View>
        </ScrollView>

        {/* ── LEGEND ── */}
        <View style={s.legend}>
          <LegendItem color={COLORS.seatFree}     label="Ελεύθερη" />
          <LegendItem color={COLORS.seatSelected}  label="Επιλεγμένη" />
          <LegendItem color={COLORS.seatTaken}     label="Κατειλημμένη" />
          <LegendItem color={COLORS.seatVip}       label="VIP" vip />
        </View>
      </ScrollView>

      {/* ── BOTTOM BAR ── */}
      {selected.length > 0 ? (
        <View style={s.bottomBarWrap}>
          <LinearGradient
            colors={['transparent', COLORS.background]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <SafeAreaView edges={['bottom']} style={s.bottomBar}>
            <View style={s.bottomInfo}>
              <Text style={s.bottomCount}>
                {selected.length} θέση{selected.length !== 1 ? 'ς' : ''}
              </Text>
              <Text style={s.seatsChosen}>{selected.join(' · ')}</Text>
            </View>
            <View style={s.bottomRight}>
              <Text style={s.totalLabel}>Σύνολο</Text>
              <Text style={s.totalValue}>€{total.toFixed(2)}</Text>
            </View>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate('Confirmation', {
                  showtimeId,
                  selectedSeats: selected,
                  movieTitle,
                  cinemaName,
                  showDate,
                  showTime,
                  hallName,
                  totalPrice: total,
                  categoryId,
                  numTickets: selected.length,
                })
              }
            >
              <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={s.continueBtn}>
                <Text style={s.continueBtnText}>Συνέχεια</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </SafeAreaView>
        </View>
      ) : (
        <View style={s.hintBar}>
          <SafeAreaView edges={['bottom']}>
            <Text style={s.hintText}>Επιλέξτε θέσεις για να συνεχίσετε</Text>
          </SafeAreaView>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root:           { flex: 1, backgroundColor: COLORS.background },
  header:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  backBtn:        { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.surfaceAlt, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  headerInfo:     { flex: 1 },
  headerTitle:    { color: '#fff', fontSize: 15, fontWeight: '700' },
  headerSub:      { color: COLORS.textDim, fontSize: 11, marginTop: 2 },
  screenArea:     { alignItems: 'center', paddingTop: 20, paddingBottom: 16 },
  screenGlow:     { position: 'absolute', top: 0, left: '10%', right: '10%', height: 60 },
  screenBar:      { width: '70%', height: 6, borderRadius: 3, backgroundColor: COLORS.primary, opacity: 0.9 },
  screenShadow:   { width: '55%', height: 3, borderRadius: 2, backgroundColor: COLORS.primary, opacity: 0.25, marginTop: 3 },
  screenLabel:    { display: 'none' }, // hidden — bar IS the screen indicator
  seatMapScroll:  { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  seatRow:        { flexDirection: 'row', alignItems: 'center', marginBottom: SEAT_GAP, gap: 8 },
  rowLabel:       { color: COLORS.textDim, fontSize: 11, fontWeight: '700', width: 16, textAlign: 'center' },
  seatsInRow:     { flexDirection: 'row', gap: SEAT_GAP },
  seat:           { justifyContent: 'center', alignItems: 'center' },
  seatFree:       { backgroundColor: COLORS.seatFree, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  seatSelected:   { backgroundColor: COLORS.seatSelected },
  seatTaken:      { backgroundColor: COLORS.seatTaken },
  seatVip:        { backgroundColor: COLORS.seatVip, borderWidth: 1, borderColor: COLORS.gold + '55' },
  vipTag:         { color: COLORS.gold, fontSize: 10, fontWeight: '700', marginLeft: 8, letterSpacing: 0.5 },
  legend:         { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 16, paddingVertical: 16, paddingHorizontal: 16 },
  legendItem:     { flexDirection: 'row', alignItems: 'center', gap: 7 },
  legendBox:      { width: 16, height: 16, borderRadius: 4 },
  legendLabel:    { color: COLORS.textSecondary, fontSize: 12 },
  bottomBarWrap:  { position: 'absolute', bottom: 0, left: 0, right: 0 },
  bottomBar:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 10, backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border },
  bottomInfo:     { flex: 1 },
  bottomCount:    { color: '#fff', fontSize: 14, fontWeight: '700' },
  seatsChosen:    { color: COLORS.textDim, fontSize: 11, marginTop: 2, flexShrink: 1 },
  bottomRight:    { alignItems: 'flex-end', marginRight: 4 },
  totalLabel:     { color: COLORS.textDim, fontSize: 11 },
  totalValue:     { color: '#fff', fontSize: 18, fontWeight: '800' },
  continueBtn:    { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 28 },
  continueBtnText:{ color: '#fff', fontSize: 14, fontWeight: '700' },
  hintBar:        { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border, paddingHorizontal: 20, paddingTop: 16 },
  hintText:       { color: COLORS.textDim, fontSize: 13, textAlign: 'center', paddingBottom: 8 },
});
