import {
  RecordingPresets,
  createAudioPlayer,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RootStackParamList } from '../navigation/AppNavigator';
import { fetchSpeakingFeedback, fetchTTSArrayBuffer, langCode } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { C } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'SpeakingPractice'>;

type SentencePhase = 'idle' | 'recording' | 'processing' | 'feedback';

export function SpeakingPracticeScreen({ route, navigation }: Props) {
  const { sentences, language, chapterTitle } = route.params;
  const { token } = useAuth();
  const insets = useSafeAreaInsets();

  const [idx,        setIdx]        = useState(0);
  const [phase,      setPhase]      = useState<SentencePhase>('idle');
  const [transcript, setTranscript] = useState('');
  const [feedback,   setFeedback]   = useState('');
  const [isPlaying,  setIsPlaying]  = useState(false);
  const [done,       setDone]       = useState(false);

  const recorder   = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY });
  const playerRef  = useRef<ReturnType<typeof createAudioPlayer> | null>(null);
  const pulseAnim  = useRef(new Animated.Value(1)).current;
  const pulseLoop  = useRef<Animated.CompositeAnimation | null>(null);

  const sentence = sentences[idx] ?? '';

  useEffect(() => () => { playerRef.current?.remove?.(); }, []);

  // ── Pulse animation while recording ───────────────────────────────────────────
  useEffect(() => {
    if (phase === 'recording') {
      pulseAnim.setValue(1);
      pulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.25, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1,    duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
      );
      pulseLoop.current.start();
    } else {
      pulseLoop.current?.stop();
      pulseAnim.setValue(1);
    }
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── TTS ───────────────────────────────────────────────────────────────────────
  async function handlePlay() {
    if (isPlaying) return;
    setIsPlaying(true);
    try {
      const base64 = await fetchTTSArrayBuffer(sentence, 1.0);
      const uri = `${FileSystem.cacheDirectory}speak_tts_${Date.now()}.mp3`;
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

  // ── Recording ─────────────────────────────────────────────────────────────────
  async function handleRecordStart() {
    if (phase !== 'idle' && phase !== 'feedback') return;
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) return;
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setTranscript('');
      setFeedback('');
      setPhase('recording');
    } catch (e) {
      console.error('[REC] start error', e);
    }
  }

  async function handleRecordStop() {
    if (phase !== 'recording') return;
    setPhase('processing');
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri || !token) { setPhase('idle'); return; }
      const audioBase64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const result = await fetchSpeakingFeedback(
        audioBase64,
        sentence,
        langCode(language),
        token,
      );
      setTranscript(result.transcript);
      setFeedback(result.feedback);
      setPhase('feedback');
    } catch (e) {
      console.error('[REC] stop/submit error', e);
      setPhase('idle');
    }
  }

  // ── Navigation ────────────────────────────────────────────────────────────────
  function handleNext() {
    playerRef.current?.remove?.();
    const nextIdx = idx + 1;
    if (nextIdx >= sentences.length) {
      setDone(true);
      return;
    }
    setIdx(nextIdx);
    setPhase('idle');
    setTranscript('');
    setFeedback('');
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  if (done) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={[styles.header, { paddingTop: 8 }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={22} color={C.BLUE} />
            <Text style={styles.backLabel}>Back</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.doneScreen}>
          <Text style={styles.doneEmoji}>🎙️</Text>
          <Text style={styles.doneTitle}>Great practice!</Text>
          <Text style={styles.doneSub}>You spoke through all {sentences.length} sentences.</Text>
          <TouchableOpacity style={styles.doneBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Text style={styles.doneBtnText}>Back to Chapter</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={C.BLUE} />
          <Text style={styles.backLabel}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{chapterTitle}</Text>
        <Text style={styles.progress}>{idx + 1}/{sentences.length}</Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${((idx + 1) / sentences.length) * 100}%` as any }]} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 48 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Sentence card ─────────────────────────────────────────────── */}
        <View style={styles.sentenceCard}>
          <Text style={styles.sentenceText}>{sentence}</Text>

          {/* Play button */}
          <TouchableOpacity
            style={[styles.playBtn, isPlaying && styles.playBtnActive]}
            onPress={handlePlay}
            activeOpacity={0.75}
            disabled={isPlaying}
          >
            <Ionicons
              name={isPlaying ? 'volume-high' : 'volume-high-outline'}
              size={20}
              color={isPlaying ? C.PURPLE : C.TEXT_SECONDARY}
            />
            <Text style={[styles.playBtnLabel, isPlaying && { color: C.PURPLE }]}>
              {isPlaying ? 'Playing…' : 'Listen'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Record section ────────────────────────────────────────────── */}
        <View style={styles.recordSection}>
          {(phase === 'recording' || phase === 'processing') && (
            <Text style={styles.hint}>
              {phase === 'recording' ? 'Recording… release when done' : 'Processing…'}
            </Text>
          )}

          {/* Hold-to-record button */}
          <View style={styles.recordBtnWrap}>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <Pressable
                style={[
                  styles.recordBtn,
                  phase === 'recording'  && styles.recordBtnActive,
                  phase === 'processing' && styles.recordBtnProcessing,
                ]}
                onPressIn={handleRecordStart}
                onPressOut={handleRecordStop}
                disabled={phase === 'processing'}
              >
                {phase === 'processing' ? (
                  <ActivityIndicator color="#fff" size="large" />
                ) : (
                  <Ionicons
                    name={phase === 'recording' ? 'stop-circle' : 'mic'}
                    size={40}
                    color="#fff"
                  />
                )}
              </Pressable>
            </Animated.View>
          </View>

          {/* Feedback area */}
          {phase === 'feedback' && (
            <View style={styles.feedbackCard}>
              <View style={styles.feedbackRow}>
                <Text style={styles.feedbackLabel}>You said</Text>
                <Text style={styles.transcriptText}>"{transcript}"</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.feedbackRow}>
                <Text style={styles.feedbackLabel}>Feedback</Text>
                <Text style={styles.feedbackText}>{feedback}</Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Next button — pinned to bottom */}
      <View style={[styles.nextBar, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={[styles.nextBtn, phase === 'idle' && styles.nextBtnMuted]}
          onPress={handleNext}
          activeOpacity={0.8}
        >
          <Text style={styles.nextBtnText}>
            {idx < sentences.length - 1 ? 'Next sentence →' : 'Finish'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.BG_BASE },

  // ── Header ────────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 10,
    paddingTop: 8,
  },
  backBtn:      { flexDirection: 'row', alignItems: 'center', gap: 2 },
  backLabel:    { color: C.BLUE, fontSize: 16, fontWeight: '600' },
  headerTitle:  { flex: 1, color: C.TEXT_PRIMARY, fontSize: 15, fontWeight: '700' },
  progress:     { color: C.TEXT_MUTED, fontSize: 13, fontWeight: '700' },

  // ── Progress bar ──────────────────────────────────────────────────────────────
  progressTrack: { height: 3, backgroundColor: C.BG_ELEVATED, marginHorizontal: 0 },
  progressFill:  { height: 3, backgroundColor: C.PURPLE },

  // ── Scroll ────────────────────────────────────────────────────────────────────
  scroll:        { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 24, gap: 28 },

  // ── Sentence card ─────────────────────────────────────────────────────────────
  sentenceCard: {
    backgroundColor: C.BG_SURFACE,
    borderRadius: 20,
    borderWidth: 1, borderColor: C.BORDER_DEFAULT,
    padding: 24,
    gap: 16,
  },
  sentenceText: {
    color: C.TEXT_PRIMARY,
    fontSize: 26, fontWeight: '700', lineHeight: 36,
  },
  playBtn: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: C.BG_ELEVATED,
    borderWidth: 1, borderColor: C.BORDER_DEFAULT,
  },
  playBtnActive: { borderColor: C.PURPLE, backgroundColor: '#1e1530' },
  playBtnLabel:  { color: C.TEXT_SECONDARY, fontSize: 13, fontWeight: '600' },

  // ── Record section ────────────────────────────────────────────────────────────
  recordSection: { gap: 16, alignItems: 'center' },
  hint: {
    color: C.TEXT_MUTED,
    fontSize: 13, textAlign: 'center',
  },

  recordBtnWrap: { marginVertical: 8 },
  recordBtn: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: C.PURPLE,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: C.PURPLE, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45, shadowRadius: 12,
    elevation: 8,
  },
  recordBtnActive:     { backgroundColor: C.RED },
  recordBtnProcessing: { backgroundColor: C.TEXT_MUTED },

  // ── Feedback card ─────────────────────────────────────────────────────────────
  feedbackCard: {
    width: '100%',
    backgroundColor: C.BG_SURFACE,
    borderRadius: 16,
    borderWidth: 1, borderColor: C.BORDER_DEFAULT,
    padding: 18,
    gap: 14,
  },
  feedbackRow: { gap: 6 },
  feedbackLabel: {
    color: C.TEXT_MUTED,
    fontSize: 10, fontWeight: '800',
    textTransform: 'uppercase', letterSpacing: 0.6,
  },
  transcriptText: {
    color: C.TEXT_SECONDARY,
    fontSize: 16, fontStyle: 'italic', lineHeight: 24,
  },
  divider: { height: 1, backgroundColor: C.BORDER_DEFAULT },
  feedbackText: {
    color: C.TEXT_PRIMARY,
    fontSize: 15, lineHeight: 22,
  },

  // ── Next bar ──────────────────────────────────────────────────────────────────
  nextBar: {
    paddingHorizontal: 24,
    paddingTop: 12,
    backgroundColor: C.BG_BASE,
    borderTopWidth: 1,
    borderTopColor: C.BORDER_DEFAULT,
  },
  nextBtn: {
    height: 52, borderRadius: 14,
    backgroundColor: C.BLUE,
    alignItems: 'center', justifyContent: 'center',
  },
  nextBtnMuted: { opacity: 0.55 },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // ── Done screen ───────────────────────────────────────────────────────────────
  doneScreen: {
    flex: 1,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 40, gap: 14,
  },
  doneEmoji: { fontSize: 60, marginBottom: 8 },
  doneTitle: { color: C.TEXT_PRIMARY, fontSize: 26, fontWeight: '800' },
  doneSub:   { color: C.TEXT_MUTED,   fontSize: 15, textAlign: 'center', lineHeight: 22 },
  doneBtn: {
    marginTop: 16,
    paddingHorizontal: 28, paddingVertical: 14,
    borderRadius: 14, backgroundColor: C.PURPLE,
  },
  doneBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
