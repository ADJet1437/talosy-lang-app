import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  LessonCategory,
  LessonDetail,
  LessonSummary,
  fetchLessonCategories,
  fetchLessonDetail,
} from '../services/api';

type Props = {
  onOpenLesson: (lesson: LessonDetail) => void;
};

const CARD_BG = '#edf7f2';

function seededRandom(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  return Math.abs(h) / 2147483647;
}

export function LessonsScreen({ onOpenLesson }: Props) {
  const [categories, setCategories]               = useState<LessonCategory[]>([]);
  const [activeCategoryId, setActiveCategoryId]   = useState<string | null>(null);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [error, setError]                         = useState<string | null>(null);
  const [starting, setStarting]                   = useState<string | null>(null);
  const isStartingRef = useRef(false);

  useEffect(() => {
    fetchLessonCategories()
      .then((data) => {
        setCategories(data);
        if (data.length > 0) setActiveCategoryId(data[0].id);
      })
      .catch(() => setError('Could not load lessons. Is the server running?'))
      .finally(() => setLoadingCategories(false));
  }, []);

  async function handlePlay(lesson: LessonSummary) {
    if (isStartingRef.current) return;
    isStartingRef.current = true;
    setStarting(lesson.id);
    try {
      const detail = await fetchLessonDetail(lesson.id);
      onOpenLesson(detail);
    } catch {
      // silently fail — user can retry
    } finally {
      setStarting(null);
      isStartingRef.current = false;
    }
  }

  const currentLessons =
    categories.find((c) => c.id === activeCategoryId)?.lessons ?? [];

  if (loadingCategories) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#2563eb" size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>

      {/* Category tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsRow}
        contentContainerStyle={styles.tabsContent}
      >
        {categories.map((cat) => {
          const active = cat.id === activeCategoryId;
          return (
            <TouchableOpacity
              key={cat.id}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setActiveCategoryId(cat.id)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Lesson cards */}
      <ScrollView
        style={styles.lessonList}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {currentLessons.map((lesson) => {
          const total     = Math.floor(seededRandom(lesson.id + 't') * 40) + 10;
          const completed = Math.floor(seededRandom(lesson.id + 'c') * (total + 1));
          const pct       = total > 0 ? completed / total : 0;

          return (
            <View
              key={lesson.id}
              style={[styles.card, { backgroundColor: CARD_BG }]}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle} numberOfLines={1}>{lesson.title}</Text>
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
              </View>

              <Text style={styles.cardDescription}>{lesson.description}</Text>

              <View style={styles.cardFooter}>
                <Text style={styles.progressText}>{completed}/{total}</Text>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${pct * 100}%` }]} />
                </View>
                <TouchableOpacity
                  style={styles.playBtn}
                  onPress={() => handlePlay(lesson)}
                  disabled={starting !== null}
                  activeOpacity={0.8}
                >
                  {starting === lesson.id
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.playBtnText}>▶</Text>
                  }
                </TouchableOpacity>
              </View>

            </View>
          );
        })}
      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { color: '#e55', fontSize: 14, textAlign: 'center', lineHeight: 22 },

  // ── Category tabs ─────────────────────────────────────────────────────────
  tabsRow: {
    flexGrow: 0,
    flexShrink: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0ea',
  },
  tabsContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    alignItems: 'center',
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#ebebf0',
  },
  tabActive:     { backgroundColor: '#1a1a2e' },
  tabText:       { color: '#666680', fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: '#fff' },

  // ── Lesson cards ──────────────────────────────────────────────────────────
  lessonList:  { flex: 1 },
  listContent: { padding: 16, gap: 12, paddingBottom: 40 },

  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e0e0ea',
    padding: 16,
    gap: 8,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  cardTitle: { color: '#1a1a2e', fontSize: 16, fontWeight: '700', flex: 1 },

  badge:                   { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, flexShrink: 0 },
  badgeBeginner:           { backgroundColor: '#c8eedd' },
  badgeIntermediate:       { backgroundColor: '#fde8c4' },
  badgeText:               { fontSize: 11, fontWeight: '700' },
  badgeBeginnerText:       { color: '#1a7a40' },
  badgeIntermediateText:   { color: '#a05a10' },

  cardDescription: { color: '#666680', fontSize: 13, lineHeight: 19 },

  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
  },
  progressText: {
    color: '#666680',
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 0,
    minWidth: 36,
  },
  progressTrack: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#c8e6d4',
    flexDirection: 'row',
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: '#1a9a68',
    height: '100%',
  },

  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  playBtnText: { color: '#fff', fontSize: 13, marginLeft: 2 },
});
