// ============================================================================
// DOCUMENTAÇÃO: LAYOUT PROTEGIDO COM SUPORTE A TEMA CLARO/ESCURO E OTA
// ============================================================================
// Gerencia a verificação de atualizações OTA no arranque e a rota do perfil
// (aluno ou personal) com suporte completo a Light e Dark Mode via NativeWind.
// ============================================================================

import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, useColorScheme } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as Updates from 'expo-updates';
import { supabase } from '@/lib/supabase';

export default function AppGroupLayout() {
  const [userRole, setUserRole] = useState<'aluno' | 'personal' | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusText, setStatusText] = useState<string>('Carregando aplicativo...');

  const segments = useSegments();
  const router = useRouter();
  
  // 🟢 Hook para leitura do tema do dispositivo (light ou dark)
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    async function initializeAppAndFetchRole() {
      try {
        setLoading(true);

        // 🟢 ETAPA 1: VERIFICAÇÃO E DOWNLOAD DA ATUALIZAÇÃO OTA (PRODUÇÃO)
        if (!__DEV__) {
          setStatusText('Verificando atualizações...');
          try {
            const update = await Updates.checkForUpdateAsync();

            if (update.isAvailable) {
              setStatusText('Baixando nova versão...');
              await Updates.fetchUpdateAsync();

              setStatusText('Reiniciando aplicativo...');
              await Updates.reloadAsync();
              return; // Interrompe para recarregar com o pacote novo
            }
          } catch (otaError) {
            console.warn('⚠️ [OTA] Falha ao verificar atualizações (sem rede ou erro):', otaError);
          }
        }

        // 🟢 ETAPA 2: BUSCA DO PERFIL DO USUÁRIO NO SUPABASE
        setStatusText('Carregando seu perfil...');
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          setUserRole(null);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (!error && data) {
          setUserRole(data.role as 'aluno' | 'personal');
        }
      } catch (err) {
        console.error('Erro na inicialização do layout:', err);
      } finally {
        setLoading(false);
      }
    }

    initializeAppAndFetchRole();

    // Listener para o evento de logout
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setUserRole(null);
        router.replace('/(auth)/login');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Redirecionamento de rotas baseado no papel do usuário (aluno ou personal)
  useEffect(() => {
    if (loading || !userRole) return;

    const currentSubGroup = segments.length > 1 ? (segments as string[])[1] : undefined;

    if (userRole === 'personal' && currentSubGroup !== '(personal)') {
      router.replace('/(app)/(personal)');
    } else if (userRole === 'aluno' && currentSubGroup !== '(aluno)') {
      router.replace('/(app)/(aluno)');
    }
  }, [userRole, loading, segments]);

  // 🟢 TELA DE CARREGAMENTO COM SUPORTE ADAPTATIVO A TEMA CLARO E ESCURO
  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white dark:bg-[#09090b]">
        <ActivityIndicator size="large" color="#59C83A" />
        <Text className="text-zinc-600 dark:text-zinc-400 font-sans-medium text-xs mt-3">
          {statusText}
        </Text>
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(aluno)" />
      <Stack.Screen name="(personal)" />
    </Stack>
  );
}