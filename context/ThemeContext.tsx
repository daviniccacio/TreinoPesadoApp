// ============================================================================
// DOCUMENTAÇÃO: CONTEXTO GLOBAL DE TEMA COM SINCRONIZAÇÃO NATIVEWIND
// ============================================================================
// Gerencia a preferência de tema (Light/Dark), grava no AsyncStorage e 
// força a atualização do esquema de cores do NativeWind.
// ============================================================================

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme as useNativeWindColorScheme } from 'nativewind';

interface ThemeContextData {
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextData>({} as ThemeContextData);
const THEME_STORAGE_KEY = '@treino_pesado:theme_preference';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useRNColorScheme();
  const { setColorScheme } = useNativeWindColorScheme();
  const [isDark, setIsDark] = useState<boolean>(systemColorScheme === 'dark');

  // Carrega a preferência salva ao iniciar o aplicativo
  useEffect(() => {
    async function loadThemePreference() {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedTheme !== null) {
          const activeDark = savedTheme === 'dark';
          setIsDark(activeDark);
          setColorScheme(activeDark ? 'dark' : 'light');
        } else {
          setColorScheme(systemColorScheme === 'dark' ? 'dark' : 'light');
        }
      } catch (error) {
        console.warn('Erro ao carregar preferência de tema:', error);
      }
    }
    loadThemePreference();
  }, [systemColorScheme]);

  // Alterna o tema globalmente e sincroniza o NativeWind + AsyncStorage
  async function toggleTheme() {
    try {
      const nextTheme = !isDark;
      setIsDark(nextTheme);
      setColorScheme(nextTheme ? 'dark' : 'light');
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

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme deve ser usado dentro de um ThemeProvider');
  }
  return context;
}