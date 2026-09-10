// ============================================================================
// DOCUMENTAÇÃO: LAYOUT DO GRUPO PROTEGIDO (EXPO ROUTER)
// ============================================================================
// Identifica se o usuário logado é 'aluno' ou 'personal' e redireciona
// automaticamente para o sub-grupo correspondente com tipagem segura.
// ============================================================================

import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function AppGroupLayout() {
  const [userRole, setUserRole] = useState<'aluno' | 'personal' | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    async function fetchUserRole() {
      try {
        setLoading(true);

        const { data: { user } } = await supabase.auth.getUser();

        // Proteção: Se não houver usuário logado, cancela a busca
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
        console.error('Erro ao buscar perfil no layout:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchUserRole();

    // Escuta evento de logout para limpar o perfil do estado
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

  useEffect(() => {
    if (loading || !userRole) return;

    // 🟢 CORREÇÃO DA TUPLA COM TYPE CASTING (as string[]):
    // Converte o segmento estrito do Expo Router num array comum para permitir a leitura segura do índice 1
    const currentSubGroup = segments.length > 1 ? (segments as string[])[1] : undefined;

    if (userRole === 'personal' && currentSubGroup !== '(personal)') {
      router.replace('/(app)/(personal)');
    } else if (userRole === 'aluno' && currentSubGroup !== '(aluno)') {
      router.replace('/(app)/(aluno)');
    }
  }, [userRole, loading, segments]);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white dark:bg-zinc-950">
        <ActivityIndicator size="large" color="#59C83A" />
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