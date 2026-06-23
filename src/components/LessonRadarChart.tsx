import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { fetchLessonCategories, langCode } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { C } from '../theme';

const SIZE    = 240;
const CX      = SIZE / 2;
const CY      = SIZE / 2;
const MAX_R   = 76;
const LABEL_R = MAX_R + 12;
const RINGS   = 3;

type Pt = { x: number; y: number };

function angle(i: number, n: number): number {
  return (2 * Math.PI * i) / n - Math.PI / 2;
}

function polar(r: number, a: number): Pt {
  return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) };
}

function LineSeg({
  x1, y1, x2, y2, color, w = 1,
}: { x1: number; y1: number; x2: number; y2: number; color: string; w?: number }) {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 0.5) return null;
  const deg = Math.atan2(dy, dx) * (180 / Math.PI);
  return (
    <View
      style={{
        position: 'absolute',
        left:   (x1 + x2) / 2 - len / 2,
        top:    (y1 + y2) / 2 - w / 2,
        width:  len,
        height: w,
        backgroundColor: color,
        transform: [{ rotate: `${deg}deg` }],
      }}
    />
  );
}

type Props = { learnLang: string };

export function LessonRadarChart({ learnLang }: Props) {
  const { token } = useAuth();
  const [axes, setAxes] = useState<{ name: string; pct: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchLessonCategories(langCode(learnLang), token)
      .then((cats) =>
        setAxes(
          cats.map((cat) => {
            const total = cat.lessons.reduce((s, l) => s + l.total_items, 0);
            const done  = cat.lessons.reduce((s, l) => s + l.done_items,  0);
            return { name: cat.name, pct: total > 0 ? done / total : 0 };
          }),
        ),
      )
      .catch(() => setAxes([]))
      .finally(() => setLoading(false));
  }, [learnLang, token]);

  const N = axes.length;

  // Clamp data radius to a minimum so zero-progress points still show a dot
  const dataPts: Pt[] = axes.map((ax, i) =>
    polar(Math.max(ax.pct, 0.05) * MAX_R, angle(i, N)),
  );

  const avgPct = N > 0 ? Math.round((axes.reduce((s, a) => s + a.pct, 0) / N) * 100) : 0;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Lesson Coverage</Text>
          {!loading && N >= 3 && (
            <Text style={styles.subtitle}>{avgPct}% average completion</Text>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={C.PURPLE} size="small" />
        </View>
      ) : N < 3 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Start lessons to see your coverage</Text>
        </View>
      ) : (
        <View style={{ width: SIZE, height: SIZE, alignSelf: 'center' }}>

          {/* ── Concentric grid rings ─────────────────────────────────────── */}
          {Array.from({ length: RINGS }).map((_, ri) => {
            const r = MAX_R * ((ri + 1) / RINGS);
            return (
              <View
                key={`ring-${ri}`}
                style={{
                  position: 'absolute',
                  left: CX - r, top: CY - r,
                  width: r * 2, height: r * 2,
                  borderRadius: r,
                  borderWidth: 1,
                  borderColor: ri === RINGS - 1 ? C.BORDER_DEFAULT : C.BORDER_SUBTLE,
                }}
              />
            );
          })}

          {/* ── Axis spokes to max ───────────────────────────────────────── */}
          {axes.map((_, i) => {
            const tip = polar(MAX_R, angle(i, N));
            return (
              <LineSeg
                key={`axis-${i}`}
                x1={CX} y1={CY} x2={tip.x} y2={tip.y}
                color={C.BORDER_DEFAULT} w={1}
              />
            );
          })}

          {/* ── Fill: center spokes to each data vertex ──────────────────── */}
          {dataPts.map((pt, i) => (
            <LineSeg
              key={`fill-${i}`}
              x1={CX} y1={CY} x2={pt.x} y2={pt.y}
              color="#8875f728" w={MAX_R * 0.7}
            />
          ))}

          {/* ── Polygon outline ───────────────────────────────────────────── */}
          {dataPts.map((pt, i) => {
            const next = dataPts[(i + 1) % N];
            return (
              <LineSeg
                key={`edge-${i}`}
                x1={pt.x} y1={pt.y} x2={next.x} y2={next.y}
                color={C.PURPLE} w={2}
              />
            );
          })}

          {/* ── Vertex dots ───────────────────────────────────────────────── */}
          {dataPts.map((pt, i) => (
            <View
              key={`dot-${i}`}
              style={{
                position: 'absolute',
                left: pt.x - 4, top: pt.y - 4,
                width: 8, height: 8,
                borderRadius: 4,
                backgroundColor: C.PURPLE,
                shadowColor: C.PURPLE,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.9,
                shadowRadius: 5,
              }}
            />
          ))}

          {/* ── Labels ───────────────────────────────────────────────────── */}
          {axes.map((ax, i) => {
            const pt = polar(LABEL_R, angle(i, N));
            return (
              <View
                key={`label-${i}`}
                style={{
                  position: 'absolute',
                  left: pt.x - 28, top: pt.y - 18,
                  width: 56,
                  alignItems: 'center',
                }}
              >
                <Text style={styles.labelName} numberOfLines={1}>{ax.name}</Text>
                <Text style={styles.labelPct}>{Math.round(ax.pct * 100)}%</Text>
              </View>
            );
          })}

        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.BG_SURFACE,
    borderRadius: 18,
    borderWidth: 1, borderColor: C.BORDER_DEFAULT,
    padding: 16,
    gap: 12,
  },
  header:   { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  title:    { color: C.TEXT_PRIMARY, fontSize: 14, fontWeight: '700' },
  subtitle: { color: C.TEXT_MUTED,   fontSize: 11, marginTop: 2 },

  center:    { height: 120, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: C.TEXT_MUTED, fontSize: 12, textAlign: 'center' },

  labelName: { color: C.TEXT_SECONDARY, fontSize: 8, fontWeight: '700', textAlign: 'center' },
  labelPct:  { color: C.PURPLE,         fontSize: 9, fontWeight: '800' },
});
