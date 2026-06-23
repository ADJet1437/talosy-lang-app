import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  LessonCategory,
  LessonSummary,
  fetchLessonCategories,
  fetchLessonDetail,
  langCode,
} from '../services/api';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useAuth } from '../context/AuthContext';
import { LessonNode, NodePosition, NodeState } from '../components/LessonNode';
import { C } from '../theme';

type Props = {
  learnLang?: string;
  nativeLang?: string;
};

type Nav = NativeStackNavigationProp<RootStackParamList>;

const POSITIONS: NodePosition[] = ['center', 'left', 'right'];

const BANNER_COLOR: Record<string, string> = {
  'Daily Life':    C.BANNER_DAILY,
  'Travel':        C.BANNER_TRAVEL,
  'Work & Study':  C.BANNER_WORK,
  'Food & Drink':  C.BANNER_FOOD,
  'Entertainment': C.BANNER_ENTERTAIN,
  'Culture':       C.BANNER_CULTURE,
};

const BANNER_EMOJI: Record<string, string> = {
  'Daily Life':    '🌅',
  'Travel':        '✈️',
  'Work & Study':  '💼',
  'Food & Drink':  '🍽️',
  'Entertainment': '🎬',
  'Culture':       '🏮',
};

function realState(lesson: LessonSummary): { state: NodeState; dots: number } {
  const { done_items, total_items } = lesson;
  if (total_items === 0 || done_items === 0) return { state: 'todo', dots: 0 };
  if (done_items >= total_items) return { state: 'done', dots: 5 };
  const dots = Math.max(1, Math.min(4, Math.round((done_items / total_items) * 5)));
  return { state: 'active', dots };
}

export function LessonsScreen({ learnLang = 'English', nativeLang = 'English' }: Props) {
  const navigation = useNavigation<Nav>();
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const [categories,        setCategories]        = useState<LessonCategory[]>([]);
  const [activeCategoryId,  setActiveCategoryId]  = useState<string | null>(null);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [error,             setError]             = useState<string | null>(null);
  const [starting,          setStarting]          = useState<string | null>(null);
  const isStartingRef = useRef(false);
  const scrollRef     = useRef<ScrollView>(null);
  const sectionYs     = useRef<Record<string, number>>({});

  useEffect(() => {
    fetchLessonCategories(langCode(learnLang), token)
      .then((data) => {
        setCategories(data);
        if (data.length > 0) setActiveCategoryId(data[0].id);
      })
      .catch(() => setError('Could not load lessons. Is the server running?'))
      .finally(() => setLoadingCategories(false));
  }, [learnLang, token]);

  async function handlePlay(lesson: LessonSummary) {
    if (isStartingRef.current) return;
    isStartingRef.current = true;
    setStarting(lesson.id);
    try {
      const detail = await fetchLessonDetail(lesson.id, langCode(learnLang), token, langCode(nativeLang));
      navigation.navigate('ChapterList', { lesson: detail, learnLang, nativeLang });
    } catch {
      // silent — user can retry
    } finally {
      setStarting(null);
      isStartingRef.current = false;
    }
  }

  function handleTabPress(catId: string) {
    setActiveCategoryId(catId);
    const y = sectionYs.current[catId];
    if (y !== undefined) scrollRef.current?.scrollTo({ y, animated: true });
  }


  if (loadingCategories) {
    return <View style={styles.center}><ActivityIndicator color={C.BLUE} size="large" /></View>;
  }

  if (error) {
    return <View style={styles.center}><Text style={styles.errorText}>{error}</Text></View>;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>

      {/* ── Category jump tabs ──────────────────────────────────────────────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsRow}
        contentContainerStyle={styles.tabsContent}
      >
        {categories.map((cat) => {
          const active = cat.id === activeCategoryId;
          return (
            <TouchableOpacity
              key={cat.id}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => handleTabPress(cat.id)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>
                {BANNER_EMOJI[cat.name] ?? '📚'} {cat.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Path canvas ─────────────────────────────────────────────────────── */}
      <ScrollView
        ref={scrollRef}
        style={styles.canvas}
        contentContainerStyle={styles.canvasContent}
        showsVerticalScrollIndicator={false}
      >
        {categories.map((cat) => (
          <View
            key={cat.id}
            onLayout={(e) => { sectionYs.current[cat.id] = e.nativeEvent.layout.y; }}
          >
            {/* Category banner */}
            <View style={[styles.banner, { backgroundColor: BANNER_COLOR[cat.name] ?? C.BG_ELEVATED }]}>
              <Text style={styles.bannerEmoji}>{BANNER_EMOJI[cat.name] ?? '📚'}</Text>
              <Text style={styles.bannerName}>{cat.name}</Text>
            </View>

            {/* Lesson nodes */}
            {cat.lessons.map((lesson, idx) => {
              const { state, dots } = realState(lesson);
              const position        = POSITIONS[idx % POSITIONS.length];
              const isLast          = idx === cat.lessons.length - 1;

              return (
                <View key={lesson.id}>
                  <LessonNode
                    lesson={lesson}
                    index={idx + 1}
                    position={position}
                    nodeState={state}
                    doneDots={dots}
                    isStarting={starting === lesson.id}
                    onPress={() => handlePlay(lesson)}
                  />
                  {!isLast && <Connector from={position} to={POSITIONS[(idx + 1) % POSITIONS.length]} />}
                </View>
              );
            })}

            <View style={styles.sectionBottom} />
          </View>
        ))}
      </ScrollView>

    </View>
  );
}

