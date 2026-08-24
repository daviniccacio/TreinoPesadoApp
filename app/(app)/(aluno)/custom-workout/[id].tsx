import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  useColorScheme,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Trash, CaretRight } from 'phosphor-react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../../lib/supabase';

interface WorkoutExerciseItem {
  id: string;
  sets: number;
  reps: string;
  weight: string;
  exercises: {
    id: string;
    name: string;
    category_id: string;
  };
}

interface CustomWorkoutDetail {
  id: string;
  title: string;
  custom_workout_exercises: WorkoutExerciseItem[];
}

/**
 * Função de busca dos detalhes do treino personalizado no Supabase
 */
async function fetchCustomWorkoutDetail(workoutId: string): Promise<CustomWorkoutDetail> {
  if (!workoutId) throw new Error('ID do treino não fornecido');

  const { data, error } = await supabase
    .from('custom_workouts')
    .select(`
      id,
      title,
      custom_workout_exercises (
        id,
        sets,
        reps,
        weight,
        exercises (
          id,
          name,
          category_id
        )
      )
    `)
    .eq('id', workoutId)
    .single();

  if (error) throw new Error(error.message);
  return data as unknown as CustomWorkoutDetail;
}

export default function CustomWorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient(); // Instância para invalidar o cache ao deletar

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [deleting, setDeleting] = useState<boolean>(false);

  // --- REQUISITION COM TANSTACK QUERY ---
  const {
    data: workout,
    isLoading,
  } = useQuery({
    queryKey: ['custom-workout-detail', id],
    queryFn: () => fetchCustomWorkoutDetail(id || ''),
    enabled: !!id,
  });

  /**
   * Exclui o treino e invalida as queries para atualizar as listas automaticamente
   */
  async function handleDeleteWorkout() {
    Alert.alert(
      'Excluir Treino',
      'Tem certeza de que deseja apagar este treino personalizado?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              const { error } = await supabase
                .from('custom_workouts')
                .delete()
                .eq('id', id);

              if (!error) {
                // Invalida o cache das listas para forçar atualização automática
                await queryClient.invalidateQueries({ queryKey: ['student-workouts'] });
                await queryClient.invalidateQueries({ queryKey: ['student-home-data'] });

                Alert.alert('Sucesso', 'Treino excluído com sucesso!');
                router.replace('/(aluno)/(tabs)/my-workouts');
              } else {
                Alert.alert('Erro', error.message || 'Não foi possível excluir o treino.');
              }
            } catch (err) {
              console.error('Erro ao excluir treino:', err);
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  }

  function handleGoBack() {
    router.replace('/(aluno)/(tabs)/my-workouts');
  }

  return (
    <View className="flex-1 bg-white dark:bg-zinc-950" style={{ paddingTop: insets.top }}>
      {/* 1. Cabeçalho */}
      <View className="flex-row items-center justify-between px-5 py-3 border-b border-[#f0edef] dark:border-zinc-800">
        <TouchableOpacity
          onPress={handleGoBack}
          className="w-10 h-10 rounded-full bg-[#f8f9fa] dark:bg-zinc-900 items-center justify-center border border-[#e2dfe1] dark:border-zinc-800"
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color={isDark ? '#59C83A' : '#1b1b1d'} />
        </TouchableOpacity>

        <Text
          className="text-lg font-bold text-[#1b1b1d] dark:text-white flex-1 text-center mx-2"
          numberOfLines={1}
        >
          {workout?.title || 'Detalhes do Treino'}
        </Text>

        <TouchableOpacity
          onPress={handleDeleteWorkout}
          disabled={deleting}
          className="w-10 h-10 rounded-full bg-[#ffebe8] dark:bg-red-950/40 items-center justify-center border border-transparent dark:border-red-900/30"
          activeOpacity={0.7}
        >
          {deleting ? (
            <ActivityIndicator size="small" color="#e11d48" />
          ) : (
            <Trash size={20} color="#e11d48" />
          )}
        </TouchableOpacity>
      </View>

      {/* 2. Conteúdo Principal */}
      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#59C83A" />
          <Text className="mt-3 text-[#414755] dark:text-zinc-400 font-medium text-xs">
            Carregando exercícios do treino...
          </Text>
        </View>
      ) : workout ? (
        <ScrollView className="flex-1 px-5 pt-4" showsVerticalScrollIndicator={false}>
          {/* Título e Total de Exercícios */}
          <Text className="text-2xl font-extrabold text-[#1b1b1d] dark:text-white mb-1">
            {workout.title}
          </Text>
          <Text style={{ color: '#59C83A' }} className="text-xs font-bold uppercase mb-6">
            {workout.custom_workout_exercises?.length || 0} Exercícios no Total
          </Text>

          {/* Lista de Exercícios do Treino */}
          {workout.custom_workout_exercises?.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              onPress={() =>
                router.push({
                  pathname: '/(aluno)/exercise/[id]',
                  params: {
                    id: item.exercises?.id,
                    from: 'custom-workout',
                    workoutId: id,
                  },
                })
              }
              className="bg-[#f8f9fa] dark:bg-zinc-900 p-4 rounded-2xl mb-3 flex-row items-center justify-between border border-[#e2dfe1] dark:border-zinc-800"
              activeOpacity={0.8}
            >
              <View className="flex-1 mr-3">
                <Text style={{ color: '#59C83A' }} className="text-xs font-bold uppercase mb-0.5">
                  {index + 1}. {item.exercises?.category_id}
                </Text>
                <Text className="text-base font-bold text-[#1b1b1d] dark:text-white mb-1">
                  {item.exercises?.name}
                </Text>
                <View className="flex-row items-center gap-3">
                  <Text className="text-xs text-[#414755] dark:text-zinc-400">
                    <Text style={{ color: '#59C83A' }} className="font-bold">
                      {item.sets}
                    </Text>{' '}
                    séries
                  </Text>
                  <Text className="text-xs text-[#414755] dark:text-zinc-400">
                    <Text style={{ color: '#59C83A' }} className="font-bold">
                      {item.reps}
                    </Text>{' '}
                    reps
                  </Text>
                  <Text className="text-xs text-[#414755] dark:text-zinc-400">
                    Carga:{' '}
                    <Text style={{ color: '#59C83A' }} className="font-bold">
                      {item.weight}
                    </Text>
                  </Text>
                </View>
              </View>

              <View className="w-9 h-9 rounded-full bg-white dark:bg-zinc-800 items-center justify-center border border-[#e0dddf] dark:border-zinc-700">
                <CaretRight size={16} color="#59C83A" />
              </View>
            </TouchableOpacity>
          ))}

          <View className="h-10" />
        </ScrollView>
      ) : null}
    </View>
  );
}