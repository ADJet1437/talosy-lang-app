import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '../context/AuthContext';
import { LessonDetail } from '../services/api';
import { LoginScreen } from '../screens/LoginScreen';
import { MainScreen } from '../screens/MainScreen';
import { ChapterListScreen } from '../screens/ChapterListScreen';
import { C } from '../theme';

export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
  ChapterList: { lesson: LessonDetail };
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
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      )}
    </Stack.Navigator>
  );
}
