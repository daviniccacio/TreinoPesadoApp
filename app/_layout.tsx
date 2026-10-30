// ============================================================================
// DOCUMENTAÇÃO: ROOT LAYOUT COMPLETO (SISTEMA ENTERPRISE COM TIMER GLOBAL)
// ============================================================================
// Gerencia autenticação via Supabase, fontes, cache TanStack Query, tema global,
// verificação de perfil, direcionamento de rotas, push notifications,
// monitoramento de rede, resiliência contra erros e temporizador flutuante.
// ============================================================================

import { SafeAreaProvider } from 'react-native-safe-area-context';

if (SafeAreaProvider) {
  (SafeAreaProvider as any).displayName = 'SafeAreaProvider';
}

import '../global.css';

import React, { useEffect, useState } from 'react';
import { View, Alert, Text, TouchableOpacity } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import {
  Stack,
  useRouter,
  useSegments,
  ThemeProvider as NavigationThemeProvider,
  DarkTheme,
  DefaultTheme,
} from 'expo-router';

import * as SystemUI from 'expo-system-ui';

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

import * as Notifications from 'expo-notifications';
import { registerForPushNotificationsAsync } from '../lib/notifications';
import { supabase } from '../lib/supabase';

// IMPORTAÇÃO DOS PROVEDORES DE CONTEXTO E COMPONENTES
import { ThemeProvider as AppThemeProvider, useTheme } from '../context/ThemeContext';
import { TimerProvider } from '../context/TimerContext';
import { FloatingTimer } from '../components/FloatingTimer';
import { AppEntranceLoading } from '../components/AppLoaders';
import { OfflineBanner } from '../components/OfflineBanner';
import { GlobalErrorBoundary } from '../components/ErrorBoundary';
import { TermsAndPrivacyModal } from '../components/TermsAndPrivacyModal';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      refetchOnWindowFocus: false,
    },
  },
});

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

interface UserProfile {
  role: string;
  is_blocked: boolean;
  accepted_terms?: boolean;
}

