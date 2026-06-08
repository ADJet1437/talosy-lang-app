import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { C } from '../theme';
import { buildActiveDays, computeStreaks } from '../utils/streak';

type Props = {
  visible: boolean;
  onClose: () => void;
};

const SCREEN_WIDTH   = Dimensions.get('window').width;
const SHEET_HEIGHT   = Dimensions.get('window').height * 0.72;
const H_PAD          = 24;
const CELL_SIZE      = Math.floor((SCREEN_WIDTH - H_PAD * 2) / 7);
const DAY_SIZE       = Math.min(36, CELL_SIZE - 8);

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DOW_LABELS = ['M','T','W','T','F','S','S'];


function subtitle(n: number): string {
  if (n === 0)  return 'Start your streak today!';
  if (n === 1)  return 'Great start — day 1!';
  if (n < 7)    return "You're on a roll — keep it up!";
  if (n < 14)   return 'One week strong 💪';
  if (n < 30)   return "Two weeks! You're unstoppable";
  return 'Monthly legend 🏆';
}

// ─── Calendar helpers ─────────────────────────────────────────────────────────

function daysInMonth(y: number, m: number) { return new Date(y, m+1, 0).getDate(); }

// 0=Monday … 6=Sunday
function firstDow(y: number, m: number) { return (new Date(y, m, 1).getDay() + 6) % 7; }

// ─── Component ────────────────────────────────────────────────────────────────

