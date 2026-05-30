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
import { TalkosWS, createSession, fetchTTSBase64 } from '../services/api';
import { TopicSheet } from '../components/TopicSheet';
import { WordSheet } from '../components/WordSheet';

type Props = NativeStackScreenProps<RootStackParamList, 'Conversation'>;
type AppState = 'setup' | 'connecting' | 'ai_speaking' | 'listening' | 'processing' | 'paused' | 'ended';
type Message = { role: 'user' | 'ai'; text: string; translation?: string };

const SPEECH_THRESHOLD = -25;
const SILENCE_MS = 1800;
const VAD_INTERVAL_MS = 100;
const TEXT_STREAM_MS_PER_WORD = 50;

export function ConversationScreen({ navigation, route }: Props) {
  const { language, nativeLanguage } = route.params;
  const [appState, setAppState] = useState<AppState>('setup');
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingText, setStreamingText] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [suggestionPlaying, setSuggestionPlaying] = useState(false);
  const [suggestionSpeed, setSuggestionSpeed] = useState(1.0);
  const [activeScene, setActiveScene] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [wordSheet, setWordSheet] = useState<{ word: string; context: string } | null>(null);

  const wsRef = useRef<TalkosWS | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const onFinishRef = useRef<(() => void) | null>(null);

  const isActiveRef = useRef(false);
  const isPausedRef = useRef(false);
  const hasSpokenRef = useRef(false);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submitCalledRef = useRef(false);
  const vadIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamingFullTextRef = useRef('');
  const streamingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const suggestionPlayerRef = useRef<ReturnType<typeof createAudioPlayer> | null>(null);
  const navigatedRef = useRef(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  const recorder = useAudioRecorder(
    { ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true },
  );

  // ─── VAD ───────────────────────────────────────────────────────────────────

  const stopVadPolling = useCallback(() => {
    if (vadIntervalRef.current) {
      clearInterval(vadIntervalRef.current);
      vadIntervalRef.current = null;
    }
  }, []);

  // ─── Streaming text ─────────────────────────────────────────────────────────

  function startTextStream(text: string) {
    if (streamingIntervalRef.current) { clearInterval(streamingIntervalRef.current); streamingIntervalRef.current = null; }
    streamingFullTextRef.current = text;
    setStreamingText('');
    const words = text.split(' ');
    let wordIdx = 0;
    streamingIntervalRef.current = setInterval(() => {
      wordIdx++;
      setStreamingText(words.slice(0, wordIdx).join(' '));
      if (wordIdx >= words.length) { clearInterval(streamingIntervalRef.current!); streamingIntervalRef.current = null; }
    }, TEXT_STREAM_MS_PER_WORD);
  }

  function flushStreaming() {
    if (streamingIntervalRef.current) { clearInterval(streamingIntervalRef.current); streamingIntervalRef.current = null; }
    streamingFullTextRef.current = '';
    setStreamingText('');
  }

  // ─── Messages ───────────────────────────────────────────────────────────────

  const addMessage = useCallback((role: 'user' | 'ai', text: string, translation?: string) => {
    setMessages((prev) => [...prev, { role, text, translation }]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  // ─── Pulse animation ────────────────────────────────────────────────────────

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

  // ─── Submit / listen cycle ──────────────────────────────────────────────────

  function triggerSubmit() {
    if (!isActiveRef.current || submitCalledRef.current) return;
    submitCalledRef.current = true;
    isActiveRef.current = false;
    stopVadPolling();
    submitSpeech();
  }

  async function submitSpeech() {
    setAppState('processing');
    setSuggestion('');
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) { enterListening(); return; }
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      wsRef.current?.sendSpeech(base64);
    } catch (e) {
      console.error('[REC] submitSpeech error:', e);
      enterListening();
    }
  }

  const enterListening = useCallback(async () => {
    hasSpokenRef.current = false;
    submitCalledRef.current = false;
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
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

      vadIntervalRef.current = setInterval(() => {
        if (!isActiveRef.current) { stopVadPolling(); return; }
        const db = recorder.getStatus().metering ?? -999;
        if (db > SPEECH_THRESHOLD) {
          hasSpokenRef.current = true;
          if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
        } else if (hasSpokenRef.current && !silenceTimerRef.current) {
          silenceTimerRef.current = setTimeout(() => { silenceTimerRef.current = null; triggerSubmit(); }, SILENCE_MS);
        }
      }, VAD_INTERVAL_MS);
    } catch (e) {
      console.error('[REC] enterListening error:', e);
    }
  }, [recorder, stopVadPolling]);

  // ─── Audio playback ─────────────────────────────────────────────────────────

  const playAudio = useCallback(async (base64Mp3: string, onFinish: () => void) => {
    isActiveRef.current = false;
    stopVadPolling();
    onFinishRef.current = onFinish;

    try {
      const tempUri = `${FileSystem.cacheDirectory}ai_${Date.now()}.mp3`;
      await FileSystem.writeAsStringAsync(tempUri, base64Mp3, {
        encoding: FileSystem.EncodingType.Base64,
      });
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      const player = createAudioPlayer({ uri: tempUri });
      player.addListener('playbackStatusUpdate', (status) => {
        if (status.didJustFinish) {
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

  // ─── Session setup ──────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    createSession(language, nativeLanguage).then((sessionId) => {
      if (cancelled) return;
      sessionIdRef.current = sessionId;
      setAppState('connecting');

      const ws = new TalkosWS(sessionId, language, nativeLanguage, {
        onReady: (openingText, openingAudio) => {
          if (openingAudio) {
            startTextStream(openingText);
            setAppState('ai_speaking');
            playAudio(openingAudio, () => {
              addMessage('ai', openingText);
              flushStreaming();
              if (!isPausedRef.current) enterListening();
            });
          } else {
            addMessage('ai', openingText);
            enterListening();
          }
        },
        onTranscript: (text) => addMessage('user', text),
        onNoSpeech: () => { if (!isPausedRef.current) enterListening(); },
        onAIResponse: (text, audio, translation, sug) => {
          suggestionPlayerRef.current?.pause?.();
          setSuggestionPlaying(false);
          setSuggestion('');
          startTextStream(text);
          setAppState('ai_speaking');
          playAudio(audio, () => {
            addMessage('ai', text, translation);
            flushStreaming();
            if (sug) setSuggestion(sug);
            if (!isPausedRef.current) enterListening();
            else setAppState('paused');
          });
        },
        onSessionEnd: () => {
          if (!navigatedRef.current && sessionIdRef.current) {
            navigatedRef.current = true;
            navigation.replace('Summary', { sessionId: sessionIdRef.current });
          }
        },
        onError: (msg) => {
          Alert.alert('Connection error', msg);
          navigation.goBack();
        },
        onClose: () => {},
      });
      wsRef.current = ws;
    }).catch((e) => {
      console.error('[SETUP] createSession error:', e);
      Alert.alert('Error', 'Could not start session. Is the server running?');
      navigation.goBack();
    });

    return () => {
      cancelled = true;
      isActiveRef.current = false;
      stopVadPolling();
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (streamingIntervalRef.current) clearInterval(streamingIntervalRef.current);
      recorder.stop().catch(() => {});
      wsRef.current?.close();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Controls ───────────────────────────────────────────────────────────────

  function handlePause() {
    isPausedRef.current = true;
    isActiveRef.current = false;
    stopVadPolling();
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
    flushStreaming();
    recorder.stop().catch(() => {});
    setAppState('paused');
  }

  function handleResume() {
    isPausedRef.current = false;
    enterListening();
  }

  function handleEndSession() {
    if (navigatedRef.current || !sessionIdRef.current) return;
    navigatedRef.current = true;
    isActiveRef.current = false;
    isPausedRef.current = false;
    stopVadPolling();
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (streamingIntervalRef.current) clearInterval(streamingIntervalRef.current);
    recorder.stop().catch(() => {});
    wsRef.current?.endSession();
    navigation.replace('Summary', { sessionId: sessionIdRef.current });
  }

  // ─── Suggestion TTS ─────────────────────────────────────────────────────────

  async function handleSuggestionPlay() {
    if (suggestionPlaying) {
      suggestionPlayerRef.current?.pause?.();
      setSuggestionPlaying(false);
      return;
    }
    setSuggestionPlaying(true);
    try {
      const base64 = await fetchTTSBase64(suggestion, suggestionSpeed);
      const uri = `${FileSystem.cacheDirectory}suggestion_${Date.now()}.mp3`;
      await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
      const player = createAudioPlayer({ uri });
      suggestionPlayerRef.current = player;
      player.addListener('playbackStatusUpdate', (status) => {
        if (status.didJustFinish) {
          player.remove();
          setSuggestionPlaying(false);
        }
      });
      player.play();
    } catch {
      setSuggestionPlaying(false);
    }
  }

  // ─── Topic selection ────────────────────────────────────────────────────────

  function handleSceneSelect(scene: string, category: string) {
    setSheetOpen(false);
    setActiveScene(scene);

    // Stop any active recording/VAD before sending
    isActiveRef.current = false;
    stopVadPolling();
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
    recorder.stop().catch(() => {});
    flushStreaming();
    setSuggestion('');
    setAppState('processing');

    const text = `Let's focus our conversation on "${scene}" (${category}).`;
    wsRef.current?.sendSetTopic(text);
  }

  // ─── State config ───────────────────────────────────────────────────────────

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
  const pauseActive = appState === 'listening' || appState === 'ai_speaking' || appState === 'processing' || appState === 'paused';

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
        <View style={styles.headerLangTag}>
          <Text style={styles.headerLangText}>{language}</Text>
        </View>
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

      {/* Messages */}
      <ScrollView ref={scrollRef} style={styles.transcript} contentContainerStyle={styles.transcriptContent}>
        {messages.map((m, i) => (
          m.role === 'user' ? (
            <View key={i} style={[styles.bubble, styles.userBubble]}>
              <Text style={[styles.bubbleText, styles.userText]}>{m.text}</Text>
            </View>
          ) : (
            <View key={i} style={styles.aiBubbleWrap}>
              <View style={styles.aiWordRow}>
                {m.text.split(' ').filter(Boolean).map((token, wi) => {
                  const clean = token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
                  return (
                    <Text
                      key={wi}
                      style={[styles.bubbleText, styles.aiText, clean ? styles.aiWordTappable : undefined]}
                      onPress={clean ? () => setWordSheet({ word: clean, context: m.text }) : undefined}
                      suppressHighlighting
                    >
                      {token}{' '}
                    </Text>
                  );
                })}
              </View>
              {m.translation && (
                <Text style={styles.translationText}>{m.translation}</Text>
              )}
            </View>
          )
        ))}
        {streamingText ? (
          <View style={styles.aiBubbleWrap}>
            <Text style={[styles.bubbleText, styles.aiText]}>{streamingText}</Text>
          </View>
        ) : null}
        {suggestion ? (
          <View style={styles.suggestionWrap}>
            <Text style={styles.suggestionLabel}>try saying</Text>
            <View style={styles.suggestionBox}>
              <Text style={styles.suggestionText}>{suggestion}</Text>
              <TouchableOpacity onPress={handleSuggestionPlay} style={styles.suggestionPlayBtn}>
                <Text style={[styles.suggestionPlayIcon, suggestionPlaying && styles.suggestionPlayIconActive]}>
                  {suggestionPlaying ? '⏸' : '▶'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setSuggestionSpeed(suggestionSpeed === 1.0 ? 0.75 : suggestionSpeed === 0.75 ? 0.5 : 1.0)}
                style={styles.suggestionSpeedBtn}
              >
                <Text style={[styles.suggestionSpeedText, suggestionSpeed < 1 && styles.suggestionSpeedTextActive]}>
                  {suggestionSpeed === 1.0 ? '1x' : suggestionSpeed === 0.75 ? '0.75x' : '0.5x'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </ScrollView>

      {/* Floating topics button */}
      <TouchableOpacity
        style={styles.topicsBtn}
        onPress={() => setSheetOpen(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.topicsBtnText}>💬 Topics</Text>
      </TouchableOpacity>

      {/* Footer */}
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

      <TopicSheet
        visible={sheetOpen}
        activeScene={activeScene}
        onClose={() => setSheetOpen(false)}
        onSelect={handleSceneSelect}
      />

      <WordSheet
        visible={wordSheet !== null}
        word={wordSheet?.word ?? ''}
        context={wordSheet?.context ?? ''}
        targetLanguage={language}
        nativeLanguage={nativeLanguage}
        onClose={() => setWordSheet(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: '#1a1a2e', alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1, backgroundColor: '#1a1a2e' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a4a',
  },
  headerBack: { color: '#7c6af7', fontSize: 28, fontWeight: '300', lineHeight: 32 },
  headerTitle: { color: '#e0e0ff', fontSize: 16, fontWeight: '700' },
  headerLangTag: {
    marginLeft: 6,
    backgroundColor: '#16213e',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  headerLangText: { color: '#8888aa', fontSize: 12 },

  indicatorArea: { alignItems: 'center', paddingVertical: 28, gap: 14 },
  indicatorWrapper: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center' },
  glowRing: { position: 'absolute', width: 72, height: 72, borderRadius: 36, opacity: 0.25 },
  indicatorCircle: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  indicatorIcon: { fontSize: 28 },
  indicatorLabel: { color: '#e0e0ff', fontSize: 16, fontWeight: '600', letterSpacing: 0.3 },

  transcript: { flex: 1 },
  transcriptContent: { padding: 16, gap: 10, paddingBottom: 24 },

  bubble: { maxWidth: '80%', borderRadius: 16, padding: 12 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#7c6af7' },
  aiBubbleWrap: { alignSelf: 'flex-start', maxWidth: '85%', gap: 4 },
  aiWordRow: { flexDirection: 'row', flexWrap: 'wrap' },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  userText: { color: '#fff' },
  aiText: { color: '#e0e0ff' },
  aiWordTappable: { textDecorationLine: 'underline', textDecorationColor: '#3a3a6a' },
  translationText: { color: '#6a6a9a', fontSize: 12, lineHeight: 18 },

  suggestionWrap: { alignSelf: 'flex-end', alignItems: 'flex-end', gap: 4, marginTop: 4 },
  suggestionLabel: { color: '#8888aa', fontSize: 11 },
  suggestionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1e3e',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#5a4aaa',
    borderStyle: 'dashed',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
  },
  suggestionText: { color: '#a89af7', fontSize: 14, flex: 1 },
  suggestionPlayBtn: { padding: 4 },
  suggestionPlayIcon: { color: '#5a4aaa', fontSize: 14 },
  suggestionPlayIconActive: { color: '#7c6af7' },
  suggestionSpeedBtn: { padding: 4 },
  suggestionSpeedText: { color: '#5a4aaa', fontSize: 12, fontWeight: '700' },
  suggestionSpeedTextActive: { color: '#a89af7' },

  topicsBtn: {
    position: 'absolute',
    bottom: 120,
    right: 16,
    backgroundColor: '#1e1e3e',
    borderWidth: 1.5,
    borderColor: '#7c6af7',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  topicsBtnText: {
    color: '#a89af7',
    fontSize: 13,
    fontWeight: '600',
  },

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
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#7c6af7',
    alignItems: 'center', justifyContent: 'center',
  },
  roundBtnDisabled: {
    backgroundColor: '#16213e',
    borderWidth: 1.5, borderColor: '#2a2a4a',
    opacity: 0.5,
  },
  roundBtnEnd: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#16213e',
    borderWidth: 1.5, borderColor: '#3a2a2a',
    alignItems: 'center', justifyContent: 'center',
  },
  roundBtnIcon: { fontSize: 20, color: '#e0e0ff' },
});
