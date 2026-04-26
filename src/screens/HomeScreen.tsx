import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { RootStackParamList } from '../navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Talkos</Text>
      <Text style={styles.subtitle}>Immersive AI language conversations</Text>
      <TouchableOpacity style={styles.startBtn} onPress={() => navigation.navigate('SessionSetup')}>
        <Text style={styles.startBtnText}>Start Talking</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  title: { fontSize: 56, fontWeight: '800', color: '#e0e0ff', letterSpacing: 2 },
  subtitle: { fontSize: 16, color: '#8888aa', marginBottom: 64, marginTop: 8, textAlign: 'center' },
  startBtn: {
    backgroundColor: '#7c6af7',
    paddingVertical: 18,
    paddingHorizontal: 56,
    borderRadius: 36,
    alignItems: 'center',
  },
  startBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
