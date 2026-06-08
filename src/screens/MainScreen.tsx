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
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { RootStackParamList } from '../navigation/AppNavigator';
import { LessonDetail, SessionSummary, TalkosWS, createSession, fetchReview, fetchTTSBase64 } from '../services/api';
import { ChatTab, AppState, Message } from '../components/ChatTab';
import { MeTab } from '../components/MeTab';
import { LessonsScreen } from './LessonsScreen';
import { ChapterListComponent } from '../components/ChapterListComponent';
import { TopicSheet } from '../components/TopicSheet';
import { WordSheet } from '../components/WordSheet';
import { ReviewSheet } from '../components/ReviewSheet';

type Props = NativeStackScreenProps<RootStackParamList, 'Main'>;
type ActiveTab = 'chat' | 'lessons' | 'me';
type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const TABS: { key: ActiveTab; icon: IoniconName; iconActive: IoniconName; label: string }[] = [
  { key: 'chat',    icon: 'chatbubble-outline',  iconActive: 'chatbubble',  label: 'Chat' },
  { key: 'lessons', icon: 'book-outline',         iconActive: 'book',        label: 'Lessons' },
  { key: 'me',      icon: 'person-outline',       iconActive: 'person',      label: 'Me' },
];

const SPEECH_THRESHOLD     = -25;
const SILENCE_MS           = 1800;
const VAD_INTERVAL_MS      = 100;
const TEXT_STREAM_MS_PER_WORD = 50;
const EQ_BAR_COUNT         = 18;
const EQ_CYCLE_MS          = 900;
const EQ_MIN_H             = 3;
const EQ_MAX_H             = 22;

