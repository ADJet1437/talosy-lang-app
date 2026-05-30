import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { WordLookupResult, fetchWordLookup } from '../services/api';

type Props = {
  visible: boolean;
  word: string;
  context: string;
  targetLanguage: string;
  nativeLanguage: string;
  onClose: () => void;
};

const SHEET_HEIGHT = Dimensions.get('window').height * 0.42;

export function WordSheet({ visible, word, context, targetLanguage, nativeLanguage, onClose }: Props) {
  const [result, setResult] = useState<WordLookupResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      setResult(null);
      setError(false);
      setLoading(true);
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 65,
        friction: 11,
        useNativeDriver: true,
      }).start();
      fetchWordLookup(word, context, targetLanguage, nativeLanguage)
        .then((r) => { setResult(r); setLoading(false); })
        .catch(() => { setError(true); setLoading(false); });
    } else {
      Animated.timing(slideAnim, {
        toValue: SHEET_HEIGHT,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          {/* Word title */}
          <Text style={styles.word}>{word}</Text>
          {result?.pronunciation ? (
            <Text style={styles.pronunciation}>{result.pronunciation}</Text>
          ) : null}

          <View style={styles.divider} />

          {loading && (
            <View style={styles.centered}>
              <ActivityIndicator color="#7c6af7" size="small" />
            </View>
          )}

          {error && (
            <View style={styles.centered}>
              <Text style={styles.errorText}>Could not load definition. Try again.</Text>
            </View>
          )}

          {result && (
            <View style={styles.content}>
              <Text style={styles.explanation}>{result.explanation}</Text>

              <View style={styles.exampleBox}>
                <Text style={styles.exampleLabel}>Example</Text>
                <Text style={styles.exampleTarget}>{result.example}</Text>
                <Text style={styles.exampleTranslation}>{result.example_translation}</Text>
              </View>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    height: SHEET_HEIGHT,
    backgroundColor: '#16213e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
  },
  word: {
    color: '#e0e0ff',
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  pronunciation: {
    color: '#8888aa',
    fontSize: 14,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#2a2a4a',
    marginVertical: 16,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: '#8888aa',
    fontSize: 14,
  },
  content: {
    gap: 16,
  },
  explanation: {
    color: '#c0c0e0',
    fontSize: 15,
    lineHeight: 22,
  },
  exampleBox: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 14,
    gap: 6,
  },
  exampleLabel: {
    color: '#7c6af7',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  exampleTarget: {
    color: '#e0e0ff',
    fontSize: 15,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  exampleTranslation: {
    color: '#6a6a9a',
    fontSize: 13,
    lineHeight: 19,
  },
});
