// ============================================================================
// DOCUMENTAÇÃO: ROOT LAYOUT ENTERPRISE (PROTEÇÃO DE ROTAS SEM LOOPS)
// ============================================================================
// Gerencia a autenticação local, tema global, cache TanStack Query,
// notificações push, temporizador e redirecionamento seguro por papéis.
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
import { api } from '../services/api';

// IMPORTAÇÃO DOS PROVEDORES DE CONTEXTO E COMPONENTES ENTERPRISE
import { ThemeProvider as AppThemeProvider, useTheme } from '../context/ThemeContext';
import { TimerProvider } from '../context/TimerContext';
import { FloatingTimer } from '../components/FloatingTimer';
import { AppEntranceLoading } from '../components/AppLoaders';
import { OfflineBanner } from '../components/OfflineBanner';
import { GlobalErrorBoundary } from '../components/ErrorBoundary';
import { TermsAndPrivacyModal } from '../components/TermsAndPrivacyModal';
import { AuthProvider, useAuth } from '../context/AuthContext';

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
  const { user, isLoadingAuth, signOut } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState<boolean>(false);
  const [networkError, setNetworkError] = useState<boolean>(false);

  // Controle de término da tela de apresentação (Entrance Loading)
  const [isEntranceFinished, setIsEntranceFinished] = useState<boolean>(false);

  // Modal LGPD (Termos de Uso)
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

  // ESCUTA DE NOTIFICAÇÕES PUSH
  useEffect(() => {
    const notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('🔔 [PUSH RECEBIDO]:', notification.request.content.title);
      }
    );

    const responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('👆 [PUSH CLICADO]:', response.notification.request.content.data);
      }
    );

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, []);

  // 🟢 BUSCA DO PERFIL NA API DA VPS
  async function fetchUserProfile() {
    if (!user?.id) {
      setUserProfile(null);
      return;
    }

    setIsProfileLoading(true);
    setNetworkError(false);

    try {
      const response = await api.get<UserProfile>(`/api/profiles/me?userId=${user.id}`);
      const profile = response.data;

      if (profile) {
        setUserProfile(profile);
        setShowTermsModal(!profile.accepted_terms);
      }
    } catch (err: any) {
      console.error('⚠️ [VPS] Erro ao buscar perfil na VPS:', err.message);
      setNetworkError(true);
    } finally {
      setIsProfileLoading(false);
    }
  }

  // REGISTRO DE ACEITE DOS TERMOS LGPD
  async function handleAcceptTerms() {
    if (!user?.id) return;

    try {
      await api.put('/api/profiles/accept-terms', { userId: user.id });
      setShowTermsModal(false);
      setUserProfile((prev) => (prev ? { ...prev, accepted_terms: true } : null));
    } catch (err: any) {
      Alert.alert('Erro', 'Não foi possível registrar o aceite. Tente novamente.');
    }
  }

  // BUSCA PERFIL QUANDO O USUÁRIO MUDA
  useEffect(() => {
    if (user?.id) {
      fetchUserProfile();
    } else {
      setUserProfile(null);
      setIsProfileLoading(false);
    }
  }, [user?.id]);

  // REGISTRA PUSH TOKEN NO BACKEND
  useEffect(() => {
    if (user?.id) {
      registerForPushNotificationsAsync(user.id);
    }
  }, [user?.id]);

  // 🟢 PROTEÇÃO GLOBAL DE ROTAS (PROTEGIDA CONTRA LOOPS INFINITOS)
  useEffect(() => {
    if (isLoadingAuth || (!fontsLoaded && !fontError) || isProfileLoading) return;

    const routeSegments = segments as string[];
    const fullPath = routeSegments.join('/');
    const rootGroup = routeSegments[0];

    // Ignora redirecionamento se o usuário estiver em rotas de recuperação de senha
    const isRecoveryRoute =
      fullPath.includes('reset-password') ||
      fullPath.includes('verify-otp') ||
      fullPath.includes('forgot-password');

    if (isRecoveryRoute) return;

    // 1. Se NÃO houver usuário logado
    if (!user) {
      if (rootGroup !== '(auth)') {
        router.replace('/(auth)/login');
      }
      return;
    }

    // 2. Se o perfil ainda não tiver sido carregado da VPS
    if (!userProfile) return;

    // 3. Se o usuário estiver bloqueado pelo administrador
    if (userProfile.is_blocked) {
      signOut();
      setUserProfile(null);
      Alert.alert('Acesso Suspenso', 'Sua conta foi bloqueada pelo administrador.');
      router.replace('/(auth)/login');
      return;
    }

    // 4. Redirecionamento seguro baseado no papel (Role) sem disparos repetidos
    const userRole = userProfile.role || 'aluno';

    if (userRole === 'admin' && !fullPath.includes('(admin)')) {
      router.replace('/(app)/(admin)' as any);
    } else if (userRole === 'personal' && !fullPath.includes('(personal)')) {
      router.replace('/(app)/(personal)' as any);
    } else if (userRole === 'aluno' && !fullPath.includes('(aluno)')) {
      router.replace('/(app)/(aluno)' as any);
    }
  }, [user, userProfile, isLoadingAuth, isProfileLoading, fontsLoaded, fontError, segments]);

  const isBootFinished = Boolean(
    !isLoadingAuth &&
    (fontsLoaded || !!fontError) &&
    (!user || !isProfileLoading || !!userProfile)
  );

  if (networkError && !userProfile) {
    return (
      <View style={{ flex: 1, backgroundColor }} className="justify-center items-center px-6">
        <Text className="text-base font-sans-bold text-red-500 mb-2 text-center">
          Falha de Conexão com o Servidor
        </Text>
        <Text className="text-xs font-sans-medium text-zinc-400 mb-6 text-center">
          Não foi possível verificar suas permissões na VPS.
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
      <OfflineBanner />

      <NavigationThemeProvider value={isDark ? CustomDarkTheme : CustomLightTheme}>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'fade',
            contentStyle: { backgroundColor },
          }}
        >
          <Stack.Screen name="index" options={{ style: { backgroundColor } } as any} />
          <Stack.Screen name="(auth)" options={{ style: { backgroundColor } } as any} />
          <Stack.Screen name="(app)" options={{ style: { backgroundColor } } as any} />
        </Stack>
      </NavigationThemeProvider>

      <FloatingTimer />

      <TermsAndPrivacyModal
        visible={showTermsModal}
        isDark={isDark}
        onAccept={handleAcceptTerms}
      />
    </SafeAreaProvider>
  );
}

// ============================================================================
// EXPORTAÇÃO PRINCIPAL DO ROOT LAYOUT COM AUTHPROVIDER INTEGRADO
// ============================================================================
export default function RootLayout() {
  return (
    <GlobalErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AppThemeProvider>
          <AuthProvider>
            <TimerProvider>
              <RootLayoutContent />
            </TimerProvider>
          </AuthProvider>
        </AppThemeProvider>
      </QueryClientProvider>
    </GlobalErrorBoundary>
  );
}