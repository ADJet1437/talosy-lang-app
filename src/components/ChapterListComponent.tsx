import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { LessonDetail } from '../services/api';

type Props = {
  visible: boolean;
  lesson: LessonDetail | null;
  onClose: () => void;
};

const SHEET_HEIGHT = Dimensions.get('window').height * 0.85;

export function ChapterListComponent({ visible, lesson, onClose }: Props) {
  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 0 : SHEET_HEIGHT,
      tension: 65,
      friction: 11,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              {lesson && (
                <View style={[
                  styles.badge,
                  lesson.difficulty === 'beginner' ? styles.badgeBeginner : styles.badgeIntermediate,
                ]}>
                  <Text style={[
                    styles.badgeText,
                    lesson.difficulty === 'beginner' ? styles.badgeBeginnerText : styles.badgeIntermediateText,
                  ]}>
                    {lesson.difficulty}
                  </Text>
                </View>
              )}
              <Text style={styles.title} numberOfLines={1}>{lesson?.title ?? ''}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          {/* Chapters + items */}
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {lesson?.chapters.map((chapter) => (
              <View key={chapter.number} style={styles.chapter}>

                <View style={styles.chapterHeader}>
                  <Text style={styles.chapterNumber}>
                    {String(chapter.number).padStart(2, '0')}
                  </Text>
                  <Text style={styles.chapterTitle}>{chapter.title}</Text>
                </View>

                {chapter.items.map((item, idx) => (
                  <View key={item.id} style={styles.item}>
                    <Text style={styles.itemNumber}>
                      {String(idx + 1).padStart(2, '0')}
                    </Text>
                    <Text style={styles.itemSentence}>{item.sentence}</Text>
                  </View>
                ))}

              </View>
            ))}
          </ScrollView>

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
    paddingTop: 20,
    paddingHorizontal: 20,
  },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },

  badge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, flexShrink: 0 },
  badgeBeginner:         { backgroundColor: '#c8eedd' },
  badgeIntermediate:     { backgroundColor: '#fde8c4' },
  badgeText:             { fontSize: 10, fontWeight: '700' },
  badgeBeginnerText:     { color: '#1a7a40' },
  badgeIntermediateText: { color: '#a05a10' },

  title:    { color: '#1a1a2e', fontSize: 17, fontWeight: '700', flex: 1 },
  closeBtn: { padding: 4, flexShrink: 0 },
  closeIcon:{ color: '#9999b0', fontSize: 16 },

  divider: { height: 1, backgroundColor: '#e0e0ea', marginVertical: 16 },

  // ── Chapters ──────────────────────────────────────────────────────────────
  content: { gap: 24, paddingBottom: 40 },

  chapter: { gap: 10 },

  chapterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0ea',
  },
  chapterNumber: {
    color: '#2563eb',
    fontSize: 12,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  chapterTitle: {
    color: '#2563eb',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
    flex: 1,
  },

  // ── Items ─────────────────────────────────────────────────────────────────
  item: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  itemNumber: {
    color: '#9999b0',
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    minWidth: 20,
    paddingTop: 2,
  },
  itemSentence: {
    color: '#1a1a2e',
    fontSize: 15,
    lineHeight: 23,
    flex: 1,
  },
});
