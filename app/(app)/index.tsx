import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

/**
 * Porteiro de Redirecionamento Baseado na Role
 */
export default function AppEntryRedirect() {
  const router = useRouter();

  useEffect(() => {
    async function redirectToCorrectArea() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          router.replace('/(auth)');
          return;
        }

        // Busca a role diretamente na tabela profiles
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        // Direciona estritamente para o grupo correspondente
        if (data?.role === 'personal') {
          router.replace('/(personal)');
        } else {
          router.replace('/(aluno)');
        }
      } catch (err) {
        console.error('Erro ao redirecionar:', err);
        router.replace('/(aluno)');
      }
    }

    redirectToCorrectArea();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#09090b' }}>
      <ActivityIndicator size="large" color="#59C83A" />
    </View>
  );
}