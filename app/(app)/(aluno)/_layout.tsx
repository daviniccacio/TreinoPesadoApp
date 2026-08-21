import React from "react";
import { Stack } from "expo-router";

export default function AlunoStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
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