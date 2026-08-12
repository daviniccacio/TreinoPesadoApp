import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

interface CustomWorkout {
  id: string;
  title: string;
  created_at: string;
  custom_workout_exercises: { id: string }[];
}

export default function MyWorkoutsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [customWorkouts, setCustomWorkouts] = useState<CustomWorkout[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useFocusEffect(
    useCallback(() => {
      fetchCustomWorkouts();
    }, [])
  );

  async function fetchCustomWorkouts() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('custom_workouts')
        .select(`
          id,
          title,
          created_at,
          custom_workout_exercises (id)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setCustomWorkouts(data as unknown as CustomWorkout[]);
      }
    } catch (err) {
      console.error('Erro ao buscar treinos customizados:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      {/* Cabeçalho */}
      <View className="px-5 py-4 border-b border-[#f0edef] flex-row justify-between items-center">
        <Text className="text-2xl font-extrabold text-[#1b1b1d]">
          Meus Treinos
        </Text>
      </View>

      <ScrollView className="flex-1 px-5 pt-4" showsVerticalScrollIndicator={false}>
        {/* Botão no topo: Montar Novo Treino */}
        <TouchableOpacity
          onPress={() => router.push('/create-workout')}
          className="bg-[#0058bc] p-4 rounded-2xl flex-row items-center justify-between mb-6 shadow-sm"
          activeOpacity={0.8}
        >
          <View className="flex-row items-center gap-3">
            <View className="w-10 h-10 rounded-full bg-white/20 items-center justify-center">
              <Ionicons name="add" size={24} color="#ffffff" />
            </View>
            <View>
              <Text className="text-white font-bold text-base">Montar Novo Treino</Text>
              <Text className="text-white/80 text-xs">Crie uma rotina personalizada</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#ffffff" />
        </TouchableOpacity>

        {/* Lista de Treinos Criados */}
        <Text className="text-lg font-bold text-[#1b1b1d] mb-3">
          Seus Treinos Salvos ({customWorkouts.length})
        </Text>

        {loading ? (
          <View className="py-12 items-center">
            <ActivityIndicator size="large" color="#0058bc" />
            <Text className="mt-3 text-[#414755] font-medium text-xs">
              Carregando treinos...
            </Text>
          </View>
        ) : customWorkouts.length === 0 ? (
          <View className="bg-[#f8f9fa] p-8 rounded-2xl border border-dashed border-[#e2dfe1] items-center my-2">
            <Ionicons name="barbell-outline" size={40} color="#808591" />
            <Text className="text-[#1b1b1d] font-bold mt-2 text-base">
              Nenhum treino criado
            </Text>
            <Text className="text-[#414755] text-xs text-center mt-1">
              Toque no botão acima para criar seu primeiro treino personalizado.
            </Text>
          </View>
        ) : (
          customWorkouts.map((workout) => (
            <TouchableOpacity
              key={workout.id}
              onPress={() => router.push(`/custom-workout/${workout.id}`)}
              className="bg-[#f0edef] p-4 rounded-2xl mb-3 flex-row items-center justify-between border border-[#e2dfe1]"
              activeOpacity={0.8}
            >
              <View className="flex-1 mr-3">
                <Text className="text-base font-bold text-[#1b1b1d] mb-1">
                  {workout.title}
                </Text>
                <Text className="text-xs text-[#0058bc] font-bold">
                  {workout.custom_workout_exercises?.length || 0} exercícios
                </Text>
              </View>
              <View className="w-9 h-9 rounded-full bg-white items-center justify-center border border-[#e0dddf]">
                <Ionicons name="chevron-forward" size={18} color="#0058bc" />
              </View>
            </TouchableOpacity>
          ))
        )}

        <View className="h-10" />
      </ScrollView>
    </View>
  );
}