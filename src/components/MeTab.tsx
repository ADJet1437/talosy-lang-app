import React, { useState } from 'react';
import {
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const LANGUAGES = [
  'English', 'Spanish', 'French', 'German', 'Swedish',
  'Japanese', 'Mandarin', 'Korean', 'Italian', 'Portuguese',
];

type ModalTarget = 'learn' | 'native';

type Props = {
  isImmersive: boolean;
  learnLang: string;
  nativeLang: string;
  onLearnLangChange: (lang: string) => void;
  onNativeLangChange: (lang: string) => void;
  userMessages: number;
  aiMessages: number;
  onToggleMode: () => void;
};

export function MeTab({
  isImmersive,
  learnLang,
  nativeLang,
  onLearnLangChange,
  onNativeLangChange,
  userMessages,
  aiMessages,
  onToggleMode,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTarget, setModalTarget] = useState<ModalTarget>('learn');
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
    if (modalTarget === 'learn') onLearnLangChange(lang);
    else onNativeLangChange(lang);
    setModalOpen(false);
    setSearch('');
  }

  return (
    <>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <Text style={styles.section}>Conversation</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowIcon}>{isImmersive ? '⚡' : '✋'}</Text>
              <View>
                <Text style={styles.rowLabel}>{isImmersive ? 'Immersive mode' : 'Manual mode'}</Text>
                <Text style={styles.rowSub}>{isImmersive ? 'Auto-detects speech' : 'Tap bar to speak'}</Text>
              </View>
            </View>
            <Switch
              value={isImmersive}
              onValueChange={onToggleMode}
              trackColor={{ false: '#2a2a4a', true: '#7c6af7' }}
              thumbColor={isImmersive ? '#e0d8ff' : '#555577'}
            />
          </View>
        </View>

        <Text style={styles.section}>This Session</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Messages sent</Text>
            <Text style={styles.rowValue}>{userMessages}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>AI responses</Text>
            <Text style={styles.rowValue}>{aiMessages}</Text>
          </View>
        </View>

        <Text style={styles.section}>Languages</Text>
        <Text style={styles.langNote}>Changes take effect on the next session</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.row} onPress={() => openModal('learn')} activeOpacity={0.7}>
            <Text style={styles.rowLabel}>I want to practice</Text>
            <View style={styles.dropdownRow}>
              <Text style={styles.dropdownValue}>{learnLang}</Text>
              <Text style={styles.chevron}>›</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.row} onPress={() => openModal('native')} activeOpacity={0.7}>
            <Text style={styles.rowLabel}>I speak</Text>
            <View style={styles.dropdownRow}>
              <Text style={styles.dropdownValue}>{nativeLang}</Text>
              <Text style={styles.chevron}>›</Text>
            </View>
          </TouchableOpacity>
        </View>

        <Text style={styles.section}>About</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Talkos</Text>
            <Text style={styles.rowValue}>v1.0.0</Text>
          </View>
        </View>

      </ScrollView>

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
                style={[styles.listRow, item === active && styles.listRowActive]}
                onPress={() => pick(item)}
              >
                <Text style={[styles.listRowName, item === active && styles.listRowNameActive]}>
                  {item}
                </Text>
                {item === active && <Text style={styles.listRowCheck}>✓</Text>}
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40, gap: 8 },

  section: {
    color: '#9999b0', fontSize: 11, fontWeight: '700',
    letterSpacing: 0.8, textTransform: 'uppercase',
    marginTop: 12, marginBottom: 4, paddingHorizontal: 4,
  },
  langNote: {
    color: '#b8b8c8', fontSize: 11,
    paddingHorizontal: 4, marginBottom: 4, marginTop: -4,
  },

  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1, borderColor: '#e0e0ea',
    overflow: 'hidden',
  },
  divider: { height: 1, backgroundColor: '#e0e0ea', marginHorizontal: 16 },

  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  rowLeft:  { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  rowIcon:  { fontSize: 20 },
  rowLabel: { color: '#1a1a2e', fontSize: 15, fontWeight: '500' },
  rowSub:   { color: '#9999b0', fontSize: 12, marginTop: 2 },
  rowValue: { color: '#666680', fontSize: 14 },

  dropdownRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dropdownValue: { color: '#666680', fontSize: 14 },
  chevron: { color: '#9999b0', fontSize: 18, fontWeight: '300' },

  modal: { flex: 1, backgroundColor: '#f5f5f7' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0ea',
  },
  modalTitle: { color: '#1a1a2e', fontSize: 17, fontWeight: '700' },
  modalClose: { color: '#7c6af7', fontSize: 16, fontWeight: '600' },
  searchRow: { padding: 16, paddingBottom: 8 },
  searchInput: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0ea',
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#1a1a2e',
    fontSize: 15,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f5',
  },
  listRowActive: { backgroundColor: '#f0eeff' },
  listRowName: { flex: 1, color: '#444460', fontSize: 15 },
  listRowNameActive: { color: '#1a1a2e', fontWeight: '600' },
  listRowCheck: { color: '#7c6af7', fontSize: 16, fontWeight: '700' },
});
