import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { RootStackParamList } from '../navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

type Mode = 'starting' | 'levelup' | 'conversation';

const LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Japanese', 'Mandarin'];
const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

const MODES: { id: Mode; icon: string; title: string; subtitle: string }[] = [
  {
    id: 'starting',
    icon: '📖',
    title: 'Starting Mode',
    subtitle: 'Read & speak short articles aloud',
  },
  {
    id: 'levelup',
    icon: '🎭',
    title: 'Level Up',
    subtitle: 'Speak as a role in a scene',
  },
  {
    id: 'conversation',
    icon: '💬',
    title: 'Conversation',
    subtitle: 'Free-form AI conversation practice',
  },
];

export function HomeScreen({ navigation }: Props) {
  const [language, setLanguage] = useState('English');
  const [level, setLevel] = useState('Beginner');
  const [mode, setMode] = useState<Mode>('starting');

  function handleStart() {
    if (mode === 'conversation') {
      navigation.navigate('SessionSetup');
      return;
    }
    navigation.navigate('TopicSetup', { mode, language, level });
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.heroIcon}>🎙</Text>
          <Text style={styles.title}>Talkos</Text>
          <Text style={styles.subtitle}>Immersive AI language conversations</Text>
        </View>

        <Text style={styles.sectionLabel}>Practice Language</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
          {LANGUAGES.map((l) => (
            <TouchableOpacity
              key={l}
              style={[styles.chip, language === l && styles.chipActive]}
              onPress={() => setLanguage(l)}
            >
              <Text style={[styles.chipText, language === l && styles.chipTextActive]}>{l}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.sectionLabel}>Your Level</Text>
        <View style={styles.levelRow}>
          {LEVELS.map((lv) => (
            <TouchableOpacity
              key={lv}
              style={[styles.chip, level === lv && styles.chipActive]}
              onPress={() => setLevel(lv)}
            >
              <Text style={[styles.chipText, level === lv && styles.chipTextActive]}>{lv}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Choose Mode</Text>
        <View style={styles.modeList}>
          {MODES.map((m) => (
            <TouchableOpacity
              key={m.id}
              style={[styles.modeCard, mode === m.id && styles.modeCardActive]}
              onPress={() => setMode(m.id)}
              activeOpacity={0.8}
            >
              <Text style={styles.modeIcon}>{m.icon}</Text>
              <View style={styles.modeText}>
                <Text style={[styles.modeTitle, mode === m.id && styles.modeTitleActive]}>
                  {m.title}
                </Text>
                <Text style={styles.modeSubtitle}>{m.subtitle}</Text>
              </View>
              <View style={[styles.modeRadio, mode === m.id && styles.modeRadioActive]} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.startBtn} onPress={handleStart} activeOpacity={0.85}>
          <Text style={styles.startBtnText}>Start</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#1a1a2e' },
  container: { padding: 24, paddingBottom: 16 },
  hero: { alignItems: 'center', marginBottom: 32, marginTop: 40 },
  heroIcon: { fontSize: 52, marginBottom: 8 },
  title: { fontSize: 42, fontWeight: '800', color: '#e0e0ff', letterSpacing: 1 },
  subtitle: { fontSize: 14, color: '#666688', marginTop: 4, textAlign: 'center' },
  sectionLabel: {
    color: '#7c6af7',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 10,
    marginTop: 20,
  },
  chipRow: { flexDirection: 'row' },
  levelRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2a2a4a',
    marginRight: 8,
    marginBottom: 4,
  },
  chipActive: { backgroundColor: '#7c6af7', borderColor: '#7c6af7' },
  chipText: { color: '#8888aa', fontSize: 14 },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  modeList: { gap: 10 },
  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16213e',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#2a2a4a',
    gap: 14,
  },
  modeCardActive: { borderColor: '#7c6af7', backgroundColor: '#1e1640' },
  modeIcon: { fontSize: 26 },
  modeText: { flex: 1 },
  modeTitle: { color: '#aaaacc', fontSize: 15, fontWeight: '700' },
  modeTitleActive: { color: '#e0e0ff' },
  modeSubtitle: { color: '#555577', fontSize: 12, marginTop: 2 },
  modeRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#2a2a4a',
  },
  modeRadioActive: { borderColor: '#7c6af7', backgroundColor: '#7c6af7' },
  footer: {
    padding: 20,
    paddingBottom: 36,
    backgroundColor: '#1a1a2e',
    borderTopWidth: 1,
    borderTopColor: '#2a2a4a',
  },
  startBtn: {
    backgroundColor: '#7c6af7',
    paddingVertical: 18,
    borderRadius: 32,
    alignItems: 'center',
  },
  startBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
