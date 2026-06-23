import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RootStackParamList } from '../navigation/AppNavigator';
import {
  FillBlankLevel,
  FillBlankPart,
  completeLessonItem,
  fetchTTSArrayBuffer,
  generateFillBlank,
  langCode,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { C } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'SentenceDetail'>;

type PracticePhase = 'idle' | 'loading' | 'active' | 'done';
type LevelResult   = 'pending' | 'passed' | 'revealed';
type BlankState    = 'idle' | 'correct' | 'wrong' | 'revealed';

export function SentenceDetailScreen({ route, navigation }: Props) {
  const { item, learnLang, nativeLang, onDone, allItems, currentIndex } = route.params;
  const { token } = useAuth();
  const insets = useSafeAreaInsets();

  // ── Study state ───────────────────────────────────────────────────────────────
  const [showTranslation, setShowTranslation] = useState(false);
  const [isPlaying,       setIsPlaying]       = useState(false);
  const transFade = useRef(new Animated.Value(0)).current;
  const playerRef = useRef<ReturnType<typeof createAudioPlayer> | null>(null);

  // ── Practice state ────────────────────────────────────────────────────────────
  const [phase,        setPhase]        = useState<PracticePhase>('idle');
  const [tests,        setTests]        = useState<FillBlankLevel[]>([]);
  const [lvlIdx,       setLvlIdx]       = useState(0);
  const [inputs,       setInputs]       = useState<string[]>([]);
  const [blankStates,  setBlankStates]  = useState<BlankState[]>([]);
  const [strikes,      setStrikes]      = useState(0);
  const [levelResults, setLevelResults] = useState<LevelResult[]>(['pending', 'pending', 'pending']);
  const [showNext,     setShowNext]     = useState(false);
  const [isChecking,   setIsChecking]   = useState(false);
  const [showDialog,   setShowDialog]   = useState(false);
  const [allPassed,    setAllPassed]    = useState(false);

  const bingoAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const nextItem =
    allItems && currentIndex !== undefined ? allItems[currentIndex + 1] : undefined;

  useEffect(() => () => { playerRef.current?.remove?.(); }, []);

  // ── TTS ───────────────────────────────────────────────────────────────────────
  async function handlePlay() {
    if (isPlaying) return;
    setIsPlaying(true);
    try {
      const base64 = await fetchTTSArrayBuffer(item.sentence, 1.0);
      const uri = `${FileSystem.cacheDirectory}sentence_tts_${Date.now()}.mp3`;
      await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      playerRef.current?.remove?.();
      const player = createAudioPlayer({ uri });
      playerRef.current = player;
      player.addListener('playbackStatusUpdate', (status: any) => {
        if (status.didJustFinish) { player.remove(); setIsPlaying(false); }
      });
      player.play();
    } catch (e) {
      console.error('[TTS]', e);
      setIsPlaying(false);
    }
  }

  // ── Translation ───────────────────────────────────────────────────────────────
  function handleShowTranslation() {
    setShowTranslation(true);
    transFade.setValue(0);
    Animated.timing(transFade, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }

  // ── Start practice ────────────────────────────────────────────────────────────
  async function handleStart() {
    if (!token) return;
    setPhase('loading');
    try {
      const levels = await generateFillBlank(item.sentence, langCode(learnLang), token);
      const blanks0 = levels[0]?.parts.filter((p) => p.type === 'blank') ?? [];
      setTests(levels);
      setLvlIdx(0);
      setInputs(new Array(blanks0.length).fill(''));
      setBlankStates(new Array(blanks0.length).fill('idle'));
      setStrikes(0);
      setLevelResults(new Array(levels.length).fill('pending') as LevelResult[]);
      setShowNext(false);
      setPhase('active');
    } catch (e) {
      console.error('[FillBlank]', e);
      setPhase('idle');
    }
  }

  // ── Advance to a level ────────────────────────────────────────────────────────
  function initLevel(idx: number) {
    const test = tests[idx];
    const blanks = test.parts.filter((p) => p.type === 'blank');
    setLvlIdx(idx);
    setInputs(new Array(blanks.length).fill(''));
    setBlankStates(new Array(blanks.length).fill('idle'));
    setStrikes(0);
    setShowNext(false);
    setIsChecking(false);
  }

  // ── Check ─────────────────────────────────────────────────────────────────────
  function handleCheck() {
    if (isChecking || showNext || !tests[lvlIdx]) return;
    setIsChecking(true);

    const currentTest = tests[lvlIdx];
    let bi = 0;
    const newStates = [...blankStates];
    let anyWrong = false;
    const wrongIndices: number[] = [];

    for (const p of currentTest.parts) {
      if (p.type !== 'blank') continue;
      if (newStates[bi] === 'correct' || newStates[bi] === 'revealed') { bi++; continue; }
      const answer = ('answer' in p ? p.answer : '') ?? '';
      const correct = (inputs[bi] ?? '').trim().toLowerCase() === answer.toLowerCase();
      if (correct) {
        newStates[bi] = 'correct';
      } else {
        newStates[bi] = 'wrong';
        anyWrong = true;
        wrongIndices.push(bi);
      }
      bi++;
    }

    setBlankStates(newStates);

    if (!anyWrong) {
      const newResults = [...levelResults] as LevelResult[];
      if (newResults[lvlIdx] !== 'revealed') newResults[lvlIdx] = 'passed';
      setLevelResults(newResults);
      setShowNext(true);
      setIsChecking(false);
      return;
    }

    // Shake
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue:  8, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue:  4, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue:  0, duration: 55, useNativeDriver: true }),
    ]).start();

    const newStrikes = strikes + 1;
    setStrikes(newStrikes);

    if (newStrikes >= 3) {
      const revealedStates = newStates.map((s) => (s === 'wrong' ? 'revealed' : s)) as BlankState[];
      setBlankStates(revealedStates);
      const newResults = [...levelResults] as LevelResult[];
      newResults[lvlIdx] = 'revealed';
      setLevelResults(newResults);
      setShowNext(true);
      setIsChecking(false);
    } else {
      setTimeout(() => {
        setBlankStates((prev) => prev.map((s) => (s === 'wrong' ? 'idle' : s)));
        setInputs((prev) => {
          const next = [...prev];
          wrongIndices.forEach((i) => { next[i] = ''; });
          return next;
        });
        setIsChecking(false);
      }, 700);
    }
  }

  // ── Next level / finish ───────────────────────────────────────────────────────
  function handleNext() {
    const nextIdx = lvlIdx + 1;
    if (nextIdx < tests.length) {
      initLevel(nextIdx);
      return;
    }

    // All levels done
    if (token) completeLessonItem(token, item.id).catch(() => {});
    onDone(item.id);
    setPhase('done');

    const passed = levelResults.every((r) => r === 'passed');
    setAllPassed(passed);

    if (passed) {
      Animated.spring(bingoAnim, { toValue: 1, useNativeDriver: true, damping: 7 }).start(() => {
        setTimeout(() => {
          Animated.timing(bingoAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(
            () => setShowDialog(true),
          );
        }, 1600);
      });
    } else {
      setShowDialog(true);
    }
  }

  // ── Update a single input ─────────────────────────────────────────────────────
  function updateInput(bi: number, text: string) {
    setInputs((prev) => { const next = [...prev]; next[bi] = text; return next; });
  }

  // ── Inline sentence renderer ──────────────────────────────────────────────────
  function renderInlineSentence() {
    const parts: FillBlankPart[] = tests[lvlIdx]?.parts ?? [];
    const elements: React.ReactElement[] = [];
    let bi = 0;

    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (p.type === 'text') {
        const tokens = p.value.match(/\S*\s*/g)?.filter((t) => t !== '') ?? [p.value];
        tokens.forEach((tok, ti) => {
          elements.push(<Text key={`t-${i}-${ti}`} style={styles.inlineText}>{tok}</Text>);
        });
      } else {
        const state = blankStates[bi];
        const answer = p.answer ?? '';
        const currentBi = bi;
        elements.push(
          <TextInput
            key={`b-${i}`}
            style={[
              styles.inlineInput,
              state === 'correct'  && styles.inlineInputCorrect,
              state === 'wrong'    && styles.inlineInputWrong,
              state === 'revealed' && styles.inlineInputRevealed,
              { width: Math.max(56, answer.length * 13 + 16) },
            ]}
            value={state === 'revealed' ? answer : (inputs[currentBi] ?? '')}
            onChangeText={
              state === 'idle' || state === 'wrong'
                ? (t) => updateInput(currentBi, t)
                : undefined
            }
            editable={state === 'idle' || state === 'wrong'}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
            textContentType="none"
            returnKeyType="done"
            onSubmitEditing={handleCheck}
          />,
        );
        bi++;
      }
    }
    return elements;
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={C.BLUE} />
          <Text style={styles.backLabel}>Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Study card ───────────────────────────────────────────────── */}
        <View style={styles.studyCard}>
          <Text style={styles.sentence}>{item.sentence}</Text>

          <TouchableOpacity
            style={[styles.playBtn, isPlaying && styles.playBtnActive]}
            onPress={handlePlay}
            activeOpacity={0.75}
            disabled={isPlaying}
          >
            <Ionicons
              name={isPlaying ? 'volume-high' : 'volume-high-outline'}
              size={22}
              color={isPlaying ? C.PURPLE : C.TEXT_SECONDARY}
            />
          </TouchableOpacity>

          {!showTranslation ? (
            <TouchableOpacity style={styles.showTransBtn} onPress={handleShowTranslation} activeOpacity={0.7}>
              <Text style={styles.showTransText}>Show translation</Text>
            </TouchableOpacity>
          ) : (
            <Animated.Text style={[styles.translation, { opacity: transFade }]}>
              {item.translation ?? '—'}
            </Animated.Text>
          )}
        </View>

        {/* ── Divider ─────────────────────────────────────────────────── */}
        <View style={styles.divider} />

        {/* ── Practice section ────────────────────────────────────────── */}
        <View style={styles.practiceSection}>
          <Text style={styles.sectionLabel}>Practice</Text>

          {phase === 'idle' && (
            <TouchableOpacity style={styles.startBtn} onPress={handleStart} activeOpacity={0.8}>
              <Ionicons name="play-circle-outline" size={20} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.startBtnText}>Start challenges</Text>
            </TouchableOpacity>
          )}

          {phase === 'loading' && (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={C.PURPLE} />
              <Text style={styles.loadingText}>Generating challenges…</Text>
            </View>
          )}

          {(phase === 'active' || phase === 'done') && tests.length > 0 && (
            <>
              {/* Level progress dots */}
              <View style={styles.levelRow}>
                {levelResults.map((result, i) => (
                  <View
                    key={i}
                    style={[
                      styles.levelDot,
                      phase === 'active' && i === lvlIdx && styles.levelDotActive,
                      result === 'passed'   && styles.levelDotPassed,
                      result === 'revealed' && styles.levelDotRevealed,
                    ]}
                  />
                ))}
                <Text style={styles.levelLabel}>
                  {phase === 'active' ? `Level ${lvlIdx + 1} of ${tests.length}` : 'Complete'}
                </Text>
              </View>

              {/* Strikes */}
              {phase === 'active' && strikes > 0 && (
                <View style={styles.strikesRow}>
                  {[0, 1, 2].map((i) => (
                    <View key={i} style={[styles.strikePip, i < strikes && styles.strikePipUsed]} />
                  ))}
                  <Text style={styles.strikesText}>
                    {strikes >= 3 ? 'Answer revealed' : `${3 - strikes} attempt${3 - strikes !== 1 ? 's' : ''} left`}
                  </Text>
                </View>
              )}

              {/* Inline sentence with TextInput blanks */}
              <Animated.View
                style={[styles.inlineContainer, { transform: [{ translateX: shakeAnim }] }]}
              >
                {renderInlineSentence()}
              </Animated.View>

              {/* Action buttons */}
              {phase === 'active' && (
                showNext ? (
                  <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.8}>
                    <Text style={styles.nextBtnText}>
                      {lvlIdx < tests.length - 1 ? `Next Level →` : 'Finish ✓'}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.checkBtn, isChecking && styles.checkBtnDisabled]}
                    onPress={handleCheck}
                    disabled={isChecking}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.checkBtnText}>Check</Text>
                  </TouchableOpacity>
                )
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* Bingo overlay */}
      {phase === 'done' && allPassed && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.bingoOverlay,
            { opacity: bingoAnim, transform: [{ scale: bingoAnim }] },
          ]}
          pointerEvents="none"
        >
          <Text style={styles.bingoEmoji}>🎉</Text>
          <Text style={styles.bingoTitle}>Perfect!</Text>
          <Text style={styles.bingoSub}>All levels cleared!</Text>
        </Animated.View>
      )}

      {/* Congrats dialog */}
      <Modal visible={showDialog} transparent animationType="fade" onRequestClose={() => {}}>
        <View style={styles.dialogBackdrop}>
          <View style={styles.dialogCard}>
            <Text style={styles.dialogEmoji}>{allPassed ? '🌟' : '✅'}</Text>
            <Text style={styles.dialogTitle}>{allPassed ? 'Well done!' : 'Good effort!'}</Text>
            <Text style={styles.dialogBody}>
              {allPassed
                ? `You aced all ${tests.length} challenges!`
                : `You completed all ${tests.length} levels.`}
            </Text>
            <View style={styles.dialogActions}>
              {nextItem && (
                <TouchableOpacity
                  style={styles.dialogNextBtn}
                  activeOpacity={0.8}
                  onPress={() => {
                    setShowDialog(false);
                    navigation.replace('SentenceDetail', {
                      item: nextItem,
                      learnLang,
                      nativeLang,
                      onDone,
                      allItems,
                      currentIndex: (currentIndex ?? 0) + 1,
                    });
                  }}
                >
                  <Text style={styles.dialogNextBtnText}>Next Challenge →</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.dialogBackBtn}
                activeOpacity={0.8}
                onPress={() => { setShowDialog(false); navigation.goBack(); }}
              >
                <Text style={styles.dialogBackBtnText}>Back to Chapter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.BG_BASE },

  // ── Header ────────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 8,
    backgroundColor: C.BG_BASE,
  },
  backBtn:   { flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: 4 },
  backLabel: { color: C.BLUE, fontSize: 16, fontWeight: '600' },

  // ── Scroll ────────────────────────────────────────────────────────────────────
  scroll:        { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 8, gap: 0 },

  // ── Study card ────────────────────────────────────────────────────────────────
  studyCard: {
    backgroundColor: C.BG_SURFACE,
    borderRadius: 20,
    borderWidth: 1, borderColor: C.BORDER_DEFAULT,
    padding: 24,
    gap: 20,
  },
  sentence: {
    color: C.TEXT_PRIMARY,
    fontSize: 24, fontWeight: '700', lineHeight: 34,
  },
  playBtn: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.BG_ELEVATED,
    borderWidth: 1, borderColor: C.BORDER_DEFAULT,
  },
  playBtnActive: { borderColor: C.PURPLE, backgroundColor: '#1e1530' },
  showTransBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1, borderColor: C.BORDER_STRONG,
  },
  showTransText: { color: C.TEXT_SECONDARY, fontSize: 13, fontWeight: '600' },
  translation:   { color: C.TEXT_MUTED, fontSize: 16, fontStyle: 'italic', lineHeight: 24 },

  // ── Divider ───────────────────────────────────────────────────────────────────
  divider: { height: 1, backgroundColor: C.BORDER_DEFAULT, marginVertical: 28 },

  // ── Practice section ──────────────────────────────────────────────────────────
  practiceSection: { gap: 18 },
  sectionLabel: {
    color: C.TEXT_MUTED,
    fontSize: 11, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.8,
  },

  startBtn: {
    flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center',
    height: 52, borderRadius: 14,
    backgroundColor: C.PURPLE,
  },
  startBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  loadingText: { color: C.TEXT_MUTED, fontSize: 14 },

  // Level dots
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  levelDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: C.BORDER_STRONG,
  },
  levelDotActive:   { backgroundColor: C.BLUE, width: 22, borderRadius: 5 },
  levelDotPassed:   { backgroundColor: C.GREEN },
  levelDotRevealed: { backgroundColor: '#f97316' },
  levelLabel: { color: C.TEXT_MUTED, fontSize: 12, fontWeight: '700', marginLeft: 4 },

  // Strikes
  strikesRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  strikePip: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: C.BORDER_STRONG,
  },
  strikePipUsed: { backgroundColor: C.RED },
  strikesText: { color: C.TEXT_MUTED, fontSize: 12, marginLeft: 4 },

  // Inline sentence
  inlineContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 8,
  },
  inlineText: {
    color: C.TEXT_PRIMARY,
    fontSize: 20, fontWeight: '600', lineHeight: 32,
  },
  inlineInput: {
    minWidth: 56,
    height: 36,
    borderRadius: 8,
    borderWidth: 2, borderColor: C.BORDER_STRONG,
    backgroundColor: C.BG_ELEVATED,
    color: C.TEXT_PRIMARY,
    fontSize: 17, fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 6,
    marginVertical: 2,
  },
  inlineInputCorrect:  { borderColor: C.GREEN,  backgroundColor: '#052e16', color: C.GREEN },
  inlineInputWrong:    { borderColor: C.RED,    backgroundColor: '#2d0a0a', color: C.RED },
  inlineInputRevealed: { borderColor: '#f97316', backgroundColor: '#431407', color: '#f97316' },

  // Buttons
  checkBtn: {
    height: 52, borderRadius: 14,
    backgroundColor: C.BLUE,
    alignItems: 'center', justifyContent: 'center',
  },
  checkBtnDisabled: { opacity: 0.4 },
  checkBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  nextBtn: {
    height: 52, borderRadius: 14,
    backgroundColor: C.GREEN,
    alignItems: 'center', justifyContent: 'center',
  },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Bingo overlay
  bingoOverlay: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(10,6,20,0.88)',
  },
  bingoEmoji: { fontSize: 72 },
  bingoTitle: { color: '#fff', fontSize: 32, fontWeight: '800', marginTop: 12 },
  bingoSub:   { color: C.TEXT_MUTED, fontSize: 16, marginTop: 6 },

  // Dialog
  dialogBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32,
  },
  dialogCard: {
    width: '100%',
    backgroundColor: C.BG_SURFACE,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    gap: 10,
    borderWidth: 1, borderColor: C.BORDER_DEFAULT,
  },
  dialogEmoji: { fontSize: 44, marginBottom: 4 },
  dialogTitle: { color: C.TEXT_PRIMARY, fontSize: 22, fontWeight: '800' },
  dialogBody:  { color: C.TEXT_SECONDARY, fontSize: 15, textAlign: 'center', lineHeight: 22 },
  dialogActions: { width: '100%', gap: 10, marginTop: 8 },
  dialogNextBtn: {
    height: 50, borderRadius: 14,
    backgroundColor: C.PURPLE,
    alignItems: 'center', justifyContent: 'center',
  },
  dialogNextBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  dialogBackBtn: {
    height: 50, borderRadius: 14,
    backgroundColor: C.BG_ELEVATED,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: C.BORDER_DEFAULT,
  },
  dialogBackBtnText: { color: C.TEXT_SECONDARY, fontSize: 16, fontWeight: '600' },
});
