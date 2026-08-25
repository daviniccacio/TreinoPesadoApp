import React from 'react';
import { useColorScheme } from 'react-native';
import { Stack } from 'expo-router';

export default function AuthLayout() {
  // Detecta o tema ativo no dispositivo (light ou dark)
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // Define a cor de fundo nativa da pilha para evitar piscadas brancas ao trocar de tela
        contentStyle: {
          backgroundColor: isDark ? '#09090b' : '#ffffff',
        },
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
    </Stack>
  );
}