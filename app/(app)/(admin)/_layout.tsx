// ============================================================================
// DOCUMENTAÇÃO: LAYOUT DO GRUPO ADMINISTRATIVO
// ============================================================================
// Define a pilha de navegação (Stack) para todas as telas contidas em (admin).
// ============================================================================

import React from 'react';
import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';

export default function AdminGroupLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const backgroundColor = isDark ? '#09090b' : '#ffffff';

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
      <Stack.Screen name="index" />
    </Stack>
  );
}