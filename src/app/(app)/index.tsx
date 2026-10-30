// ============================================================================
// DOCUMENTAÇÃO: PONTO DE ENTRADA DO GRUPO (APP) COM SKELETON LOADING
// ============================================================================
// Lê a 'role' do usuário no Supabase e redireciona para a área correspondente.
// Exibe um Skeleton de transição enquanto consulta o perfil no banco de dados.
// ============================================================================

import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Redirect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Skeleton } from '@/components/SkeletonLoading'; // 🟢 Importação do Skeleton reutilizável

export default function AppGroupIndex() {
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<'aluno' | 'personal' | null>(null);

  useEffect(() => {
    async function checkUserRole() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          // Busca o papel (role) do usuário no perfil do Supabase
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

          const role = profile?.role?.toLowerCase();

          if (role === 'personal') {
            setUserRole('personal');
          } else {
            setUserRole('aluno');
          }
        } else {
          setUserRole('aluno');
        }
      } catch (error) {
        console.error('Erro ao verificar role do usuário:', error);
        setUserRole('aluno'); // Fallback de segurança em caso de falha
      } finally {
        setLoading(false);
      }
    }

    checkUserRole();
  }, []);

  // 🟢 EXIBE SKELETON ANIMADO ENQUANTO VERIFICA A AUTENTICAÇÃO NO SUPABASE
  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white dark:bg-zinc-950 px-8">
        <View className="w-full items-center gap-4">
          {/* Skeleton simulando o logotipo ou avatar da marca */}
          <Skeleton width={80} height={80} borderRadius={24} className="mb-2" />

          {/* Skeleton simulando o título principal */}
          <Skeleton width="60%" height={24} borderRadius={8} />

          {/* Skeleton simulando um subtítulo/mensagem de carregamento */}
          <Skeleton width="40%" height={16} borderRadius={6} />
        </View>
      </View>
    );
  }

  // Redireciona para a rota apropriada assim que o perfil for carregado
  if (userRole === 'personal') {
    return <Redirect href="/(personal)" />;
  }

  return <Redirect href="/(aluno)" />;
}