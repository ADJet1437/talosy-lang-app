import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LessonItem } from '../services/api';
import { C } from '../theme';

const SCREEN_W       = Dimensions.get('window').width;
const SWIPE_THRESHOLD = 60;

type Props = {
  items: LessonItem[];
  startIndex: number;
  visible: boolean;
  doneIds: Set<string>;
  onClose: () => void;
  onDone: (itemId: string) => void;
};

type Step = 'study' | 'fill_blank';

// ── Problem builder ────────────────────────────────────────────────────────────

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

function buildProblem(item: LessonItem) {
  const words = extractWords(item.sentence);
  if (words.length === 0) return null;
  const target       = words[Math.floor(Math.random() * words.length)];
  const blankSentence = item.sentence.replace(target, '_____');
  return { blankSentence, target };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SentencePracticeSheet({
  items,
  startIndex,
  visible,
  doneIds,
  onClose,
  onDone,
}: Props) {
  const insets = useSafeAreaInsets();

  const [index,           setIndex]           = useState(startIndex);
  const [step,            setStep]            = useState<Step>('study');
  const [showTranslation, setShowTranslation] = useState(false);
  const [typed,           setTyped]           = useState('');
  const [checkResult,     setCheckResult]     = useState<'correct' | 'wrong' | null>(null);
  const [problem,         setProblem]         = useState<ReturnType<typeof buildProblem>>(null);

  const translateX  = useRef(new Animated.Value(0)).current;
  const transFade   = useRef(new Animated.Value(0)).current;
  const shakeAnim   = useRef(new Animated.Value(0)).current;
  const inputRef    = useRef<TextInput>(null);
  const navigating  = useRef(false);

  const item = items[index] ?? null;

  // ── Sync index when sheet opens ────────────────────────────────────────────
  useEffect(() => {
    if (!visible) return;
    setIndex(startIndex);
  }, [visible, startIndex]);

  // ── Reset all state when item changes ──────────────────────────────────────
  useEffect(() => {
    if (!item) return;
    setStep('study');
    setShowTranslation(false);
    transFade.setValue(0);
    setTyped('');
    setCheckResult(null);
    setProblem(buildProblem(item));
    translateX.setValue(0);
  }, [index, item?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-focus input on fill_blank step ───────────────────────────────────
  useEffect(() => {
    if (step === 'fill_blank') {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [step]);

  // ── Navigation ─────────────────────────────────────────────────────────────
  function goTo(nextIndex: number) {
    if (navigating.current) return;
    if (nextIndex < 0 || nextIndex >= items.length) { onClose(); return; }
    navigating.current = true;
    const dir = nextIndex > index ? -SCREEN_W : SCREEN_W;
    Animated.sequence([
      Animated.timing(translateX, { toValue: dir,  duration: 180, useNativeDriver: true }),
      Animated.timing(translateX, { toValue: -dir, duration: 0,   useNativeDriver: true }),
      Animated.timing(translateX, { toValue: 0,    duration: 180, useNativeDriver: true }),
    ]).start(() => { navigating.current = false; setIndex(nextIndex); });
  }

  function goNext() { goTo(index + 1); }
  function goPrev() { goTo(index - 1); }

  // ── Swipe to navigate ──────────────────────────────────────────────────────
  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gs) =>
      Math.abs(gs.dx) > 15 && Math.abs(gs.dy) < Math.abs(gs.dx),
    onPanResponderMove:   (_, gs) => { translateX.setValue(gs.dx * 0.3); },
    onPanResponderRelease: (_, gs) => {
      if      (gs.dx >  SWIPE_THRESHOLD && index > 0) goPrev();
      else if (gs.dx < -SWIPE_THRESHOLD)              goNext();
      else Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
    },
  }), [index, items.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Study step handlers ────────────────────────────────────────────────────
  function handleShowTranslation() {
    setShowTranslation(true);
    transFade.setValue(0);
    Animated.timing(transFade, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }

  // ── Fill-blank handlers ────────────────────────────────────────────────────
  function handleCheck() {
    if (!problem || !typed.trim() || checkResult) return;
    const correct = typed.trim().toLowerCase() === problem.target.toLowerCase();
    setCheckResult(correct ? 'correct' : 'wrong');
    if (correct) {
      setTimeout(handleDone, 550);
    } else {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue:  8, duration: 55, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -8, duration: 55, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue:  5, duration: 55, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue:  0, duration: 55, useNativeDriver: true }),
      ]).start(() => {
        setCheckResult(null);
        setTyped('');
        inputRef.current?.focus();
      });
    }
  }

  function handleDone() {
    if (!item) return;
    onDone(item.id);
    if (index + 1 < items.length) goTo(index + 1);
    else onClose();
  }

  // ── Early exits ────────────────────────────────────────────────────────────
  if (!visible || !item) return null;

  const isDone = item.completed || doneIds.has(item.id);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.handle} />

          {/* Progress */}
          <View style={styles.progressRow}>
            <Text style={styles.progressText}>{index + 1} / {items.length}</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${((index + 1) / items.length) * 100}%` as any }]} />
            </View>
          </View>

          <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>

            {/* Step dots */}
            <View style={styles.stepRow}>
              {(['study', 'fill_blank'] as Step[]).map((s) => (
                <View key={s} style={[styles.stepDot, step === s && styles.stepDotActive]} />
              ))}
            </View>

            {/* Already-done badge */}
            {isDone && (
              <View style={styles.doneBadge}>
                <Text style={styles.doneBadgeText}>✓ Already completed</Text>
              </View>
            )}

            {/* ── Step 1: Study ─────────────────────────────────────────────── */}
            {step === 'study' && (
              <View style={styles.stepContent}>
                <Text style={styles.stepLabel}>Study</Text>

                <Text style={styles.fullSentence}>{item.sentence}</Text>

                {/* Translation reveal */}
                {!showTranslation ? (
                  <TouchableOpacity
                    style={styles.showTransBtn}
                    onPress={handleShowTranslation}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.showTransText}>Show translation</Text>
                  </TouchableOpacity>
                ) : (
                  <>
                    <Animated.Text style={[styles.translation, { opacity: transFade }]}>
                      {item.translation ?? '—'}
                    </Animated.Text>
                    <TouchableOpacity
                      style={[styles.primaryBtn, styles.primaryBtnFull]}
                      onPress={() => setStep('fill_blank')}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.primaryBtnText}>Next ›</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}

            {/* ── Step 2: Fill in the blank ─────────────────────────────────── */}
            {step === 'fill_blank' && (
              <View style={styles.stepContent}>
                <Text style={styles.stepLabel}>Fill in the blank</Text>

                {problem ? (
                  <>
                    <Text style={styles.blankSentence}>{problem.blankSentence}</Text>

                    <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
                      <TextInput
                        ref={inputRef}
                        style={[
                          styles.textInput,
                          checkResult === 'correct' && styles.textInputCorrect,
                          checkResult === 'wrong'   && styles.textInputWrong,
                        ]}
                        value={typed}
                        onChangeText={checkResult ? undefined : setTyped}
                        placeholder="Type the missing word…"
                        placeholderTextColor={C.TEXT_MUTED}
                        autoCapitalize="none"
                        autoCorrect={false}
                        returnKeyType="done"
                        onSubmitEditing={handleCheck}
                        editable={checkResult !== 'correct'}
                      />
                    </Animated.View>

                    {checkResult === 'correct' && (
                      <Text style={styles.feedbackCorrect}>✓ Correct!</Text>
                    )}
                    {checkResult === 'wrong' && (
                      <Text style={styles.feedbackWrong}>✗ Try again</Text>
                    )}

                    <View style={styles.actions}>
                      <TouchableOpacity
                        style={styles.backBtnRow}
                        onPress={() => { setStep('study'); setTyped(''); setCheckResult(null); }}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.backBtnText}>‹ Back</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.primaryBtn, !typed.trim() && styles.primaryBtnDisabled]}
                        onPress={handleCheck}
                        activeOpacity={0.7}
                        disabled={!typed.trim() || checkResult === 'correct'}
                      >
                        <Text style={styles.primaryBtnText}>Check</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  // No blankable word — mark done directly
                  <TouchableOpacity style={[styles.primaryBtn, styles.primaryBtnFull]} onPress={handleDone} activeOpacity={0.7}>
                    <Text style={styles.primaryBtnText}>Mark done ✓</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

          </Animated.View>
        </View>
      </KeyboardAvoidingView>
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
    paddingHorizontal: 10, paddingVertical: 4,
    marginBottom: 4,
  },
  doneBadgeText: { color: C.GREEN, fontSize: 11, fontWeight: '700' },

  stepContent: { gap: 16 },
  stepLabel: {
    color: C.TEXT_MUTED, fontSize: 11, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.8,
  },

  actions: { flexDirection: 'row', gap: 12 },
  backBtnRow: {
    flex: 1, height: 48,
    borderRadius: 12,
    backgroundColor: C.BG_ELEVATED,
    alignItems: 'center', justifyContent: 'center',
  },
  backBtnText: { color: C.TEXT_SECONDARY, fontSize: 15, fontWeight: '600' },

  // ── Study step ─────────────────────────────────────────────────────────────
  fullSentence: { color: C.TEXT_PRIMARY, fontSize: 20, fontWeight: '600', lineHeight: 30 },

  showTransBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1, borderColor: C.BORDER_STRONG,
  },
  showTransText: { color: C.TEXT_SECONDARY, fontSize: 13, fontWeight: '600' },

  translation: { color: C.TEXT_MUTED, fontSize: 16, fontStyle: 'italic', lineHeight: 24 },

  // ── Fill blank step ────────────────────────────────────────────────────────
  blankSentence: { color: C.TEXT_PRIMARY, fontSize: 18, fontWeight: '600', lineHeight: 26 },

  textInput: {
    backgroundColor: C.BG_ELEVATED,
    borderRadius: 12,
    borderWidth: 2, borderColor: 'transparent',
    paddingHorizontal: 16, paddingVertical: 14,
    color: C.TEXT_PRIMARY,
    fontSize: 17, fontWeight: '600',
  },
  textInputCorrect: { borderColor: C.GREEN, backgroundColor: '#052e16' },
  textInputWrong:   { borderColor: C.RED,   backgroundColor: '#2d0a0a' },

  feedbackCorrect: { color: C.GREEN, fontSize: 13, fontWeight: '700' },
  feedbackWrong:   { color: C.RED,   fontSize: 13, fontWeight: '700' },

  primaryBtn: {
    flex: 2, height: 48,
    borderRadius: 12,
    backgroundColor: C.GREEN,
    alignItems: 'center' as const, justifyContent: 'center' as const,
  },
  primaryBtnFull: { flex: 0 },
  primaryBtnDisabled: { opacity: 0.4 },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
