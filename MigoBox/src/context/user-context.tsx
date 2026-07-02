import { createContext, ReactNode, useContext, useMemo, useState } from 'react';

import { domain } from '@/types/domain';

type UserContextType = {
  user: domain.User | null;
  welcomeMessage: string;
  setUser: (nextUser: domain.User | null) => void;
  setWelcomeMessage: (nextMessage: string) => void;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

type UserProviderProps = {
  children: ReactNode;
};

export function UserProvider({ children }: UserProviderProps) {
  const [user, setUser] = useState<domain.User | null>(null);
  const [welcomeMessage, setWelcomeMessage] = useState('Bem vindo de volta!');

  const value = useMemo(
    () => ({
      user,
      welcomeMessage,
      setUser,
      setWelcomeMessage,
    }),
    [user, welcomeMessage],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUserContext() {
  const context = useContext(UserContext);

  if (!context) {
    throw new Error('useUserContext must be used within UserProvider');
  }

  return context;
}
