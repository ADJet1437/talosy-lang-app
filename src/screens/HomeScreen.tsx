import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RootStackParamList } from '../navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const LANGUAGES = [
  'English', 'Spanish', 'French', 'German', 'Swedish',
  'Japanese', 'Mandarin', 'Korean', 'Italian', 'Portuguese',
];

type ModalTarget = 'learn' | 'native';

export function HomeScreen({ navigation }: Props) {
  const [learnLang, setLearnLang] = useState('English');
  const [nativeLang, setNativeLang] = useState('English');
  const [modalTarget, setModalTarget] = useState<ModalTarget>('learn');
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState('');

  const active = modalTarget === 'learn' ? learnLang : nativeLang;

  const filtered = search.trim()
    ? LANGUAGES.filter((l) => l.toLowerCase().includes(search.toLowerCase()))
    : LANGUAGES;

  function openModal(target: ModalTarget) {
    setModalTarget(target);
    setSearch('');
    setModalOpen(true);
  }

  function pick(lang: string) {
    if (modalTarget === 'learn') setLearnLang(lang);
    else setNativeLang(lang);
    setModalOpen(false);
    setSearch('');
  }

  return (
    <View style={styles.container}>
      <View style={styles.top}>
        <Text style={styles.appName}>Talkos</Text>
        <Text style={styles.subtitle}>AI language partner — speak to learn</Text>
      </View>

      <View style={styles.middle}>
        <Text style={styles.label}>I WANT TO PRACTICE</Text>
        <TouchableOpacity style={styles.dropdown} onPress={() => openModal('learn')} activeOpacity={0.8}>
          <Text style={styles.dropdownText}>{learnLang}</Text>
          <Text style={styles.dropdownChevron}>›</Text>
        </TouchableOpacity>

        <Text style={[styles.label, { marginTop: 8 }]}>I SPEAK</Text>
        <TouchableOpacity style={styles.dropdown} onPress={() => openModal('native')} activeOpacity={0.8}>
          <Text style={styles.dropdownText}>{nativeLang}</Text>
          <Text style={styles.dropdownChevron}>›</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.startBtn}
        onPress={() => navigation.navigate('Conversation', { language: learnLang, nativeLanguage: nativeLang })}
        activeOpacity={0.85}
      >
        <Text style={styles.startBtnText}>Start</Text>
      </TouchableOpacity>

      <Modal visible={modalOpen} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {modalTarget === 'learn' ? 'I want to practice' : 'I speak'}
            </Text>
            <TouchableOpacity onPress={() => { setModalOpen(false); setSearch(''); }}>
              <Text style={styles.modalClose}>Done</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search…"
              placeholderTextColor="#555577"
              value={search}
              onChangeText={setSearch}
              autoCorrect={false}
            />
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(l) => l}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.row, item === active && styles.rowActive]}
                onPress={() => pick(item)}
              >
                <Text style={[styles.rowName, item === active && styles.rowNameActive]}>
                  {item}
                </Text>
                {item === active && <Text style={styles.rowCheck}>✓</Text>}
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 48,
    justifyContent: 'space-between',
  },
  top: { alignItems: 'center', gap: 8 },
  appName: {
    fontSize: 32,
    fontWeight: '900',
    color: '#8ba4f8',
  },
  subtitle: { color: '#8888aa', fontSize: 14 },
  middle: { gap: 12 },
  label: { color: '#8888aa', fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16213e',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#2a2a4a',
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  dropdownText: { flex: 1, color: '#e0e0ff', fontSize: 16, fontWeight: '500' },
  dropdownChevron: { color: '#555577', fontSize: 22, fontWeight: '300' },
  startBtn: {
    backgroundColor: '#7c6af7',
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: 'center',
  },
  startBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Modal
  modal: { flex: 1, backgroundColor: '#1a1a2e' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a4a',
  },
  modalTitle: { color: '#e0e0ff', fontSize: 17, fontWeight: '700' },
  modalClose: { color: '#7c6af7', fontSize: 16, fontWeight: '600' },
  searchRow: { padding: 16, paddingBottom: 8 },
  searchInput: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a4a',
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#e0e0ff',
    fontSize: 15,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#16213e',
  },
  rowActive: { backgroundColor: '#1e1640' },
  rowName: { flex: 1, color: '#aaaacc', fontSize: 15 },
  rowNameActive: { color: '#e0e0ff', fontWeight: '600' },
  rowCheck: { color: '#7c6af7', fontSize: 16, fontWeight: '700' },
});
