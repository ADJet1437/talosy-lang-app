import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { TOPICS } from '../data/topics';
import { C } from '../theme';

type Props = {
  visible: boolean;
  activeScene: string | null;
  onClose: () => void;
  onSelect: (scene: string, category: string) => void;
};

const SCREEN_WIDTH = Dimensions.get('window').width;
const SHEET_HEIGHT = Dimensions.get('window').height * 0.55;
const CARD_PADDING = 16;
const CARD_GAP     = 10;
const CARD_SIZE    = (SCREEN_WIDTH - CARD_PADDING * 2 - CARD_GAP * 2) / 3;

export function TopicSheet({ visible, activeScene, onClose, onSelect }: Props) {
  const [activeCategory, setActiveCategory] = useState(TOPICS[0].name);
  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0, tension: 65, friction: 11, useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SHEET_HEIGHT, duration: 220, useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const currentScenes = TOPICS.find((c) => c.name === activeCategory)?.scenes ?? [];

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsContent}
            style={styles.tabsRow}
          >
            {TOPICS.map((cat) => {
              const active = cat.name === activeCategory;
              return (
                <TouchableOpacity
                  key={cat.name}
                  onPress={() => setActiveCategory(cat.name)}
                  style={[styles.tab, active && styles.tabActive]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.tabText, active && styles.tabTextActive]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <ScrollView
            style={styles.scenesScroll}
            contentContainerStyle={styles.scenesContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.grid}>
              {currentScenes.map((scene) => {
                const selected = scene.name === activeScene;
                return (
                  <TouchableOpacity
                    key={scene.name}
                    style={[styles.card, selected && styles.cardSelected]}
                    onPress={() => onSelect(scene.name, activeCategory)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.cardIcon}>{scene.icon}</Text>
                    <Text style={[styles.cardLabel, selected && styles.cardLabelSelected]} numberOfLines={2}>
                      {scene.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
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
    overflow: 'hidden',
  },

  tabsRow:     { height: SHEET_HEIGHT * 0.1 },
  tabsContent: { paddingHorizontal: 12, gap: 6, alignItems: 'center' },

  tab:          { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, backgroundColor: C.BG_ELEVATED },
  tabActive:    { backgroundColor: C.TEXT_PRIMARY },
  tabText:      { color: C.TEXT_SECONDARY, fontSize: 12, fontWeight: '600' },
  tabTextActive:{ color: C.BG_BASE },

  scenesScroll:  { height: SHEET_HEIGHT * 0.9 },
  scenesContent: { padding: CARD_PADDING },
  grid:          { flexDirection: 'row', flexWrap: 'wrap', gap: CARD_GAP },

  card: {
    width: CARD_SIZE, height: CARD_SIZE,
    borderRadius: 16,
    backgroundColor: C.BG_ELEVATED,
    borderWidth: 1.5, borderColor: C.BORDER_DEFAULT,
    alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingHorizontal: 8,
  },
  cardSelected:      { backgroundColor: C.BLUE, borderColor: C.BLUE },
  cardIcon:          { fontSize: 28 },
  cardLabel:         { color: C.TEXT_SECONDARY, fontSize: 11, fontWeight: '500', textAlign: 'center', lineHeight: 15 },
  cardLabelSelected: { color: C.TEXT_ON_COLOR, fontWeight: '700' },
});
