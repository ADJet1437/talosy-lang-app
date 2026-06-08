import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { LessonItem } from '../services/api';
import { C } from '../theme';

type Props = {
  visible: boolean;
  item: LessonItem | null;
  onClose: () => void;
  onUnlock: (itemId: string) => void;
};

const SHEET_HEIGHT = Dimensions.get('window').height * 0.54;

// Pick a word to blank — longest word >= 4 chars, seeded so it's stable per item
function buildChallenge(sentence: string, seed: string): { blanked: string; answer: string } {
  const clean = (w: string) => w.replace(/[.,!?;:'"-]/g, '');
  const words    = sentence.split(' ');
  const eligible = words.map(clean).filter((w) => w.length >= 4);

  const pool = eligible.length > 0 ? eligible : words.map(clean);
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  const answer = pool[Math.abs(h) % pool.length];

  const blanked = sentence.replace(new RegExp(`\\b${answer}\\b`, 'i'), '_____');
  return { blanked, answer: answer.toLowerCase() };
}

export function ItemPracticeSheet({ visible, item, onClose, onUnlock }: Props) {
  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const [input,     setInput]     = useState('');
  const [result,    setResult]    = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [challenge, setChallenge] = useState<{ blanked: string; answer: string } | null>(null);

  useEffect(() => {
    if (visible && item) {
      setInput('');
      setResult('idle');
      setChallenge(buildChallenge(item.sentence, item.id));
      Animated.spring(slideAnim, {
        toValue: 0, tension: 65, friction: 11, useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SHEET_HEIGHT, duration: 220, useNativeDriver: true,
      }).start();
    }
  }, [visible, item]);

  function handleCheck() {
    if (!challenge || !item) return;
    Keyboard.dismiss();
    const correct = input.trim().toLowerCase() === challenge.answer;
    setResult(correct ? 'correct' : 'wrong');
    if (correct) onUnlock(item.id);
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>

          <Text style={styles.sentence}>{item?.sentence}</Text>
          <Text style={styles.translation}>
            {/* Replace with real translation API call later */}
            {item ? `(${item.sentence} — translated)` : ''}
          </Text>

          <View style={styles.divider} />

          <Text style={styles.sectionLabel}>Fill in the blank</Text>
          <Text style={styles.blanked}>{challenge?.blanked}</Text>

          <TextInput
            style={[
              styles.input,
              result === 'correct' && styles.inputCorrect,
              result === 'wrong'   && styles.inputWrong,
            ]}
            value={input}
            onChangeText={(t) => { setInput(t); setResult('idle'); }}
            placeholder="type the missing word…"
            placeholderTextColor={C.TEXT_MUTED}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="done"
            onSubmitEditing={handleCheck}
          />

          {result === 'correct' && <Text style={styles.feedbackCorrect}>✓ Correct!</Text>}
          {result === 'wrong'   && <Text style={styles.feedbackWrong}>✗ Try again</Text>}

          <TouchableOpacity
            style={[styles.checkBtn, result === 'correct' && styles.checkBtnDone]}
            onPress={result === 'correct' ? onClose : handleCheck}
            activeOpacity={0.8}
          >
            <Text style={styles.checkBtnText}>
              {result === 'correct' ? 'Done ✓' : 'Check'}
            </Text>
          </TouchableOpacity>

        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },

  sheet: {
    height: SHEET_HEIGHT,
    backgroundColor: C.BG_SURFACE,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 14,
  },

  sentence:    { color: C.TEXT_PRIMARY, fontSize: 20, fontWeight: '700', lineHeight: 28 },
  translation: { color: C.TEXT_MUTED, fontSize: 14, lineHeight: 20, fontStyle: 'italic' },

  divider: { height: 1, backgroundColor: C.BORDER_DEFAULT, marginVertical: 2 },

  sectionLabel: {
    color: C.BLUE, fontSize: 11, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  blanked: { color: C.TEXT_PRIMARY, fontSize: 17, lineHeight: 26, fontWeight: '500' },

  input: {
    backgroundColor: C.BG_ELEVATED,
    borderWidth: 1.5, borderColor: C.BORDER_DEFAULT,
    borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 16, color: C.TEXT_PRIMARY,
  },
  inputCorrect: { borderColor: C.GREEN,  backgroundColor: C.BADGE_BEGINNER_BG },
  inputWrong:   { borderColor: C.RED,    backgroundColor: '#2a0a0e' },

  feedbackCorrect: { color: C.GREEN, fontSize: 14, fontWeight: '700' },
  feedbackWrong:   { color: C.RED,   fontSize: 14, fontWeight: '700' },

  checkBtn: {
    backgroundColor: C.BLUE,
    borderRadius: 14, paddingVertical: 13,
    alignItems: 'center', marginTop: 4,
  },
  checkBtnDone: { backgroundColor: C.GREEN },
  checkBtnText: { color: C.TEXT_ON_COLOR, fontSize: 15, fontWeight: '700' },
});
