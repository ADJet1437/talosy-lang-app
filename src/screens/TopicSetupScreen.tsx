import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { RootStackParamList } from '../navigation/AppNavigator';
import { fetchTopics, generateContent, generateScene } from '../services/api';

type Props = NativeStackScreenProps<RootStackParamList, 'TopicSetup'>;

export function TopicSetupScreen({ navigation, route }: Props) {
  const { mode, language, level } = route.params;

  const [topics, setTopics] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [customTopic, setCustomTopic] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTopics()
      .then((data) => { setTopics(data); setSelected(data[0] ?? null); })
      .catch(() => setError('Could not load topics'))
      .finally(() => setLoading(false));
  }, []);

  const activeTopic = customTopic.trim() || selected;

  async function handleNext() {
    if (!activeTopic) return;
    setGenerating(true);
    setError(null);
    try {
      if (mode === 'starting') {
        const text = await generateContent(activeTopic, level.toLowerCase(), language);
        navigation.navigate('Teleprompter', { text, topic: activeTopic, language, level, mode });
      } else {
        const scene = await generateScene(activeTopic, language);
        navigation.navigate('RoleSelect', { scene, topic: activeTopic, language, level });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate content');
    } finally {
      setGenerating(false);
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
        <Text style={styles.sectionLabel}>Predefined Topics</Text>
        <View style={styles.topicGrid}>
          {topics.map((t) => (
            <TouchableOpacity
              key={t}
              style={[
                styles.topicChip,
                selected === t && !customTopic.trim() && styles.topicChipActive,
              ]}
              onPress={() => { setSelected(t); setCustomTopic(''); }}
            >
              <Text style={[
                styles.topicChipText,
                selected === t && !customTopic.trim() && styles.topicChipTextActive,
              ]}>
                {t}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Or Enter Your Own</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Buying a house, Space exploration…"
          placeholderTextColor="#444466"
          value={customTopic}
          onChangeText={setCustomTopic}
          returnKeyType="done"
        />

        {error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.nextBtn, (!activeTopic || generating) && styles.nextBtnDisabled]}
          onPress={handleNext}
          disabled={!activeTopic || generating}
        >
          {generating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.nextBtnText}>
              {mode === 'starting' ? 'Generate Article' : 'Generate Scene'}
            </Text>
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
  container: { padding: 20, paddingBottom: 16 },
  sectionLabel: {
    color: '#7c6af7',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 12,
    marginTop: 20,
  },
  topicGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  topicChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2a2a4a',
    backgroundColor: '#16213e',
  },
  topicChipActive: { borderColor: '#7c6af7', backgroundColor: '#1e1640' },
  topicChipText: { color: '#8888aa', fontSize: 14 },
  topicChipTextActive: { color: '#e0e0ff', fontWeight: '600' },
  input: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a4a',
    color: '#e0e0ff',
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  error: { color: '#ff6b6b', textAlign: 'center', marginTop: 12 },
  footer: {
    padding: 16,
    paddingBottom: 32,
    backgroundColor: '#1a1a2e',
    borderTopWidth: 1,
    borderTopColor: '#2a2a4a',
  },
  nextBtn: {
    backgroundColor: '#7c6af7',
    paddingVertical: 17,
    borderRadius: 32,
    alignItems: 'center',
  },
  nextBtnDisabled: { opacity: 0.5 },
  nextBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
