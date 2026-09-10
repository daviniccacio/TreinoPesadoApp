// ============================================================================
// DOCUMENTAÇÃO: LAYOUT DA PILHA DA ÁREA DO ALUNO (COM SUPORTE A DARK MODE)
// ============================================================================
// Gerencia a navegação em pilha (Stack) das telas do aluno, garantindo
// consistência de fundo para evitar piscadas brancas durante as transições.
// ============================================================================

import React from "react";
import { useColorScheme } from "react-native";
import { Stack } from "expo-router";

export default function AlunoStackLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // Define a cor de fundo exata com base no tema do dispositivo
  const backgroundColor = isDark ? "#09090b" : "#ffffff";

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        // Garante que o fundo nativo da pilha acompanhe o tema
        contentStyle: {
          backgroundColor,
        },
      }}
    >
      {/* Grupo de Abas */}
      <Stack.Screen name="(tabs)" />

      {/* Telas Secundárias (Empilhadas na Navegação) */}
      <Stack.Screen name="create-workout" />
      <Stack.Screen name="execute-workout" />
      <Stack.Screen name="workout-detail" />
      <Stack.Screen name="category/[id]" />
      <Stack.Screen name="custom-workout/[id]" />
      <Stack.Screen name="exercise/[id]" />
    </Stack>
  );
}