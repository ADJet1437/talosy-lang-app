import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RootStackParamList } from '../navigation/AppNavigator';
import { LessonChapter, LessonItem, completeLessonItem } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { C } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ChapterList'>;

export function ChapterListScreen({ route, navigation }: Props) {
  const { lesson, learnLang = 'English', nativeLang = 'English' } = route.params;
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());
  const allItems = lesson.chapters.flatMap((ch) => ch.items);

  function isItemDone(item: LessonItem) {
    return item.completed || doneIds.has(item.id);
  }

  function isChapterDone(chapter: LessonChapter) {
    return chapter.items.length > 0 && chapter.items.every(isItemDone);
  }

  function handleItemDone(itemId: string) {
    setDoneIds((prev) => new Set([...prev, itemId]));
    if (token) completeLessonItem(token, itemId).catch(() => {});
  }

  function handleSpeakingPractice(chapter: LessonChapter) {
    const sentences = chapter.items.filter(isItemDone).map((i) => i.sentence);
    navigation.navigate('SpeakingPractice', {
      sentences,
      language: learnLang,
      chapterTitle: chapter.title,
    });
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
            <Text style={styles.backChevron}>‹</Text>
            <Text style={styles.backLabel}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{lesson.title}</Text>
        </View>

        {/* Chapter list */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
        >
          {lesson.chapters.map((chapter) => {
            const total = chapter.items.length;
            const done = chapter.items.filter(isItemDone).length;
            const chapterDone = isChapterDone(chapter);

            return (
              <View key={chapter.number} style={styles.chapter}>
                <View style={styles.chapterHeader}>
                  <View style={styles.chapterNumBadge}>
                    <Text style={styles.chapterNumText}>
                      {String(chapter.number).padStart(2, '0')}
                    </Text>
                  </View>
                  <Text style={styles.chapterTitle}>{chapter.title}</Text>
                  <Text style={[styles.chapterProgress, chapterDone && styles.chapterProgressDone]}>
                    {chapterDone ? '✓' : `${done}/${total}`}
                  </Text>
                </View>

                {chapter.items.map((item, idx) => {
                  const isDone = isItemDone(item);
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.item}
                      onPress={() => navigation.navigate('SentenceDetail', {
                        item,
                        learnLang,
                        nativeLang,
                        onDone: handleItemDone,
                        allItems,
                        currentIndex: allItems.findIndex((i) => i.id === item.id),
                      })}
                      activeOpacity={0.6}
                    >
                      <Text style={styles.itemIdx}>{String(idx + 1).padStart(2, '0')}</Text>
                      <Text style={[styles.itemText, isDone && styles.itemTextDone]}>{item.sentence}</Text>
                      {isDone && <Text style={styles.itemCheck}>✓</Text>}
                    </TouchableOpacity>
                  );
                })}

                {/* Chapter completion banner */}
                {chapterDone && (
                  <View style={styles.completionBanner}>
                    <Text style={styles.completionEmoji}>🎉</Text>
                    <View style={styles.completionText}>
                      <Text style={styles.completionTitle}>Chapter complete!</Text>
                      <Text style={styles.completionSub}>Practice what you learned in a conversation</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.chatBtn}
                      onPress={() => handleSpeakingPractice(chapter)}
                      activeOpacity={0.75}
                    >
                      <Text style={styles.chatBtnText}>Speak →</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.BG_BASE,
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: 8,
    backgroundColor: C.BG_SURFACE,
    borderBottomWidth: 1,
    borderBottomColor: C.BORDER_DEFAULT,
  },
  backBtn:     { flexDirection: 'row', alignItems: 'center', gap: 2 },
  backChevron: { color: C.BLUE, fontSize: 28, lineHeight: 32, fontWeight: '300' },
  backLabel:   { color: C.BLUE, fontSize: 15, fontWeight: '600' },
  headerTitle: { flex: 1, color: C.TEXT_PRIMARY, fontSize: 16, fontWeight: '700' },

  diffBadge:         { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  badgeBeginner:     { backgroundColor: C.BADGE_BEGINNER_BG },
  badgeIntermediate: { backgroundColor: C.BADGE_INTERMEDIATE_BG },
  diffBadgeText:         { fontSize: 11, fontWeight: '700' },
  badgeBeginnerText:     { color: C.BADGE_BEGINNER_TEXT },
  badgeIntermediateText: { color: C.BADGE_INTERMEDIATE_TEXT },

  // ── Scroll ──────────────────────────────────────────────────────────────────
  scroll:        { flex: 1 },
  scrollContent: { padding: 20, gap: 28 },

  // ── Chapter ─────────────────────────────────────────────────────────────────
  chapter: { gap: 10 },
  chapterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.BORDER_DEFAULT,
  },
  chapterNumBadge: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: C.BLUE,
    alignItems: 'center', justifyContent: 'center',
  },
  chapterNumText:      { color: '#fff', fontSize: 11, fontWeight: '800' },
  chapterTitle:        { flex: 1, color: C.TEXT_PRIMARY, fontSize: 14, fontWeight: '700' },
  chapterProgress:     { color: C.TEXT_MUTED, fontSize: 12, fontWeight: '700' },
  chapterProgressDone: { color: C.GREEN },

  // ── Item ────────────────────────────────────────────────────────────────────
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
  },
  itemIdx:      { color: C.TEXT_MUTED, fontSize: 12, fontWeight: '700', minWidth: 20 },
  itemText:     { flex: 1, color: C.TEXT_PRIMARY, fontSize: 15, lineHeight: 22 },
  itemTextDone: { color: C.TEXT_MUTED },
  itemCheck:    { color: C.GREEN, fontSize: 14, fontWeight: '800' },

  // ── Chapter completion banner ────────────────────────────────────────────────
  completionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
    padding: 14,
    borderRadius: 14,
    backgroundColor: C.BG_ELEVATED,
    borderWidth: 1,
    borderColor: C.GREEN,
  },
  completionEmoji: { fontSize: 22 },
  completionText:  { flex: 1, gap: 2 },
  completionTitle: { color: C.TEXT_PRIMARY, fontSize: 13, fontWeight: '700' },
  completionSub:   { color: C.TEXT_MUTED, fontSize: 11 },
  chatBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: C.BLUE,
  },
  chatBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
