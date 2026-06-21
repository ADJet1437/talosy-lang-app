import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RootStackParamList } from '../navigation/AppNavigator';
import { ConversationMessage, fetchConversationMessages } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { C } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ConversationDetail'>;

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    + ' · '
    + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export function ConversationDetailScreen({ route, navigation }: Props) {
  const { session } = route.params;
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetchConversationMessages(session.id, token)
      .then(setMessages)
      .catch(() => setError('Could not load messages.'))
      .finally(() => setLoading(false));
  }, [token, session.id]);

  function renderMessage({ item }: { item: ConversationMessage }) {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.bubbleRow, isUser ? styles.bubbleRowUser : styles.bubbleRowAI]}>
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAI]}>
          <Text style={[styles.bubbleText, isUser ? styles.bubbleTextUser : styles.bubbleTextAI]}>
            {item.text}
          </Text>
        </View>
      </View>
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
        <View style={styles.headerMeta}>
          <Text style={styles.headerLang}>{session.language}</Text>
          <Text style={styles.headerDate}>{formatDate(session.started_at)}</Text>
        </View>
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

      {!loading && !error && (
        <FlatList
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={renderMessage}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
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
    gap: 10,
  },
  backBtn:     { flexDirection: 'row', alignItems: 'center', gap: 2 },
  backChevron: { color: C.BLUE, fontSize: 28, lineHeight: 32, fontWeight: '300' },
  backLabel:   { color: C.BLUE, fontSize: 15, fontWeight: '600' },
  headerMeta:  { flex: 1, alignItems: 'center', gap: 2 },
  headerLang:  { color: C.TEXT_PRIMARY, fontSize: 15, fontWeight: '700' },
  headerDate:  { color: C.TEXT_MUTED, fontSize: 11 },
  headerSpacer:{ width: 48 },

  center:    { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: C.RED, fontSize: 14 },

  list: { paddingHorizontal: 16, paddingTop: 16, gap: 8 },

  bubbleRow:     { flexDirection: 'row' },
  bubbleRowUser: { justifyContent: 'flex-end' },
  bubbleRowAI:   { justifyContent: 'flex-start' },

  bubble: {
    maxWidth: '80%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleUser: {
    backgroundColor: C.BLUE,
    borderBottomRightRadius: 4,
  },
  bubbleAI: {
    backgroundColor: C.BG_ELEVATED,
    borderBottomLeftRadius: 4,
  },
  bubbleText:     { fontSize: 15, lineHeight: 22 },
  bubbleTextUser: { color: '#fff' },
  bubbleTextAI:   { color: C.TEXT_PRIMARY },
});
