import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { ConversationScreen } from '../screens/ConversationScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { SessionSetupScreen } from '../screens/SessionSetupScreen';
import { SummaryScreen } from '../screens/SummaryScreen';
import { Scenario, SessionSummary } from '../services/api';

export type RootStackParamList = {
  Home: undefined;
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
      <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Talkos' }} />
      <Stack.Screen name="SessionSetup" component={SessionSetupScreen} options={{ title: 'New Conversation' }} />
      <Stack.Screen name="Conversation" component={ConversationScreen} options={{ title: '', headerBackVisible: false }} />
      <Stack.Screen name="Summary" component={SummaryScreen} options={{ title: 'Session Summary', headerBackVisible: false }} />
    </Stack.Navigator>
  );
}
