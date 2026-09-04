// 1. Importamos o SafeAreaProvider
import { SafeAreaProvider } from 'react-native-safe-area-context';

// 2. Correção de displayName para NativeWind
if (SafeAreaProvider) {
  (SafeAreaProvider as any).displayName = 'SafeAreaProvider';
}

// 3. CSS Global
import '../global.css';

// 4. Importações do React, React Native, Expo Router, Supabase e TanStack Query
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, useColorScheme } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from '@react-navigation/native';
import { supabase } from '../lib/supabase';

// 5. Tema escuro customizado para coincidir com a cor dark:bg-zinc-950 (#09090b)
const CustomDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#09090b',
    card: '#09090b',
  },
};

const CustomLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#ffffff',
    card: '#ffffff',
  },
};

// 6. Configuração da instância do TanStack Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutos sem refetch desnecessário
      gcTime: 1000 * 60 * 30,    // 30 minutos em cache
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * Layout Raiz do Aplicativo
 * Valida a existência do usuário no servidor e gerencia a proteção global de rotas.
 */
export default function RootLayout() {
  const [session, setSession] = useState<any>(null);
  const [isReady, setIsReady] = useState<boolean>(false);

  const segments = useSegments();
  const router = useRouter();

  // Detecta o tema atual do dispositivo (light ou dark)
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    // Valida no servidor do Supabase se o usuário realmente existe no banco
    async function validateAuthOnServer() {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error || !user) {
          await supabase.auth.signOut();
          setSession(null);
        } else {
          const { data: { session: validSession } } = await supabase.auth.getSession();
          setSession(validSession);
        }
      } catch (err) {
        console.error('Erro ao validar autenticação:', err);
        setSession(null);
      } finally {
        setIsReady(true);
      }
    }

    validateAuthOnServer();

    // Escuta alterações de login e logout em tempo real
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (event === 'SIGNED_OUT' || !currentSession) {
          setSession(null);
        } else {
          setSession(currentSession);
        }
        setIsReady(true);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Controle e Proteção Global de Rotas
  useEffect(() => {
    if (!isReady) return;

    const inAppGroup = segments[0] === '(app)';
    const inAuthGroup = segments[0] === '(auth)';

    if (session) {
      if (!inAppGroup) {
        router.replace('/(app)');
      }
    } else {
      if (!inAuthGroup) {
        router.replace('/(auth)/login');
      }
    }
  }, [session, isReady, segments]);

  // Tela de carregamento exibida enquanto consulta a autenticação no banco
  if (!isReady) {
    return (
      <View className="flex-1 justify-center items-center bg-white dark:bg-zinc-950">
        <ActivityIndicator size="large" color="#59C83A" />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={isDark ? CustomDarkTheme : CustomLightTheme}>
        <SafeAreaProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              // Fixa a cor do container nativo da Stack para evitar a piscada branca durante o fade
              contentStyle: {
                backgroundColor: isDark ? '#09090b' : '#ffffff',
              },
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(app)" />
          </Stack>
        </SafeAreaProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}