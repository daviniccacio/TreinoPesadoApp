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

// --- COMPONENTE DE ÍCONE ANIMADO COM LINHA INDICADORA ---
interface AnimatedTabItemProps {
  focused: boolean;
  children: React.ReactNode;
}

function AnimatedTabItem({ focused, children }: AnimatedTabItemProps) {
  return (
    <View className="items-center justify-center relative w-full h-full">
      {/* Linha indicadora superior animada */}
      <MotiView
        animate={{
          scaleX: focused ? 1 : 0,
          opacity: focused ? 1 : 0,
        }}
        transition={{
          type: "spring",
          damping: 15,
          stiffness: 180,
        }}
        style={{
          position: "absolute",
          top: -6,
          width: 20,
          height: 3,
          borderRadius: 2,
          backgroundColor: "#59C83A",
        }}
      />

      {/* Ícone com animação de elevação sutil */}
      <MotiView
        animate={{
          scale: focused ? 1.12 : 1.0,
          translateY: focused ? -2 : 0,
        }}
        transition={{
          type: "spring",
          damping: 12,
          stiffness: 170,
        }}
      >
        {children}
      </MotiView>
    </View>
  );
}

// --- LAYOUT DA NAVBAR PRINCIPAL ---
export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#59C83A",
        tabBarInactiveTintColor: isDark ? "#71717a" : "#8e8e93",
        tabBarStyle: {
          position: "absolute",
          bottom: insets.bottom + 10,
          left: 16,
          right: 16,
          height: 64,
          borderRadius: 24,
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: isDark ? "#27272a" : "#e5e7eb",
          backgroundColor: isDark ? "#09090b" : "#ffffff",
          shadowColor: "#000000",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: isDark ? 0.4 : 0.08,
          shadowRadius: 12,
          elevation: 8,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "700",
          marginTop: 2,
        },
      }}
    >
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