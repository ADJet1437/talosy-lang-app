import React, { useRef, useState } from 'react';
import {
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { C } from '../theme';
import { buildActiveDays, computeStreaks } from '../utils/streak';

const LANGUAGES = [
  'English', 'Spanish', 'French', 'German', 'Swedish',
  'Japanese', 'Mandarin', 'Korean', 'Italian', 'Portuguese',
];


type ModalTarget = 'learn' | 'native';

type Props = {
  isImmersive: boolean;
  learnLang: string;
  nativeLang: string;
  onLearnLangChange: (lang: string) => void;
  onNativeLangChange: (lang: string) => void;
  userMessages: number;
  aiMessages: number;
  onToggleMode: () => void;
};

export function ProfileTab({
  isImmersive,
  learnLang,
  nativeLang,
  onLearnLangChange,
  onNativeLangChange,
  userMessages,
  aiMessages,
  onToggleMode,
}: Props) {
  // ── Streak data ─────────────────────────────────────────────────────────────
  const activeDays = useRef(buildActiveDays()).current;
  const { current: streakCurrent, longest: streakLongest } = computeStreaks(activeDays);
  const gap         = streakLongest - streakCurrent;
  const progressPct = streakLongest > 0 ? Math.min(streakCurrent / streakLongest, 1) : 1;
  const motiveLine  = gap <= 0
    ? 'New personal best! 🏆'
    : `${gap} more day${gap === 1 ? '' : 's'} to beat your best of ${streakLongest}`;

  // ── Settings full-screen ────────────────────────────────────────────────────
  const [settingsVisible, setSettingsVisible] = useState(false);

  // ── Language picker ─────────────────────────────────────────────────────────
  const [langOpen,   setLangOpen]   = useState(false);
  const [langTarget, setLangTarget] = useState<ModalTarget>('learn');
  const [search,     setSearch]     = useState('');

  const activeL  = langTarget === 'learn' ? learnLang : nativeLang;
  const filtered = search.trim()
    ? LANGUAGES.filter((l) => l.toLowerCase().includes(search.toLowerCase()))
    : LANGUAGES;

  function openLang(target: ModalTarget) {
    setLangTarget(target);
    setSearch('');
    setLangOpen(true);
  }

  function pickLang(lang: string) {
    if (langTarget === 'learn') onLearnLangChange(lang);
    else onNativeLangChange(lang);
    setLangOpen(false);
    setSearch('');
  }

  return (
    <>
      {/* ── Profile header ──────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.avatarRow}>
          <View style={styles.avatar} />
          <View>
            <Text style={styles.userName}>Alex Morgan</Text>
            <Text style={styles.userEmail}>alex.morgan@gmail.com</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.settingsBtn} onPress={() => setSettingsVisible(true)} activeOpacity={0.7}>
          <Text style={styles.settingsIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <View style={styles.body}>

        {/* Streak insight card */}
        <View style={styles.streakCard}>

          {/* Top row */}
          <View style={styles.streakTopRow}>
            <View style={styles.streakTitleRow}>
              <Text style={styles.streakFlame}>🔥</Text>
              <Text style={styles.streakTitle}>{streakCurrent}-day streak</Text>
            </View>
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>Active</Text>
            </View>
          </View>

          {/* Progress bar */}
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPct * 100}%` as any }]} />
          </View>
          <View style={styles.progressLabelRow}>
            <Text style={styles.motiveLine}>{motiveLine}</Text>
            <Text style={styles.progressLabel}>{streakCurrent} / {streakLongest}</Text>
          </View>

          {/* Mini stats */}
          <View style={styles.miniStatsRow}>
            <View style={styles.miniStat}>
              <Text style={styles.miniStatEmoji}>🔥</Text>
              <Text style={styles.miniStatVal}>{streakCurrent}</Text>
              <Text style={styles.miniStatLbl}>Current</Text>
            </View>
            <View style={styles.miniStatDivider} />
            <View style={styles.miniStat}>
              <Text style={styles.miniStatEmoji}>⚡</Text>
              <Text style={styles.miniStatVal}>{streakLongest}</Text>
              <Text style={styles.miniStatLbl}>Longest</Text>
            </View>
          </View>

        </View>
      </View>

      {/* ── Settings full-screen ────────────────────────────────────────── */}
      <Modal
        visible={settingsVisible}
        transparent={false}
        animationType="none"
        onRequestClose={() => setSettingsVisible(false)}
      >
        <View style={styles.settingsScreen}>

          {/* Settings header */}
          <View style={styles.settingsHeader}>
            <TouchableOpacity style={styles.backBtn} onPress={() => setSettingsVisible(false)} activeOpacity={0.7}>
              <Text style={styles.backArrow}>‹</Text>
              <Text style={styles.backLabel}>Back</Text>
            </TouchableOpacity>
            <Text style={styles.settingsTitle}>Settings</Text>
            <View style={styles.backBtn} />
          </View>

          {/* Settings content */}
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.settingsScroll}>

            <Text style={styles.section}>Conversation</Text>
            <View style={styles.card}>
              <View style={styles.row}>
                <View style={styles.rowLeft}>
                  <Text style={styles.rowIcon}>{isImmersive ? '⚡' : '✋'}</Text>
                  <View>
                    <Text style={styles.rowLabel}>{isImmersive ? 'Immersive mode' : 'Manual mode'}</Text>
                    <Text style={styles.rowSub}>{isImmersive ? 'Auto-detects speech' : 'Tap bar to speak'}</Text>
                  </View>
                </View>
                <Switch
                  value={isImmersive}
                  onValueChange={onToggleMode}
                  trackColor={{ false: C.BORDER_DEFAULT, true: C.PURPLE }}
                  thumbColor={isImmersive ? '#e0d8ff' : C.TEXT_MUTED}
                />
              </View>
            </View>

            <Text style={styles.section}>Languages</Text>
            <Text style={styles.langNote}>Changes take effect on the next session</Text>
            <View style={styles.card}>
              <TouchableOpacity style={styles.row} onPress={() => openLang('learn')} activeOpacity={0.7}>
                <Text style={styles.rowLabel}>I want to practice</Text>
                <View style={styles.dropdownRow}>
                  <Text style={styles.dropdownValue}>{learnLang}</Text>
                  <Text style={styles.chevron}>›</Text>
                </View>
              </TouchableOpacity>
              <View style={styles.divider} />
              <TouchableOpacity style={styles.row} onPress={() => openLang('native')} activeOpacity={0.7}>
                <Text style={styles.rowLabel}>I speak</Text>
                <View style={styles.dropdownRow}>
                  <Text style={styles.dropdownValue}>{nativeLang}</Text>
                  <Text style={styles.chevron}>›</Text>
                </View>
              </TouchableOpacity>
            </View>

            <Text style={styles.section}>This Session</Text>
            <View style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Messages sent</Text>
                <Text style={styles.rowValue}>{userMessages}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.row}>
                <Text style={styles.rowLabel}>AI responses</Text>
                <Text style={styles.rowValue}>{aiMessages}</Text>
              </View>
            </View>

            <Text style={styles.section}>About</Text>
            <View style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Talkos</Text>
                <Text style={styles.rowValue}>v1.0.0</Text>
              </View>
            </View>

          </ScrollView>
        </View>

        {/* Language picker — rendered inside settings Modal so it layers on top */}
        <Modal visible={langOpen} animationType="slide" presentationStyle="pageSheet">
          <SafeAreaView style={styles.langModal}>
            <View style={styles.langHeader}>
              <Text style={styles.langTitle}>
                {langTarget === 'learn' ? 'I want to practice' : 'I speak'}
              </Text>
              <TouchableOpacity onPress={() => { setLangOpen(false); setSearch(''); }}>
                <Text style={styles.langDone}>Done</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.searchRow}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search…"
                placeholderTextColor={C.TEXT_MUTED}
                value={search}
                onChangeText={setSearch}
                autoCorrect={false}
              />
            </View>
            <FlatList
              data={filtered}
              keyExtractor={(l) => l}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.listRow, item === activeL && styles.listRowActive]}
                  onPress={() => pickLang(item)}
                >
                  <Text style={[styles.listRowName, item === activeL && styles.listRowNameActive]}>
                    {item}
                  </Text>
                  {item === activeL && <Text style={styles.listRowCheck}>✓</Text>}
                </TouchableOpacity>
              )}
            />
          </SafeAreaView>
        </Modal>

      </Modal>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({

  // ── Profile header ──────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: C.BORDER_DEFAULT,
    backgroundColor: C.BG_SURFACE,
  },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#6d28d9',
    borderWidth: 2, borderColor: '#6d28d9',
  },
  userName:  { color: C.TEXT_PRIMARY,   fontSize: 14, fontWeight: '700' },
  userEmail: { color: C.TEXT_MUTED,     fontSize: 12, marginTop: 1 },
  settingsBtn: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: C.BG_ELEVATED,
    alignItems: 'center', justifyContent: 'center',
  },
  settingsIcon: { fontSize: 16 },

  // ── Body ────────────────────────────────────────────────────────────────────
  body: { flex: 1, backgroundColor: C.BG_BASE, padding: 16 },

  // ── Streak insight card ─────────────────────────────────────────────────────
  streakCard: {
    backgroundColor: C.BG_SURFACE,
    borderRadius: 18,
    borderWidth: 1, borderColor: C.BORDER_DEFAULT,
    padding: 18,
    gap: 14,
  },
  streakTopRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  streakTitleRow:{ flexDirection: 'row', alignItems: 'center', gap: 8 },
  streakFlame:   { fontSize: 24 },
  streakTitle:   { color: C.TEXT_PRIMARY, fontSize: 17, fontWeight: '800' },

  activeBadge: {
    backgroundColor: '#2a1500',
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4,
  },
  activeBadgeText: { color: '#f59e0b', fontSize: 12, fontWeight: '700' },

  progressTrack: {
    height: 6, backgroundColor: C.BG_ELEVATED,
    borderRadius: 3, overflow: 'hidden',
  },
  progressFill: {
    height: 6, backgroundColor: '#f59e0b', borderRadius: 3,
  },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: -6 },
  motiveLine:    { color: C.TEXT_MUTED, fontSize: 12, fontStyle: 'italic', flex: 1 },
  progressLabel: { color: C.TEXT_MUTED, fontSize: 12, fontWeight: '600' },

  miniStatsRow: {
    flexDirection: 'row',
    backgroundColor: C.BG_ELEVATED,
    borderRadius: 14,
    borderWidth: 1, borderColor: C.BORDER_DEFAULT,
    overflow: 'hidden',
  },
  miniStat: { flex: 1, alignItems: 'center', paddingVertical: 12, gap: 2 },
  miniStatDivider: { width: 1, backgroundColor: C.BORDER_DEFAULT, marginVertical: 10 },
  miniStatEmoji: { fontSize: 16 },
  miniStatVal:   { color: C.TEXT_PRIMARY, fontSize: 22, fontWeight: '800' },
  miniStatLbl:   { color: C.TEXT_MUTED,   fontSize: 11, fontWeight: '600' },

  // ── Settings full-screen ────────────────────────────────────────────────────
  settingsScreen: {
    flex: 1,
    backgroundColor: C.BG_BASE,
  },
  settingsHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: C.BORDER_DEFAULT,
    backgroundColor: C.BG_SURFACE,
  },
  backBtn:   { flexDirection: 'row', alignItems: 'center', gap: 2, minWidth: 64 },
  backArrow: { color: C.BLUE, fontSize: 26, fontWeight: '300', lineHeight: 28 },
  backLabel: { color: C.BLUE, fontSize: 16 },
  settingsTitle: { color: C.TEXT_PRIMARY, fontSize: 16, fontWeight: '700' },

  settingsScroll: { padding: 20, gap: 8, paddingBottom: 48 },

  // ── Shared settings rows ────────────────────────────────────────────────────
  section: {
    color: C.TEXT_MUTED, fontSize: 11, fontWeight: '700',
    letterSpacing: 0.8, textTransform: 'uppercase',
    marginTop: 12, marginBottom: 4, paddingHorizontal: 4,
  },
  langNote: {
    color: C.TEXT_MUTED, fontSize: 11,
    paddingHorizontal: 4, marginBottom: 4, marginTop: -4,
  },
  card: {
    backgroundColor: C.BG_SURFACE,
    borderRadius: 14,
    borderWidth: 1, borderColor: C.BORDER_DEFAULT,
    overflow: 'hidden',
  },
  divider: { height: 1, backgroundColor: C.BORDER_DEFAULT, marginHorizontal: 16 },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  rowLeft:  { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  rowIcon:  { fontSize: 20 },
  rowLabel: { color: C.TEXT_PRIMARY, fontSize: 15, fontWeight: '500' },
  rowSub:   { color: C.TEXT_MUTED, fontSize: 12, marginTop: 2 },
  rowValue: { color: C.TEXT_SECONDARY, fontSize: 14 },

  dropdownRow:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dropdownValue: { color: C.TEXT_SECONDARY, fontSize: 14 },
  chevron:       { color: C.TEXT_MUTED, fontSize: 18, fontWeight: '300' },

  // ── Language picker ─────────────────────────────────────────────────────────
  langModal:  { flex: 1, backgroundColor: C.BG_BASE },
  langHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: C.BORDER_DEFAULT,
  },
  langTitle: { color: C.TEXT_PRIMARY, fontSize: 17, fontWeight: '700' },
  langDone:  { color: C.PURPLE, fontSize: 16, fontWeight: '600' },

  searchRow: { padding: 16, paddingBottom: 8 },
  searchInput: {
    backgroundColor: C.BG_ELEVATED,
    borderRadius: 12,
    borderWidth: 1, borderColor: C.BORDER_DEFAULT,
    paddingHorizontal: 16, paddingVertical: 12,
    color: C.TEXT_PRIMARY, fontSize: 15,
  },

  listRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14, gap: 14,
    borderBottomWidth: 1, borderBottomColor: C.BORDER_SUBTLE,
  },
  listRowActive:     { backgroundColor: C.BG_ELEVATED },
  listRowName:       { flex: 1, color: C.TEXT_SECONDARY, fontSize: 15 },
  listRowNameActive: { color: C.TEXT_PRIMARY, fontWeight: '600' },
  listRowCheck:      { color: C.PURPLE, fontSize: 16, fontWeight: '700' },
});
