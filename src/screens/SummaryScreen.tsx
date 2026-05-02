import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { RootStackParamList } from '../navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Summary'>;

export function SummaryScreen({ navigation, route }: Props) {
  const { summary } = route.params;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{summary.exchanges}</Text>
          <Text style={styles.statLabel}>exchanges</Text>
        </View>
        {summary.level && (
          <View style={styles.statBox}>
            <Text style={[styles.statValue, styles.levelValue]}>{summary.level}</Text>
            <Text style={styles.statLabel}>your level</Text>
          </View>
        )}
      </View>

      {summary.highlights.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>✅ What went well</Text>
          {summary.highlights.map((h, i) => (
            <Text key={i} style={styles.cardItem}>• {h}</Text>
          ))}
        </View>
      )}

      {summary.improvements.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>💡 To improve</Text>
          {summary.improvements.map((imp, i) => (
            <Text key={i} style={styles.cardItem}>• {imp}</Text>
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
  container: { flexGrow: 1, backgroundColor: '#1a1a2e', padding: 24, alignItems: 'center' },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
    marginBottom: 28,
  },
  statBox: {
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    minWidth: 120,
    borderWidth: 1,
    borderColor: '#2a2a4a',
  },
  statValue: { color: '#7c6af7', fontSize: 36, fontWeight: '800' },
  levelValue: { fontSize: 22, textTransform: 'capitalize' },
  statLabel: { color: '#8888aa', fontSize: 13, marginTop: 4 },
  card: {
    backgroundColor: '#16213e',
    borderRadius: 14,
    padding: 18,
    width: '100%',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#2a2a4a',
    gap: 8,
  },
  cardTitle: { color: '#e0e0ff', fontSize: 15, fontWeight: '700', marginBottom: 4 },
  cardItem: { color: '#aaaacc', fontSize: 14, lineHeight: 21 },
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
