// 1. PRIMEIRO: Importamos o SafeAreaProvider
import { SafeAreaProvider } from 'react-native-safe-area-context';

// 2. SEGUNDO: Correção de displayName para NativeWind
if (SafeAreaProvider) {
  (SafeAreaProvider as any).displayName = 'SafeAreaProvider';
}

// 3. TERCEIRO: CSS Global
import '../global.css';

// 4. QUARTO: Importações do React, Expo Router e Supabase
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { supabase } from '../lib/supabase';

/**
 * Layout Raiz do Aplicativo
 * Gerencia o estado de sessão (logado / deslogado) e redireciona entre (auth) e (app)
 */
export default function RootLayout() {
  const [session, setSession] = useState<any>(null);
  const [isReady, setIsReady] = useState<boolean>(false);

  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // 1. Obtém a sessão atual salva no dispositivo
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsReady(true);
    });

    // 2. Escuta alterações de login e logout em tempo real
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setIsReady(true);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // 3. Controla a proteção global de rotas
  useEffect(() => {
    if (!isReady) return;

    const inAppGroup = segments[0] === '(app)';

    if (session && !inAppGroup) {
      // Usuário logado tentando acessar telas externas -> envia para o app
      router.replace('/(app)');
    } else if (!session && inAppGroup) {
      // Usuário deslogado dentro do app -> envia para a tela de login
      router.replace('/(auth)/login');
    }
  }, [session, isReady, segments]);

  if (!isReady) {
    return (
      <View className="flex-1 justify-center items-center bg-white dark:bg-zinc-950">
        <ActivityIndicator size="large" color="#59C83A" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      {/* Mapeamento explícito de todas as pastas no nível raiz de app/ */}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
      </Stack>
    </SafeAreaProvider>
  );
}