export function MainScreen({ navigation }: Props) {
  // ─── State ────────────────────────────────────────────────────────────────
  const [language, setLanguage]                   = useState('English');
  const [nativeLanguage, setNativeLanguage]       = useState('English');
  const [appState, setAppState]                   = useState<AppState>('setup');
  const [messages, setMessages]                   = useState<Message[]>([]);
  const [streamingText, setStreamingText]         = useState('');
  const [suggestion, setSuggestion]               = useState('');
  const [suggestionPlaying, setSuggestionPlaying] = useState(false);
  const [suggestionSpeed, setSuggestionSpeed]     = useState(1.0);
  const [activeScene, setActiveScene]             = useState<string | null>(null);
  const [sheetOpen, setSheetOpen]                 = useState(false);
  const [wordSheet, setWordSheet]                 = useState<{ word: string; context: string } | null>(null);
  const [activeTab, setActiveTab]                 = useState<ActiveTab>('chat');
  const [isImmersive, setIsImmersive]             = useState(false);
  const [isManualRecording, setIsManualRecording] = useState(false);
  const [plusMenuOpen, setPlusMenuOpen]           = useState(false);
  const [reviewOpen, setReviewOpen]               = useState(false);
  const [reviewLoading, setReviewLoading]         = useState(false);
  const [reviewData, setReviewData]               = useState<SessionSummary | null>(null);
  const [openLesson, setOpenLesson]               = useState<LessonDetail | null>(null);

  // ─── Refs ─────────────────────────────────────────────────────────────────
  const wsRef                = useRef<TalkosWS | null>(null);
  const sessionIdRef         = useRef<string | null>(null);
  const scrollRef            = useRef<ScrollView>(null);
  const onFinishRef          = useRef<(() => void) | null>(null);
  const isActiveRef          = useRef(false);
  const isPausedRef          = useRef(false);
  const tabPausedRef         = useRef(false);
  const isImmersiveRef       = useRef(false);
  const hasSpokenRef         = useRef(false);
  const silenceTimerRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submitCalledRef      = useRef(false);
  const vadIntervalRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamingFullTextRef = useRef('');
  const streamingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const suggestionPlayerRef  = useRef<ReturnType<typeof createAudioPlayer> | null>(null);
  const equalizerLoopRef     = useRef<Animated.CompositeAnimation | null>(null);

  // ─── Animated values ──────────────────────────────────────────────────────
  const pulseAnim      = useRef(new Animated.Value(1)).current;
  const equalizerAnims = useRef(
    Array.from({ length: EQ_BAR_COUNT }, () => new Animated.Value(EQ_MIN_H))
  ).current;

  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true });

  // ─── VAD ──────────────────────────────────────────────────────────────────

  const stopVadPolling = useCallback(() => {
    if (vadIntervalRef.current) { clearInterval(vadIntervalRef.current); vadIntervalRef.current = null; }
  }, []);

  // ─── Equalizer animation ──────────────────────────────────────────────────

  function startEqualizerAnimation() {
    const half = EQ_CYCLE_MS / 2;
    const phaseStep = EQ_CYCLE_MS / EQ_BAR_COUNT;
    const anims = equalizerAnims.map((anim, i) =>
      Animated.sequence([
        Animated.delay(Math.round(i * phaseStep)),
        Animated.loop(Animated.sequence([
          Animated.timing(anim, { toValue: EQ_MAX_H, duration: half, useNativeDriver: false }),
          Animated.timing(anim, { toValue: EQ_MIN_H, duration: half, useNativeDriver: false }),
        ])),
      ])
    );
    equalizerLoopRef.current = Animated.parallel(anims);
    equalizerLoopRef.current.start();
  }

  function stopEqualizerAnimation() {
    equalizerLoopRef.current?.stop();
    equalizerLoopRef.current = null;
    equalizerAnims.forEach((a) => a.setValue(EQ_MIN_H));
  }

  // ─── Streaming text ───────────────────────────────────────────────────────

  function startTextStream(text: string) {
    if (streamingIntervalRef.current) { clearInterval(streamingIntervalRef.current); streamingIntervalRef.current = null; }
    streamingFullTextRef.current = text;
    setStreamingText('');
    const words = text.split(' ');
    let idx = 0;
    streamingIntervalRef.current = setInterval(() => {
      idx++;
      setStreamingText(words.slice(0, idx).join(' '));
      if (idx >= words.length) { clearInterval(streamingIntervalRef.current!); streamingIntervalRef.current = null; }
    }, TEXT_STREAM_MS_PER_WORD);
  }

  function flushStreaming() {
    if (streamingIntervalRef.current) { clearInterval(streamingIntervalRef.current); streamingIntervalRef.current = null; }
    streamingFullTextRef.current = '';
    setStreamingText('');
  }

  // ─── Messages ─────────────────────────────────────────────────────────────

  const addMessage = useCallback((role: 'user' | 'ai', text: string, translation?: string) => {
    setMessages((prev) => [...prev, { role, text, translation }]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  // ─── Pulse animation ──────────────────────────────────────────────────────

  useEffect(() => {
    const shouldPulse = appState === 'listening' || appState === 'ai_speaking';
    if (!shouldPulse) { pulseAnim.stopAnimation(); pulseAnim.setValue(1); return; }
    const dur = appState === 'listening' ? 700 : 1100;
    const anim = Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.55, duration: dur, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1,    duration: dur, useNativeDriver: true }),
    ]));
    anim.start();
    return () => anim.stop();
  }, [appState]);

  // ─── Submit / listen cycle ────────────────────────────────────────────────

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
      if (!uri) {
        if (isImmersiveRef.current) enterListening(); else setAppState('paused');
        return;
      }
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      wsRef.current?.sendSpeech(base64);
    } catch (e) {
      console.error('[REC] submitSpeech error:', e);
      if (isImmersiveRef.current) enterListening(); else setAppState('paused');
    }
  }

  const enterListening = useCallback(async () => {
    hasSpokenRef.current = false;
    submitCalledRef.current = false;
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
    stopVadPolling();
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) { Alert.alert('Permission required', 'Microphone access is needed.'); return; }
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

  // ─── Audio playback ───────────────────────────────────────────────────────

  const playAudio = useCallback(async (base64Mp3: string, onFinish: () => void) => {
    isActiveRef.current = false;
    stopVadPolling();
    onFinishRef.current = onFinish;
    try {
      const tempUri = `${FileSystem.cacheDirectory}ai_${Date.now()}.mp3`;
      await FileSystem.writeAsStringAsync(tempUri, base64Mp3, { encoding: FileSystem.EncodingType.Base64 });
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      const player = createAudioPlayer({ uri: tempUri });
      player.addListener('playbackStatusUpdate', (status) => {
        if (status.didJustFinish) {
          player.remove();
          setTimeout(() => { onFinishRef.current?.(); onFinishRef.current = null; }, 400);
        }
      });
      player.play();
    } catch (e) {
      console.error('[AUDIO] error:', e);
      onFinish();
    }
  }, [stopVadPolling]);

  // ─── Session setup ────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    createSession(language, nativeLanguage).then((sessionId) => {
      if (cancelled) return;
      sessionIdRef.current = sessionId;
      setAppState('connecting');

      const ws = new TalkosWS(sessionId, language, nativeLanguage, {
        onReady: () => {
          if (isImmersiveRef.current) enterListening();
          else setAppState('paused');
        },
        onTranscript: (text) => addMessage('user', text),
        onNoSpeech: () => { if (!isPausedRef.current && isImmersiveRef.current) enterListening(); },
        onAIResponse: (text, audio, translation, sug) => {
          if (!text || !audio) return;
          suggestionPlayerRef.current?.pause?.();
          setSuggestionPlaying(false);
          setSuggestion('');
          startTextStream(text);
          setAppState('ai_speaking');
          playAudio(audio, () => {
            addMessage('ai', text, translation);
            flushStreaming();
            if (sug) setSuggestion(sug);
            if (!isPausedRef.current && isImmersiveRef.current) enterListening();
            else setAppState('paused');
          });
        },
        onSessionEnd: () => { navigation.replace('Main'); },
        onError: (msg) => { Alert.alert('Connection error', msg); navigation.goBack(); },
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

  // ─── Mode toggle ──────────────────────────────────────────────────────────

  function toggleMode() {
    const next = !isImmersive;
    setIsImmersive(next);
    isImmersiveRef.current = next;
    setPlusMenuOpen(false);

    if (next) {
      if (isManualRecording) {
        setIsManualRecording(false);
        stopEqualizerAnimation();
        recorder.stop().catch(() => {});
      }
      tabPausedRef.current = false;
      isPausedRef.current = false;
      enterListening();
    } else {
      isActiveRef.current = false;
      stopVadPolling();
      if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
      recorder.stop().catch(() => {});
      isPausedRef.current = true;
      setAppState('paused');
    }
  }

  // ─── Manual recording ─────────────────────────────────────────────────────

  async function handleBarPress() {
    if (isImmersive) return;
    if (appState === 'ai_speaking' || appState === 'processing' || appState === 'connecting') return;
    setPlusMenuOpen(false);

    if (isManualRecording) {
      setIsManualRecording(false);
      stopEqualizerAnimation();
      isActiveRef.current = false;
      hasSpokenRef.current = true;
      await submitSpeech();
    } else {
      setIsManualRecording(true);
      startEqualizerAnimation();
      hasSpokenRef.current = false;
      submitCalledRef.current = false;
      try {
        const { granted } = await requestRecordingPermissionsAsync();
        if (!granted) {
          Alert.alert('Permission required', 'Microphone access is needed.');
          setIsManualRecording(false);
          stopEqualizerAnimation();
          return;
        }
        await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
        await recorder.prepareToRecordAsync();
        isActiveRef.current = true;
        recorder.record();
        setAppState('listening');
      } catch (e) {
        console.error('[REC] manual start error:', e);
        setIsManualRecording(false);
        stopEqualizerAnimation();
      }
    }
  }

  // ─── Tab switching ────────────────────────────────────────────────────────

  function handleTabSwitch(tab: ActiveTab) {
    if (tab === activeTab) return;
    setPlusMenuOpen(false);
    setActiveTab(tab);

    if (tab !== 'chat' && !isPausedRef.current) {
      tabPausedRef.current = true;
      isActiveRef.current = false;
      stopVadPolling();
      if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
      if (isManualRecording) { setIsManualRecording(false); stopEqualizerAnimation(); }
      recorder.stop().catch(() => {});
      isPausedRef.current = true;
      flushStreaming();
      setAppState('paused');
    }

    if (tab === 'chat' && tabPausedRef.current) {
      tabPausedRef.current = false;
      if (isImmersiveRef.current && !isActiveRef.current) {
        isPausedRef.current = false;
        enterListening();
      } else if (!isImmersiveRef.current) {
        setAppState('paused');
      }
    }
  }

  // ─── Review ───────────────────────────────────────────────────────────────

  async function handleReview() {
    if (!sessionIdRef.current) return;
    setReviewData(null);
    setReviewLoading(true);
    setReviewOpen(true);
    try {
      const summary = await fetchReview(sessionIdRef.current);
      setReviewData(summary);
    } finally {
      setReviewLoading(false);
    }
  }

  // ─── Topic selection ──────────────────────────────────────────────────────

  function handleSceneSelect(scene: string, category: string) {
    setSheetOpen(false);
    setActiveScene(scene);
    isActiveRef.current = false;
    stopVadPolling();
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
    if (isManualRecording) { setIsManualRecording(false); stopEqualizerAnimation(); }
    recorder.stop().catch(() => {});
    flushStreaming();
    setSuggestion('');
    setAppState('processing');
    wsRef.current?.sendSetTopic(`Let's focus our conversation on "${scene}" (${category}).`);
  }

  // ─── Suggestion TTS ───────────────────────────────────────────────────────

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
        if (status.didJustFinish) { player.remove(); setSuggestionPlaying(false); }
      });
      player.play();
    } catch {
      setSuggestionPlaying(false);
    }
  }

  // ─── Setup loading screen ─────────────────────────────────────────────────

  if (appState === 'setup') {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#7c6af7" size="large" />
      </View>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Talkos</Text>
          <View style={styles.headerLangTag}>
            <Text style={styles.headerLangText}>{language}</Text>
          </View>
        </View>
        {activeTab === 'chat' && (
          <TouchableOpacity onPress={handleReview} style={styles.headerEndBtn} activeOpacity={0.7}>
            <Text style={styles.headerEndText}>Review</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tab content */}
      <View style={[styles.tabContent, activeTab !== 'chat' && styles.tabHidden]}>
        <ChatTab
          appState={appState}
          isImmersive={isImmersive}
          isManualRecording={isManualRecording}
          messages={messages}
          streamingText={streamingText}
          suggestion={suggestion}
          suggestionPlaying={suggestionPlaying}
          suggestionSpeed={suggestionSpeed}
          plusMenuOpen={plusMenuOpen}
          pulseAnim={pulseAnim}
          equalizerAnims={equalizerAnims}
          scrollRef={scrollRef}
          onBarPress={handleBarPress}
          onWordTap={(word, context) => setWordSheet({ word, context })}
          onSuggestionPlay={handleSuggestionPlay}
          onSuggestionSpeedToggle={() => setSuggestionSpeed((s) => s === 1.0 ? 0.75 : s === 0.75 ? 0.5 : 1.0)}
          onPlusToggle={() => setPlusMenuOpen((v) => !v)}
        />
      </View>

      <View style={[styles.tabContent, activeTab !== 'lessons' && styles.tabHidden]}>
        <LessonsScreen
          onOpenLesson={(lesson) => setOpenLesson(lesson)}
        />
      </View>

      <View style={[styles.tabContent, activeTab !== 'me' && styles.tabHidden]}>
        <MeTab
          isImmersive={isImmersive}
          learnLang={language}
          nativeLang={nativeLanguage}
          onLearnLangChange={setLanguage}
          onNativeLangChange={setNativeLanguage}
          userMessages={messages.filter((m) => m.role === 'user').length}
          aiMessages={messages.filter((m) => m.role === 'ai').length}
          onToggleMode={toggleMode}
        />
      </View>

      {/* Bottom tab bar */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => {
          const active = tab.key === activeTab;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabBarItem}
              onPress={() => handleTabSwitch(tab.key)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={active ? tab.iconActive : tab.icon}
                size={22}
                color={active ? '#1a1a2e' : '#9999b0'}
              />
              <Text style={[styles.tabBarLabel, active && styles.tabBarLabelActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Plus menu overlay + floating menu — must be above tab bar */}
      {plusMenuOpen && (
        <TouchableOpacity style={styles.plusOverlay} onPress={() => setPlusMenuOpen(false)} activeOpacity={1} />
      )}
      {plusMenuOpen && (
        <View style={styles.plusMenuFloating}>
          <TouchableOpacity
            style={styles.plusMenuItem}
            onPress={() => { setPlusMenuOpen(false); setSheetOpen(true); }}
            activeOpacity={0.7}
          >
            <Text style={styles.plusMenuIcon}>💬</Text>
            <Text style={styles.plusMenuText}>Topics</Text>
          </TouchableOpacity>
          <View style={styles.plusMenuDivider} />
          <TouchableOpacity style={styles.plusMenuItem} onPress={() => setPlusMenuOpen(false)} activeOpacity={0.7}>
            <Text style={styles.plusMenuIcon}>📄</Text>
            <Text style={styles.plusMenuText}>Upload File</Text>
          </TouchableOpacity>
          <View style={styles.plusMenuDivider} />
          <TouchableOpacity style={styles.plusMenuItem} onPress={() => setPlusMenuOpen(false)} activeOpacity={0.7}>
            <Text style={styles.plusMenuIcon}>📷</Text>
            <Text style={styles.plusMenuText}>Camera</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Sheets */}
      <ChapterListComponent
        visible={openLesson !== null}
        lesson={openLesson}
        onClose={() => setOpenLesson(null)}
      />
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
      <ReviewSheet
        visible={reviewOpen}
        loading={reviewLoading}
        summary={reviewData}
        onClose={() => setReviewOpen(false)}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  center:    { flex: 1, backgroundColor: '#f5f5f7', alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1, backgroundColor: '#f5f5f7' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#e0e0ea',
  },
  headerCenter:   { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 },
  headerTitle:    { color: '#1a1a2e', fontSize: 16, fontWeight: '700' },
  headerLangTag:  { backgroundColor: '#ebebf0', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  headerLangText: { color: '#666680', fontSize: 12 },
  headerEndBtn:   { padding: 4 },
  headerEndText:  { color: '#7c6af7', fontSize: 14, fontWeight: '600' },

  tabContent: { flex: 1 },
  tabHidden:  { display: 'none' },

  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1, borderTopColor: '#e0e0ea',
    backgroundColor: '#ffffff',
    paddingBottom: 24, paddingTop: 10,
  },
  tabBarItem:        { flex: 1, alignItems: 'center', gap: 3 },
  tabBarLabel:       { fontSize: 11, fontWeight: '600', color: '#9999b0' },
  tabBarLabelActive: { color: '#1a1a2e' },

  plusOverlay: { ...StyleSheet.absoluteFillObject },
  plusMenuFloating: {
    position: 'absolute',
    bottom: 137,
    right: 16,
    width: 190,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1, borderColor: '#e0e0ea',
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12,
    elevation: 10,
  },
  plusMenuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  plusMenuIcon:    { fontSize: 18 },
  plusMenuText:    { color: '#1a1a2e', fontSize: 14, fontWeight: '500' },
  plusMenuDivider: { height: 1, backgroundColor: '#e0e0ea', marginHorizontal: 12 },
});
