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
import { C } from '../theme';

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
  const [result,  setResult]  = useState<WordLookupResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(false);
  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      setResult(null);
      setError(false);
      setLoading(true);
      Animated.spring(slideAnim, {
        toValue: 0, tension: 65, friction: 11, useNativeDriver: true,
      }).start();
      fetchWordLookup(word, context, targetLanguage, nativeLanguage)
        .then((r) => { setResult(r); setLoading(false); })
        .catch(() => { setError(true); setLoading(false); });
    } else {
      Animated.timing(slideAnim, {
        toValue: SHEET_HEIGHT, duration: 220, useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay} pointerEvents="box-none">
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.word}>{word}</Text>
              {result?.pronunciation ? (
                <Text style={styles.pronunciation}>{result.pronunciation}</Text>
              ) : null}
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          {loading && (
            <View style={styles.centered}>
              <ActivityIndicator color={C.BLUE} size="small" />
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
  overlay:  { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },

  sheet: {
    height: SHEET_HEIGHT,
    backgroundColor: C.BG_SURFACE,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
  },

  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: C.BORDER_DEFAULT,
    alignSelf: 'center', marginBottom: 16,
  },

  header:     { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  headerText: { flex: 1 },
  word:          { color: C.TEXT_PRIMARY, fontSize: 26, fontWeight: '700', letterSpacing: 0.5 },
  pronunciation: { color: C.TEXT_SECONDARY, fontSize: 14, marginTop: 4 },

  closeBtn:  { paddingTop: 4 },
  closeIcon: { color: C.TEXT_MUTED, fontSize: 18 },

  divider: { height: 1, backgroundColor: C.BORDER_DEFAULT, marginVertical: 16 },

  centered:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: C.TEXT_MUTED, fontSize: 14 },

  content:     { gap: 16 },
  explanation: { color: C.TEXT_PRIMARY, fontSize: 15, lineHeight: 22 },

  exampleBox: {
    backgroundColor: C.BG_ELEVATED,
    borderRadius: 12,
    borderWidth: 1, borderColor: C.BORDER_DEFAULT,
    padding: 14, gap: 6,
  },
  exampleLabel:       { color: C.BLUE, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  exampleTarget:      { color: C.TEXT_PRIMARY, fontSize: 15, lineHeight: 22, fontStyle: 'italic' },
  exampleTranslation: { color: C.TEXT_MUTED, fontSize: 13, lineHeight: 19 },
});
