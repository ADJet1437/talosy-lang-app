import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LessonItem } from '../services/api';
import { C } from '../theme';

const SCREEN_W = Dimensions.get('window').width;
const SWIPE_THRESHOLD = 60;

type Props = {
  items: LessonItem[];
  startIndex: number;
  visible: boolean;
  doneIds: Set<string>;
  onClose: () => void;
  onDone: (itemId: string) => void;
};

type Step = 'fill_blank' | 'read_out';

const STOP = new Set([
  'jag','du','han','hon','det','vi','ni','de','och','men','eller','att','som',
  'är','var','inte','på','för','med','till','från','om','vid','hos','mot','av',
  'en','ett','den','kan','ska','vill','har','hade','vara','bli','gör','ser','vet',
  'tar','kom','fick','gick','när','där','här','vad','hur','vem','all','alla',
]);

function extractWords(sentence: string): string[] {
  return sentence
    .replace(/[.,!?;:"]/g, '')
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !STOP.has(w.toLowerCase()));
}

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildProblem(item: LessonItem, allItems: LessonItem[]) {
  const words = extractWords(item.sentence);
  if (words.length === 0) return null;
  const target = words[Math.floor(Math.random() * words.length)];
  const blankSentence = item.sentence.replace(target, '_____');
  const pool = allItems
    .filter((i) => i.id !== item.id)
    .flatMap((i) => extractWords(i.sentence))
    .filter((w) => w.toLowerCase() !== target.toLowerCase());
  const distractors = shuffled([...new Set(pool)]).slice(0, 2);
  return { blankSentence, target, choices: shuffled([target, ...distractors]) };
}

export function SentencePracticeSheet({
  items,
  startIndex,
  visible,
  doneIds,
  onClose,
  onDone,
}: Props) {
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(startIndex);
  const [step, setStep] = useState<Step>('fill_blank');
  const [selected, setSelected] = useState<string | null>(null);
  const [problem, setProblem] = useState<ReturnType<typeof buildProblem>>(null);
  const translateX = useRef(new Animated.Value(0)).current;

  const item = items[index] ?? null;

  // Reset state when sheet opens or item changes
  useEffect(() => {
    if (!visible) return;
    setIndex(startIndex);
  }, [visible, startIndex]);

  useEffect(() => {
    if (!item) return;
    setStep('fill_blank');
    setSelected(null);
    setProblem(buildProblem(item, items));
    translateX.setValue(0);
  }, [index, item?.id]);

  function goTo(nextIndex: number) {
    if (nextIndex < 0 || nextIndex >= items.length) { onClose(); return; }
    const dir = nextIndex > index ? -SCREEN_W : SCREEN_W;
    Animated.sequence([
      Animated.timing(translateX, { toValue: dir, duration: 180, useNativeDriver: true }),
      Animated.timing(translateX, { toValue: -dir, duration: 0, useNativeDriver: true }),
      Animated.timing(translateX, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => setIndex(nextIndex));
  }

  function goNext() { goTo(index + 1); }
  function goPrev() { goTo(index - 1); }

  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gs) =>
      Math.abs(gs.dx) > 15 && Math.abs(gs.dy) < Math.abs(gs.dx),
    onPanResponderMove: (_, gs) => {
      translateX.setValue(gs.dx * 0.3);
    },
    onPanResponderRelease: (_, gs) => {
      if (gs.dx > SWIPE_THRESHOLD) {
        // swipe right → previous item
        if (index > 0) { goPrev(); } else { Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start(); }
      } else if (gs.dx < -SWIPE_THRESHOLD) {
        // swipe left → next item
        goNext();
      } else {
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
      }
    },
  }), [index, items.length]);

  function handleChoice(choice: string) {
    if (selected || !problem) return;
    setSelected(choice);
    if (choice === problem.target) {
      setTimeout(() => { setStep('read_out'); setSelected(null); }, 700);
    }
  }

  function handleDone() {
    if (!item) return;
    onDone(item.id);
    // Advance to next item or close
    if (index + 1 < items.length) { goTo(index + 1); } else { onClose(); }
  }

  if (!visible || !item) return null;

  const isDone = item.completed || doneIds.has(item.id);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

      <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.handle} />

        {/* Progress bar */}
        <View style={styles.progressRow}>
          <Text style={styles.progressText}>{index + 1} / {items.length}</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${((index + 1) / items.length) * 100}%` }]} />
          </View>
        </View>

        <Animated.View
          style={{ transform: [{ translateX }] }}
          {...panResponder.panHandlers}
        >
          {/* Step indicator */}
          <View style={styles.stepRow}>
            {(['fill_blank', 'read_out'] as Step[]).map((s) => (
              <View key={s} style={[styles.stepDot, step === s && styles.stepDotActive]} />
            ))}
          </View>

          {/* Already-done badge */}
          {isDone && (
            <View style={styles.doneBadge}>
              <Text style={styles.doneBadgeText}>✓ Already completed</Text>
            </View>
          )}

          {step === 'fill_blank' && (
            <View style={styles.stepContent}>
              <Text style={styles.stepLabel}>Fill in the blank</Text>

              {problem ? (
                <>
                  <Text style={styles.blankSentence}>{problem.blankSentence}</Text>
                  <View style={styles.choices}>
                    {problem.choices.map((choice) => {
                      const isCorrect = choice === problem.target;
                      const isSelected = selected === choice;
                      const showCorrect = selected !== null && isCorrect;
                      const showWrong = isSelected && !isCorrect;
                      return (
                        <TouchableOpacity
                          key={choice}
                          style={[
                            styles.choiceBtn,
                            showCorrect && styles.choiceBtnCorrect,
                            showWrong && styles.choiceBtnWrong,
                          ]}
                          onPress={() => handleChoice(choice)}
                          activeOpacity={0.7}
                        >
                          <Text style={[
                            styles.choiceText,
                            showCorrect && styles.choiceTextCorrect,
                            showWrong && styles.choiceTextWrong,
                          ]}>
                            {choice}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  {selected && selected !== problem.target && (
                    <TouchableOpacity style={styles.retryBtn} onPress={() => setSelected(null)} activeOpacity={0.7}>
                      <Text style={styles.retryText}>Try again</Text>
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                <TouchableOpacity style={styles.primaryBtn} onPress={() => setStep('read_out')} activeOpacity={0.7}>
                  <Text style={styles.primaryBtnText}>Next →</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {step === 'read_out' && (
            <View style={styles.stepContent}>
              <Text style={styles.stepLabel}>Read it out</Text>
              <Text style={styles.fullSentence}>{item.sentence}</Text>
              <View style={styles.actions}>
                <TouchableOpacity style={styles.skipBtn} onPress={goNext} activeOpacity={0.7}>
                  <Text style={styles.skipText}>Skip →</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.primaryBtn} onPress={handleDone} activeOpacity={0.7}>
                  <Text style={styles.primaryBtnText}>Mark done ✓</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },

  sheet: {
    backgroundColor: C.BG_SURFACE,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 12,
    gap: 14,
  },

  handle: {
    alignSelf: 'center',
    width: 36, height: 4,
    borderRadius: 2,
    backgroundColor: C.BORDER_STRONG,
    marginBottom: 4,
  },

  progressRow:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressText: { color: C.TEXT_MUTED, fontSize: 11, fontWeight: '700', minWidth: 36 },
  progressTrack: { flex: 1, height: 4, borderRadius: 2, backgroundColor: C.BG_ELEVATED },
  progressFill:  { height: 4, borderRadius: 2, backgroundColor: C.BLUE },

  stepRow:       { flexDirection: 'row', gap: 6, marginBottom: 4 },
  stepDot:       { width: 6, height: 6, borderRadius: 3, backgroundColor: C.BORDER_STRONG },
  stepDotActive: { backgroundColor: C.BLUE, width: 18 },

  doneBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#052e16',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 4,
  },
  doneBadgeText: { color: C.GREEN, fontSize: 11, fontWeight: '700' },

  stepContent: { gap: 14 },
  stepLabel: {
    color: C.TEXT_MUTED,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  blankSentence: { color: C.TEXT_PRIMARY, fontSize: 18, fontWeight: '600', lineHeight: 26 },

  choices: { gap: 10 },
  choiceBtn: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: C.BG_ELEVATED,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  choiceBtnCorrect: { backgroundColor: '#052e16', borderColor: C.GREEN },
  choiceBtnWrong:   { backgroundColor: '#2d0a0a', borderColor: C.RED },
  choiceText:        { color: C.TEXT_PRIMARY, fontSize: 16, fontWeight: '600' },
  choiceTextCorrect: { color: C.GREEN },
  choiceTextWrong:   { color: C.RED },

  retryBtn: { alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 20 },
  retryText: { color: C.BLUE, fontSize: 14, fontWeight: '600' },

  fullSentence: { color: C.TEXT_PRIMARY, fontSize: 20, fontWeight: '600', lineHeight: 30 },

  actions:  { flexDirection: 'row', gap: 12 },
  skipBtn: {
    flex: 1, height: 48,
    borderRadius: 12,
    backgroundColor: C.BG_ELEVATED,
    alignItems: 'center', justifyContent: 'center',
  },
  skipText: { color: C.TEXT_SECONDARY, fontSize: 15, fontWeight: '600' },

  primaryBtn: {
    flex: 2, height: 48,
    borderRadius: 12,
    backgroundColor: C.GREEN,
    alignItems: 'center', justifyContent: 'center',
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
