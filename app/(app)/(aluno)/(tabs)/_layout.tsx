// ============================================================================
// DOCUMENTAÇÃO: LAYOUT DE ABAS FLUTUANTE (ÁREA DO ALUNO)
// ============================================================================
// Gerencia a navegação principal da área do aluno com abas para Início,
// Meus Treinos, Histórico e Perfil, utilizando animações suaves e DM Sans.
// ============================================================================

import React from "react";
import { useColorScheme, View } from "react-native";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  House,
  Barbell,
  ClockCounterClockwise,
  User,
} from "phosphor-react-native";
import { MotiView } from "moti";

// --- COMPONENTE DE ÍCONE ANIMADO (MINIMALISTA) ---
interface AnimatedTabItemProps {
  focused: boolean;
  children: React.ReactNode;
}

function AnimatedTabItem({ focused, children }: AnimatedTabItemProps) {
  return (
    <View className="items-center justify-center relative w-full h-full">
      <MotiView
        animate={{
          scale: focused ? 1.12 : 1.0,
          translateY: focused ? -1 : 0,
        }}
        transition={{
          type: "spring",
          damping: 22,
          stiffness: 160,
        }}
      >
        {children}
      </MotiView>
    </View>
  );
}

export default function StudentTabsLayout() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        animation: "fade",

        // 🟢 COR EXATA DO BACKGROUND (Sincronizado com dark:bg-zinc-950)
        sceneStyle: {
          backgroundColor: isDark ? "#09090b" : "#f8f9fa",
        },

        tabBarActiveTintColor: "#59C83A",
        tabBarInactiveTintColor: isDark ? "#a1a1aa" : "#71717a",

        tabBarStyle: {
          position: "absolute",
          bottom: Math.max(insets.bottom, 12),
          left: 16,
          right: 16,
          height: 62,
          borderRadius: 24,
          borderWidth: 1,
          borderColor: isDark ? "#27272a" : "#e2dfe1",
          backgroundColor: isDark
            ? "rgba(24, 24, 27, 0.96)"
            : "rgba(255, 255, 255, 0.96)",
          elevation: 6,
          shadowColor: "#000000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isDark ? 0.3 : 0.08,
          shadowRadius: 10,
          paddingBottom: 6,
          paddingTop: 6,
        },

        // 🟢 TIPOGRAFIA DA NAVBAR: Usa a fonte DM Sans Bold
        tabBarLabelStyle: {
          fontFamily: "DMSans_700Bold",
          fontSize: 10,
          marginTop: 2,
        },
      }}
    >
      {/* 1. ABA INÍCIO */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Início",
          tabBarIcon: ({ color, size, focused }) => (
            <AnimatedTabItem focused={focused}>
              <House
                size={size - 2}
                color={color}
                weight={focused ? "fill" : "regular"}
              />
            </AnimatedTabItem>
          ),
        }}
      />

      {/* 2. ABA MEUS TREINOS */}
      <Tabs.Screen
        name="my-workouts"
        options={{
          title: "Meus Treinos",
          tabBarIcon: ({ color, size, focused }) => (
            <AnimatedTabItem focused={focused}>
              <Barbell
                size={size - 2}
                color={color}
                weight={focused ? "fill" : "regular"}
              />
            </AnimatedTabItem>
          ),
        }}
      />

      {/* 3. ABA HISTÓRICO */}
      <Tabs.Screen
        name="history"
        options={{
          title: "Histórico",
          tabBarIcon: ({ color, size, focused }) => (
            <AnimatedTabItem focused={focused}>
              <ClockCounterClockwise
                size={size - 2}
                color={color}
                weight={focused ? "fill" : "regular"}
              />
            </AnimatedTabItem>
          ),
        }}
      />

      {/* 4. ABA PERFIL */}
      <Tabs.Screen
        name="profile"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color, size, focused }) => (
            <AnimatedTabItem focused={focused}>
              <User
                size={size - 2}
                color={color}
                weight={focused ? "fill" : "regular"}
              />
            </AnimatedTabItem>
          ),
        }}
      />
    </Tabs>
  );
}