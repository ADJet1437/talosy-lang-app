import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  message_used: number;
};

type AuthContextType = {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  setAuth: (token: string, user: AuthUser) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.multiGet(['auth_token', 'auth_user'])
      .then(([[, storedToken], [, storedUser]]) => {
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const setAuth = async (newToken: string, newUser: AuthUser) => {
    await AsyncStorage.multiSet([
      ['auth_token', newToken],
      ['auth_user', JSON.stringify(newUser)],
    ]);
    setToken(newToken);
    setUser(newUser);
  };

  const signOut = async () => {
    await AsyncStorage.multiRemove(['auth_token', 'auth_user']);
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, setAuth, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
