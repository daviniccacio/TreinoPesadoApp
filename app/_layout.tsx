import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { supabase } from '../lib/supabase';

// Estilos globais do NativeWind
import '../global.css';

export default function RootLayout() {
  const [session, setSession] = useState<any>(null);
  const [isReady, setIsReady] = useState<boolean>(false);

  const segments = useSegments();
  const router = useRouter();

  // 1. Monitora o estado de autenticação do usuário no Supabase
  useEffect(() => {
    // Busca a sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsReady(true);
    });

    // Escuta eventos de login e logout em tempo real
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

  // 2. Executa o redirecionamento seguro quando a sessão altera
  useEffect(() => {
    if (!isReady) return;

    // Verifica se a rota atual está dentro do grupo autenticado (app)
    const inAuthGroup = segments[0] === '(app)';

    if (session && !inAuthGroup) {
      // Se o usuário está logado -> navega para as abas do app
      router.replace('/(app)');
    } else if (!session && inAuthGroup) {
      // Se o usuário deslogou -> navega para a rota exata de login
      router.replace('/(auth)/login');
    }
  }, [session, isReady, segments]);

  // Exibe indicador de carregamento enquanto valida a sessão
  if (!isReady) {
    return (
      <View className="flex-1 justify-center items-center bg-white dark:bg-zinc-950">
        <ActivityIndicator size="large" color="#0058bc" />
      </View>
    );
  }

  // Define as pilhas principais do aplicativo
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(app)" />
      <Stack.Screen name="(auth)" />
    </Stack>
  );
}