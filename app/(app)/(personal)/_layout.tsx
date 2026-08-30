// ============================================================================
// LAYOUT DE NAVEGAÇÃO POR ABAS (PERSONAL TRAINER)
// ============================================================================
// Configura a barra de navegação inferior (Tab Bar) com suporte a modo escuro,
// ícones interativos e ocultação de rotas internas de navegação.
// ============================================================================

import React from 'react';
import { useColorScheme } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Users, Books, CalendarCheck, User, Barbell } from 'phosphor-react-native';

export default function PersonalLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  
  // Altura customizada considerando a barra de navegação inferior dos celulares
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
      {/* 1. ABA ALUNOS */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Alunos',
          tabBarIcon: ({ color, size, focused }) => (
            <Users size={size} color={color} weight={focused ? 'fill' : 'bold'} />
          ),
        }}
      />

      {/* 2. ABA EXERCÍCIOS (CATÁLOGO DA ACADEMIA) */}
      <Tabs.Screen
        name="exercises"
        options={{
          title: 'Exercícios',
          tabBarIcon: ({ color, size, focused }) => (
            <Barbell size={size} color={color} weight={focused ? 'fill' : 'bold'} />
          ),
        }}
      />

      {/* 3. ABA BIBLIOTECA DE MODELOS */}
      <Tabs.Screen
        name="routines"
        options={{
          title: 'Biblioteca',
          tabBarIcon: ({ color, size, focused }) => (
            <Books size={size} color={color} weight={focused ? 'fill' : 'bold'} />
          ),
        }}
      />

      {/* 4. ABA FREQUÊNCIA SEMANAL */}
      <Tabs.Screen
        name="attendance"
        options={{
          title: 'Frequência',
          tabBarIcon: ({ color, size, focused }) => (
            <CalendarCheck size={size} color={color} weight={focused ? 'fill' : 'bold'} />
          ),
        }}
      />

      {/* 5. ABA PERFIL PROFISSIONAL */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size, focused }) => (
            <User size={size} color={color} weight={focused ? 'fill' : 'bold'} />
          ),
        }}
      />

      {/* ==================================================================== */}
      {/* ROTAS OCULTAS DA NAVBAR (Telas acessadas por botões internos)        */}
      {/* ==================================================================== */}
      <Tabs.Screen name="create-workout" options={{ href: null }} />
      <Tabs.Screen name="student-detail" options={{ href: null }} />
      <Tabs.Screen name="category/[id]" options={{ href: null }} />
      <Tabs.Screen name="exercise/[id]" options={{ href: null }} />
      <Tabs.Screen name="routine/[id]" options={{ href: null }} />
    </Tabs>
  );
}