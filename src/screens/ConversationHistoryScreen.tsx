import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { RootStackParamList } from '../navigation/AppNavigator';
import { ConversationSummary, deleteConversation, fetchConversationHistory } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { C } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ConversationHistory'>;

const LANG_FLAG: Record<string, string> = {
  English: '🇺🇸', Swedish: '🇸🇪', Chinese: '🇨🇳', Spanish: '🇪🇸',
  French: '🇫🇷', German: '🇩🇪', Japanese: '🇯🇵', Korean: '🇰🇷',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export function ConversationHistoryScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [sessions, setSessions] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetchConversationHistory(token)
      .then(setSessions)
      .catch(() => setError('Could not load history.'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleDelete = useCallback((session: ConversationSummary) => {
    Alert.alert(
      'Delete conversation',
      'This will permanently delete this conversation.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!token) return;
            await deleteConversation(session.id, token).catch(() => {});
            setSessions((prev) => prev.filter((s) => s.id !== session.id));
          },
        },
      ]
    );
  }, [token]);

  function renderItem({ item }: { item: ConversationSummary }) {
    const flag = LANG_FLAG[item.language] ?? '🌐';
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('Main', {
          resumeSessionId: item.id,
          resumeLanguage: item.language,
          resumeNativeLanguage: item.native_language,
        })}
        activeOpacity={0.7}
      >
        <View style={styles.cardLeft}>
          <Text style={styles.flag}>{flag}</Text>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardLang}>{item.language}</Text>
          <Text style={styles.cardMeta}>
            {formatDate(item.started_at)} · {formatTime(item.started_at)}
          </Text>
          <View style={styles.cardTags}>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{item.exchange_count} exchanges</Text>
            </View>
            {item.level_detected && (
              <View style={styles.tag}>
                <Text style={styles.tagText}>{item.level_detected}</Text>
              </View>
            )}
          </View>
        </View>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => handleDelete(item)}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="trash-outline" size={16} color={C.TEXT_MUTED} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backChevron}>‹</Text>
          <Text style={styles.backLabel}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>History</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading && (
        <View style={styles.center}>
          <ActivityIndicator color={C.BLUE} size="large" />
        </View>
      )}

      {error && (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {!loading && !error && sessions.length === 0 && (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No conversations yet.</Text>
          <Text style={styles.emptySubText}>Start chatting to build your history.</Text>
        </View>
      )}

      {!loading && !error && sessions.length > 0 && (
        <FlatList
          data={sessions}
          keyExtractor={(s) => s.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.BG_BASE },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: 8,
    backgroundColor: C.BG_SURFACE,
    borderBottomWidth: 1,
    borderBottomColor: C.BORDER_DEFAULT,
  },
  backBtn:      { flexDirection: 'row', alignItems: 'center', gap: 2 },
  backChevron:  { color: C.BLUE, fontSize: 28, lineHeight: 32, fontWeight: '300' },
  backLabel:    { color: C.BLUE, fontSize: 15, fontWeight: '600' },
  title:        { flex: 1, textAlign: 'center', color: C.TEXT_PRIMARY, fontSize: 16, fontWeight: '700' },
  headerSpacer: { width: 48 },

  center:       { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  errorText:    { color: C.RED, fontSize: 14 },
  emptyText:    { color: C.TEXT_PRIMARY, fontSize: 16, fontWeight: '600' },
  emptySubText: { color: C.TEXT_MUTED, fontSize: 13 },

  list:      { paddingHorizontal: 16, paddingTop: 16 },
  separator: { height: 10 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.BG_SURFACE,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: C.BORDER_DEFAULT,
  },
  cardLeft: {
    width: 40, height: 40,
    borderRadius: 20,
    backgroundColor: C.BG_ELEVATED,
    alignItems: 'center', justifyContent: 'center',
  },
  flag:     { fontSize: 20 },
  cardBody: { flex: 1, gap: 4 },
  cardLang: { color: C.TEXT_PRIMARY, fontSize: 15, fontWeight: '700' },
  cardMeta: { color: C.TEXT_MUTED, fontSize: 12 },
  cardTags: { flexDirection: 'row', gap: 6, marginTop: 2 },
  tag:      { backgroundColor: C.BG_ELEVATED, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  tagText:  { color: C.TEXT_SECONDARY, fontSize: 11, fontWeight: '600' },

  deleteBtn: { padding: 4 },
});