function RootLayoutContent() {
  const [session, setSession] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isReady, setIsReady] = useState<boolean>(false);
  const [isProfileLoading, setIsProfileLoading] = useState<boolean>(false);
  const [networkError, setNetworkError] = useState<boolean>(false);

  // Estado do término do Splash Screen
  const [isEntranceFinished, setIsEntranceFinished] = useState<boolean>(false);

  // ESTADO PARA CONTROLAR O MODAL DE TERMOS E PRIVACIDADE (LGPD)
  const [showTermsModal, setShowTermsModal] = useState<boolean>(false);

  const [fontsLoaded, fontError] = useFonts({
    Outfit_700Bold,
    Outfit_800ExtraBold,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });

  const segments = useSegments();
  const router = useRouter();

  const { isDark } = useTheme();
  const backgroundColor = isDark ? '#09090b' : '#ffffff';

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(backgroundColor);
  }, [isDark, backgroundColor]);

  // ESCUTA ATIVA DE NOTIFICAÇÕES (RECEBIMENTO E CLIQUE)
  useEffect(() => {
    const notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log(
          '🔔 [PUSH RECEBIDO EM PRIMEIRO PLANO]:',
          notification.request.content.title,
          '-',
          notification.request.content.body
        );
      }
    );

    const responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log(
          '👆 [USUÁRIO CLICOU NA NOTIFICAÇÃO]:',
          response.notification.request.content.data
        );
      }
    );

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, []);

  // ETAPA 1: VALIDAÇÃO DA SESSÃO INICIAL COM DIAGNÓSTICO
  useEffect(() => {
    async function validateAuthOnServer() {
      try {
        const {
          data: { session: cachedSession },
        } = await supabase.auth.getSession();

        if (cachedSession) {
          console.log('--------------------------------------------------');
          console.log('🔥 [BOOT DO APP] SESSÃO LOCAL RECUPERADA!');
          console.log('👤 USUÁRIO LOGADO:', cachedSession.user.email);
          console.log('--------------------------------------------------');
          setSession(cachedSession);
        } else {
          console.log('--------------------------------------------------');
          console.log('🔒 [BOOT DO APP] NENHUMA SESSÃO LOCAL ENCONTRADA');
          console.log('--------------------------------------------------');
          setSession(null);
        }
      } catch (err) {
        console.error('⚠️ Erro ao verificar sessão inicial:', err);
      } finally {
        setIsReady(true);
      }
    }

    validateAuthOnServer();

    // Escuta alterações na autenticação (Login, Logout, Refresh, Recovery)
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('🔄 [AUTH EVENT]:', event, '| Usuário:', currentSession?.user?.email ?? 'Sem sessão');

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

  // ETAPA 2: BUSCA DO PERFIL NO SUPABASE (SISTEMA CORRIGIDO COM .maybeSingle())
  // ============================================================================
// DOCUMENTAÇÃO: TRATAMENTO DE SESSÃO FANTASMA E CONTA EXCLUÍDA EM _LAYOUT.TSX
// ============================================================================
// Detecta se a sessão local pertence a uma conta excluída do banco.
// Caso o perfil retorne nulo, encerra a sessão local e redireciona para o Login.
// ============================================================================

async function fetchUserProfile() {
  if (!session?.user?.id) {
    setUserProfile(null);
    return;
  }

  setIsProfileLoading(true);
  setNetworkError(false);

  try {
    // Busca o perfil no Supabase de forma segura
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role, is_blocked, accepted_terms')
      .eq('id', session.user.id)
      .maybeSingle();

    if (error) {
      console.error('Erro ao verificar perfil do usuário:', error.message);
      setNetworkError(true);
    } else if (profile) {
      // 🟢 CASO 1: Perfil encontrado com sucesso
      setUserProfile(profile as UserProfile);
      if (!profile.accepted_terms) {
        setShowTermsModal(true);
      } else {
        setShowTermsModal(false);
      }
    } else {
      // 🔴 CASO 2: SESSÃO FANTASMA DETECTADA (Conta excluída do Supabase)
      // Se a sessão local existe mas o perfil não foi encontrado no banco, deslogamos o app!
      console.warn('⚠️ Conta excluída detectada no banco. Encerrando sessão local...');
      await supabase.auth.signOut();
      setSession(null);
      setUserProfile(null);
      router.replace('/(auth)/login');
    }
  } catch (err) {
    console.error('Erro de conexão ao buscar perfil:', err);
    setNetworkError(true);
  } finally {
    setIsProfileLoading(false);
  }
}

  async function handleAcceptTerms() {
    if (!session?.user?.id) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ accepted_terms: true })
        .eq('id', session.user.id);

      if (error) {
        Alert.alert('Erro', 'Não foi possível registrar o aceite. Tente novamente.');
        return;
      }

      setShowTermsModal(false);
      setUserProfile((prev) => (prev ? { ...prev, accepted_terms: true } : null));
    } catch (err) {
      console.error('Erro ao salvar aceite dos termos:', err);
    }
  }

  useEffect(() => {
    if (session?.user?.id) {
      fetchUserProfile();
    }
  }, [session?.user?.id]);

  // REGISTRO DO PUSH TOKEN NO SUPABASE QUANDO LOGADO
  useEffect(() => {
    if (session?.user?.id) {
      registerForPushNotificationsAsync(session.user.id);
    }
  }, [session]);

  // ETAPA 3: PROTEÇÃO GLOBAL DE ROTAS
  useEffect(() => {
    if (!isReady || (!fontsLoaded && !fontError) || isProfileLoading) return;

    const routeSegments = segments as string[];
    const rootGroup = routeSegments[0];
    const subGroup = routeSegments[1];

    const isRecoveryRoute =
      routeSegments.includes('reset-password') ||
      routeSegments.includes('verify-otp') ||
      routeSegments.includes('forgot-password');

    if (isRecoveryRoute) {
      return;
    }

    if (!session) {
      if (rootGroup !== '(auth)') {
        router.replace('/(auth)/login');
      }
      return;
    }

    if (!userProfile) return;

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

  const isBootFinished = Boolean(
    isReady &&
    (fontsLoaded || !!fontError) &&
    (!session || !isProfileLoading || !!userProfile)
  );

  if (networkError && !userProfile) {
  return (
    <View style={{ flex: 1, backgroundColor }} className="justify-center items-center px-6">
      <Text className="text-base font-sans-bold text-red-500 mb-2 text-center">
        Falha ao Carregar Perfil
      </Text>
      <Text className="text-xs font-sans-medium text-zinc-400 mb-6 text-center">
        Não foi possível validar os dados da sua conta local com o banco de dados.
      </Text>
      
      {/* Botão de Tentar Novamente */}
      <TouchableOpacity
        onPress={fetchUserProfile}
        className="bg-[#59C83A] px-6 py-3 rounded-2xl mb-3 w-full items-center"
      >
        <Text className="text-white font-sans-bold text-sm">Tentar Novamente</Text>
      </TouchableOpacity>

      {/* 🟢 BOTÃO DE EMERGÊNCIA: Limpa a sessão fantasma local e vai para o login */}
      <TouchableOpacity
        onPress={async () => {
          await supabase.auth.signOut();
          setSession(null);
          setUserProfile(null);
          setNetworkError(false);
          router.replace('/(auth)/login');
        }}
        className="bg-red-500/10 border border-red-500/30 px-6 py-3 rounded-2xl w-full items-center"
      >
        <Text className="text-red-500 font-sans-bold text-sm">Sair e Limpar Sessão</Text>
      </TouchableOpacity>
    </View>
  );
}

  if (!isEntranceFinished) {
    return (
      <AppEntranceLoading
        isReady={isBootFinished}
        onFinishLoading={() => setIsEntranceFinished(true)}
      />
    );
  }

  return (
    <SafeAreaProvider style={{ flex: 1, backgroundColor }}>
      {/* BANNER DE INTERNET MONITORA A CONEXÃO EM TEMPO REAL */}
      <OfflineBanner />

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

      {/* WIDGET FLUTUANTE DO CRONÔMETRO EXIBIDO EM QUALQUER TELA QUANDO ATIVO */}
      <FloatingTimer />

      {/* MODAL DE CONFORMIDADE LGPD */}
      <TermsAndPrivacyModal
        visible={showTermsModal}
        isDark={isDark}
        onAccept={handleAcceptTerms}
      />
    </SafeAreaProvider>
  );
}

// ============================================================================
// EXPORTAÇÃO PRINCIPAL DO ROOT LAYOUT COM O TIMERPROVIDER INTEGRADO
// ============================================================================
export default function RootLayout() {
  return (
    <GlobalErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AppThemeProvider>
          <TimerProvider>
            <RootLayoutContent />
          </TimerProvider>
        </AppThemeProvider>
      </QueryClientProvider>
    </GlobalErrorBoundary>
  );
}