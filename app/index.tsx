// ============================================================================
// DOCUMENTAÇÃO: INDEX INICIAL DA APLICAÇÃO (VERSÃO DE PRODUÇÃO)
// ============================================================================
// Verifica a existência de sessão salva no Supabase e redireciona o usuário
// instantaneamente para a rota apropriada, sem alertas ou telas de teste.
// ============================================================================

import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { supabase } from '../lib/supabase';

export default function RootIndex() {
  const [loading, setLoading] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    let isMounted = true;

    // 1. Escuta alterações no estado de autenticação (Login, Logout, Sessão Inicial)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      setHasSession(!!session);
      setLoading(false);
    });

    // 2. Leitura direta de segurança para garantir a recuperação da sessão
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      setHasSession(!!session);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Exibe uma tela limpa com spinner verde enquanto valida a sessão no banco
  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-zinc-950">
        <ActivityIndicator size="large" color="#59C83A" />
      </View>
    );
  }

  // Redireciona para a área interna se o usuário estiver logado
  if (hasSession) {
    return <Redirect href="/(app)/(aluno)" />;
  }

  // Redireciona para a tela de login se não houver sessão ativa
  return <Redirect href="/(auth)/login" />;
}