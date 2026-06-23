import React, { useEffect, useRef, useState } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LessonDetail, LessonItem, completeLessonItem } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ItemPracticeSheet } from './ItemPracticeSheet';
import { C } from '../theme';

type Props = {
  visible: boolean;
  lesson: LessonDetail | null;
  onClose: () => void;
};

const SCREEN_WIDTH = Dimensions.get('window').width;

export function ChapterListComponent({ visible, lesson, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const slideAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;
  const [modalVisible, setModalVisible] = useState(false);
  const [practiceItem, setPracticeItem] = useState<LessonItem | null>(null);
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (visible) {
      setDoneIds(new Set());
      setModalVisible(true);
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 70,
        friction: 12,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.spring(slideAnim, {
        toValue: SCREEN_WIDTH,
        tension: 70,
        friction: 12,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setModalVisible(false);
      });
    }
  }, [visible, lesson?.id]);

  function handleItemDone(itemId: string) {
    setDoneIds((prev) => new Set([...prev, itemId]));
    if (token) completeLessonItem(token, itemId).catch(() => {});
    setPracticeItem(null);
  }

  return (
    <>
      <Modal
        visible={modalVisible}
        transparent
        animationType="none"
        onRequestClose={onClose}
      >
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: C.BG_BASE }]}>
          <Animated.View
            style={[styles.screen, { transform: [{ translateX: slideAnim }] }]}
            pointerEvents={visible ? 'auto' : 'none'}
          >
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
              <TouchableOpacity onPress={onClose} style={styles.backBtn} activeOpacity={0.7}>
                <Text style={styles.backChevron}>‹</Text>
                <Text style={styles.backLabel}>Back</Text>
              </TouchableOpacity>
              <Text style={styles.headerTitle} numberOfLines={1}>{lesson?.title ?? ''}</Text>
            </View>

            {/* Chapter list */}
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
              showsVerticalScrollIndicator={false}
            >
              {lesson?.chapters.map((chapter) => {
                const total = chapter.items.length;
                const done = chapter.items.filter((i) => i.completed || doneIds.has(i.id)).length;
                const allDone = done === total;

                return (
                  <View key={chapter.number} style={styles.chapter}>
                    {/* Chapter header */}
                    <View style={styles.chapterHeader}>
                      <View style={styles.chapterNumBadge}>
                        <Text style={styles.chapterNumText}>
                          {String(chapter.number).padStart(2, '0')}
                        </Text>
                      </View>
                      <Text style={styles.chapterTitle}>{chapter.title}</Text>
                      <Text style={[styles.chapterProgress, allDone && styles.chapterProgressDone]}>
                        {allDone ? '✓' : `${done}/${total}`}
                      </Text>
                    </View>

                    {/* Items */}
                    {chapter.items.map((item, idx) => {
                      const isDone = item.completed || doneIds.has(item.id);
                      return (
                        <TouchableOpacity
                          key={item.id}
                          style={styles.item}
                          onPress={() => setPracticeItem(item)}
                          activeOpacity={0.6}
                        >
                          <Text style={styles.itemIdx}>
                            {String(idx + 1).padStart(2, '0')}
                          </Text>
                          <Text style={[styles.itemText, isDone && styles.itemTextDone]}>
                            {item.sentence}
                          </Text>
                          {isDone && <Text style={styles.itemCheck}>✓</Text>}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                );
              })}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      <ItemPracticeSheet
        item={practiceItem}
        onClose={() => setPracticeItem(null)}
        onDone={handleItemDone}
      />
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: C.BG_BASE,
    flexDirection: 'column',
  },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: C.BG_SURFACE,
    borderBottomWidth: 1,
    borderBottomColor: C.BORDER_DEFAULT,
  },
  backBtn:     { flexDirection: 'row', alignItems: 'center', gap: 2 },
  backChevron: { color: C.BLUE, fontSize: 28, lineHeight: 32, fontWeight: '300' },
  backLabel:   { color: C.BLUE, fontSize: 15, fontWeight: '600' },
  headerTitle: { flex: 1, color: C.TEXT_PRIMARY, fontSize: 16, fontWeight: '700' },
  diffBadge:          { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  badgeBeginner:      { backgroundColor: C.BADGE_BEGINNER_BG },
  badgeIntermediate:  { backgroundColor: C.BADGE_INTERMEDIATE_BG },
  diffBadgeText:          { fontSize: 11, fontWeight: '700' },
  badgeBeginnerText:      { color: C.BADGE_BEGINNER_TEXT },
  badgeIntermediateText:  { color: C.BADGE_INTERMEDIATE_TEXT },

  // ── Scroll ────────────────────────────────────────────────────────────────
  scroll:        { flex: 1 },
  scrollContent: { padding: 20, gap: 28 },

  // ── Chapter ───────────────────────────────────────────────────────────────
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

  // ── Item ──────────────────────────────────────────────────────────────────
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
});
