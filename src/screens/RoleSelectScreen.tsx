import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { RootStackParamList } from '../navigation/AppNavigator';
import { Role, generateRoleContent } from '../services/api';

type Props = NativeStackScreenProps<RootStackParamList, 'RoleSelect'>;

const ROLE_ICONS = ['🧑', '👤', '🙋'];

export function RoleSelectScreen({ navigation, route }: Props) {
  const { scene, topic, language, level } = route.params;

  const [selected, setSelected] = useState<Role | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStart() {
    if (!selected) return;
    setGenerating(true);
    setError(null);
    try {
      const text = await generateRoleContent(
        scene.description,
        selected.name,
        selected.description,
        level.toLowerCase(),
        language,
      );
      navigation.navigate('Teleprompter', {
        text,
        topic,
        language,
        level,
        mode: 'levelup',
        roleName: selected.name,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate script');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        <View style={styles.sceneCard}>
          <Text style={styles.sceneLabel}>Scene</Text>
          <Text style={styles.sceneText}>{scene.description}</Text>
        </View>

        <Text style={styles.sectionLabel}>Choose Your Role</Text>
        <View style={styles.roleList}>
          {scene.roles.map((role, i) => (
            <TouchableOpacity
              key={role.id}
              style={[styles.roleCard, selected?.id === role.id && styles.roleCardActive]}
              onPress={() => setSelected(role)}
              activeOpacity={0.8}
            >
              <Text style={styles.roleIcon}>{ROLE_ICONS[i] ?? '👤'}</Text>
              <View style={styles.roleText}>
                <Text style={[styles.roleName, selected?.id === role.id && styles.roleNameActive]}>
                  {role.name}
                </Text>
                <Text style={styles.roleDesc}>{role.description}</Text>
              </View>
              <View style={[styles.radio, selected?.id === role.id && styles.radioActive]} />
            </TouchableOpacity>
          ))}
        </View>

        {error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.startBtn, (!selected || generating) && styles.startBtnDisabled]}
          onPress={handleStart}
          disabled={!selected || generating}
        >
          {generating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.startBtnText}>Generate My Script</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#1a1a2e' },
  scroll: { flex: 1 },
  container: { padding: 20, paddingBottom: 16 },
  sceneCard: {
    backgroundColor: '#16213e',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2a2a4a',
    marginTop: 8,
  },
  sceneLabel: {
    color: '#7c6af7',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  sceneText: { color: '#aaaacc', fontSize: 14, lineHeight: 20 },
  sectionLabel: {
    color: '#7c6af7',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 12,
    marginTop: 24,
  },
  roleList: { gap: 10 },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16213e',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#2a2a4a',
    gap: 14,
  },
  roleCardActive: { borderColor: '#7c6af7', backgroundColor: '#1e1640' },
  roleIcon: { fontSize: 26 },
  roleText: { flex: 1 },
  roleName: { color: '#aaaacc', fontSize: 15, fontWeight: '700' },
  roleNameActive: { color: '#e0e0ff' },
  roleDesc: { color: '#555577', fontSize: 13, marginTop: 2 },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#2a2a4a',
  },
  radioActive: { borderColor: '#7c6af7', backgroundColor: '#7c6af7' },
  error: { color: '#ff6b6b', textAlign: 'center', marginTop: 12 },
  footer: {
    padding: 16,
    paddingBottom: 32,
    backgroundColor: '#1a1a2e',
    borderTopWidth: 1,
    borderTopColor: '#2a2a4a',
  },
  startBtn: {
    backgroundColor: '#7c6af7',
    paddingVertical: 17,
    borderRadius: 32,
    alignItems: 'center',
  },
  startBtnDisabled: { opacity: 0.5 },
  startBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
