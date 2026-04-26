import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { RootStackParamList } from '../navigation/AppNavigator';
import { Scenario, createSession, fetchScenarios } from '../services/api';

type Props = NativeStackScreenProps<RootStackParamList, 'SessionSetup'>;

const LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Japanese', 'Mandarin'];
const LEVELS = ['Auto-detect', 'Beginner', 'Intermediate', 'Advanced'] as const;

export function SessionSetupScreen({ navigation }: Props) {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selected, setSelected] = useState<Scenario | null>(null);
  const [language, setLanguage] = useState('English');
  const [level, setLevel] = useState<string>('Auto-detect');
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchScenarios()
      .then((data) => { setScenarios(data); setSelected(data[0] ?? null); })
      .catch(() => setError('Could not load scenarios'))
      .finally(() => setLoading(false));
  }, []);

  async function handleStart() {
    if (!selected) return;
    setStarting(true);
    setError(null);
    try {
      const resolvedLevel = level === 'Auto-detect' ? undefined : level.toLowerCase();
      const sessionId = await createSession(selected.id, language, resolvedLevel);
      navigation.navigate('Conversation', { sessionId, scenario: selected });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start session');
    } finally {
      setStarting(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#7c6af7" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.sectionLabel}>Choose a scenario</Text>
      <View style={styles.scenarioGrid}>
        {scenarios.map((s) => (
          <TouchableOpacity
            key={s.id}
            style={[styles.scenarioCard, selected?.id === s.id && styles.scenarioCardActive]}
            onPress={() => setSelected(s)}
          >
            <Text style={styles.scenarioEmoji}>{s.emoji}</Text>
            <Text style={[styles.scenarioTitle, selected?.id === s.id && styles.scenarioTitleActive]}>
              {s.title}
            </Text>
            <Text style={styles.scenarioDesc}>{s.description}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionLabel}>Practice language</Text>
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

      <Text style={styles.sectionLabel}>Your level</Text>
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

      {error && <Text style={styles.error}>{error}</Text>}
    </ScrollView>

    <View style={styles.stickyFooter}>
      <TouchableOpacity
        style={[styles.startBtn, (!selected || starting) && styles.startBtnDisabled]}
        onPress={handleStart}
        disabled={!selected || starting}
      >
        {starting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.startBtnText}>Start Conversation</Text>
        )}
      </TouchableOpacity>
    </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: '#1a1a2e', alignItems: 'center', justifyContent: 'center' },
  screen: { flex: 1, backgroundColor: '#1a1a2e' },
  scroll: { flex: 1 },
  container: { backgroundColor: '#1a1a2e', padding: 20, paddingBottom: 16 },
  stickyFooter: {
    padding: 16,
    paddingBottom: 32,
    backgroundColor: '#1a1a2e',
    borderTopWidth: 1,
    borderTopColor: '#2a2a4a',
  },
  sectionLabel: {
    color: '#7c6af7',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 12,
    marginTop: 24,
  },
  scenarioGrid: { gap: 10 },
  scenarioCard: {
    backgroundColor: '#16213e',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#2a2a4a',
  },
  scenarioCardActive: { borderColor: '#7c6af7', backgroundColor: '#1e1640' },
  scenarioEmoji: { fontSize: 28, marginBottom: 6 },
  scenarioTitle: { color: '#aaaacc', fontSize: 15, fontWeight: '700', marginBottom: 4 },
  scenarioTitleActive: { color: '#e0e0ff' },
  scenarioDesc: { color: '#666688', fontSize: 13 },
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
  startBtn: {
    backgroundColor: '#7c6af7',
    paddingVertical: 17,
    borderRadius: 32,
    alignItems: 'center',
  },
  startBtnDisabled: { opacity: 0.5 },
  startBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  error: { color: '#ff6b6b', textAlign: 'center', marginTop: 12 },
});
