import { Ionicons } from '@expo/vector-icons';
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
import {
  Alert,
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RootStackParamList } from '../navigation/AppNavigator';
import { TalkosWS, createSession } from '../services/api';
import { useAuth } from '../context/AuthContext';

type Props = NativeStackScreenProps<RootStackParamList, 'LessonCall'>;

type CallState = 'connecting' | 'ready' | 'listening' | 'processing' | 'ai_speaking';

const SPEECH_THRESHOLD = -25;
const SILENCE_MS = 1800;
const VAD_INTERVAL_MS = 100;
const AVATAR_SIZE = 104;
const CONTAINER_SIZE = 300;

export function LessonCallScreen({ route, navigation }: Props) {
  const { topic, sentences, language, nativeLanguage } = route.params;
  const { token } = useAuth();
  const insets = useSafeAreaInsets();

  const [callState, setCallState] = useState<CallState>('connecting');
  const [elapsed, setElapsed] = useState(0);

  const wsRef           = useRef<TalkosWS | null>(null);
  const isPausedRef     = useRef(false);
  const isActiveRef     = useRef(false);
  const hasSpokenRef    = useRef(false);
  const submitCalledRef = useRef(false);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const vadIntervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef        = useRef<ReturnType<typeof setInterval> | null>(null);
  const onFinishRef     = useRef<(() => void) | null>(null);

  // ── Pulse rings ─────────────────────────────────────────────────────────────
  const scales    = useRef([new Animated.Value(1), new Animated.Value(1), new Animated.Value(1)]).current;
  const opacities = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;

  useEffect(() => {
    let maxScale: number;
    let dur: number;
    let initOpacity: number;

    switch (callState) {
      case 'ai_speaking': maxScale = 2.6; dur = 700;  initOpacity = 0.55; break;
      case 'listening':   maxScale = 1.9; dur = 1100; initOpacity = 0.40; break;
      default:            maxScale = 1.4; dur = 1900; initOpacity = 0.22; break;
    }

    scales.forEach((sc) => sc.setValue(1));
    opacities.forEach((op) => op.setValue(initOpacity));

    const anims = scales.map((scale, i) => {
      const opacity = opacities[i];
      const offset  = i * Math.round(dur / scales.length);
      return Animated.loop(
        Animated.sequence([
          Animated.delay(offset),
          Animated.parallel([
            Animated.timing(scale,   { toValue: maxScale, duration: dur, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0,        duration: dur, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(scale,   { toValue: 1,           duration: 0, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: initOpacity, duration: 0, useNativeDriver: true }),
          ]),
        ])
      );
    });

    const composite = Animated.parallel(anims);
    composite.start();
    return () => {
      composite.stop();
      scales.forEach((sc) => sc.setValue(1));
      opacities.forEach((op) => op.setValue(0));
    };
  }, [callState]);

  // ── Recorder ────────────────────────────────────────────────────────────────
  const recorder = useAudioRecorder({
    ...RecordingPresets.HIGH_QUALITY,
    isMeteringEnabled: true,
  });

  // ── VAD helpers ─────────────────────────────────────────────────────────────
  const stopVad = useCallback(() => {
    if (vadIntervalRef.current) { clearInterval(vadIntervalRef.current); vadIntervalRef.current = null; }
  }, []);

  async function submitSpeech() {
    setCallState('processing');
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) { enterListening(); return; }
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      wsRef.current?.sendSpeech(base64);
    } catch {
      enterListening();
    }
  }

  function triggerSubmit() {
    if (!isActiveRef.current || submitCalledRef.current) return;
    submitCalledRef.current = true;
    isActiveRef.current = false;
    stopVad();
    submitSpeech();
  }

  const enterListening = useCallback(async () => {
    if (isPausedRef.current) return;
    hasSpokenRef.current    = false;
    submitCalledRef.current = false;
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
    stopVad();

    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted || isPausedRef.current) return;

      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      if (isPausedRef.current) return;

      isActiveRef.current = true;
      recorder.record();
      setCallState('listening');

      vadIntervalRef.current = setInterval(() => {
        if (!isActiveRef.current) { stopVad(); return; }
        const db = recorder.getStatus().metering ?? -999;
        if (db > SPEECH_THRESHOLD) {
          hasSpokenRef.current = true;
          if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
        } else if (hasSpokenRef.current && !silenceTimerRef.current) {
          silenceTimerRef.current = setTimeout(() => { silenceTimerRef.current = null; triggerSubmit(); }, SILENCE_MS);
        }
      }, VAD_INTERVAL_MS);
    } catch { /* ignore */ }
  }, [recorder, stopVad]);

  // ── Audio playback ──────────────────────────────────────────────────────────
  const playAudio = useCallback(async (base64Mp3: string, onFinish: () => void) => {
    isActiveRef.current = false;
    stopVad();
    onFinishRef.current = onFinish;
    try {
      const tempUri = `${FileSystem.cacheDirectory}call_${Date.now()}.mp3`;
      await FileSystem.writeAsStringAsync(tempUri, base64Mp3, { encoding: FileSystem.EncodingType.Base64 });
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      const player = createAudioPlayer({ uri: tempUri });
      player.addListener('playbackStatusUpdate', (status: any) => {
        if (status.didJustFinish) {
          player.remove();
          setTimeout(() => { onFinishRef.current?.(); onFinishRef.current = null; }, 300);
        }
      });
      player.play();
    } catch {
      onFinish();
    }
  }, [stopVad]);

  // ── Session lifecycle ────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});

    async function setup() {
      try {
        const sessionId = await createSession(language, nativeLanguage, token);
        if (cancelled) return;

        const ws = new TalkosWS(sessionId, language, nativeLanguage, {
          onReady: () => {
            if (cancelled) return;
            ws.sendPracticeLesson(topic, sentences);
            setCallState('ready');
            timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
          },
          onTranscript: () => {},
          onNoSpeech: () => { if (!isPausedRef.current) enterListening(); },
          onAIResponse: (_text, audio) => {
            if (cancelled || !audio) return;
            setCallState('ai_speaking');
            playAudio(audio, () => { if (!isPausedRef.current) enterListening(); });
          },
          onSessionEnd: () => navigation.goBack(),
          onError: (msg) => { Alert.alert('Connection error', msg); navigation.goBack(); },
          onClose: () => {},
        });
        wsRef.current = ws;
      } catch {
        if (!cancelled) {
          Alert.alert('Error', 'Could not start call. Is the server running?');
          navigation.goBack();
        }
      }
    }

    setup();

    return () => {
      cancelled = true;
      isPausedRef.current = true;
      isActiveRef.current = false;
      stopVad();
      if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      onFinishRef.current = null;
      recorder.stop().catch(() => {});
      wsRef.current?.endSession();
      wsRef.current?.close();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── End call ────────────────────────────────────────────────────────────────
  function handleEndCall() {
    isPausedRef.current = true;
    isActiveRef.current = false;
    stopVad();
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    onFinishRef.current = null;
    recorder.stop().catch(() => {});
    wsRef.current?.endSession();
    navigation.goBack();
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');

  const stateLabel: Record<CallState, string> = {
    connecting:  'Connecting…',
    ready:       'Starting…',
    listening:   'Listening…',
    processing:  'Processing…',
    ai_speaking: 'Speaking…',
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}>

      {/* Header row: topic + timer */}
      <View style={styles.header}>
        <View style={styles.chip}>
          <Text style={styles.chipText} numberOfLines={1}>{topic}</Text>
        </View>
        <View style={[styles.chip, elapsed === 0 && styles.chipInvisible]}>
          <Text style={styles.timerText}>{mm}:{ss}</Text>
        </View>
      </View>

      {/* Avatar with pulse rings */}
      <View style={styles.centerSection}>
        <View style={[styles.ringContainer, { width: CONTAINER_SIZE, height: CONTAINER_SIZE }]}>
          {scales.map((scale, i) => (
            <Animated.View
              key={i}
              style={[
                styles.ring,
                {
                  width:        AVATAR_SIZE,
                  height:       AVATAR_SIZE,
                  borderRadius: AVATAR_SIZE / 2,
                  transform:    [{ scale }],
                  opacity:      opacities[i],
                },
              ]}
            />
          ))}
          <View style={[styles.avatar, { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2 }]}>
            <Ionicons name="hardware-chip-outline" size={46} color="#fff" />
          </View>
        </View>

        <Text style={styles.aiName}>Talkos</Text>
        <Text style={styles.statusText}>{stateLabel[callState]}</Text>
      </View>

      {/* End call button */}
      <TouchableOpacity style={styles.endCallBtn} onPress={handleEndCall} activeOpacity={0.8}>
        <Ionicons name="call" size={28} color="#fff" style={styles.endCallIcon} />
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0d0d12',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  // ── Header ───────────────────────────────────────────────────────────────────
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    maxWidth: '55%',
  },
  chipInvisible: { opacity: 0 },
  chipText:  { color: 'rgba(255,255,255,0.65)', fontSize: 13, fontWeight: '600' },
  timerText: { color: 'rgba(255,255,255,0.65)', fontSize: 13, fontWeight: '700' },

  // ── Center ───────────────────────────────────────────────────────────────────
  centerSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
  },
  ringContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    backgroundColor: '#7c3aed',
  },
  avatar: {
    backgroundColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 22,
    elevation: 10,
  },
  aiName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  statusText: {
    color: 'rgba(255,255,255,0.42)',
    fontSize: 15,
    fontWeight: '500',
  },

  // ── End call button ──────────────────────────────────────────────────────────
  endCallBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 8,
  },
  endCallIcon: {
    transform: [{ rotate: '135deg' }],
  },
});
