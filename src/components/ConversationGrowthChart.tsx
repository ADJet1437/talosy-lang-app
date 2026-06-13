import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { ConversationGrowthPoint, fetchConversationGrowth } from '../services/api';
import { C } from '../theme';

type Range = '7d' | '30d' | '90d';

const RANGES: { key: Range; label: string }[] = [
  { key: '7d',  label: '7D' },
  { key: '30d', label: '1M' },
  { key: '90d', label: '3M' },
];

const CHART_H = 80;
const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function xLabel(point: ConversationGrowthPoint, idx: number, total: number, range: Range): string {
  const d = new Date(point.date + 'T00:00:00');
  if (range === '7d') return DAYS[d.getDay()];
  // For 1M/3M: show label at 0%, 25%, 50%, 75%, 100%
  const step = Math.round((total - 1) / 4);
  if (step > 0 && (idx === 0 || idx % step === 0 || idx === total - 1)) {
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }
  return '';
}

// For 90D, bucket into ~13 weekly points so bars stay readable
function downsample(data: ConversationGrowthPoint[], range: Range): ConversationGrowthPoint[] {
  if (range !== '90d' || data.length <= 13) return data;
  const step = Math.ceil(data.length / 13);
  const result: ConversationGrowthPoint[] = [];
  for (let i = step - 1; i < data.length; i += step) result.push(data[i]);
  if (result[result.length - 1]?.date !== data[data.length - 1]?.date) {
    result.push(data[data.length - 1]);
  }
  return result;
}

type Props = { token: string };

export function ConversationGrowthChart({ token }: Props) {
  const [range,   setRange]   = useState<Range>('7d');
  const [points,  setPoints]  = useState<ConversationGrowthPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchConversationGrowth(token, range)
      .then((data) => setPoints(downsample(data, range)))
      .catch(() => setPoints([]))
      .finally(() => setLoading(false));
  }, [range, token]);

  const maxTotal  = Math.max(...points.map((p) => p.total), 1);
  const lastTotal = points[points.length - 1]?.total ?? 0;
  const hasData   = lastTotal > 0;

  return (
    <View style={styles.card}>
      {/* Header row */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Conversations</Text>
          <Text style={styles.subtitle}>
            {lastTotal} total · {range === '7d' ? 'last 7 days' : range === '30d' ? 'last month' : 'last 3 months'}
          </Text>
        </View>
        <View style={styles.tabs}>
          {RANGES.map((r) => (
            <TouchableOpacity
              key={r.key}
              style={[styles.tab, range === r.key && styles.tabActive]}
              onPress={() => setRange(r.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, range === r.key && styles.tabTextActive]}>
                {r.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={C.PURPLE} size="small" />
        </View>
      ) : !hasData ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Start a conversation to see your progress</Text>
        </View>
      ) : (
        <>
          {/* Chart */}
          <View style={styles.chartWrap}>
            {/* Y-axis */}
            <View style={styles.yAxis}>
              <Text style={styles.yLabel}>{maxTotal}</Text>
              <Text style={styles.yLabel}>0</Text>
            </View>
            {/* Bars */}
            <View style={styles.barsArea}>
              {points.map((point) => {
                const h = Math.max(2, (point.total / maxTotal) * CHART_H);
                return (
                  <View key={point.date} style={styles.barCol}>
                    <View style={[styles.bar, { height: h }]} />
                  </View>
                );
              })}
            </View>
          </View>
          {/* X-axis labels */}
          <View style={styles.xAxis}>
            {/* spacer for y-axis column */}
            <View style={styles.yAxisSpacer} />
            <View style={styles.xLabels}>
              {points.map((point, idx) => (
                <View key={point.date} style={styles.xLabelCol}>
                  <Text style={styles.xLabel} numberOfLines={1}>
                    {xLabel(point, idx, points.length, range)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </>
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

  // ── Header ─────────────────────────────────────────────────────────────────
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  title:    { color: C.TEXT_PRIMARY, fontSize: 14, fontWeight: '700' },
  subtitle: { color: C.TEXT_MUTED,   fontSize: 11, marginTop: 2 },

  tabs: { flexDirection: 'row', gap: 4 },
  tab: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: C.BG_ELEVATED,
  },
  tabActive:     { backgroundColor: C.PURPLE },
  tabText:       { color: C.TEXT_MUTED,   fontSize: 11, fontWeight: '600' },
  tabTextActive: { color: '#fff' },

  // ── Loading / empty ────────────────────────────────────────────────────────
  center:    { height: CHART_H + 20, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: C.TEXT_MUTED, fontSize: 12, textAlign: 'center' },

  // ── Chart ──────────────────────────────────────────────────────────────────
  chartWrap: { flexDirection: 'row', height: CHART_H, gap: 6 },
  yAxis:     { width: 24, justifyContent: 'space-between', alignItems: 'flex-end' },
  yLabel:    { color: C.TEXT_MUTED, fontSize: 9, fontWeight: '600' },

  barsArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    borderBottomWidth: 1, borderBottomColor: C.BORDER_DEFAULT,
  },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar:    { width: '100%', backgroundColor: C.PURPLE, borderRadius: 2 },

  // ── X-axis ─────────────────────────────────────────────────────────────────
  xAxis:        { flexDirection: 'row', gap: 6 },
  yAxisSpacer:  { width: 24 },
  xLabels:      { flex: 1, flexDirection: 'row', gap: 2 },
  xLabelCol:    { flex: 1, alignItems: 'center' },
  xLabel:       { color: C.TEXT_MUTED, fontSize: 8, fontWeight: '500' },
});
