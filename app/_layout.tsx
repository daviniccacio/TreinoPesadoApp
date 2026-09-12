// ============================================================================
// DOCUMENTAÇÃO: ROOT LAYOUT COM ROTEAMENTO POR ROLE E SEGURANÇA (SDK 56+)
// ============================================================================
// Gerencia a autenticação com Supabase, fontes customizadas, cache do TanStack Query,
// verificação de bloqueio (is_blocked), suporte à redefinição de senha e
// redirecionamento dinâmico baseado na role (admin, personal, aluno).
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
import { View, ActivityIndicator, useColorScheme, Alert } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// 5. Importações do Expo Router
import {
  Stack,
  useRouter,
  useSegments,
  ThemeProvider,
  DarkTheme,
  DefaultTheme,
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

import { registerForPushNotificationsAsync } from '../lib/notifications';
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

// 9. DEFINIÇÃO DOS TEMAS RE-EXPORTADOS PELO EXPO ROUTER
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

  // Validação inicial da sessão no Supabase
  useEffect(() => {
    async function validateAuthOnServer() {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error || !user) {
          await supabase.auth.signOut();
          setSession(null);
        } else {
          const {
            data: { session: validSession },
          } = await supabase.auth.getSession();
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
        // 🟢 CAPTURA O EVENTO DE RECUPERAÇÃO DE SENHA E REDIRECIONA PARA A TELA DE RESET
        if (event === 'PASSWORD_RECOVERY') {
          setSession(currentSession);
          setIsReady(true);
          router.replace('/(auth)/reset-password' as any);
          return;
        }

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

  // Registro de Push Notifications para o usuário logado
  useEffect(() => {
    if (session?.user?.id) {
      registerForPushNotificationsAsync(session.user.id);
    }
  }, [session]);

  // PROTEÇÃO GLOBAL DE ROTAS E DIRECIONAMENTO POR ROLE
  useEffect(() => {
    if (!isReady || (!fontsLoaded && !fontError)) return;

    async function handleNavigation() {
      const routeSegments = segments as string[];
      const rootGroup = routeSegments[0]; // '(app)' ou '(auth)'
      const subGroup = routeSegments[1];  // '(admin)', '(personal)', '(aluno)'

      // 🟢 CORREÇÃO CRÍTICA: Se a rota atual for 'reset-password', não executa os redirecionamentos automáticos
      if (routeSegments.includes('reset-password')) {
        return;
      }

      // 1. CASO NÃO HAJA SESSÃO ATIVA
      if (!session) {
        if (rootGroup !== '(auth)') {
          router.replace('/(auth)/login');
        }
        return;
      }

      // 2. CONSULTA PERFIL, ROLE E STATUS DE BLOQUEIO NO SUPABASE
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role, is_blocked')
          .eq('id', session.user.id)
          .single();

        if (error || !profile) {
          console.error('Erro ao verificar perfil do usuário:', error?.message);
          return;
        }

        // 3. SE O USUÁRIO ESTIVER BLOQUEADO
        if (profile.is_blocked) {
          await supabase.auth.signOut();
          setSession(null);
          Alert.alert(
            'Acesso Suspenso',
            'Sua conta foi bloqueada pelo administrador do sistema.'
          );
          router.replace('/(auth)/login');
          return;
        }

        // 4. DIRECIONAMENTO COM BASE NA ROLE
        if (profile.role === 'admin') {
          if (rootGroup !== '(app)' || subGroup !== '(admin)') {
            router.replace('/(app)/(admin)' as any);
          }
        } else if (profile.role === 'personal') {
          if (rootGroup !== '(app)' || subGroup !== '(personal)') {
            router.replace('/(app)/(personal)' as any);
          }
        } else {
          // Padrão: Aluno
          if (rootGroup !== '(app)' || subGroup !== '(aluno)') {
            router.replace('/(app)/(aluno)' as any);
          }
        }
      } catch (err) {
        console.error('Erro ao processar redirecionamento por perfil:', err);
      }
    }

    handleNavigation();
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