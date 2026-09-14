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
import { View, ActivityIndicator, Alert, Text, TouchableOpacity } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// 5. Importações do Expo Router
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

// Interface para o perfil do usuário em memória
interface UserProfile {
  role: string;
  is_blocked: boolean;
}

/**
 * Componente interno que consome o contexto de tema global e gerencia a navegação
 */
function RootLayoutContent() {
  const [session, setSession] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isReady, setIsReady] = useState<boolean>(false);
  const [isProfileLoading, setIsProfileLoading] = useState<boolean>(false);
  const [networkError, setNetworkError] = useState<boolean>(false);

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

  // 🟢 ETAPA 1: VALIDAÇÃO DA SESSÃO INICIAL
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
          setUserProfile(null);
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

  // 🟢 ETAPA 2: BUSCA DO PERFIL NO SUPABASE (APENAS QUANDO A SESSÃO MUDAR)
  async function fetchUserProfile() {
    if (!session?.user?.id) {
      setUserProfile(null);
      return;
    }

    setIsProfileLoading(true);
    setNetworkError(false);

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role, is_blocked')
        .eq('id', session.user.id)
        .single();

      if (error) {
        console.error('Erro ao verificar perfil do usuário:', error.message);
        setNetworkError(true);
      } else if (profile) {
        setUserProfile(profile as UserProfile);
      }
    } catch (err) {
      console.error('Erro de conexão ao buscar perfil:', err);
      setNetworkError(true);
    } finally {
      setIsProfileLoading(false);
    }
  }

  useEffect(() => {
    if (session?.user?.id) {
      fetchUserProfile();
    }
  }, [session?.user?.id]);

  // Registro de Push Notifications para o usuário logado
  useEffect(() => {
    if (session?.user?.id) {
      registerForPushNotificationsAsync(session.user.id);
    }
  }, [session]);

  // 🟢 ETAPA 3: PROTEÇÃO GLOBAL DE ROTAS E DIRECIONAMENTO INSTANTÂNEO
  useEffect(() => {
    if (!isReady || (!fontsLoaded && !fontError) || isProfileLoading) return;

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

    // Se o perfil ainda não foi carregado devido a erro de rede, aguarda
    if (!userProfile) return;

    // 2. SE O USUÁRIO ESTIVER BLOQUEADO
    if (userProfile.is_blocked) {
      supabase.auth.signOut();
      setSession(null);
      setUserProfile(null);
      Alert.alert(
        'Acesso Suspenso',
        'Sua conta foi bloqueada pelo administrador do sistema.'
      );
      router.replace('/(auth)/login');
      return;
    }

    // 3. DIRECIONAMENTO COM BASE NA ROLE SALVA EM MEMÓRIA (SEM CONSULTA REPETIDA)
    if (userProfile.role === 'admin') {
      if (rootGroup !== '(app)' || subGroup !== '(admin)') {
        router.replace('/(app)/(admin)' as any);
      }
    } else if (userProfile.role === 'personal') {
      if (rootGroup !== '(app)' || subGroup !== '(personal)') {
        router.replace('/(app)/(personal)' as any);
      }
    } else {
      if (rootGroup !== '(app)' || subGroup !== '(aluno)') {
        router.replace('/(app)/(aluno)' as any);
      }
    }
  }, [session, userProfile, isReady, isProfileLoading, fontsLoaded, fontError, segments]);

  // TELA DE ERRO DE CONEXÃO (RETRY AMIGÁVEL EM CASO DE GATEWAY TIMEOUT)
  if (networkError && !userProfile) {
    return (
      <View style={{ flex: 1, backgroundColor }} className="justify-center items-center px-6">
        <Text className="text-base font-sans-bold text-red-500 mb-2 text-center">
          Falha de Conexão com o Servidor
        </Text>
        <Text className="text-xs font-sans-medium text-zinc-400 mb-6 text-center">
          Não foi possível verificar suas permissões devido a um tempo limite de rede (Gateway Timeout).
        </Text>
        <TouchableOpacity
          onPress={fetchUserProfile}
          className="bg-[#59C83A] px-6 py-3 rounded-2xl"
        >
          <Text className="text-white font-sans-bold text-sm">Tentar Novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // CARREGAMENTO INICIAL DO APLICATIVO
  if (!isReady || (!fontsLoaded && !fontError) || (session && isProfileLoading && !userProfile)) {
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