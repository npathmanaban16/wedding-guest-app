import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_STORAGE_KEY = '@wedding_guest_name';

interface AuthContextType {
  guestName: string | null;
  isLoading: boolean;
  onboardingSkipped: boolean;
  // Persists the already-validated canonical name. Guest-list validation is
  // done in the login screen against WeddingContext before this is called.
  login: (canonicalName: string) => Promise<void>;
  logout: () => Promise<void>;
  skipOnboarding: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [guestName, setGuestName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [onboardingSkipped, setOnboardingSkipped] = useState(false);

  useEffect(() => {
    // Restore persisted login on app launch
    AsyncStorage.getItem(AUTH_STORAGE_KEY)
      .then((stored) => {
        if (stored) setGuestName(stored);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const skipOnboarding = () => setOnboardingSkipped(true);

  // Reset skip flag whenever the logged-in guest changes
  useEffect(() => { setOnboardingSkipped(false); }, [guestName]);

  const login = async (canonicalName: string): Promise<void> => {
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, canonicalName);
    setGuestName(canonicalName);
  };

  const logout = async () => {
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    setGuestName(null);
  };

  return (
    <AuthContext.Provider value={{ guestName, isLoading, onboardingSkipped, login, logout, skipOnboarding }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
