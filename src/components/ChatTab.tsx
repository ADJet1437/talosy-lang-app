import React from 'react';
import {
  Animated,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { C } from '../theme';

export type AppState =
  | 'setup' | 'connecting' | 'ai_speaking'
  | 'listening' | 'processing' | 'paused' | 'ended';

export type Message = { role: 'user' | 'ai'; text: string; translation?: string };

type Props = {
  appState: AppState;
  isImmersive: boolean;
  isManualRecording: boolean;
  messages: Message[];
  streamingText: string;
  suggestion: string;
  suggestionPlaying: boolean;
  suggestionSpeed: number;
  plusMenuOpen: boolean;
  pulseAnim: Animated.Value;
  equalizerAnims: Animated.Value[];
  scrollRef: React.RefObject<ScrollView>;
  onBarPress: () => void;
  onWordTap: (word: string, context: string) => void;
  onSuggestionPlay: () => void;
  onSuggestionSpeedToggle: () => void;
  onPlusToggle: () => void;
};

const STATE_CONFIG: Record<AppState, { color: string; icon: string; spinner: boolean; label: string }> = {
  setup:       { color: C.TEXT_MUTED,  icon: '',   spinner: true,  label: 'Starting…' },
  connecting:  { color: C.TEXT_MUTED,  icon: '',   spinner: true,  label: 'Connecting…' },
  ai_speaking: { color: C.GREEN,       icon: '🔊', spinner: false, label: 'Speaking…' },
  listening:   { color: C.PURPLE,      icon: '🎙', spinner: false, label: 'Listening…' },
  processing:  { color: C.ORANGE,      icon: '',   spinner: true,  label: 'Processing…' },
  paused:      { color: C.TEXT_MUTED,  icon: '🎙', spinner: false, label: 'Ready' },
  ended:       { color: C.TEXT_MUTED,  icon: '✓',  spinner: false, label: 'Ended' },
};

export function ChatTab({
  appState,
  isImmersive,
  isManualRecording,
  messages,
  streamingText,
  suggestion,
  suggestionPlaying,
  suggestionSpeed,
  plusMenuOpen,
  pulseAnim,
  equalizerAnims,
  scrollRef,
  onBarPress,
  onWordTap,
  onSuggestionPlay,
  onSuggestionSpeedToggle,
  onPlusToggle,
}: Props) {
  const cfg = {
    ...STATE_CONFIG[appState],
    label:
      appState === 'listening'
        ? isImmersive ? 'Listening…' : 'Recording…'
        : appState === 'paused'
        ? isImmersive ? 'Paused' : 'Ready'
        : STATE_CONFIG[appState].label,
    icon:
      appState === 'paused'
        ? isImmersive ? '⏸' : '🎙'
        : STATE_CONFIG[appState].icon,
  };

  const barDisabled =
    isImmersive ||
    appState === 'ai_speaking' ||
    appState === 'processing' ||
    appState === 'connecting';

  function barLabel() {
    if (isManualRecording) return '';
    if (appState === 'ai_speaking') return 'Speaking…';
    if (appState === 'processing')  return 'Processing…';
    if (appState === 'connecting')  return 'Connecting…';
    if (isImmersive)                return cfg.label;
    return 'Tap to speak';
  }

  return (
    <View style={styles.container}>

      {/* State indicator */}
      <View style={styles.indicatorArea}>
        <View style={styles.indicatorWrapper}>
          <Animated.View
            style={[styles.glowRing, { backgroundColor: cfg.color, transform: [{ scale: pulseAnim }] }]}
          />
          <View style={[styles.indicatorCircle, { backgroundColor: cfg.color }]}>
            {cfg.spinner
              ? <ActivityIndicator color={C.PURPLE} size="small" />
              : <Text style={styles.indicatorIcon}>{cfg.icon}</Text>
            }
          </View>
        </View>
        <Text style={styles.indicatorLabel}>{cfg.label}</Text>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={styles.transcript}
        contentContainerStyle={styles.transcriptContent}
      >
        {messages.map((m, i) =>
          m.role === 'user' ? (
            <View key={i} style={[styles.bubble, styles.userBubble]}>
              <Text style={[styles.bubbleText, styles.userText]}>{m.text}</Text>
            </View>
          ) : (
            <View key={i} style={styles.aiBubbleWrap}>
              <View style={styles.aiBubble}>
                <View style={styles.aiWordRow}>
                  {(m.text ?? '').split(' ').filter(Boolean).map((token, wi) => {
                    const clean = token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
                    return (
                      <Text
                        key={wi}
                        style={[styles.bubbleText, styles.aiText, clean ? styles.aiWordTappable : undefined]}
                        onPress={clean ? () => onWordTap(clean, m.text) : undefined}
                        suppressHighlighting
                      >
                        {token}{' '}
                      </Text>
                    );
                  })}
                </View>
              </View>
              {m.translation && (
                <Text style={styles.translationText}>{m.translation}</Text>
              )}
            </View>
          )
        )}

        {streamingText ? (
          <View style={styles.aiBubbleWrap}>
            <View style={styles.aiBubble}>
              <Text style={[styles.bubbleText, styles.aiText]}>{streamingText}</Text>
            </View>
          </View>
        ) : null}

        {suggestion ? (
          <View style={styles.suggestionWrap}>
            <Text style={styles.suggestionLabel}>try saying</Text>
            <View style={styles.suggestionBox}>
              <Text style={styles.suggestionText}>{suggestion}</Text>
              <TouchableOpacity onPress={onSuggestionPlay} style={styles.suggestionPlayBtn}>
                <Text style={[styles.suggestionPlayIcon, suggestionPlaying && styles.suggestionPlayIconActive]}>
                  {suggestionPlaying ? '⏸' : '▶'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onSuggestionSpeedToggle} style={styles.suggestionSpeedBtn}>
                <Text style={[styles.suggestionSpeedText, suggestionSpeed < 1 && styles.suggestionSpeedTextActive]}>
                  {suggestionSpeed === 1.0 ? '1x' : suggestionSpeed === 0.75 ? '0.75x' : '0.5x'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </ScrollView>

      {/* Input bar */}
      <View style={styles.inputSection}>
        <View style={styles.barRow}>
          <TouchableOpacity
            style={[styles.inputBar, barDisabled && styles.inputBarDisabled]}
            onPress={onBarPress}
            disabled={barDisabled}
            activeOpacity={0.8}
          >
            {isManualRecording ? (
              <View style={styles.equalizerRow}>
                {equalizerAnims.map((anim, i) => (
                  <Animated.View key={i} style={[styles.equalizerBar, { height: anim }]} />
                ))}
              </View>
            ) : (
              <>
                <Text style={[styles.inputBarIcon, barDisabled && styles.inputBarIconDisabled]}>🎙</Text>
                <Text style={[styles.inputBarText, barDisabled && styles.inputBarTextDisabled]}>
                  {barLabel()}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.plusBtnWrapper}>
            <TouchableOpacity style={styles.plusBtn} onPress={onPlusToggle} activeOpacity={0.8}>
              <Text style={styles.plusBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  indicatorArea:    { alignItems: 'center', paddingVertical: 20, gap: 10 },
  indicatorWrapper: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center' },
  glowRing:         { position: 'absolute', width: 64, height: 64, borderRadius: 32, opacity: 0.18 },
  indicatorCircle:  { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  indicatorIcon:    { fontSize: 24 },
  indicatorLabel:   { color: C.TEXT_SECONDARY, fontSize: 14, fontWeight: '600', letterSpacing: 0.3 },

  transcript:        { flex: 1 },
  transcriptContent: { padding: 16, gap: 10, paddingBottom: 16 },
  bubble:            { maxWidth: '80%', borderRadius: 16, padding: 12 },
  userBubble:        { alignSelf: 'flex-end', backgroundColor: C.BLUE },
  aiBubbleWrap:      { alignSelf: 'flex-start', maxWidth: '85%', gap: 6 },
  aiBubble:          { backgroundColor: C.BG_ELEVATED, borderRadius: 16, padding: 12 },
  aiWordRow:         { flexDirection: 'row', flexWrap: 'wrap' },
  bubbleText:        { fontSize: 15, lineHeight: 22 },
  userText:          { color: C.TEXT_ON_COLOR },
  aiText:            { color: C.TEXT_PRIMARY },
  aiWordTappable:    { textDecorationLine: 'underline', textDecorationColor: C.BORDER_STRONG },
  translationText:   { color: C.TEXT_MUTED, fontSize: 12, lineHeight: 18, fontStyle: 'italic', paddingHorizontal: 4 },

  suggestionWrap:  { alignSelf: 'flex-end', alignItems: 'flex-end', gap: 4, marginTop: 4 },
  suggestionLabel: { color: C.TEXT_MUTED, fontSize: 11 },
  suggestionBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.BG_ELEVATED, borderRadius: 16,
    borderWidth: 1, borderColor: C.PURPLE, borderStyle: 'dashed',
    paddingHorizontal: 14, paddingVertical: 8, gap: 8,
  },
  suggestionText:            { color: C.PURPLE, fontSize: 14, flex: 1 },
  suggestionPlayBtn:         { padding: 4 },
  suggestionPlayIcon:        { color: C.TEXT_MUTED, fontSize: 14 },
  suggestionPlayIconActive:  { color: C.PURPLE },
  suggestionSpeedBtn:        { padding: 4 },
  suggestionSpeedText:       { color: C.TEXT_MUTED, fontSize: 12, fontWeight: '700' },
  suggestionSpeedTextActive: { color: C.PURPLE },

  inputSection: {
    borderTopWidth: 1, borderTopColor: C.BORDER_DEFAULT,
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12,
  },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  inputBar: {
    flex: 1, height: 48,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: C.BG_ELEVATED,
    borderRadius: 24, borderWidth: 1.5, borderColor: C.BORDER_DEFAULT,
    paddingHorizontal: 18,
  },
  inputBarDisabled:     { opacity: 0.45 },
  inputBarIcon:         { fontSize: 18 },
  inputBarIconDisabled: { opacity: 0.5 },
  inputBarText:         { color: C.TEXT_SECONDARY, fontSize: 15 },
  inputBarTextDisabled: { color: C.TEXT_MUTED },

  plusBtnWrapper: { position: 'relative' },
  plusBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: C.PURPLE,
    alignItems: 'center', justifyContent: 'center',
  },
  plusBtnText: { color: C.TEXT_ON_COLOR, fontSize: 24, fontWeight: '300', lineHeight: 28, marginTop: -2 },

  equalizerRow: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 2 },
  equalizerBar: { flex: 1, borderRadius: 1.5, backgroundColor: C.PURPLE },
});
