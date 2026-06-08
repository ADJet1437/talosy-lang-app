import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LessonDetail, LessonChapter, LessonItem } from '../services/api';
import { ItemPracticeSheet } from './ItemPracticeSheet';
import { C } from '../theme';

// Fake completion state — replace with real persistence later
function seededBool(seed: string): boolean {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  return (Math.abs(h) % 3) !== 0; // ~67% chance done
}

function chapterProgress(
  chapter: LessonChapter,
  extra: Set<string>,
): { done: number; total: number; allDone: boolean } {
  const total = chapter.items.length;
  const done  = chapter.items.filter((item) => seededBool(item.id) || extra.has(item.id)).length;
  return { done, total, allDone: done === total };
}

type Props = {
  visible: boolean;
  lesson: LessonDetail | null;
  onClose: () => void;
};

const SCREEN_WIDTH = Dimensions.get('window').width;

export function ChapterListComponent({ visible, lesson, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;
  const [activeItem,    setActiveItem]    = useState<LessonItem | null>(null);
  const [practiceOpen,  setPracticeOpen]  = useState(false);
  const [extraUnlocked, setExtraUnlocked] = useState<Set<string>>(new Set());

  function isDone(item: LessonItem) {
    return seededBool(item.id) || extraUnlocked.has(item.id);
  }

  function openPractice(item: LessonItem) {
    setActiveItem(item);
    setPracticeOpen(true);
  }

  function handleUnlock(itemId: string) {
    setExtraUnlocked((prev) => new Set([...prev, itemId]));
  }

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 0 : SCREEN_WIDTH,
      tension: 70,
      friction: 12,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  return (
    <Animated.View
      style={[styles.screen, { transform: [{ translateX: slideAnim }] }]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn} activeOpacity={0.7}>
            <Text style={styles.backIcon}>‹</Text>
            <Text style={styles.backLabel}>Back</Text>
          </TouchableOpacity>
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
        </View>
        <Text style={styles.title}>{lesson?.title ?? ''}</Text>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {lesson?.chapters.map((chapter) => {
          const { done, total, allDone } = chapterProgress(chapter, extraUnlocked);
          return (
            <View key={chapter.number} style={styles.chapter}>

              <View style={styles.chapterHeader}>
                <Text style={styles.chapterNumber}>
                  {String(chapter.number).padStart(2, '0')}
                </Text>
                <Text style={styles.chapterTitle}>{chapter.title}</Text>

                {allDone ? (
                  <TouchableOpacity style={styles.unlockBtn} activeOpacity={0.75}>
                    <Text style={styles.unlockStar}>✦</Text>
                    <Text style={styles.unlockLabel}>Practice</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.lockBadge}>
                    <Text style={styles.lockCount}>{done}/{total}</Text>
                    <Text style={styles.lockIcon}>🔒</Text>
                  </View>
                )}
              </View>

              {chapter.items.map((item, idx) => {
                const done = isDone(item);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.item}
                    onPress={() => openPractice(item)}
                    activeOpacity={0.6}
                  >
                    <Text style={styles.itemNumber}>
                      {String(idx + 1).padStart(2, '0')}
                    </Text>
                    <Text style={[styles.itemSentence, done && styles.itemSentenceDone]}>
                      {item.sentence}
                    </Text>
                    {done && <Text style={styles.checkMark}>✓</Text>}
                  </TouchableOpacity>
                );
              })}

            </View>
          );
        })}
      </ScrollView>

      <ItemPracticeSheet
        visible={practiceOpen}
        item={activeItem}
        onClose={() => setPracticeOpen(false)}
        onUnlock={handleUnlock}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: C.BG_BASE,
    zIndex: 100,
  },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    backgroundColor: C.BG_SURFACE,
    borderBottomWidth: 1,
    borderBottomColor: C.BORDER_DEFAULT,
    paddingHorizontal: 20,
    paddingBottom: 14,
    gap: 6,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn:   { flexDirection: 'row', alignItems: 'center', gap: 2 },
  backIcon:  { color: C.BLUE, fontSize: 28, lineHeight: 32, fontWeight: '300' },
  backLabel: { color: C.BLUE, fontSize: 15, fontWeight: '600' },

  badge:                 { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  badgeBeginner:         { backgroundColor: C.BADGE_BEGINNER_BG },
  badgeIntermediate:     { backgroundColor: C.BADGE_INTERMEDIATE_BG },
  badgeText:             { fontSize: 11, fontWeight: '700' },
  badgeBeginnerText:     { color: C.BADGE_BEGINNER_TEXT },
  badgeIntermediateText: { color: C.BADGE_INTERMEDIATE_TEXT },

  title: { color: C.TEXT_PRIMARY, fontSize: 20, fontWeight: '700', lineHeight: 26 },

  // ── Chapters ──────────────────────────────────────────────────────────────
  scroll:   { flex: 1 },
  content:  { padding: 20, gap: 28 },
  chapter:  { gap: 12 },

  chapterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.BORDER_DEFAULT,
  },
  chapterNumber: { color: C.BLUE, fontSize: 12, fontWeight: '800', fontVariant: ['tabular-nums'] },
  chapterTitle:  { color: C.BLUE, fontSize: 13, fontWeight: '700', letterSpacing: 0.2, flex: 1 },

  // ── Chapter indicator ─────────────────────────────────────────────────────
  lockBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  lockCount: { color: C.TEXT_MUTED, fontSize: 11, fontWeight: '700', fontVariant: ['tabular-nums'] },
  lockIcon:  { fontSize: 13 },

  unlockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.TEXT_PRIMARY,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  unlockStar:  { color: C.GOLD, fontSize: 12 },
  unlockLabel: { color: C.BG_BASE, fontSize: 11, fontWeight: '700' },

  // ── Items ─────────────────────────────────────────────────────────────────
  item: { flexDirection: 'row', gap: 14, alignItems: 'center' },

  itemNumber: {
    color: C.TEXT_MUTED,
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    minWidth: 20,
  },
  itemSentence:     { color: C.TEXT_PRIMARY, fontSize: 15, lineHeight: 24, flex: 1 },
  itemSentenceDone: { color: C.TEXT_MUTED },

  checkMark: { color: C.GREEN, fontSize: 14, fontWeight: '800', flexShrink: 0 },
});
