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
import { MotiView } from "moti";

// --- COMPONENTE DE ÍCONE ANIMADO ---
interface AnimatedTabIconProps {
  focused: boolean;
  children: React.ReactNode;
}

/**
 * Envolve o ícone e aplica uma animação de escala suave com efeito de mola
 */
function AnimatedTabIcon({ focused, children }: AnimatedTabIconProps) {
  return (
    <MotiView
      animate={{
        scale: focused ? 1.18 : 1.0,
        translateY: focused ? -2 : 0,
      }}
      transition={{
        type: "spring",
        damping: 14, // Controla a resistência da mola (quanto menor, mais balanço)
        stiffness: 170, // Controla a rigidez/velocidade da mola
      }}
    >
      {children}
    </MotiView>
  );
}

// --- LAYOUT DA NAVBAR ---
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
          fontSize: 11,
          fontWeight: "700",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Início",
          tabBarIcon: ({ color, size, focused }) => (
            <AnimatedTabIcon focused={focused}>
              <House
                size={size}
                color={color}
                weight={focused ? "fill" : "regular"}
              />
            </AnimatedTabIcon>
          ),
        }}
      />

      <Tabs.Screen
        name="my-workouts"
        options={{
          title: "Meus Treinos",
          tabBarIcon: ({ color, size, focused }) => (
            <AnimatedTabIcon focused={focused}>
              <Barbell
                size={size}
                color={color}
                weight={focused ? "fill" : "regular"}
              />
            </AnimatedTabIcon>
          ),
        }}
      />

      <Tabs.Screen
        name="history"
        options={{
          title: "Histórico",
          tabBarIcon: ({ color, size, focused }) => (
            <AnimatedTabIcon focused={focused}>
              <ClockCounterClockwise
                size={size}
                color={color}
                weight={focused ? "fill" : "regular"}
              />
            </AnimatedTabIcon>
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color, size, focused }) => (
            <AnimatedTabIcon focused={focused}>
              <User
                size={size}
                color={color}
                weight={focused ? "fill" : "regular"}
              />
            </AnimatedTabIcon>
          ),
        }}
      />
    </Tabs>
  );
}