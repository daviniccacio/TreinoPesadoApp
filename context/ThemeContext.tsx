// ============================================================================
// DOCUMENTAÇÃO: CONTEXTO GLOBAL DE TEMA (LIGHT / DARK PERSISTENTE)
// ============================================================================
// Gerencia a preferência de tema do aplicativo e salva no AsyncStorage para
// manter a escolha do usuário mesmo ao trocar de tela ou reiniciar o app.
// ============================================================================

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ThemeContextData {
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextData>({} as ThemeContextData);
const THEME_STORAGE_KEY = '@treino_pesado:theme_preference';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [isDark, setIsDark] = useState<boolean>(systemColorScheme === 'dark');

  // Carrega a preferência salva ao iniciar a aplicação
  useEffect(() => {
    async function loadThemePreference() {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedTheme !== null) {
          setIsDark(savedTheme === 'dark');
        }
      } catch (error) {
        console.warn('Erro ao carregar tema salvo:', error);
      }
    }
    loadThemePreference();
  }, []);

  // Alterna o tema e grava no armazenamento local do celular
  async function toggleTheme() {
    try {
      const nextTheme = !isDark;
      setIsDark(nextTheme);
      await AsyncStorage.setItem(
        THEME_STORAGE_KEY,
        nextTheme ? 'dark' : 'light'
      );
    } catch (error) {
      console.warn('Erro ao salvar preferência de tema:', error);
    }
  }

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook customizado para consumir o estado do tema em qualquer tela
 */
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme deve ser usado dentro de um ThemeProvider');
  }
  return context;
}