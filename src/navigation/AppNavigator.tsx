import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { ConversationScreen } from '../screens/ConversationScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { ReviewScreen } from '../screens/ReviewScreen';
import { RoleSelectScreen } from '../screens/RoleSelectScreen';
import { SessionSetupScreen } from '../screens/SessionSetupScreen';
import { SummaryScreen } from '../screens/SummaryScreen';
import { TeleprompterScreen } from '../screens/TeleprompterScreen';
import { TopicSetupScreen } from '../screens/TopicSetupScreen';
import { Role, Scene, Scenario, SessionSummary, SpeechEvaluation } from '../services/api';

export type RootStackParamList = {
  Home: undefined;
  // Mode 1 & 2
  TopicSetup: { mode: 'starting' | 'levelup'; language: string; level: string };
  RoleSelect: { scene: Scene; topic: string; language: string; level: string };
  Teleprompter: {
    text: string;
    topic: string;
    language: string;
    level: string;
    mode: 'starting' | 'levelup';
    roleName?: string;
  };
  Review: {
    originalText: string;
    audioUri?: string;
    language: string;
    level: string;
    mode: 'starting' | 'levelup';
  };
  // Mode 3
  SessionSetup: undefined;
  Conversation: { sessionId: string; scenario: Scenario };
  Summary: { summary: SessionSummary };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const screenOptions = {
  headerStyle: { backgroundColor: '#1a1a2e' },
  headerTintColor: '#e0e0ff',
  headerTitleStyle: { fontWeight: '600' as const },
  contentStyle: { backgroundColor: '#1a1a2e' },
};

export function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="TopicSetup" component={TopicSetupScreen} options={{ title: 'Choose a Topic' }} />
      <Stack.Screen name="RoleSelect" component={RoleSelectScreen} options={{ title: 'Choose Your Role' }} />
      <Stack.Screen name="Teleprompter" component={TeleprompterScreen} options={{ title: '', headerBackVisible: false }} />
      <Stack.Screen name="Review" component={ReviewScreen} options={{ title: 'Review', headerBackVisible: false }} />
      <Stack.Screen name="SessionSetup" component={SessionSetupScreen} options={{ title: 'New Conversation' }} />
      <Stack.Screen name="Conversation" component={ConversationScreen} options={{ title: '', headerBackVisible: false }} />
      <Stack.Screen name="Summary" component={SummaryScreen} options={{ title: 'Session Summary', headerBackVisible: false }} />
    </Stack.Navigator>
  );
}
