import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import {
  FlatList,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { RootStackParamList } from '../navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const LANGUAGES = [
  { name: 'Amharic',    flag: '🇪🇹' },
  { name: 'Arabic',     flag: '🇸🇦' },
  { name: 'Bengali',    flag: '🇧🇩' },
  { name: 'Bulgarian',  flag: '🇧🇬' },
  { name: 'Burmese',    flag: '🇲🇲' },
  { name: 'Catalan',    flag: '🇪🇸' },
  { name: 'Khmer',      flag: '🇰🇭' },
  { name: 'Croatian',   flag: '🇭🇷' },
  { name: 'Czech',      flag: '🇨🇿' },
  { name: 'Danish',     flag: '🇩🇰' },
  { name: 'Dutch',      flag: '🇳🇱' },
  { name: 'English',    flag: '🇬🇧' },
  { name: 'Estonian',   flag: '🇪🇪' },
  { name: 'Filipino',   flag: '🇵🇭' },
  { name: 'Finnish',    flag: '🇫🇮' },
  { name: 'French',     flag: '🇫🇷' },
  { name: 'German',     flag: '🇩🇪' },
  { name: 'Greek',      flag: '🇬🇷' },
  { name: 'Gujarati',   flag: '🇮🇳' },
  { name: 'Hausa',      flag: '🇳🇬' },
  { name: 'Hebrew',     flag: '🇮🇱' },
  { name: 'Hindi',      flag: '🇮🇳' },
  { name: 'Hungarian',  flag: '🇭🇺' },
  { name: 'Indonesian', flag: '🇮🇩' },
  { name: 'Italian',    flag: '🇮🇹' },
  { name: 'Japanese',   flag: '🇯🇵' },
  { name: 'Kannada',    flag: '🇮🇳' },
  { name: 'Korean',     flag: '🇰🇷' },
  { name: 'Latvian',    flag: '🇱🇻' },
  { name: 'Lithuanian', flag: '🇱🇹' },
  { name: 'Malay',      flag: '🇲🇾' },
  { name: 'Malayalam',  flag: '🇮🇳' },
  { name: 'Mandarin',   flag: '🇨🇳' },
  { name: 'Marathi',    flag: '🇮🇳' },
  { name: 'Nepali',     flag: '🇳🇵' },
  { name: 'Norwegian',  flag: '🇳🇴' },
  { name: 'Pashto',     flag: '🇦🇫' },
  { name: 'Persian',    flag: '🇮🇷' },
  { name: 'Polish',     flag: '🇵🇱' },
  { name: 'Portuguese', flag: '🇧🇷' },
  { name: 'Punjabi',    flag: '🇮🇳' },
  { name: 'Romanian',   flag: '🇷🇴' },
  { name: 'Russian',    flag: '🇷🇺' },
  { name: 'Serbian',    flag: '🇷🇸' },
  { name: 'Sinhalese',  flag: '🇱🇰' },
  { name: 'Slovak',     flag: '🇸🇰' },
  { name: 'Spanish',    flag: '🇪🇸' },
  { name: 'Swahili',    flag: '🇰🇪' },
  { name: 'Swedish',    flag: '🇸🇪' },
  { name: 'Tamil',      flag: '🇮🇳' },
  { name: 'Telugu',     flag: '🇮🇳' },
  { name: 'Thai',       flag: '🇹🇭' },
  { name: 'Turkish',    flag: '🇹🇷' },
  { name: 'Ukrainian',  flag: '🇺🇦' },
  { name: 'Urdu',       flag: '🇵🇰' },
  { name: 'Vietnamese', flag: '🇻🇳' },
  { name: 'Yoruba',     flag: '🇳🇬' },
];

export function HomeScreen({ navigation }: Props) {
  const [selected, setSelected] = useState(LANGUAGES.find((l) => l.name === 'English')!);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = search.trim()
    ? LANGUAGES.filter((l) => l.name.toLowerCase().includes(search.toLowerCase()))
    : LANGUAGES;

  function pick(lang: typeof LANGUAGES[0]) {
    setSelected(lang);
    setModalOpen(false);
    setSearch('');
  }

  return (
    <View style={styles.container}>
      <View style={styles.top}>
        <Text style={styles.appName}>Talkos</Text>
        <Text style={styles.subtitle}>Pick a language and start talking</Text>
      </View>

      <View style={styles.middle}>
        <Text style={styles.label}>I want to practice</Text>
        <TouchableOpacity style={styles.dropdown} onPress={() => setModalOpen(true)} activeOpacity={0.8}>
          <Text style={styles.dropdownFlag}>{selected.flag}</Text>
          <Text style={styles.dropdownText}>{selected.name}</Text>
          <Text style={styles.dropdownChevron}>›</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.startBtn}
        onPress={() => navigation.navigate('Conversation', { language: selected.name })}
        activeOpacity={0.85}
      >
        <Text style={styles.startBtnText}>Start Talking</Text>
      </TouchableOpacity>

      <Modal visible={modalOpen} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Language</Text>
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
            keyExtractor={(l) => l.name}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.row, item.name === selected.name && styles.rowActive]}
                onPress={() => pick(item)}
              >
                <Text style={styles.rowFlag}>{item.flag}</Text>
                <Text style={[styles.rowName, item.name === selected.name && styles.rowNameActive]}>
                  {item.name}
                </Text>
                {item.name === selected.name && <Text style={styles.rowCheck}>✓</Text>}
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
  appName: { color: '#e0e0ff', fontSize: 36, fontWeight: '800', letterSpacing: 1 },
  subtitle: { color: '#8888aa', fontSize: 15 },
  middle: { gap: 12 },
  label: { color: '#7c6af7', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5 },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16213e',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#2a2a4a',
    paddingVertical: 18,
    paddingHorizontal: 20,
    gap: 12,
  },
  dropdownFlag: { fontSize: 28 },
  dropdownText: { flex: 1, color: '#e0e0ff', fontSize: 17, fontWeight: '600' },
  dropdownChevron: { color: '#555577', fontSize: 22, fontWeight: '300' },
  startBtn: {
    backgroundColor: '#7c6af7',
    paddingVertical: 18,
    borderRadius: 32,
    alignItems: 'center',
  },
  startBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },

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
  rowFlag: { fontSize: 24 },
  rowName: { flex: 1, color: '#aaaacc', fontSize: 15 },
  rowNameActive: { color: '#e0e0ff', fontWeight: '600' },
  rowCheck: { color: '#7c6af7', fontSize: 16, fontWeight: '700' },
});
