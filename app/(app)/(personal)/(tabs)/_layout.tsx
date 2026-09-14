// ============================================================================
// DOCUMENTAÇÃO: LAYOUT DE ABAS FLUTUANTE (PERSONAL TRAINER) - 0ms DELAY
// ============================================================================
// Gerencia exclusivamente as 5 abas principais da navegação inferior do Personal.
// ============================================================================

import React from "react";
import { View } from "react-native";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Users,
  Barbell,
  Books,
  CalendarCheck,
  User,
} from "phosphor-react-native";
import { MotiView } from "moti";

// 🟢 IMPORTAÇÃO DO HOOK DE TEMA GLOBAL (4 níveis acima para sair de tabs, personal, app e app)
import { useTheme } from "../../../../context/ThemeContext";

// --- COMPONENTE DE ÍCONE ANIMADO PARA AS ABAS ---
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

export default function PersonalTabsLayout() {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        animation: "fade",
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
        tabBarLabelStyle: {
          fontFamily: "DMSans_700Bold",
          fontSize: 10,
          marginTop: 2,
        },
      }}
    >
      {/* 1. ABA ALUNOS */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Alunos",
          tabBarIcon: ({ color, size, focused }) => (
            <AnimatedTabItem focused={focused}>
              <Users
                size={size - 2}
                color={color as string}
                weight={focused ? "fill" : "regular"}
              />
            </AnimatedTabItem>
          ),
        }}
      />

      {/* 2. ABA EXERCÍCIOS */}
      <Tabs.Screen
        name="exercises"
        options={{
          title: "Exercícios",
          tabBarIcon: ({ color, size, focused }) => (
            <AnimatedTabItem focused={focused}>
              <Barbell
                size={size - 2}
                color={color as string}
                weight={focused ? "fill" : "regular"}
              />
            </AnimatedTabItem>
          ),
        }}
      />

      {/* 3. ABA BIBLIOTECA DE MODELOS */}
      <Tabs.Screen
        name="routines"
        options={{
          title: "Biblioteca",
          tabBarIcon: ({ color, size, focused }) => (
            <AnimatedTabItem focused={focused}>
              <Books
                size={size - 2}
                color={color as string}
                weight={focused ? "fill" : "regular"}
              />
            </AnimatedTabItem>
          ),
        }}
      />

      {/* 4. ABA FREQUÊNCIA SEMANAL */}
      <Tabs.Screen
        name="attendance"
        options={{
          title: "Frequência",
          tabBarIcon: ({ color, size, focused }) => (
            <AnimatedTabItem focused={focused}>
              <CalendarCheck
                size={size - 2}
                color={color as string}
                weight={focused ? "fill" : "regular"}
              />
            </AnimatedTabItem>
          ),
        }}
      />

      {/* 5. ABA PERFIL PROFISSIONAL */}
      <Tabs.Screen
        name="profile"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color, size, focused }) => (
            <AnimatedTabItem focused={focused}>
              <User
                size={size - 2}
                color={color as string}
                weight={focused ? "fill" : "regular"}
              />
            </AnimatedTabItem>
          ),
        }}
      />
    </Tabs>
  );
}