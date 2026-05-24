import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { RootStackParamList } from '../navigation/AppNavigator';
import { SessionSummary, fetchSummary } from '../services/api';

type Props = NativeStackScreenProps<RootStackParamList, 'Summary'>;

export function SummaryScreen({ navigation, route }: Props) {
  const { sessionId } = route.params;
  const [summary, setSummary] = useState<SessionSummary | null>(null);

  useEffect(() => {
    fetchSummary(sessionId).then((s) => { if (s) setSummary(s); });
  }, [sessionId]);

  if (!summary) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#7c6af7" size="large" />
        <Text style={styles.loadingText}>Generating your review…</Text>
      </View>
    );
  }

  const nailedLabel = summary.nailed_type === 'words' ? 'You nailed these words' : 'You nailed these';

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{summary.exchanges}</Text>
          <Text style={styles.statLabel}>exchanges</Text>
        </View>
      </View>

      {summary.covered_topics.length > 0 && (
        <View style={styles.topicsRow}>
          {summary.covered_topics.map((topic, i) => (
            <View key={i} style={styles.topicChip}>
              <Text style={styles.topicText}>{topic}</Text>
            </View>
          ))}
        </View>
      )}

      {summary.nailed.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🎉 {nailedLabel}</Text>
          {summary.nailed.map((item, i) => (
            <View key={i} style={styles.nailedRow}>
              <Text style={styles.nailedCheck}>✓</Text>
              <Text style={styles.nailedText}>{item}</Text>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity style={styles.againBtn} onPress={() => navigation.navigate('Home')}>
        <Text style={styles.againBtnText}>Practice Again</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: { color: '#8888aa', fontSize: 14 },

  container: { flexGrow: 1, backgroundColor: '#1a1a2e', padding: 24, alignItems: 'center' },
  statsRow: { flexDirection: 'row', gap: 16, marginTop: 8, marginBottom: 16 },
  statBox: {
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    minWidth: 120,
    borderWidth: 1,
    borderColor: '#2a2a4a',
  },
  statValue: { color: '#7c6af7', fontSize: 40, fontWeight: '900' },
  statLabel: { color: '#8888aa', fontSize: 12, marginTop: 4 },

  topicsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    width: '100%',
    marginBottom: 16,
  },
  topicChip: {
    backgroundColor: '#1e1e3e',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#2a2a4a',
  },
  topicText: { color: '#7c6af7', fontSize: 12, fontWeight: '600' },

  card: {
    backgroundColor: '#16213e',
    borderRadius: 14,
    padding: 18,
    width: '100%',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#2a2a4a',
    gap: 10,
  },
  cardTitle: { color: '#44aa88', fontSize: 14, fontWeight: '700', marginBottom: 4 },
  nailedRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  nailedCheck: { color: '#44aa88', fontSize: 12, fontWeight: '700', marginTop: 2 },
  nailedText: { flex: 1, color: '#e0e0ff', fontSize: 14, lineHeight: 21 },

  againBtn: {
    backgroundColor: '#7c6af7',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 32,
    marginTop: 24,
    marginBottom: 32,
    minWidth: 200,
    alignItems: 'center',
  },
  againBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
