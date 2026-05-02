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
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { RootStackParamList } from '../navigation/AppNavigator';
import { pronounceText } from '../services/api';

type Props = NativeStackScreenProps<RootStackParamList, 'Teleprompter'>;

type Speed = 1 | 1.5 | 2 | 3;
const SPEEDS: Speed[] = [1, 1.5, 2, 3];
// Base duration: full scroll in 90s at 1×
const BASE_DURATION_MS = 90_000;
const TICK_MS = 100;

export function TeleprompterScreen({ navigation, route }: Props) {
  const { text, topic, language, level, mode, roleName } = route.params;

  const [isScrolling, setIsScrolling] = useState(false);
  const [speed, setSpeed] = useState<Speed>(1);
  const [recordEnabled, setRecordEnabled] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [pronouncingWord, setPronouncingWord] = useState<string | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);
  const scrollableHeightRef = useRef(0);
  const containerHeightRef = useRef(0);
  const contentHeightRef = useRef(0);
  const scrollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const speedRef = useRef<Speed>(1);
  const isScrollingRef = useRef(false);
  const recordingUriRef = useRef<string | null>(null);

  const recorder = useAudioRecorder(
    { ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: false },
  );

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  function stopScrollInterval() {
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
  }

  function startScrollInterval() {
    stopScrollInterval();
    isScrollingRef.current = true;
    scrollIntervalRef.current = setInterval(() => {
      const scrollable = scrollableHeightRef.current;
      if (scrollable <= 0) return;

      const pixelsPerTick = (scrollable / (BASE_DURATION_MS / TICK_MS)) * speedRef.current;
      scrollYRef.current = Math.min(scrollYRef.current + pixelsPerTick, scrollable);
      scrollViewRef.current?.scrollTo({ y: scrollYRef.current, animated: false });

      if (scrollYRef.current >= scrollable) {
        stopScrollInterval();
        isScrollingRef.current = false;
        setIsScrolling(false);
      }
    }, TICK_MS);
  }

  async function startRecording() {
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        Alert.alert('Permission required', 'Microphone access is needed for recording.');
        return false;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setIsRecording(true);
      return true;
    } catch (e) {
      console.error('[REC] startRecording error:', e);
      return false;
    }
  }

  async function stopRecording(): Promise<string | null> {
    try {
      await recorder.stop();
      const uri = recorder.uri ?? null;
      setIsRecording(false);
      return uri;
    } catch {
      setIsRecording(false);
      return null;
    }
  }

  async function handleStart() {
    scrollYRef.current = 0;
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });

    if (recordEnabled) {
      await startRecording();
    }
    startScrollInterval();
    setIsScrolling(true);
  }

  function handlePause() {
    stopScrollInterval();
    isScrollingRef.current = false;
    setIsScrolling(false);
  }

  function handleResume() {
    startScrollInterval();
    setIsScrolling(true);
  }

  function handleRepeat() {
    stopScrollInterval();
    isScrollingRef.current = false;
    scrollYRef.current = 0;
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    setIsScrolling(false);
  }

  async function handleDone() {
    stopScrollInterval();
    let audioUri: string | undefined;
    if (isRecording) {
      const uri = await stopRecording();
      if (uri) {
        recordingUriRef.current = uri;
        audioUri = uri;
      }
    }
    navigation.navigate('Review', { originalText: text, audioUri, language, level, mode });
  }

  const handleWordTap = useCallback(async (word: string) => {
    const clean = word.replace(/[^a-zA-Z\u00C0-\u024F\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]/g, '');
    if (!clean) return;
    if (pronouncingWord) return;

    // Pause scroll while pronunciation plays
    const wasScrolling = isScrollingRef.current;
    if (wasScrolling) {
      stopScrollInterval();
      isScrollingRef.current = false;
    }

    setPronouncingWord(clean);
    try {
      const base64 = await pronounceText(clean, language);
      const tempUri = `${FileSystem.cacheDirectory}pronounce_${Date.now()}.mp3`;
      await FileSystem.writeAsStringAsync(tempUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      const player = createAudioPlayer({ uri: tempUri });
      player.addListener('playbackStatusUpdate', async (status) => {
        if (status.didJustFinish) {
          player.remove();
          setPronouncingWord(null);
          if (isRecording) {
            await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
          }
          if (wasScrolling) {
            startScrollInterval();
            isScrollingRef.current = true;
            setIsScrolling(true);
          }
        }
      });
      player.play();
    } catch {
      setPronouncingWord(null);
      if (wasScrolling) {
        startScrollInterval();
        isScrollingRef.current = true;
        setIsScrolling(true);
      }
    }
  }, [language, isRecording, pronouncingWord]);

  useEffect(() => {
    return () => {
      stopScrollInterval();
      recorder.stop().catch(() => {});
    };
  }, []);

  const paragraphs = text.split('\n').filter(Boolean);
  const header = roleName ? `${roleName} — ${topic}` : topic;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTopic}>{header}</Text>
        <Text style={styles.headerMeta}>{language} · {level}</Text>
      </View>

      {/* Controls bar */}
      <View style={styles.controls}>
        {/* Speed */}
        <View style={styles.speedRow}>
          {SPEEDS.map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.speedBtn, speed === s && styles.speedBtnActive]}
              onPress={() => setSpeed(s)}
            >
              <Text style={[styles.speedBtnText, speed === s && styles.speedBtnTextActive]}>
                {s}×
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Record toggle */}
        <TouchableOpacity
          style={[styles.recordToggle, recordEnabled && styles.recordToggleActive]}
          onPress={() => !isScrolling && setRecordEnabled((v) => !v)}
          disabled={isScrolling}
        >
          <Text style={[styles.recordToggleText, recordEnabled && styles.recordToggleTextActive]}>
            {isRecording ? '● REC' : '○ Record'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Teleprompter text */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.scroll}
        scrollEnabled={!isScrolling}
        onLayout={(e) => {
          containerHeightRef.current = e.nativeEvent.layout.height;
          scrollableHeightRef.current = Math.max(0, contentHeightRef.current - containerHeightRef.current);
        }}
        onContentSizeChange={(_, h) => {
          contentHeightRef.current = h;
          scrollableHeightRef.current = Math.max(0, h - containerHeightRef.current);
        }}
      >
        <View style={styles.textContent}>
          {pronouncingWord && (
            <View style={styles.pronounceBanner}>
              <Text style={styles.pronounceBannerText}>🔊 "{pronouncingWord}"</Text>
            </View>
          )}
          {paragraphs.map((para, pi) => (
            <View key={pi} style={styles.paragraph}>
              {para.split(' ').filter(Boolean).map((word, wi) => (
                <TouchableOpacity
                  key={`${pi}-${wi}`}
                  onPress={() => handleWordTap(word)}
                  activeOpacity={0.6}
                >
                  <Text style={styles.word}>{word} </Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
          <View style={styles.bottomPad} />
        </View>
      </ScrollView>

      {/* Action buttons */}
      <View style={styles.footer}>
        {!isScrolling ? (
          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={handleRepeat}>
              <Text style={styles.secondaryBtnText}>↺ Repeat</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={scrollYRef.current > 0 ? handleResume : handleStart}
            >
              <Text style={styles.primaryBtnText}>
                {scrollYRef.current > 0 ? '▶ Resume' : '▶ Start Reading'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={handlePause}>
              <Text style={styles.secondaryBtnText}>⏸ Pause</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.doneBtn} onPress={handleDone}>
              <Text style={styles.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        )}
        {!isScrolling && scrollYRef.current === 0 && (
          <Text style={styles.hint}>Tap any word to hear its pronunciation</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  header: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a4a',
  },
  headerTopic: { color: '#e0e0ff', fontSize: 15, fontWeight: '700' },
  headerMeta: { color: '#555577', fontSize: 12, marginTop: 2 },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a4a',
  },
  speedRow: { flexDirection: 'row', gap: 6 },
  speedBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2a2a4a',
  },
  speedBtnActive: { backgroundColor: '#7c6af7', borderColor: '#7c6af7' },
  speedBtnText: { color: '#8888aa', fontSize: 13, fontWeight: '600' },
  speedBtnTextActive: { color: '#fff' },
  recordToggle: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2a2a4a',
  },
  recordToggleActive: { borderColor: '#e05555', backgroundColor: '#2a1515' },
  recordToggleText: { color: '#8888aa', fontSize: 13, fontWeight: '600' },
  recordToggleTextActive: { color: '#e05555' },
  scroll: { flex: 1 },
  textContent: { padding: 24, paddingBottom: 0 },
  pronounceBanner: {
    backgroundColor: '#16213e',
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#7c6af7',
  },
  pronounceBannerText: { color: '#7c6af7', fontSize: 14, fontWeight: '600' },
  paragraph: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  word: { color: '#e0e0ff', fontSize: 20, lineHeight: 34, fontWeight: '400' },
  bottomPad: { height: 80 },
  footer: {
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#2a2a4a',
    gap: 8,
  },
  btnRow: { flexDirection: 'row', gap: 10 },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a4a',
  },
  secondaryBtnText: { color: '#aaaacc', fontSize: 15, fontWeight: '600' },
  primaryBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: 'center',
    backgroundColor: '#7c6af7',
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  doneBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: 'center',
    backgroundColor: '#2a4a3a',
    borderWidth: 1,
    borderColor: '#44aa88',
  },
  doneBtnText: { color: '#44aa88', fontSize: 15, fontWeight: '700' },
  hint: { color: '#333355', fontSize: 12, textAlign: 'center' },
});
