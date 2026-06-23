import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { LessonSummary } from '../services/api';
import { C } from '../theme';

export type NodePosition = 'left' | 'center' | 'right';
export type NodeState    = 'done' | 'active' | 'todo' | 'locked';

type Props = {
  lesson:     LessonSummary;
  index:      number;
  position:   NodePosition;
  nodeState:  NodeState;
  doneDots:   number;   // 0–5
  isStarting: boolean;
  onPress:    () => void;
};

const CIRCLE = 88;
const DOTS   = 5;

function positionStyle(p: NodePosition) {
  if (p === 'left')  return { alignSelf: 'flex-start' as const, marginLeft: 36 };
  if (p === 'right') return { alignSelf: 'flex-end'   as const, marginRight: 36 };
  return                    { alignSelf: 'center'     as const };
}

export function LessonNode({ lesson, index, position, nodeState, doneDots, isStarting, onPress }: Props) {
  const isDone   = nodeState === 'done';
  const isLocked = nodeState === 'locked';
  const isActive = nodeState === 'active';
  const circleBg    = isDone   ? C.GREEN
                    : isLocked ? C.BG_ELEVATED
                    : C.BG_ELEVATED;

  const borderColor = isDone   ? C.GREEN
                    : isActive  ? C.BLUE
                    : C.BORDER_DEFAULT;

  const borderWidth = isActive ? 3 : 2;
  const numColor    = isDone ? C.TEXT_ON_COLOR : isLocked ? C.TEXT_MUTED : C.TEXT_PRIMARY;

  const dotColor    = isDone  ? C.GREEN
                    : isActive ? C.BLUE
                    : C.BORDER_STRONG;

  return (
    <View style={[styles.wrapper, positionStyle(position)]}>
      <TouchableOpacity
        style={[styles.circle, { backgroundColor: circleBg, borderColor, borderWidth }]}
        onPress={onPress}
        activeOpacity={isLocked ? 1 : 0.72}
        disabled={isLocked || isStarting}
      >
        {isStarting ? (
          <ActivityIndicator color={isDone ? C.TEXT_ON_COLOR : C.BLUE} />
        ) : isLocked ? (
          <Text style={styles.lockEmoji}>🔒</Text>
        ) : (
          <Text style={[styles.num, { color: numColor }]}>
            {String(index).padStart(2, '0')}
          </Text>
        )}
      </TouchableOpacity>

      <View style={styles.dotRow}>
        {Array.from({ length: DOTS }).map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i < doneDots && { backgroundColor: dotColor }]}
          />
        ))}
      </View>

      <Text style={[styles.label, isLocked && styles.labelLocked]} numberOfLines={2}>
        {lesson.title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: 124,
    alignItems: 'center',
    gap: 7,
  },

  circle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },

  lockEmoji: { fontSize: 28 },
  num: { fontSize: 24, fontWeight: '800', fontVariant: ['tabular-nums'] },

  dotRow: { flexDirection: 'row', gap: 5 },
  dot:    { width: 7, height: 7, borderRadius: 4, backgroundColor: C.BORDER_DEFAULT },

  label:       { color: C.TEXT_PRIMARY, fontSize: 12, fontWeight: '600', textAlign: 'center', lineHeight: 17 },
  labelLocked: { color: C.TEXT_MUTED },
});