export function StreakSheet({ visible, onClose }: Props) {
  const insets      = useSafeAreaInsets();
  const slideAnim   = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const activeDays  = useRef(buildActiveDays()).current;
  const { current, longest } = computeStreaks(activeDays);

  const now = new Date();
  const [viewYear,  setViewYear]  = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 0 : SHEET_HEIGHT,
      tension: 65, friction: 11, useNativeDriver: true,
    }).start();
  }, [visible]);

  function goBack() {
    if (viewMonth === 0) { setViewYear(y => y-1); setViewMonth(11); }
    else setViewMonth(m => m-1);
  }
  function goNext() {
    if (viewMonth === 11) { setViewYear(y => y+1); setViewMonth(0); }
    else setViewMonth(m => m+1);
  }

  // Build grid cells
  const dim   = daysInMonth(viewYear, viewMonth);
  const fdow  = firstDow(viewYear, viewMonth);
  const cells: (number|null)[] = [...Array(fdow).fill(null), ...Array.from({length:dim},(_,i)=>i+1)];
  while (cells.length % 7) cells.push(null);
  const rows: (number|null)[][] = [];
  for (let i = 0; i < cells.length; i+=7) rows.push(cells.slice(i,i+7));

  const todayY = now.getFullYear(), todayM = now.getMonth(), todayD = now.getDate();

  function cellStr(day: number) {
    return `${viewYear}-${String(viewMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  }
  function isToday(day: number)  { return viewYear===todayY && viewMonth===todayM && day===todayD; }
  function isFuture(day: number) {
    if (viewYear > todayY) return true;
    if (viewYear === todayY && viewMonth > todayM) return true;
    return viewYear===todayY && viewMonth===todayM && day>todayD;
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <Animated.View style={[
          styles.sheet,
          { transform: [{ translateY: slideAnim }], paddingBottom: insets.bottom + 20 },
        ]}>

          {/* ── Top row ─────────────────────────────────────────────────── */}
          <View style={styles.topRow}>
            <View>
              <View style={styles.headingRow}>
                <Text style={styles.flameLg}>🔥</Text>
                <Text style={styles.streakNum}>{current}</Text>
                <Text style={styles.streakUnit}>-day streak</Text>
              </View>
              <Text style={styles.sub}>{subtitle(current)}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* ── Month navigation ────────────────────────────────────────── */}
          <View style={styles.monthNav}>
            <TouchableOpacity onPress={goBack} style={styles.navBtn} activeOpacity={0.7}>
              <Text style={styles.navArrow}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.monthLabel}>{MONTH_NAMES[viewMonth]} {viewYear}</Text>
            <TouchableOpacity onPress={goNext} style={styles.navBtn} activeOpacity={0.7}>
              <Text style={styles.navArrow}>›</Text>
            </TouchableOpacity>
          </View>

          {/* ── Day-of-week headers ─────────────────────────────────────── */}
          <View style={styles.dowRow}>
            {DOW_LABELS.map((lbl, i) => (
              <View key={i} style={styles.dowCell}>
                <Text style={styles.dowLabel}>{lbl}</Text>
              </View>
            ))}
          </View>

          {/* ── Calendar grid ───────────────────────────────────────────── */}
          <View style={styles.grid}>
            {rows.map((row, ri) => (
              <View key={ri} style={styles.gridRow}>
                {row.map((day, ci) => {
                  if (day === null) return <View key={ci} style={styles.cell} />;

                  const active  = activeDays.has(cellStr(day)) && !isFuture(day);
                  const today   = isToday(day);
                  const future  = isFuture(day);

                  return (
                    <View key={ci} style={styles.cell}>
                      <View style={[
                        styles.dayCircle,
                        active              && styles.dayCircleActive,
                        today && !active    && styles.dayCircleToday,
                        today && active     && styles.dayCircleTodayActive,
                      ]}>
                        <Text style={[
                          styles.dayNum,
                          active              && styles.dayNumActive,
                          today && !active    && styles.dayNumToday,
                          future              && styles.dayNumFuture,
                        ]}>
                          {day}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>

          {/* ── Stats ───────────────────────────────────────────────────── */}
          <View style={styles.statsCard}>
            <View style={styles.statBox}>
              <Text style={styles.statEmoji}>🔥</Text>
              <Text style={styles.statVal}>{current}</Text>
              <Text style={styles.statLbl}>Current</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statEmoji}>⚡</Text>
              <Text style={styles.statVal}>{longest}</Text>
              <Text style={styles.statLbl}>Longest</Text>
            </View>
          </View>

        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const AMBER      = '#f59e0b';
const AMBER_DIM  = '#2a1500';
const AMBER_TEXT = '#1a0e00';

const styles = StyleSheet.create({
  overlay:  { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },

  sheet: {
    height: SHEET_HEIGHT,
    backgroundColor: C.BG_SURFACE,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: H_PAD,
    paddingTop: 28,
    gap: 20,
  },

  // ── Header ────────────────────────────────────────────────────────────────
  topRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  flameLg:    { fontSize: 32 },
  streakNum:  { fontSize: 32, fontWeight: '800', color: AMBER },
  streakUnit: { fontSize: 16, fontWeight: '600', color: C.TEXT_SECONDARY, marginTop: 6 },
  sub:        { color: C.TEXT_MUTED, fontSize: 13, marginTop: 4 },

  closeBtn:  { padding: 4, marginTop: 4 },
  closeIcon: { color: C.TEXT_MUTED, fontSize: 16 },

  // ── Month nav ─────────────────────────────────────────────────────────────
  monthNav:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navBtn:     { padding: 8 },
  navArrow:   { color: C.TEXT_PRIMARY, fontSize: 24, fontWeight: '300' },
  monthLabel: { color: C.TEXT_PRIMARY, fontSize: 15, fontWeight: '700' },

  // ── DOW headers ───────────────────────────────────────────────────────────
  dowRow:  { flexDirection: 'row' },
  dowCell: { width: CELL_SIZE, alignItems: 'center' },
  dowLabel:{ color: C.TEXT_MUTED, fontSize: 11, fontWeight: '700' },

  // ── Grid ──────────────────────────────────────────────────────────────────
  grid:    { gap: 4 },
  gridRow: { flexDirection: 'row' },
  cell:    { width: CELL_SIZE, height: CELL_SIZE, alignItems: 'center', justifyContent: 'center' },

  dayCircle: {
    width: DAY_SIZE,
    height: DAY_SIZE,
    borderRadius: DAY_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleActive: {
    backgroundColor: AMBER,
  },
  dayCircleToday: {
    borderWidth: 1.5,
    borderColor: C.BORDER_STRONG,
  },
  dayCircleTodayActive: {
    backgroundColor: AMBER,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },

  dayNum: {
    fontSize: 13,
    fontWeight: '500',
    color: C.TEXT_SECONDARY,
  },
  dayNumActive: {
    color: AMBER_TEXT,
    fontWeight: '700',
  },
  dayNumToday: {
    color: C.TEXT_PRIMARY,
    fontWeight: '700',
  },
  dayNumFuture: {
    color: C.TEXT_MUTED,
    opacity: 0.5,
  },

  // ── Stats ─────────────────────────────────────────────────────────────────
  statsCard: {
    flexDirection: 'row',
    backgroundColor: C.BG_ELEVATED,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.BORDER_DEFAULT,
    overflow: 'hidden',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    gap: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: C.BORDER_DEFAULT,
    marginVertical: 12,
  },
  statEmoji: { fontSize: 20 },
  statVal:   { color: C.TEXT_PRIMARY, fontSize: 26, fontWeight: '800' },
  statLbl:   { color: C.TEXT_MUTED,   fontSize: 11, fontWeight: '600' },
});
