import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

import { domain } from '@/types/domain';

const STORAGE_KEY = 'migobox_user';

type UserContextType = {
  user: domain.User | null;
  welcomeMessage: string;
  setUser: (nextUser: domain.User | null) => void;
  setWelcomeMessage: (nextMessage: string) => void;
  logout: () => Promise<void>;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

type UserProviderProps = {
  children: ReactNode;
};

export function UserProvider({ children }: UserProviderProps) {
  const [user, setUser] = useState<domain.User | null>(null);
  const [welcomeMessage, setWelcomeMessage] = useState('Bem vindo de volta!');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync(STORAGE_KEY)
      .then((stored) => {
        if (stored) {
          try {
            const parsed = JSON.parse(stored) as domain.User;
            setUser(parsed);
          } catch {
            SecureStore.deleteItemAsync(STORAGE_KEY);
          }
        }
      })
      .finally(() => setHydrated(true));
  }, []);

  const persistUser = useCallback((nextUser: domain.User | null) => {
    setUser(nextUser);
    if (nextUser) {
      SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(nextUser));
    } else {
      SecureStore.deleteItemAsync(STORAGE_KEY);
    }
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
    await SecureStore.deleteItemAsync(STORAGE_KEY);
  }, []);

  const value = useMemo(
    () => ({
      user,
      welcomeMessage,
      setUser: persistUser,
      setWelcomeMessage,
      logout,
    }),
    [user, welcomeMessage, persistUser],
  );

  return <UserContext.Provider value={value}>{hydrated ? children : null}</UserContext.Provider>;
}

export function useUserContext() {
  const context = useContext(UserContext);

  if (!context) {
    throw new Error('useUserContext must be used within UserProvider');
  }

  return context;
}
