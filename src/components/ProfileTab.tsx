import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../context/AuthContext';
import { ConversationGrowthChart } from './ConversationGrowthChart';
import { C } from '../theme';

const LANGUAGES = ['English', 'Swedish', 'Chinese'];

type ModalTarget = 'learn' | 'native';

type Props = {
  isImmersive: boolean;
  learnLang: string;
  nativeLang: string;
  onLearnLangChange: (lang: string) => void;
  onNativeLangChange: (lang: string) => void;
  onToggleMode: () => void;
  currentStreak: number;
  longestStreak: number;
  activeDays: Set<string>;
};

export function ProfileTab({
  isImmersive,
  learnLang,
  nativeLang,
  onLearnLangChange,
  onNativeLangChange,
  onToggleMode,
  currentStreak,
  longestStreak,
}: Props) {
  const { user, token, signOut } = useAuth();

  const gap         = longestStreak - currentStreak;
  const progressPct = longestStreak > 0 ? Math.min(currentStreak / longestStreak, 1) : 1;
  const motiveLine  = gap <= 0
    ? 'New personal best! 🏆'
    : `${gap} more day${gap === 1 ? '' : 's'} to beat your best of ${longestStreak}`;

  const [langOpen,   setLangOpen]   = useState(false);
  const [langTarget, setLangTarget] = useState<ModalTarget>('learn');

  const activeL = langTarget === 'learn' ? learnLang : nativeLang;

  function openLang(target: ModalTarget) {
    setLangTarget(target);
    setLangOpen(true);
  }

  function pickLang(lang: string) {
    if (langTarget === 'learn') onLearnLangChange(lang);
    else onNativeLangChange(lang);
    setLangOpen(false);
  }

  return (
    <>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Profile header ─────────────────────────────────────────────── */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar} />
          <View style={styles.profileInfo}>
            <Text style={styles.userName}>{user?.name || 'User'}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
          </View>
        </View>

        {/* ── Streak insight card ────────────────────────────────────────── */}
        <View style={styles.streakCard}>
          <View style={styles.streakTopRow}>
            <View style={styles.streakTitleRow}>
              <Text style={styles.streakFlame}>🔥</Text>
              <Text style={styles.streakTitle}>{currentStreak} day streak</Text>
            </View>
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>Active</Text>
            </View>
          </View>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPct * 100}%` as any }]} />
          </View>
          <View style={styles.progressLabelRow}>
            <Text style={styles.motiveLine}>{motiveLine}</Text>
            <Text style={styles.progressLabel}>{currentStreak} / {longestStreak}</Text>
          </View>

          <View style={styles.miniStatsRow}>
            <View style={styles.miniStat}>
              <Text style={styles.miniStatEmoji}>🔥</Text>
              <Text style={styles.miniStatVal}>{currentStreak}</Text>
              <Text style={styles.miniStatLbl}>Current</Text>
            </View>
            <View style={styles.miniStatDivider} />
            <View style={styles.miniStat}>
              <Text style={styles.miniStatEmoji}>⚡</Text>
              <Text style={styles.miniStatVal}>{longestStreak}</Text>
              <Text style={styles.miniStatLbl}>Longest</Text>
            </View>
          </View>
        </View>

        {/* ── Conversation growth chart ──────────────────────────────────── */}
        {token && <ConversationGrowthChart token={token} />}

        {/* ── Conversation ───────────────────────────────────────────────── */}
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

        {/* ── Languages ──────────────────────────────────────────────────── */}
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

        {/* ── About ──────────────────────────────────────────────────────── */}
        <Text style={styles.section}>About</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Talkos</Text>
            <Text style={styles.rowValue}>v1.0.0</Text>
          </View>
        </View>

        {/* ── Sign out ───────────────────────────────────────────────────── */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() =>
            Alert.alert('Sign out', 'Are you sure you want to sign out?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Sign out', style: 'destructive', onPress: signOut },
            ])
          }
          activeOpacity={0.8}
        >
          <Text style={styles.logoutText}>Sign out</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* ── Language picker sheet ───────────────────────────────────────── */}
      <Modal visible={langOpen} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.langModal}>
          <View style={styles.langHeader}>
            <Text style={styles.langTitle}>
              {langTarget === 'learn' ? 'I want to practice' : 'I speak'}
            </Text>
            <TouchableOpacity onPress={() => setLangOpen(false)}>
              <Text style={styles.langDone}>Done</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={LANGUAGES}
            keyExtractor={(l) => l}
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
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll:   { flex: 1, backgroundColor: C.BG_BASE },
  content:  { padding: 20, gap: 8, paddingBottom: 48 },

  // ── Profile header ──────────────────────────────────────────────────────────
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
  },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#6d28d9',
    flexShrink: 0,
  },
  profileInfo: { flex: 1 },
  userName:    { color: C.TEXT_PRIMARY, fontSize: 17, fontWeight: '700' },
  userEmail:   { color: C.TEXT_MUTED,   fontSize: 13, marginTop: 2 },

  // ── Streak card ─────────────────────────────────────────────────────────────
  streakCard: {
    backgroundColor: C.BG_SURFACE,
    borderRadius: 18,
    borderWidth: 1, borderColor: C.BORDER_DEFAULT,
    padding: 18,
    gap: 14,
    marginBottom: 8,
  },
  streakTopRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  streakTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  streakFlame:    { fontSize: 24 },
  streakTitle:    { color: C.TEXT_PRIMARY, fontSize: 17, fontWeight: '800' },

  activeBadge: {
    backgroundColor: '#2a1500',
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4,
  },
  activeBadgeText: { color: '#f59e0b', fontSize: 12, fontWeight: '700' },

  progressTrack: { height: 6, backgroundColor: C.BG_ELEVATED, borderRadius: 3, overflow: 'hidden' },
  progressFill:  { height: 6, backgroundColor: '#f59e0b', borderRadius: 3 },

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
  miniStat:        { flex: 1, alignItems: 'center', paddingVertical: 12, gap: 2 },
  miniStatDivider: { width: 1, backgroundColor: C.BORDER_DEFAULT, marginVertical: 10 },
  miniStatEmoji:   { fontSize: 16 },
  miniStatVal:     { color: C.TEXT_PRIMARY, fontSize: 22, fontWeight: '800' },
  miniStatLbl:     { color: C.TEXT_MUTED,   fontSize: 11, fontWeight: '600' },

  // ── Settings rows ────────────────────────────────────────────────────────────
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

  listRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16, gap: 14,
    borderBottomWidth: 1, borderBottomColor: C.BORDER_DEFAULT,
  },
  listRowActive:     { backgroundColor: C.BG_ELEVATED },
  listRowName:       { flex: 1, color: C.TEXT_SECONDARY, fontSize: 15 },
  listRowNameActive: { color: C.TEXT_PRIMARY, fontWeight: '600' },
  listRowCheck:      { color: C.PURPLE, fontSize: 16, fontWeight: '700' },

  // ── Sign out ─────────────────────────────────────────────────────────────────
  logoutBtn: {
    marginTop: 8,
    borderRadius: 14,
    borderWidth: 1, borderColor: C.RED,
    paddingVertical: 15,
    alignItems: 'center',
  },
  logoutText: { color: C.RED, fontSize: 15, fontWeight: '600' },
});
