// 1. Importamos o SafeAreaProvider
import { SafeAreaProvider } from 'react-native-safe-area-context';

// 2. Correção de displayName para NativeWind
if (SafeAreaProvider) {
  (SafeAreaProvider as any).displayName = 'SafeAreaProvider';
}

// 3. CSS Global
import '../global.css';

// 4. Importações do React, React Native, Expo Router, Supabase, TanStack Query
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, useColorScheme } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// 5. Importação das fontes Outfit e DM Sans
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

import { supabase } from '../lib/supabase';

// 6. Configuração da instância do TanStack Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      refetchOnWindowFocus: false,
    },
  },
});

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

  useEffect(() => {
    async function validateAuthOnServer() {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error || !user) {
          await supabase.auth.signOut();
          setSession(null);
        } else {
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

  useEffect(() => {
    if (!isReady || (!fontsLoaded && !fontError)) return;

    const inAppGroup = segments[0] === '(app)';
    const inAuthGroup = segments[0] === '(auth)';

    if (session) {
      if (!inAppGroup) {
        router.replace('/(app)');
      }
    } else {
      if (!inAuthGroup) {
        router.replace('/(auth)/login');
      }
    }
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
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'fade', // Transição suave para evitar piscadas visuais
              contentStyle: {
                backgroundColor,
              },
            }}
          >
            <Stack.Screen name="index" options={{ style: { backgroundColor } } as any} />
            <Stack.Screen name="(auth)" options={{ style: { backgroundColor } } as any} />
            <Stack.Screen name="(app)" options={{ style: { backgroundColor } } as any} />
          </Stack>
        </SafeAreaProvider>
      </QueryClientProvider>
    </View>
  );
}