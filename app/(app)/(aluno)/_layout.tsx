import React from "react";
import { useColorScheme } from "react-native";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  House,
  Barbell,
  ClockCounterClockwise,
  User,
} from "phosphor-react-native";

/**
 * Layout de Abas Inferiores do Aluno
 * Exibe apenas as abas principais (Início, Meus Treinos, Histórico, Perfil)
 * e oculta telas secundárias da barra inferior.
 */
export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#59C83A",
        tabBarInactiveTintColor: isDark ? "#a1a1aa" : "#414755",
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: isDark ? "#27272a" : "#f0edef",
          elevation: 0,
          height: 60 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
          paddingTop: 8,
          backgroundColor: isDark ? "#09090b" : "#ffffff",
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
      }}
    >
      {/* 1. Aba Início */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Início",
          tabBarIcon: ({ color, size, focused }) => (
            <House
              size={size}
              color={color}
              weight={focused ? "fill" : "regular"}
            />
          ),
        }}
      />

      {/* 2. Aba Meus Treinos */}
      <Tabs.Screen
        name="my-workouts"
        options={{
          title: "Meus Treinos",
          tabBarIcon: ({ color, size, focused }) => (
            <Barbell
              size={size}
              color={color}
              weight={focused ? "fill" : "regular"}
            />
          ),
        }}
      />

      {/* 3. Aba Histórico */}
      <Tabs.Screen
        name="history"
        options={{
          title: "Histórico",
          tabBarIcon: ({ color, size, focused }) => (
            <ClockCounterClockwise
              size={size}
              color={color}
              weight={focused ? "fill" : "regular"}
            />
          ),
        }}
      />

      {/* 4. Aba Perfil */}
      <Tabs.Screen
        name="profile"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color, size, focused }) => (
            <User
              size={size}
              color={color}
              weight={focused ? "fill" : "regular"}
            />
          ),
        }}
      />

      {/* ROTAS OCULTAS DA BARRA INFERIOR (Ocultas com href: null) */}
      <Tabs.Screen name="category/[id]" options={{ href: null }} />
      <Tabs.Screen name="exercise/[id]" options={{ href: null }} />
      <Tabs.Screen name="custom-workout/[id]" options={{ href: null }} />
      <Tabs.Screen name="create-workout" options={{ href: null }} />
      <Tabs.Screen name="workout-detail" options={{ href: null }} />
      <Tabs.Screen name="execute-workout" options={{ href: null }} />
    </Tabs>
  );
}
