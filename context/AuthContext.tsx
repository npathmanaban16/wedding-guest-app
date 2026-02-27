import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCanonicalName, isValidGuest } from '@/constants/guests';

const AUTH_STORAGE_KEY = '@wedding_guest_name';

interface AuthContextType {
  guestName: string | null;
  isLoading: boolean;
  login: (name: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [guestName, setGuestName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Restore persisted login on app launch
    AsyncStorage.getItem(AUTH_STORAGE_KEY)
      .then((stored) => {
        if (stored) setGuestName(stored);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (name: string): Promise<{ success: boolean; error?: string }> => {
    const trimmed = name.trim();
    if (!trimmed) {
      return { success: false, error: 'Please enter your name.' };
    }
    if (!isValidGuest(trimmed)) {
      return {
        success: false,
        error:
          "We couldn't find your name on the guest list. Please check the spelling or contact the couple.",
      };
    }
    const canonical = getCanonicalName(trimmed) ?? trimmed;
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, canonical);
    setGuestName(canonical);
    return { success: true };
  };

  const logout = async () => {
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    setGuestName(null);
  };

  return (
    <AuthContext.Provider value={{ guestName, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
