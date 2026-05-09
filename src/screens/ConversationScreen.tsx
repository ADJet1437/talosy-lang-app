import {
  RecordingPresets,
  createAudioPlayer,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { RootStackParamList } from '../navigation/AppNavigator';
import { SessionSummary, TeachingData, TalkosWS, createSession } from '../services/api';

type Props = NativeStackScreenProps<RootStackParamList, 'Conversation'>;
type AppState = 'setup' | 'connecting' | 'ai_speaking' | 'listening' | 'processing' | 'paused' | 'ended';
type Message = { role: 'user' | 'ai'; text: string };

const SPEECH_THRESHOLD = -25;
const SILENCE_MS = 1800;
const VAD_INTERVAL_MS = 100;

function TeachingCard({ payload, onDismiss }: { payload: TeachingData; onDismiss: () => void }) {
  if (payload.tool === 'suggest_vocabulary') {
    const { simple_word, suggestions, example } = payload.data;
    return (
      <View style={cardStyles.card}>
        <View style={cardStyles.row}>
          <Text style={cardStyles.icon}>💡</Text>
          <Text style={cardStyles.title}>Better word than "{simple_word}"</Text>
          <TouchableOpacity onPress={onDismiss}><Text style={cardStyles.dismiss}>✕</Text></TouchableOpacity>
        </View>
        <Text style={cardStyles.suggestions}>{suggestions.join('  ·  ')}</Text>
        <Text style={cardStyles.example}>{example}</Text>
      </View>
    );
  }

  if (payload.tool === 'correct_sentence') {
    const { original, corrected, explanation } = payload.data;
    return (
      <View style={cardStyles.card}>
        <View style={cardStyles.row}>
          <Text style={cardStyles.icon}>✏️</Text>
          <Text style={cardStyles.title}>Sentence correction</Text>
          <TouchableOpacity onPress={onDismiss}><Text style={cardStyles.dismiss}>✕</Text></TouchableOpacity>
        </View>
        <Text style={cardStyles.original}>"{original}"</Text>
        <Text style={cardStyles.corrected}>→  "{corrected}"</Text>
        <Text style={cardStyles.example}>{explanation}</Text>
      </View>
    );
  }

  if (payload.tool === 'generate_article') {
    const { article, topic } = payload.data;
    return (
      <View style={cardStyles.card}>
        <View style={cardStyles.row}>
          <Text style={cardStyles.icon}>📖</Text>
          <Text style={cardStyles.title}>Practice: {topic}</Text>
          <TouchableOpacity onPress={onDismiss}><Text style={cardStyles.dismiss}>✕</Text></TouchableOpacity>
        </View>
        <Text style={cardStyles.article}>{article}</Text>
      </View>
    );
  }

  if (payload.tool === 'define') {
    const { word, definition, example } = payload.data;
    return (
      <View style={cardStyles.card}>
        <View style={cardStyles.row}>
          <Text style={cardStyles.icon}>📚</Text>
          <Text style={cardStyles.title}>{word}</Text>
          <TouchableOpacity onPress={onDismiss}><Text style={cardStyles.dismiss}>✕</Text></TouchableOpacity>
        </View>
        <Text style={cardStyles.example}>{definition}</Text>
        <Text style={cardStyles.original}>"{example}"</Text>
      </View>
    );
  }

  if (payload.tool === 'pronounce') {
    const { word, phonetic, speed } = payload.data;
    return (
      <View style={cardStyles.card}>
        <View style={cardStyles.row}>
          <Text style={cardStyles.icon}>🔊</Text>
          <Text style={cardStyles.title}>{word}</Text>
          <TouchableOpacity onPress={onDismiss}><Text style={cardStyles.dismiss}>✕</Text></TouchableOpacity>
        </View>
        <Text style={cardStyles.suggestions}>{phonetic}</Text>
        <Text style={cardStyles.example}>Speed: {speed}</Text>
      </View>
    );
  }

  if (payload.tool === 'language_switch_reminder') {
    const { detected_language, target_language, last_target_utterance, reminder_level } = payload.data;
    const icon = reminder_level === 'encouraging' ? '💪' : '🌐';
    const levelColor = reminder_level === 'firm' ? '#f0a040' : '#7c6af7';
    return (
      <View style={[cardStyles.card, { borderColor: levelColor }]}>
        <View style={cardStyles.row}>
          <Text style={cardStyles.icon}>{icon}</Text>
          <Text style={cardStyles.title}>{detected_language} detected — let's speak {target_language}</Text>
          <TouchableOpacity onPress={onDismiss}><Text style={cardStyles.dismiss}>✕</Text></TouchableOpacity>
        </View>
        <Text style={cardStyles.example}>Try again:</Text>
        <View style={cardStyles.repeatBox}>
          <Text style={cardStyles.repeatText}>"{last_target_utterance}"</Text>
        </View>
      </View>
    );
  }

  return null;
}

export function ConversationScreen({ navigation, route }: Props) {
  const { language, nativeLanguage } = route.params;
  const [appState, setAppState] = useState<AppState>('setup');
  const [messages, setMessages] = useState<Message[]>([]);
  const [level, setLevel] = useState<string | null>(null);
  const [teaching, setTeaching] = useState<TeachingData | null>(null);

  const wsRef = useRef<TalkosWS | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const onFinishRef = useRef<(() => void) | null>(null);

  const isActiveRef = useRef(false);
  const isPausedRef = useRef(false);
  const hasSpokenRef = useRef(false);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submitCalledRef = useRef(false);
  const vadIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const logCountRef = useRef(0);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  const recorder = useAudioRecorder(
    { ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true },
  );

  const stopVadPolling = useCallback(() => {
    if (vadIntervalRef.current) {
      clearInterval(vadIntervalRef.current);
      vadIntervalRef.current = null;
    }
  }, []);

  const startVadPolling = useCallback(() => {
    stopVadPolling();
    vadIntervalRef.current = setInterval(() => {
      if (!isActiveRef.current) {
        stopVadPolling();
        return;
      }
      const status = recorder.getStatus();
      const db = status.metering ?? -999;

      logCountRef.current += 1;
      if (logCountRef.current % 20 === 0) {
        console.log(`[VAD] db=${db.toFixed(1)} spoken=${hasSpokenRef.current}`);
      }

      if (db > SPEECH_THRESHOLD) {
        hasSpokenRef.current = true;
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
      } else if (hasSpokenRef.current && !silenceTimerRef.current) {
        silenceTimerRef.current = setTimeout(() => {
          silenceTimerRef.current = null;
          triggerSubmit();
        }, SILENCE_MS);
      }
    }, VAD_INTERVAL_MS);
  }, [recorder, stopVadPolling]);

  const addMessage = useCallback((role: 'user' | 'ai', text: string) => {
    setMessages((prev) => [...prev, { role, text }]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  useEffect(() => {
    const shouldPulse = appState === 'listening' || appState === 'ai_speaking';
    if (!shouldPulse) {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
      return;
    }
    const duration = appState === 'listening' ? 700 : 1100;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.55, duration, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [appState]);

  function triggerSubmit() {
    if (!isActiveRef.current) return;
    if (submitCalledRef.current) return;
    submitCalledRef.current = true;
    isActiveRef.current = false;
    stopVadPolling();
    submitSpeech();
  }

  async function submitSpeech() {
    console.log('[VAD] submitting speech');
    setAppState('processing');
    try {
      await recorder.stop();
      const uri = recorder.uri;
      console.log('[REC] uri:', uri);
      if (!uri) { enterListening(); return; }
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      console.log('[REC] base64 length:', base64.length);
      wsRef.current?.sendSpeech(base64);
    } catch (e) {
      console.error('[REC] submitSpeech error:', e);
      enterListening();
    }
  }

  const enterListening = useCallback(async () => {
    console.log('[STATE] enterListening');
    hasSpokenRef.current = false;
    submitCalledRef.current = false;
    logCountRef.current = 0;
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    stopVadPolling();
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        Alert.alert('Permission required', 'Microphone access is needed.');
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      isActiveRef.current = true;
      recorder.record();
      setAppState('listening');
      startVadPolling();
      console.log('[REC] recording + VAD polling started ✓');
    } catch (e) {
      console.error('[REC] enterListening error:', e);
    }
  }, [recorder, startVadPolling, stopVadPolling]);

  const playAudio = useCallback(async (base64Mp3: string, onFinish: () => void) => {
    isActiveRef.current = false;
    stopVadPolling();
    onFinishRef.current = onFinish;

    console.log('[AUDIO] playAudio, length:', base64Mp3.length);
    try {
      const tempUri = `${FileSystem.cacheDirectory}ai_${Date.now()}.mp3`;
      await FileSystem.writeAsStringAsync(tempUri, base64Mp3, {
        encoding: FileSystem.EncodingType.Base64,
      });
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      const player = createAudioPlayer({ uri: tempUri });
      player.addListener('playbackStatusUpdate', (status) => {
        if (status.didJustFinish) {
          console.log('[AUDIO] finished → callback in 400ms');
          player.remove();
          setTimeout(() => {
            onFinishRef.current?.();
            onFinishRef.current = null;
          }, 400);
        }
      });
      player.play();
    } catch (e) {
      console.error('[AUDIO] error:', e);
      onFinish();
    }
  }, [stopVadPolling]);

  useEffect(() => {
    let cancelled = false;

    createSession(language, nativeLanguage).then((sessionId) => {
      if (cancelled) return;
      setAppState('connecting');

      const ws = new TalkosWS(sessionId, {
        onReady: (openingText, openingAudio) => {
          console.log('[WS] onReady, hasAudio:', !!openingAudio);
          addMessage('ai', openingText);
          if (openingAudio) {
            setAppState('ai_speaking');
            playAudio(openingAudio, () => { if (!isPausedRef.current) enterListening(); });
          } else {
            enterListening();
          }
        },
        onTranscript: (text) => {
          console.log('[WS] transcript:', text);
          addMessage('user', text);
        },
        onNoSpeech: () => {
          console.warn('[WS] no_speech → re-listening');
          if (!isPausedRef.current) enterListening();
        },
        onAIResponse: (text, audio, newLevel) => {
          console.log('[WS] ai_response, level:', newLevel);
          addMessage('ai', text);
          if (newLevel) setLevel(newLevel);
          setAppState('ai_speaking');
          playAudio(audio, () => { if (!isPausedRef.current) enterListening(); else setAppState('paused'); });
        },
        onTeaching: (payload) => {
          console.log('[WS] teaching:', payload.tool);
          setTeaching(payload);
        },
        onSessionEnd: (summary: SessionSummary) => {
          setAppState('ended');
          navigation.replace('Summary', { summary });
        },
        onError: (msg) => {
          console.error('[WS] error:', msg);
          Alert.alert('Connection error', msg);
          navigation.goBack();
        },
        onClose: () => console.warn('[WS] closed'),
      });
      wsRef.current = ws;
    }).catch((e) => {
      console.error('[SETUP] createSession error:', e);
      Alert.alert('Error', 'Could not start session. Is the server running?');
    });

    return () => {
      cancelled = true;
      isActiveRef.current = false;
      stopVadPolling();
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      recorder.stop().catch(() => {});
      wsRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handlePause() {
    isPausedRef.current = true;
    isActiveRef.current = false;
    stopVadPolling();
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
    recorder.stop().catch(() => {});
    setAppState('paused');
  }

  function handleResume() {
    isPausedRef.current = false;
    enterListening();
  }

  function handleEndSession() {
    isActiveRef.current = false;
    isPausedRef.current = false;
    stopVadPolling();
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    recorder.stop().catch(() => {});
    wsRef.current?.endSession();
  }

  const stateConfig: Record<AppState, { color: string; icon: string; spinner: boolean; label: string }> = {
    setup:       { color: '#2a2a4a', icon: '',   spinner: true,  label: 'Starting…' },
    connecting:  { color: '#2a2a4a', icon: '',   spinner: true,  label: 'Connecting…' },
    ai_speaking: { color: '#44aa88', icon: '🔊', spinner: false, label: 'Speaking…' },
    listening:   { color: '#7c6af7', icon: '🎙', spinner: false, label: 'Listening…' },
    processing:  { color: '#f0a040', icon: '',   spinner: true,  label: 'Processing…' },
    paused:      { color: '#f0a040', icon: '⏸', spinner: false, label: 'Paused' },
    ended:       { color: '#2a2a4a', icon: '✓',  spinner: false, label: 'Session ended' },
  };

  const cfg = stateConfig[appState];
  const pauseActive = appState === 'listening' || appState === 'paused';

  if (appState === 'setup') {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#7c6af7" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <TouchableOpacity style={styles.header} onPress={() => navigation.goBack()} activeOpacity={0.7}>
        <Text style={styles.headerBack}>‹</Text>
        <Text style={styles.headerTitle}>Talkos</Text>
      </TouchableOpacity>

      {/* State indicator */}
      <View style={styles.indicatorArea}>
        <View style={styles.indicatorWrapper}>
          <Animated.View style={[
            styles.glowRing,
            { backgroundColor: cfg.color, transform: [{ scale: pulseAnim }] },
          ]} />
          <View style={[styles.indicatorCircle, { backgroundColor: cfg.color }]}>
            {cfg.spinner
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.indicatorIcon}>{cfg.icon}</Text>
            }
          </View>
        </View>
        <Text style={styles.indicatorLabel}>{cfg.label}</Text>
      </View>

      {/* Transcript */}
      <ScrollView ref={scrollRef} style={styles.transcript} contentContainerStyle={styles.transcriptContent}>
        {messages.map((m, i) => (
          <View key={i} style={[styles.bubble, m.role === 'user' ? styles.userBubble : styles.aiBubble]}>
            <Text style={[styles.bubbleText, m.role === 'user' ? styles.userText : styles.aiText]}>
              {m.text}
            </Text>
          </View>
        ))}
      </ScrollView>

      {teaching && (
        <TeachingCard payload={teaching} onDismiss={() => setTeaching(null)} />
      )}

      {/* Footer — 2 round buttons */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.roundBtnPrimary, !pauseActive && styles.roundBtnDisabled]}
          onPress={appState === 'paused' ? handleResume : handlePause}
          disabled={!pauseActive}
          activeOpacity={0.75}
        >
          <Text style={styles.roundBtnIcon}>{appState === 'paused' ? '▶' : '⏸'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.roundBtnEnd} onPress={handleEndSession} activeOpacity={0.75}>
          <Text style={styles.roundBtnIcon}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: '#1a1a2e', alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1, backgroundColor: '#1a1a2e' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a4a',
  },
  headerBack: { color: '#7c6af7', fontSize: 28, fontWeight: '300', lineHeight: 32 },
  headerTitle: { color: '#e0e0ff', fontSize: 18, fontWeight: '700' },

  // State indicator
  indicatorArea: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 14,
  },
  indicatorWrapper: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowRing: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    opacity: 0.25,
  },
  indicatorCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorIcon: { fontSize: 28 },
  indicatorLabel: {
    color: '#e0e0ff',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  // Transcript
  transcript: { flex: 1 },
  transcriptContent: { padding: 16, gap: 10, paddingBottom: 24 },
  bubble: { maxWidth: '80%', borderRadius: 16, padding: 12 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#7c6af7' },
  aiBubble: { alignSelf: 'flex-start', backgroundColor: '#16213e', borderWidth: 1, borderColor: '#2a2a4a' },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  userText: { color: '#fff' },
  aiText: { color: '#e0e0ff' },

  // Footer — 3 round buttons
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 24,
    borderTopWidth: 1,
    borderTopColor: '#2a2a4a',
  },
  roundBtnPrimary: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#7c6af7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundBtnDisabled: {
    backgroundColor: '#16213e',
    borderWidth: 1.5,
    borderColor: '#2a2a4a',
  },
  roundBtnEnd: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#16213e',
    borderWidth: 1.5,
    borderColor: '#3a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundBtnIcon: { fontSize: 20 },
});

const cardStyles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#16213e',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#7c6af7',
    gap: 6,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  icon: { fontSize: 16 },
  title: { flex: 1, color: '#e0e0ff', fontSize: 13, fontWeight: '700' },
  dismiss: { color: '#555577', fontSize: 14, paddingLeft: 8 },
  suggestions: { color: '#7c6af7', fontSize: 14, fontWeight: '600' },
  original: { color: '#888899', fontSize: 13, fontStyle: 'italic' },
  corrected: { color: '#44aa88', fontSize: 14, fontWeight: '600' },
  example: { color: '#8888aa', fontSize: 12 },
  article: { color: '#c0c0e0', fontSize: 14, lineHeight: 22 },
  repeatBox: {
    backgroundColor: '#0d1426',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 2,
  },
  repeatText: { color: '#e0e0ff', fontSize: 14, fontWeight: '600' },
});
