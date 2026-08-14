import React from 'react';
import { useColorScheme } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Users, Books, CalendarCheck, User } from 'phosphor-react-native';

/**
 * Layout de Abas da Área do Personal Trainer
 * Atualizado para esconder rotas internas secundárias (formulários e detalhes).
 */
export default function PersonalLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // 1. Captura as margens de segurança (barra de botões do sistema Android/iOS)
  const insets = useSafeAreaInsets();

  // 2. Calcula a altura total da barra dinamicamente
  const customTabBarHeight = 60 + insets.bottom;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: isDark ? '#09090b' : '#ffffff',
          borderTopColor: isDark ? '#27272a' : '#f0edef',
          height: customTabBarHeight,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#59C83A',
        tabBarInactiveTintColor: isDark ? '#a1a1aa' : '#71717a',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      {/* ------------------- ABAS VISÍVEIS ------------------- */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Alunos',
          tabBarIcon: ({ color, size, focused }) => (
            <Users size={size} color={color} weight={focused ? 'fill' : 'bold'} />
          ),
        }}
      />

      <Tabs.Screen
        name="routines"
        options={{
          title: 'Biblioteca',
          tabBarIcon: ({ color, size, focused }) => (
            <Books size={size} color={color} weight={focused ? 'fill' : 'bold'} />
          ),
        }}
      />

      <Tabs.Screen
        name="attendance"
        options={{
          title: 'Frequência',
          tabBarIcon: ({ color, size, focused }) => (
            <CalendarCheck size={size} color={color} weight={focused ? 'fill' : 'bold'} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size, focused }) => (
            <User size={size} color={color} weight={focused ? 'fill' : 'bold'} />
          ),
        }}
      />

      {/* ------------------- ROTAS OCULTAS DA NAVBAR ------------------- */}
      {/* Definir 'href: null' esconde o botão da barra sem desativar a tela */}
      <Tabs.Screen name="create-exercise" options={{ href: null }} />
      <Tabs.Screen name="create-workout" options={{ href: null }} />
      <Tabs.Screen name="student-detail" options={{ href: null }} />
    </Tabs>
  );
}