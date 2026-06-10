import { AntDesign } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../context/AuthContext';
import { getMobileGoogleAuthUrl } from '../services/api';
import { C } from '../theme';

WebBrowser.maybeCompleteAuthSession();

function extractParam(url: string, param: string): string | null {
  const match = url.match(new RegExp(`[?&]${param}=([^&]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function LoginScreen() {
  const { setAuth } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    // Linking.createURL generates exp://... in Expo Go, talkos://auth in a standalone build
    const deepLink = Linking.createURL('auth');
    try {
      setLoading(true);

      const { authorization_url } = await getMobileGoogleAuthUrl(deepLink);
      const result = await WebBrowser.openAuthSessionAsync(authorization_url, deepLink);

      if (result.type !== 'success') return;

      const error = extractParam(result.url, 'error');
      if (error) {
        Alert.alert('Sign in failed', error.replace(/_/g, ' '));
        return;
      }

      const token = extractParam(result.url, 'token');
      if (!token) {
        Alert.alert('Sign in failed', 'No token received.');
        return;
      }

      await setAuth(token, {
        id:           extractParam(result.url, 'id') ?? '',
        email:        extractParam(result.url, 'email') ?? '',
        name:         extractParam(result.url, 'name') || null,
        avatar_url:   extractParam(result.url, 'avatar_url') || null,
        message_used: Number(extractParam(result.url, 'message_used') ?? 0),
      });
    } catch (err) {
      Alert.alert('Sign in failed', String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.hero}>
        <Text style={styles.appName}>Talkos</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.googleButton, loading && styles.googleButtonDisabled]}
          onPress={handleGoogleLogin}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={C.BG_BASE} />
          ) : (
            <>
              <AntDesign name="google" size={20} color={C.BG_BASE} style={styles.googleIcon} />
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.terms}>
          By continuing you agree to our Terms of Service and Privacy Policy.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.BG_BASE,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingBottom: 16,
  },
  hero: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    fontSize: 64,
    marginBottom: 8,
  },
  appName: {
    fontSize: 42,
    fontWeight: '700',
    color: C.TEXT_PRIMARY,
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 16,
    color: C.TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 24,
  },
  actions: {
    gap: 16,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 24,
    gap: 10,
  },
  googleButtonDisabled: {
    opacity: 0.6,
  },
  googleIcon: {
    // explicit style keeps layout stable while loading spinner swaps in
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: C.BG_BASE,
  },
  terms: {
    fontSize: 12,
    color: C.TEXT_MUTED,
    textAlign: 'center',
    lineHeight: 18,
  },
});
