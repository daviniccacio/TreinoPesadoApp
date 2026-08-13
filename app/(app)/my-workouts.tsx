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
import { Plus, ChevronRight, Dumbbell, Calendar } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';

interface CustomWorkout {
  id: string;
  title: string;
  day_of_week?: string;
  created_at: string;
  custom_workout_exercises: { id: string }[];
}

const DAYS_FILTER = [
  { id: 'todos', label: 'Todos' },
  { id: 'segunda', label: 'Seg' },
  { id: 'terca', label: 'Ter' },
  { id: 'quarta', label: 'Qua' },
  { id: 'quinta', label: 'Qui' },
  { id: 'sexta', label: 'Sex' },
  { id: 'sabado', label: 'Sáb' },
  { id: 'domingo', label: 'Dom' },
];

/**
 * Tela de Listagem e Filtro de Meus Treinos com a cor da marca #59C83A
 */
export default function MyWorkoutsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [customWorkouts, setCustomWorkouts] = useState<CustomWorkout[]>([]);
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>('todos');
  const [loading, setLoading] = useState<boolean>(true);

  useFocusEffect(
    useCallback(() => {
      fetchCustomWorkouts();
    }, [])
  );

  async function fetchCustomWorkouts() {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('custom_workouts')
        .select(`
          id,
          title,
          day_of_week,
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

  // Filtra os treinos pelo dia da semana selecionado
  const filteredWorkouts = customWorkouts.filter((workout) => {
    if (selectedDayFilter === 'todos') return true;
    return workout.day_of_week === selectedDayFilter;
  });

  return (
    <View className="flex-1 bg-white dark:bg-zinc-950" style={{ paddingTop: insets.top }}>
      {/* Cabeçalho */}
      <View className="px-5 py-4 border-b border-[#f0edef] dark:border-zinc-800 flex-row justify-between items-center">
        <Text className="text-2xl font-extrabold text-[#1b1b1d] dark:text-white">
          Meus Treinos
        </Text>
      </View>

      <ScrollView className="flex-1 px-5 pt-4" showsVerticalScrollIndicator={false}>
        {/* Botão no topo: Montar Novo Treino */}
        <TouchableOpacity
          onPress={() => router.push('/create-workout')}
          style={{ backgroundColor: '#59C83A' }}
          className="p-4 rounded-2xl flex-row items-center justify-between mb-6 shadow-sm active:opacity-90"
          activeOpacity={0.8}
        >
          <View className="flex-row items-center gap-3">
            <View className="w-10 h-10 rounded-full bg-white/20 items-center justify-center">
              <Plus size={24} color="#ffffff" />
            </View>
            <View>
              <Text className="text-white font-extrabold text-base">Montar Novo Treino</Text>
              <Text className="text-white/90 text-xs font-medium">Crie uma rotina personalizada</Text>
            </View>
          </View>
          <ChevronRight size={20} color="#ffffff" />
        </TouchableOpacity>

        {/* Filtro por Dia da Semana */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-6 flex-row"
        >
          {DAYS_FILTER.map((day) => {
            const isSelected = selectedDayFilter === day.id;
            return (
              <TouchableOpacity
                key={day.id}
                onPress={() => setSelectedDayFilter(day.id)}
                style={isSelected ? { backgroundColor: '#59C83A', borderColor: '#59C83A' } : undefined}
                className={`py-2 px-4 rounded-xl mr-2 border ${
                  isSelected
                    ? ''
                    : 'bg-[#f8f9fa] dark:bg-zinc-900 border-[#e2dfe1] dark:border-zinc-800'
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    isSelected ? 'text-white' : 'text-[#414755] dark:text-zinc-400'
                  }`}
                >
                  {day.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Lista de Treinos Criados */}
        <Text className="text-lg font-bold text-[#1b1b1d] dark:text-white mb-3">
          Seus Treinos Salvos ({filteredWorkouts.length})
        </Text>

        {loading ? (
          <View className="py-12 items-center">
            <ActivityIndicator size="large" color="#59C83A" />
            <Text className="mt-3 text-[#414755] dark:text-zinc-400 font-medium text-xs">
              Carregando treinos...
            </Text>
          </View>
        ) : filteredWorkouts.length === 0 ? (
          <View className="bg-[#f8f9fa] dark:bg-zinc-900 p-8 rounded-2xl border border-dashed border-[#e2dfe1] dark:border-zinc-800 items-center my-2">
            <Dumbbell size={40} color="#808591" />
            <Text className="text-[#1b1b1d] dark:text-white font-bold mt-2 text-base">
              Nenhum treino para este dia
            </Text>
            <Text className="text-[#414755] dark:text-zinc-400 text-xs text-center mt-1">
              Toque no botão acima para cadastrar um treino personalizado neste dia.
            </Text>
          </View>
        ) : (
          filteredWorkouts.map((workout) => (
            <TouchableOpacity
              key={workout.id}
              onPress={() => router.push(`/custom-workout/${workout.id}`)}
              className="bg-[#f8f9fa] dark:bg-zinc-900 p-4 rounded-2xl mb-3 flex-row items-center justify-between border border-[#e2dfe1] dark:border-zinc-800"
              activeOpacity={0.8}
            >
              <View className="flex-1 mr-3">
                <Text className="text-base font-bold text-[#1b1b1d] dark:text-white mb-1">
                  {workout.title}
                </Text>
                <View className="flex-row items-center gap-2">
                  <Text style={{ color: '#59C83A' }} className="text-xs font-bold">
                    {workout.custom_workout_exercises?.length || 0} exercícios
                  </Text>
                  {workout.day_of_week ? (
                    <View className="bg-[#59C83A]/10 px-2 py-0.5 rounded-md flex-row items-center gap-1 border border-[#59C83A]/20">
                      <Calendar size={10} color="#59C83A" />
                      <Text style={{ color: '#59C83A' }} className="text-[10px] font-bold uppercase">
                        {workout.day_of_week}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
              <View className="w-9 h-9 rounded-full bg-white dark:bg-zinc-800 items-center justify-center border border-[#e0dddf] dark:border-zinc-700">
                <ChevronRight size={18} color="#59C83A" />
              </View>
            </TouchableOpacity>
          ))
        )}

        <View className="h-10" />
      </ScrollView>
    </View>
  );
}