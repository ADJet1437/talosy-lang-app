import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { MainScreen } from '../screens/MainScreen';

export type RootStackParamList = {
  Main: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const screenOptions = {
  headerStyle: { backgroundColor: '#f5f5f7' },
  headerTintColor: '#7c6af7',
  headerTitleStyle: { fontWeight: '600' as const, color: '#1a1a2e' },
  headerBackTitleVisible: false,
  headerBackTitle: '',
  contentStyle: { backgroundColor: '#f5f5f7' },
};

export function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="Main" component={MainScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
