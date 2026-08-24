// 1. Importamos o SafeAreaProvider
import { SafeAreaProvider } from 'react-native-safe-area-context';

// 2. Correção de displayName para NativeWind
if (SafeAreaProvider) {
  (SafeAreaProvider as any).displayName = 'SafeAreaProvider';
}

// 3. CSS Global
import '../global.css';

// 4. Importações do React, Expo Router, Supabase e TanStack Query
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

// 5. Configuração e criação da instância do TanStack Query
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

  useEffect(() => {
    // 1. Função que valida no servidor do Supabase se o usuário realmente existe no banco
    async function validateAuthOnServer() {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error || !user) {
          // Se o usuário foi apagado do banco, força o logout para limpar o cache local
          await supabase.auth.signOut();
          setSession(null);
        } else {
          // Usuário existe no banco, obtém a sessão válida
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

    // 2. Escuta alterações de login e logout em tempo real
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

  // 3. Controle e Proteção Global de Rotas
  useEffect(() => {
    if (!isReady) return;

    const inAppGroup = segments[0] === '(app)';
    const inAuthGroup = segments[0] === '(auth)';

    if (session) {
      // Usuário logado: se não estiver dentro de (app), redireciona para a área interna
      if (!inAppGroup) {
        router.replace('/(app)');
      }
    } else {
      // Usuário deslogado ou conta apagada: se não estiver na tela de login/cadastro, manda para o login
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
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(app)" />
        </Stack>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}