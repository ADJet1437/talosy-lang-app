import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LessonItem } from '../services/api';
import { C } from '../theme';

type Props = {
  item: LessonItem | null;
  onClose: () => void;
  onDone: (itemId: string) => void;
};

export function ItemPracticeSheet({ item, onClose, onDone }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={item !== null}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.handle} />

        <Text style={styles.label}>Practice this phrase</Text>
        <Text style={styles.sentence}>{item?.sentence ?? ''}</Text>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.btnSkip} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.btnSkipText}>Skip</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.btnDone}
            onPress={() => item && onDone(item.id)}
            activeOpacity={0.7}
          >
            <Text style={styles.btnDoneText}>Mark as done ✓</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: C.BG_SURFACE,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 12,
    gap: 16,
  },
  handle: {
    alignSelf: 'center',
    width: 36, height: 4,
    borderRadius: 2,
    backgroundColor: C.BORDER_STRONG,
    marginBottom: 4,
  },
  label:    { color: C.TEXT_MUTED, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
  sentence: { color: C.TEXT_PRIMARY, fontSize: 20, fontWeight: '600', lineHeight: 28 },
  actions:  { flexDirection: 'row', gap: 12 },
  btnSkip: {
    flex: 1, height: 48,
    borderRadius: 12,
    backgroundColor: C.BG_ELEVATED,
    alignItems: 'center', justifyContent: 'center',
  },
  btnSkipText: { color: C.TEXT_SECONDARY, fontSize: 15, fontWeight: '600' },
  btnDone: {
    flex: 2, height: 48,
    borderRadius: 12,
    backgroundColor: C.GREEN,
    alignItems: 'center', justifyContent: 'center',
  },
  btnDoneText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
