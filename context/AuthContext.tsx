// ============================================================================
// DOCUMENTAÇÃO: CONTEXTO GLOBAL DE AUTENTICAÇÃO (AUTHCONTEXT)
// ============================================================================

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  getUserSession,
  saveUserSession,
  removeUserSession,
  UserSession,
} from '../lib/authStore';

interface AuthContextData {
  user: UserSession | null;
  isLoadingAuth: boolean;
  signIn: (session: UserSession) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({
  user: null,
  isLoadingAuth: true,
  signIn: async () => {},
  signOut: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);

  useEffect(() => {
    async function loadStoredSession() {
      try {
        const storedUser = await getUserSession();
        if (storedUser) {
          setUser(storedUser);
        }
      } catch (error) {
        console.error('❌ [AuthContext] Erro ao carregar sessão inicial:', error);
      } finally {
        setIsLoadingAuth(false);
      }
    }

    loadStoredSession();
  }, []);

  async function signIn(sessionData: UserSession) {
    await saveUserSession(sessionData);
    setUser(sessionData);
  }

  async function signOut() {
    await removeUserSession();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isLoadingAuth, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  return useContext(AuthContext);
}