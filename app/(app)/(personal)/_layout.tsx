import { Tabs } from 'expo-router';
import { Users, Barbell, ClipboardText } from 'phosphor-react-native';

export default function PersonalLayout() {
  return (
    <Tabs screenOptions={{ 
      headerShown: false, 
      tabBarActiveTintColor: '#59C83A',
      tabBarInactiveTintColor: '#71717a'
    }}>
      <Tabs.Screen 
        name="index" // Esta será a tua tela de Alunos
        options={{ 
          title: 'Alunos', 
          tabBarIcon: ({ color }) => <Users size={24} color={color} /> 
        }} 
      />
      <Tabs.Screen 
        name="routines" // Esta será a tua tela de montar treinos
        options={{ 
          title: 'Treinos', 
          tabBarIcon: ({ color }) => <Barbell size={24} color={color} /> 
        }} 
      />
      <Tabs.Screen 
        name="logs" // Esta será a tua tela de histórico/logs
        options={{ 
          title: 'Registros', 
          tabBarIcon: ({ color }) => <ClipboardText size={24} color={color} /> 
        }} 
      />
    </Tabs>
  );
}