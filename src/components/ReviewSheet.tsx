import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { SessionSummary } from '../services/api';

type Props = {
  visible: boolean;
  loading: boolean;
  summary: SessionSummary | null;
  onClose: () => void;
};

const SHEET_HEIGHT = Dimensions.get('window').height * 0.62;

export function ReviewSheet({ visible, loading, summary, onClose }: Props) {
  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 0 : SHEET_HEIGHT,
      tension: 65,
      friction: 11,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  const nailedLabel = summary?.nailed_type === 'words' ? 'You nailed these words' : 'You nailed these';

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Session Review</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          {loading && (
            <View style={styles.centered}>
              <ActivityIndicator color="#2563eb" size="large" />
              <Text style={styles.loadingText}>Generating your review…</Text>
            </View>
          )}

          {!loading && summary && (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

              {/* Exchanges stat */}
              <View style={styles.statRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{summary.exchanges}</Text>
                  <Text style={styles.statLabel}>exchanges</Text>
                </View>
              </View>

              {/* Covered topics */}
              {summary.covered_topics.length > 0 && (
                <View style={styles.topicsWrap}>
                  {summary.covered_topics.map((topic, i) => (
                    <View key={i} style={styles.topicChip}>
                      <Text style={styles.topicText}>{topic}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Nailed */}
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

            </ScrollView>
          )}

        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' },

  sheet: {
    height: SHEET_HEIGHT,
    backgroundColor: '#f5f5f7',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
  },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title:  { color: '#1a1a2e', fontSize: 18, fontWeight: '700' },
  closeBtn: { padding: 4 },
  closeIcon: { color: '#9999b0', fontSize: 16 },

  divider: { height: 1, backgroundColor: '#e0e0ea', marginVertical: 16 },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  loadingText: { color: '#666680', fontSize: 14 },

  content: { gap: 16, paddingBottom: 16 },

  statRow: { flexDirection: 'row', justifyContent: 'center' },
  statBox: {
    backgroundColor: '#ffffff',
    borderRadius: 16, borderWidth: 1, borderColor: '#e0e0ea',
    padding: 20, alignItems: 'center', minWidth: 130,
  },
  statValue: { color: '#2563eb', fontSize: 40, fontWeight: '900' },
  statLabel: { color: '#9999b0', fontSize: 12, marginTop: 4 },

  topicsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  topicChip: {
    backgroundColor: '#ffffff', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: '#e0e0ea',
  },
  topicText: { color: '#2563eb', fontSize: 12, fontWeight: '600' },

  card: {
    backgroundColor: '#ffffff', borderRadius: 14,
    borderWidth: 1, borderColor: '#e0e0ea',
    padding: 16, gap: 10,
  },
  cardTitle:   { color: '#1a9a68', fontSize: 14, fontWeight: '700', marginBottom: 4 },
  nailedRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  nailedCheck: { color: '#1a9a68', fontSize: 12, fontWeight: '700', marginTop: 2 },
  nailedText:  { flex: 1, color: '#1a1a2e', fontSize: 14, lineHeight: 21 },
});
