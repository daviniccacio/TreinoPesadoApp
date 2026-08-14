import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { cssInterop } from 'nativewind';
import { supabase } from '../../lib/supabase';

// Estilos globais do NativeWind
import '../../global.css';

// ============================================================================
// CORREÇÃO DE COMPATIBILIDADE: NativeWind (css-interop) + SafeAreaContext
// Regista explicitamente os componentes de área segura para evitar que o
// NativeWind falhe ao tentar ler a propriedade 'displayName' de undefined.
// ============================================================================
if (SafeAreaProvider) {
  (SafeAreaProvider as any).displayName = 'SafeAreaProvider';
  cssInterop(SafeAreaProvider, { className: 'style' });
}

if (SafeAreaView) {
  (SafeAreaView as any).displayName = 'SafeAreaView';
  cssInterop(SafeAreaView, { className: 'style' });
}

/**
 * Layout Raiz do Aplicativo
 */
export default function RootLayout() {
  const [session, setSession] = useState<any>(null);
  const [isReady, setIsReady] = useState<boolean>(false);

  const segments = useSegments();
  const router = useRouter();

  // 1. Monitora a sessão do usuário no Supabase
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsReady(true);
    });

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

  // 2. Controla os redirecionamentos de rota baseados na autenticação
  useEffect(() => {
    if (!isReady) return;

    const inAuthGroup = segments[0] === '(app)';

    if (session && !inAuthGroup) {
      router.replace('/(app)');
    } else if (!session && inAuthGroup) {
      router.replace('/(auth)/login');
    }
  }, [session, isReady, segments]);

  // 3. Renderiza a aplicação protegida pelo SafeAreaProvider
  return (
    <SafeAreaProvider>
      {!isReady ? (
        <View className="flex-1 justify-center items-center bg-white dark:bg-zinc-950">
          <ActivityIndicator size="large" color="#59C83A" />
        </View>
      ) : (
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(app)" />
          <Stack.Screen name="(auth)" />
        </Stack>
      )}
    </SafeAreaProvider>
  );
}