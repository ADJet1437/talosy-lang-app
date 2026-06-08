import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { MainScreen } from '../screens/MainScreen';
import { C } from '../theme';

export type RootStackParamList = {
  Main: undefined;
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
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="Main" component={MainScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
