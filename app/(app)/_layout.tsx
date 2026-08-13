import React from 'react';
import { useColorScheme } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { House, Dumbbell, Heart, User } from 'lucide-react-native';

/**
 * Layout de Abas Inferiores estilizadas com a cor da marca #59C83A
 */
export default function TabsLayout() {
  // Captura as margens de segurança do sistema do celular
  const insets = useSafeAreaInsets();

  // Detecta se o dispositivo está no modo claro ou escuro
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // Cor do ícone e texto da aba selecionada (Verde Oficial Treino Pesado)
        tabBarActiveTintColor: '#59C83A',
        // Cor do ícone e texto das abas não selecionadas
        tabBarInactiveTintColor: isDark ? '#a1a1aa' : '#414755',
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: isDark ? '#27272a' : '#f0edef',
          elevation: 0,
          // Calcula a altura dinâmica somando a margem inferior de segurança
          height: 60 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
          paddingTop: 8,
          backgroundColor: isDark ? '#09090b' : '#ffffff',
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      {/* 1. Aba Início / Treinos */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Treinos',
          tabBarIcon: ({ color, size, focused }) => (
            <House size={size} color={color} fill={focused ? color : 'none'} />
          ),
        }}
      />

      {/* 2. Aba Meus Treinos */}
      <Tabs.Screen
        name="my-workouts"
        options={{
          title: 'Meus Treinos',
          tabBarIcon: ({ color, size, focused }) => (
            <Dumbbell size={size} color={color} fill={focused ? color : 'none'} />
          ),
        }}
      />

      {/* 3. Aba Favoritos */}
      <Tabs.Screen
        name="favorites"
        options={{
          title: 'Favoritos',
          tabBarIcon: ({ color, size, focused }) => (
            <Heart size={size} color={color} fill={focused ? color : 'none'} />
          ),
        }}
      />

      {/* 4. Aba Perfil */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size, focused }) => (
            <User size={size} color={color} fill={focused ? color : 'none'} />
          ),
        }}
      />

      {/* Rotas ocultas da barra inferior */}
      <Tabs.Screen name="category/[id]" options={{ href: null }} />
      <Tabs.Screen name="exercise/[id]" options={{ href: null }} />
      <Tabs.Screen name="custom-workout/[id]" options={{ href: null }} />
      <Tabs.Screen name="create-workout" options={{ href: null }} />
    </Tabs>
  );
}