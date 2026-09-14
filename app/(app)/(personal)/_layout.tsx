// ============================================================================
// DOCUMENTAÇÃO: LAYOUT PAI DE PILHA (PERSONAL TRAINER)
// ============================================================================
// Define a estrutura Stack para a área do personal.
// Gerencia a transição entre o grupo de abas (tabs) e as telas cheias secundárias.
// ============================================================================

import React from 'react';
import { Stack } from 'expo-router';

// 🟢 IMPORTAÇÃO DO HOOK DE TEMA GLOBAL (3 níveis acima para sair de personal, app e app)
import { useTheme } from '../../../context/ThemeContext';

export default function PersonalStackLayout() {
  const { isDark } = useTheme();
  const backgroundColor = isDark ? '#09090b' : '#f8f9fa';

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        contentStyle: {
          backgroundColor,
        },
      }}
    >
      {/* 1. MÓDULO DE ABAS PRINCIPAIS */}
      <Stack.Screen name="(tabs)" />

      {/* 2. TELAS SECUNDÁRIAS (EXIBIDAS EM TELA CHEIA SEM NAVBAR) */}
      <Stack.Screen name="create-workout" />
      <Stack.Screen name="student-detail" />
      <Stack.Screen name="category/[id]" />
      <Stack.Screen name="exercise/[id]" />
      <Stack.Screen name="routine/[id]" />
    </Stack>
  );
}