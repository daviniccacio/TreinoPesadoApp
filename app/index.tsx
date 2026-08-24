import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { supabase } from '../lib/supabase';

export default function RootIndex() {
  const [loading, setLoading] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    // 1. Verifica se existe sessão de usuário ativa no Supabase
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session);
      setLoading(false);
    });

    // 2. Escuta mudanças no estado de autenticação em tempo real
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSession(!!session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Exibe a tela de carregamento com spinner enquanto verifica o banco
  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white dark:bg-zinc-950">
        <ActivityIndicator size="large" color="#59C83A" />
      </View>
    );
  }

  // Se o usuário estiver logado, redireciona para a área interna do aluno
  if (hasSession) {
    return <Redirect href="/(app)/(aluno)" />;
  }

  // Se não estiver logado, redireciona para a tela de login
  return <Redirect href="/(auth)/login" />;
}