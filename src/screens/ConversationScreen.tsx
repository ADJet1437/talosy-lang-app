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
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { RootStackParamList } from '../navigation/AppNavigator';
import { SessionSummary, TalkosWS } from '../services/api';

type Props = NativeStackScreenProps<RootStackParamList, 'Conversation'>;
type AppState = 'connecting' | 'ai_speaking' | 'listening' | 'processing' | 'ended';
type Message = { role: 'user' | 'ai'; text: string };

const SPEECH_THRESHOLD = -35;   // dB above this = user is speaking
const SILENCE_MS = 1800;        // ms of silence after speech before auto-submit
const VAD_INTERVAL_MS = 100;    // poll metering every 100ms

export function ConversationScreen({ navigation, route }: Props) {
  const { sessionId, scenario } = route.params;

  const [appState, setAppState] = useState<AppState>('connecting');
  const [messages, setMessages] = useState<Message[]>([]);
  const [level, setLevel] = useState<string | null>(null);

  const wsRef = useRef<TalkosWS | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const onFinishRef = useRef<(() => void) | null>(null);

  const isActiveRef = useRef(false);
  const hasSpokenRef = useRef(false);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submitCalledRef = useRef(false);
  const vadIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const logCountRef = useRef(0);

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
    console.log('[AUDIO] playAudio, length:', base64Mp3.length);
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
          console.log('[AUDIO] finished → enterListening in 400ms');
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
    const ws = new TalkosWS(sessionId, {
      onReady: (openingText, openingAudio) => {
        console.log('[WS] onReady, hasAudio:', !!openingAudio);
        addMessage('ai', openingText);
        if (openingAudio) {
          setAppState('ai_speaking');
          playAudio(openingAudio, enterListening);
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
        enterListening();
      },
      onAIResponse: (text, audio, newLevel) => {
        console.log('[WS] ai_response, level:', newLevel);
        addMessage('ai', text);
        if (newLevel) setLevel(newLevel);
        setAppState('ai_speaking');
        playAudio(audio, enterListening);
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

    return () => {
      isActiveRef.current = false;
      stopVadPolling();
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      recorder.stop().catch(() => {});
      ws.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleEndSession() {
    isActiveRef.current = false;
    stopVadPolling();
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    recorder.stop().catch(() => {});
    wsRef.current?.endSession();
  }

  const stateLabel: Record<AppState, string> = {
    connecting: 'Connecting…',
    ai_speaking: `${scenario.title} is speaking…`,
    listening: 'Listening… speak when ready',
    processing: 'Processing…',
    ended: 'Session ended',
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.scenarioTitle}>{scenario.emoji} {scenario.title}</Text>
        {level && <Text style={styles.levelBadge}>{level}</Text>}
      </View>

      <ScrollView ref={scrollRef} style={styles.transcript} contentContainerStyle={styles.transcriptContent}>
        {messages.map((m, i) => (
          <View key={i} style={[styles.bubble, m.role === 'user' ? styles.userBubble : styles.aiBubble]}>
            <Text style={[styles.bubbleText, m.role === 'user' ? styles.userText : styles.aiText]}>
              {m.text}
            </Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={[styles.statusRow, appState === 'listening' && styles.statusRowActive]}>
          <View style={[
            styles.statusDot,
            appState === 'listening' && styles.dotListening,
            appState === 'ai_speaking' && styles.dotSpeaking,
            appState === 'processing' && styles.dotProcessing,
          ]} />
          <Text style={styles.statusText}>{stateLabel[appState]}</Text>
        </View>

        <TouchableOpacity style={styles.endBtn} onPress={handleEndSession}>
          <Text style={styles.endBtnText}>End Session</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a4a',
  },
  scenarioTitle: { color: '#e0e0ff', fontSize: 15, fontWeight: '600' },
  levelBadge: {
    color: '#7c6af7',
    fontSize: 12,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: '#7c6af7',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    textTransform: 'capitalize',
  },
  transcript: { flex: 1 },
  transcriptContent: { padding: 16, gap: 10, paddingBottom: 24 },
  bubble: { maxWidth: '80%', borderRadius: 16, padding: 12 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#7c6af7' },
  aiBubble: { alignSelf: 'flex-start', backgroundColor: '#16213e', borderWidth: 1, borderColor: '#2a2a4a' },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  userText: { color: '#fff' },
  aiText: { color: '#e0e0ff' },
  footer: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#2a2a4a',
    gap: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#16213e',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#2a2a4a',
  },
  statusRowActive: { borderColor: '#7c6af7' },
  statusDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#444466' },
  dotListening: { backgroundColor: '#7c6af7' },
  dotSpeaking: { backgroundColor: '#44aa88' },
  dotProcessing: { backgroundColor: '#f0a040' },
  statusText: { color: '#aaaacc', fontSize: 14 },
  endBtn: {
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#2a2a4a',
  },
  endBtnText: { color: '#555577', fontSize: 13 },
});