function Connector({ from, to }: { from: NodePosition; to: NodePosition }) {
  const offset =
    from === 'center' && to === 'left'  ? -28 :
    from === 'center' && to === 'right' ?  28 :
    from === 'left'   && to === 'center'?  28 :
    from === 'right'  && to === 'center'? -28 :
    from === 'left'   && to === 'right' ?  56 :
    from === 'right'  && to === 'left'  ? -56 : 0;

  const rotate = offset === 0 ? '0deg' : offset > 0 ? '12deg' : '-12deg';

  return (
    <View style={styles.connectorWrap}>
      <View style={[styles.connectorLine, { transform: [{ rotate }, { translateX: offset / 2 }] }]}>
        {Array.from({ length: 5 }).map((_, i) => (
          <View key={i} style={styles.connectorDot} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.BG_BASE },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { color: C.RED, fontSize: 14, textAlign: 'center', lineHeight: 22 },

  // ── Tabs ──────────────────────────────────────────────────────────────────
  tabsRow: {
    flexGrow: 0, flexShrink: 0,
    backgroundColor: C.BG_SURFACE,
    borderBottomWidth: 1, borderBottomColor: C.BORDER_DEFAULT,
  },
  tabsContent:  { paddingHorizontal: 16, paddingVertical: 10, gap: 8, alignItems: 'center' },
  tab:          { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: C.BG_ELEVATED },
  tabActive:    { backgroundColor: C.TEXT_PRIMARY },
  tabText:      { color: C.TEXT_SECONDARY, fontSize: 12, fontWeight: '600' },
  tabTextActive:{ color: C.BG_BASE },

  // ── Canvas ─────────────────────────────────────────────────────────────────
  canvas:        { flex: 1 },
  canvasContent: { paddingBottom: 60, paddingTop: 4 },

  // ── Category banner ────────────────────────────────────────────────────────
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginHorizontal: 24,
    marginTop: 28,
    marginBottom: 24,
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  bannerEmoji: { fontSize: 22 },
  bannerName:  { fontSize: 15, fontWeight: '700', color: C.TEXT_PRIMARY },

  // ── Connector ─────────────────────────────────────────────────────────────
  connectorWrap: { height: 44, alignItems: 'center', justifyContent: 'center' },
  connectorLine: { height: 40, justifyContent: 'space-between', alignItems: 'center' },
  connectorDot:  { width: 4, height: 4, borderRadius: 2, backgroundColor: C.BORDER_DEFAULT },

  sectionBottom: { height: 12 },
});
