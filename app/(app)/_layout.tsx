// ============================================================================
// DOCUMENTAÇÃO: LAYOUT DO GRUPO PROTEGIDO (INTEGRADO À API DA VPS)
// ============================================================================
// Identifica se o usuário logado na VPS é 'aluno', 'personal' ou 'admin' e 
// redireciona automaticamente para o sub-grupo correspondente sem loops.
// ============================================================================

import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';

// IMPORTAÇÃO DA API DA VPS E DO CONTEXTO DE AUTENTICAÇÃO
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

interface UserProfileResponse {
  role: 'aluno' | 'personal' | 'admin';
  is_blocked: boolean;
}

export default function AppGroupLayout() {
  const { user, isLoadingAuth } = useAuth();
  const { isDark } = useTheme();

  const [userRole, setUserRole] = useState<'aluno' | 'personal' | 'admin' | null>(null);
  const [loadingRole, setLoadingRole] = useState<boolean>(true);

  const segments = useSegments();
  const router = useRouter();

  const backgroundColor = isDark ? '#09090b' : '#ffffff';

  // Busca o papel do usuário diretamente na API da VPS
  useEffect(() => {
    async function fetchUserRoleFromVPS() {
      if (isLoadingAuth) return;

      if (!user || !user.id) {
        setUserRole(null);
        setLoadingRole(false);
        router.replace('/(auth)/login');
        return;
      }

      try {
        setLoadingRole(true);
        const response = await api.get<UserProfileResponse>(`/api/profiles/me?userId=${user.id}`);
        const profile = response.data;

        if (profile && profile.role) {
          setUserRole(profile.role);
        } else {
          setUserRole('aluno'); // Fallback seguro
        }
      } catch (err: any) {
        console.error('❌ [AppLayout] Erro ao buscar perfil na VPS:', err.message);
        // Fallback para o role salvo no token/sessão caso a VPS demore
        setUserRole((user.role as any) || 'aluno');
      } finally {
        setLoadingRole(false);
      }
    }

    fetchUserRoleFromVPS();
  }, [user, isLoadingAuth]);

  // Gerenciamento de rotas e redirecionamento sem loop
  useEffect(() => {
    if (loadingRole || !userRole) return;

    const routeSegments = segments as string[];
    const fullPath = routeSegments.join('/');

    // Evita redirecionamentos desnecessários se já estiver na pasta correta
    if (userRole === 'personal' && !fullPath.includes('(personal)')) {
      router.replace('/(app)/(personal)');
    } else if (userRole === 'admin' && !fullPath.includes('(admin)')) {
      router.replace('/(app)/(admin)');
    } else if (userRole === 'aluno' && !fullPath.includes('(aluno)')) {
      router.replace('/(app)/(aluno)');
    }
  }, [userRole, loadingRole, segments]);

  if (isLoadingAuth || loadingRole) {
    return (
      <View style={{ flex: 1, backgroundColor }} className="justify-center items-center">
        <ActivityIndicator size="large" color="#59C83A" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor } }}>
      <Stack.Screen name="(aluno)" />
      <Stack.Screen name="(personal)" />
      <Stack.Screen name="(admin)" />
    </Stack>
  );
}