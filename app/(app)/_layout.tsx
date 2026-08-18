import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { supabase } from '../../lib/supabase';

/**
 * Layout do Grupo Protegido (app)
 * Identifica o perfil (aluno ou personal) e direciona para a sub-rota correta.
 */
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

    const currentSubGroup = segments[1];

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