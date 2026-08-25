import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { supabase } from '../../lib/supabase';

/**
 * Ponto de entrada do grupo (app).
 * Lê a 'role' do usuário no Supabase e redireciona para a área correspondente (Aluno ou Personal).
 */
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
        setUserRole('aluno'); // Fallback de segurança
      } finally {
        setLoading(false);
      }
    }

    checkUserRole();
  }, []);

  // Exibe o carregamento verde enquanto consulta o perfil no banco de dados
  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white dark:bg-zinc-950">
        <ActivityIndicator size="large" color="#59C83A" />
      </View>
    );
  }

  // Redireciona para a rota apropriada
  if (userRole === 'personal') {
    return <Redirect href="/(personal)" />;
  }

  return <Redirect href="/(aluno)" />;
}