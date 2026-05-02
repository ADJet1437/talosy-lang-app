import { createAudioPlayer } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { RootStackParamList } from '../navigation/AppNavigator';
import { SpeechEvaluation, evaluateSpeech, transcribeAudio } from '../services/api';

type Props = NativeStackScreenProps<RootStackParamList, 'Review'>;

type Status = 'loading' | 'ready' | 'error';

export function ReviewScreen({ navigation, route }: Props) {
  const { originalText, audioUri, language, level, mode } = route.params;

  const [status, setStatus] = useState<Status>(audioUri ? 'loading' : 'ready');
  const [transcript, setTranscript] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<SpeechEvaluation | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPlayingBack, setIsPlayingBack] = useState(false);

  useEffect(() => {
    if (!audioUri) return;

    async function run() {
      try {
        const base64 = await FileSystem.readAsStringAsync(audioUri!, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const tx = await transcribeAudio(base64, language);
        setTranscript(tx);
        const ev = await evaluateSpeech(originalText, tx, language);
        setEvaluation(ev);
        setStatus('ready');
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : 'Evaluation failed');
        setStatus('error');
      }
    }

    run();
  }, []);

  function handlePlayback() {
    if (!audioUri || isPlayingBack) return;
    setIsPlayingBack(true);
    const player = createAudioPlayer({ uri: audioUri });
    player.addListener('playbackStatusUpdate', (s) => {
      if (s.didJustFinish) {
        player.remove();
        setIsPlayingBack(false);
      }
    });
    player.play();
  }

  function handleTryAgain() {
    navigation.pop(2); // back to TopicSetup or RoleSelect
  }

  function handleHome() {
    navigation.popToTop();
  }

  if (status === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#7c6af7" size="large" />
        <Text style={styles.loadingText}>Evaluating your speech…</Text>
      </View>
    );
  }

  const scoreColor = (score: number) =>
    score >= 75 ? '#44aa88' : score >= 50 ? '#f0a040' : '#e05555';

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Scores */}
        {evaluation && (
          <View style={styles.scoresRow}>
            <View style={styles.scoreCard}>
              <Text style={[styles.scoreValue, { color: scoreColor(evaluation.accuracy_score) }]}>
                {evaluation.accuracy_score}
              </Text>
              <Text style={styles.scoreLabel}>Accuracy</Text>
            </View>
            <View style={styles.scoreDivider} />
            <View style={styles.scoreCard}>
              <Text style={[styles.scoreValue, { color: scoreColor(evaluation.fluency_score) }]}>
                {evaluation.fluency_score}
              </Text>
              <Text style={styles.scoreLabel}>Fluency</Text>
            </View>
            <View style={styles.scoreDivider} />
            <View style={styles.scoreCard}>
              <Text style={styles.scoreValue}>
                {evaluation.matched_sentences}/{evaluation.total_sentences}
              </Text>
              <Text style={styles.scoreLabel}>Sentences</Text>
            </View>
          </View>
        )}

        {/* Playback */}
        {audioUri && (
          <TouchableOpacity
            style={[styles.playbackBtn, isPlayingBack && styles.playbackBtnActive]}
            onPress={handlePlayback}
            disabled={isPlayingBack}
          >
            <Text style={styles.playbackBtnText}>
              {isPlayingBack ? '▶ Playing…' : '▶ Play My Recording'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Overall feedback */}
        {evaluation && (
          <>
            <Text style={styles.sectionLabel}>Overall Feedback</Text>
            <View style={styles.feedbackCard}>
              <Text style={styles.feedbackText}>{evaluation.overall_feedback}</Text>
            </View>

            <Text style={styles.sectionLabel}>Strengths</Text>
            {evaluation.strengths.map((s, i) => (
              <View key={i} style={styles.bulletRow}>
                <Text style={styles.bulletGreen}>✓ </Text>
                <Text style={styles.bulletText}>{s}</Text>
              </View>
            ))}

            <Text style={styles.sectionLabel}>Improvements</Text>
            {evaluation.improvements.map((s, i) => (
              <View key={i} style={styles.bulletRow}>
                <Text style={styles.bulletOrange}>→ </Text>
                <Text style={styles.bulletText}>{s}</Text>
              </View>
            ))}
          </>
        )}

        {/* Transcript vs original */}
        {transcript && (
          <>
            <Text style={styles.sectionLabel}>What You Said</Text>
            <View style={styles.textCard}>
              <Text style={styles.textCardContent}>{transcript}</Text>
            </View>
          </>
        )}

        <Text style={styles.sectionLabel}>Original Text</Text>
        <View style={[styles.textCard, styles.textCardDim]}>
          <Text style={styles.textCardContentDim}>{originalText}</Text>
        </View>

        {status === 'error' && (
          <Text style={styles.errorMsg}>{errorMsg}</Text>
        )}

        {!audioUri && (
          <View style={styles.noRecordBanner}>
            <Text style={styles.noRecordText}>No recording — evaluation skipped</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.secondaryBtn} onPress={handleTryAgain}>
          <Text style={styles.secondaryBtnText}>Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primaryBtn} onPress={handleHome}>
          <Text style={styles.primaryBtnText}>Home</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#1a1a2e' },
  center: { flex: 1, backgroundColor: '#1a1a2e', alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadingText: { color: '#8888aa', fontSize: 15 },
  container: { padding: 20, paddingBottom: 16 },
  scoresRow: {
    flexDirection: 'row',
    backgroundColor: '#16213e',
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2a2a4a',
    marginBottom: 16,
  },
  scoreCard: { flex: 1, alignItems: 'center' },
  scoreValue: { fontSize: 36, fontWeight: '800', color: '#e0e0ff' },
  scoreLabel: { color: '#555577', fontSize: 12, marginTop: 2 },
  scoreDivider: { width: 1, backgroundColor: '#2a2a4a', marginHorizontal: 8 },
  playbackBtn: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a4a',
    marginBottom: 8,
  },
  playbackBtnActive: { borderColor: '#7c6af7' },
  playbackBtnText: { color: '#aaaacc', fontSize: 15, fontWeight: '600' },
  sectionLabel: {
    color: '#7c6af7',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 8,
    marginTop: 20,
  },
  feedbackCard: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2a2a4a',
  },
  feedbackText: { color: '#aaaacc', fontSize: 14, lineHeight: 22 },
  bulletRow: { flexDirection: 'row', marginBottom: 6 },
  bulletGreen: { color: '#44aa88', fontSize: 14, fontWeight: '700' },
  bulletOrange: { color: '#f0a040', fontSize: 14, fontWeight: '700' },
  bulletText: { color: '#aaaacc', fontSize: 14, flex: 1, lineHeight: 20 },
  textCard: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2a2a4a',
  },
  textCardDim: { backgroundColor: '#111128' },
  textCardContent: { color: '#e0e0ff', fontSize: 14, lineHeight: 22 },
  textCardContentDim: { color: '#555577', fontSize: 14, lineHeight: 22 },
  errorMsg: { color: '#ff6b6b', textAlign: 'center', marginTop: 12 },
  noRecordBanner: {
    backgroundColor: '#16213e',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#2a2a4a',
  },
  noRecordText: { color: '#555577', fontSize: 13 },
  footer: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 32,
    gap: 10,
    backgroundColor: '#1a1a2e',
    borderTopWidth: 1,
    borderTopColor: '#2a2a4a',
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a4a',
  },
  secondaryBtnText: { color: '#aaaacc', fontSize: 15, fontWeight: '600' },
  primaryBtn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 24,
    alignItems: 'center',
    backgroundColor: '#7c6af7',
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
