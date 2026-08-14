import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

// Estilos globais do NativeWind
import '../global.css';

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

  // 2. Controla os redirecionamentos de rota
  useEffect(() => {
    if (!isReady) return;

    const inAuthGroup = segments[0] === '(app)';

    if (session && !inAuthGroup) {
      router.replace('/(app)');
    } else if (!session && inAuthGroup) {
      router.replace('/(auth)/login');
    }
  }, [session, isReady, segments]);

  // 3. Renderiza a aplicação dentro do SafeAreaProvider
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