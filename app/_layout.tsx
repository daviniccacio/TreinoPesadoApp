// ============================================================================
// DOCUMENTAÇÃO: ROOT LAYOUT (COMPATÍVEL COM EXPO SDK 56+)
// ============================================================================
// Gerencia a autenticação com Supabase, fontes customizadas, cache do TanStack Query
// e aplica o ThemeProvider oficial re-exportado pelo Expo Router para evitar
// o erro de incompatibilidade com @react-navigation/native.
// ============================================================================

// 1. Importação do SafeAreaProvider para gestão de áreas seguras
import { SafeAreaProvider } from 'react-native-safe-area-context';

// 2. Correção de displayName para compatibilidade com NativeWind
if (SafeAreaProvider) {
  (SafeAreaProvider as any).displayName = 'SafeAreaProvider';
}

// 3. Estilos globais do Tailwind / NativeWind
import '../global.css';

// 4. Importações do React e React Native
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, useColorScheme } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// 🟢 5. IMPORTAÇÃO UNIFICADA DO EXPO ROUTER (SDK 56+)
// No SDK 56+, ThemeProvider, DarkTheme e DefaultTheme devem vir diretamente de 'expo-router'
import { 
  Stack, 
  useRouter, 
  useSegments, 
  ThemeProvider, 
  DarkTheme, 
  DefaultTheme 
} from 'expo-router';

// 6. Assistente SystemUI para alterar a cor da janela nativa do OS
import * as SystemUI from 'expo-system-ui';

// 7. Importação das fontes Google Fonts (Outfit e DM Sans)
import {
  useFonts,
  Outfit_700Bold,
  Outfit_800ExtraBold,
} from '@expo-google-fonts/outfit';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';

import { supabase } from '../lib/supabase';

// 8. Configuração da instância global do TanStack Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      refetchOnWindowFocus: false,
    },
  },
});

// 🟢 9. DEFINIÇÃO DOS TEMAS RE-EXPORTADOS PELO EXPO ROUTER
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

export default function RootLayout() {
  const [session, setSession] = useState<any>(null);
  const [isReady, setIsReady] = useState<boolean>(false);

  const [fontsLoaded, fontError] = useFonts({
    Outfit_700Bold,
    Outfit_800ExtraBold,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });

  const segments = useSegments();
  const router = useRouter();

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const backgroundColor = isDark ? '#09090b' : '#ffffff';

  // Atualização da cor da janela nativa do sistema operacional
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(backgroundColor);
  }, [isDark, backgroundColor]);

  // Validação de sessão no Supabase
  useEffect(() => {
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

  // Proteção Global de Rotas
  useEffect(() => {
    if (!isReady || (!fontsLoaded && !fontError)) return;

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
  }, [session, isReady, fontsLoaded, fontError, segments]);

  if (!isReady || (!fontsLoaded && !fontError)) {
    return (
      <View style={{ flex: 1, backgroundColor }} className="justify-center items-center">
        <ActivityIndicator size="large" color="#59C83A" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor }}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider style={{ flex: 1, backgroundColor }}>
          {/* ThemeProvider importado diretamente de 'expo-router' */}
          <ThemeProvider value={isDark ? CustomDarkTheme : CustomLightTheme}>
            <Stack
              screenOptions={{
                headerShown: false,
                animation: 'fade',
                contentStyle: {
                  backgroundColor,
                },
              }}
            >
              <Stack.Screen name="index" options={{ style: { backgroundColor } } as any} />
              <Stack.Screen name="(auth)" options={{ style: { backgroundColor } } as any} />
              <Stack.Screen name="(app)" options={{ style: { backgroundColor } } as any} />
            </Stack>
          </ThemeProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
    </View>
  );
}