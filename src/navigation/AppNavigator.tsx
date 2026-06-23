import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '../context/AuthContext';
import { ConversationSummary, LessonDetail, LessonItem } from '../services/api';
import { LoginScreen } from '../screens/LoginScreen';
import { MainScreen } from '../screens/MainScreen';
import { ChapterListScreen } from '../screens/ChapterListScreen';
import { SentenceDetailScreen } from '../screens/SentenceDetailScreen';
import { SpeakingPracticeScreen } from '../screens/SpeakingPracticeScreen';
import { LessonCallScreen } from '../screens/LessonCallScreen';
import { ConversationHistoryScreen } from '../screens/ConversationHistoryScreen';
import { ConversationDetailScreen } from '../screens/ConversationDetailScreen';
import { C } from '../theme';

export type RootStackParamList = {
  Login: undefined;
  Main: { resumeSessionId?: string; resumeLanguage?: string; resumeNativeLanguage?: string } | undefined;
  ChapterList: { lesson: LessonDetail; learnLang: string; nativeLang: string };
  SentenceDetail: { item: LessonItem; learnLang: string; nativeLang: string; onDone: (itemId: string) => void; allItems?: LessonItem[]; currentIndex?: number };
  SpeakingPractice: { sentences: string[]; language: string; chapterTitle: string };
  LessonCall: { topic: string; sentences: string[]; language: string; nativeLanguage: string };
  ConversationHistory: undefined;
  ConversationDetail: { session: ConversationSummary };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const screenOptions = {
  headerStyle:           { backgroundColor: C.BG_SURFACE },
  headerTintColor:       C.PURPLE,
  headerTitleStyle:      { fontWeight: '600' as const, color: C.TEXT_PRIMARY },
  headerBackTitleVisible: false,
  headerBackTitle:       '',
  contentStyle:          { backgroundColor: C.BG_BASE },
};

export function AppNavigator() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.BG_BASE, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={C.PURPLE} size="large" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      {user ? (
        <>
          <Stack.Screen name="Main" component={MainScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ChapterList" component={ChapterListScreen} options={{ headerShown: false }} />
          <Stack.Screen name="SentenceDetail" component={SentenceDetailScreen} options={{ headerShown: false }} />
          <Stack.Screen name="SpeakingPractice" component={SpeakingPracticeScreen} options={{ headerShown: false }} />
          <Stack.Screen name="LessonCall" component={LessonCallScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ConversationHistory" component={ConversationHistoryScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ConversationDetail" component={ConversationDetailScreen} options={{ headerShown: false }} />
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      )}
    </Stack.Navigator>
  );
}
