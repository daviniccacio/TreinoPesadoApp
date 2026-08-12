import { Tabs } from 'expo-router';
import { House, Dumbbell, Heart, User } from 'lucide-react-native';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#0058bc', // Cor ativa do aplicativo
        tabBarInactiveTintColor: '#414755', // Cor neutra para abas inativas
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#f0edef',
          elevation: 0,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
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
            <House
              size={size}
              color={color}
              fill={focused ? color : 'none'} // Preenche quando focado
            />
          ),
        }}
      />

      {/* 2. Aba Meus Treinos */}
      <Tabs.Screen
        name="my-workouts"
        options={{
          title: 'Meus Treinos',
          tabBarIcon: ({ color, size, focused }) => (
            <Dumbbell
              size={size}
              color={color}
              fill={focused ? color : 'none'} // Preenche quando focado
            />
          ),
        }}
      />

      {/* 3. Aba Favoritos */}
      <Tabs.Screen
        name="favorites"
        options={{
          title: 'Favoritos',
          tabBarIcon: ({ color, size, focused }) => (
            <Heart
              size={size}
              color={color}
              fill={focused ? color : 'none'} // Preenche quando focado
            />
          ),
        }}
      />

      {/* 4. Aba Perfil */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size, focused }) => (
            <User
              size={size}
              color={color}
              fill={focused ? color : 'none'} // Preenche quando focado
            />
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