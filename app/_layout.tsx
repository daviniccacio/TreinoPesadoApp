// ============================================================================
// DOCUMENTAÇÃO: ROOT LAYOUT INTEGRADO COM TEMA PERSISTENTE E ROLE (SDK 56+)
// ============================================================================
// Gerencia a autenticação com Supabase, fontes customizadas, cache do TanStack Query,
// contexto de tema global (Light/Dark persitente), verificação de bloqueio (is_blocked),
// suporte à redefinição de senha e redirecionamento dinâmico baseado na role.
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
import { View, ActivityIndicator, Alert } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// 5. Importações do Expo Router (Com alias para evitar conflito de ThemeProvider)
import {
  Stack,
  useRouter,
  useSegments,
  ThemeProvider as NavigationThemeProvider,
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

// 🟢 8. IMPORTAÇÃO DO PROVEDOR E HOOK DE TEMA GLOBAL
import { ThemeProvider as AppThemeProvider, useTheme } from '../context/ThemeContext';

// 9. Configuração da instância global do TanStack Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      refetchOnWindowFocus: false,
    },
  },
});

// 10. DEFINIÇÃO DOS TEMAS RE-EXPORTADOS PELO EXPO ROUTER
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

/**
 * Componente interno que consome o contexto de tema global e gerencia a navegação
 */
function RootLayoutContent() {
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

  // 🟢 LÊ O ESTADO DE TEMA DO NOSSO CONTEXTO GLOBAL PERSISTENTE
  const { isDark } = useTheme();
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
          queryClient.clear();
          setSession(null);
        } else {
          const {
            data: { session: validSession },
          } = await supabase.auth.getSession();
          setSession(validSession);
        }
      } catch (err) {
        console.error('Erro ao validar autenticação:', err);
        queryClient.clear();
        setSession(null);
      } finally {
        setIsReady(true);
      }
    }

    validateAuthOnServer();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        queryClient.clear();

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
    <SafeAreaProvider style={{ flex: 1, backgroundColor }}>
      <NavigationThemeProvider value={isDark ? CustomDarkTheme : CustomLightTheme}>
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
      </NavigationThemeProvider>
    </SafeAreaProvider>
  );
}

// 🟢 COMPONENTE RAIZ QUE ENVELOPA OS PROVEDORES GLOBAIS
export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppThemeProvider>
        <RootLayoutContent />
      </AppThemeProvider>
    </QueryClientProvider>
  );
}