import React, { useEffect, useState } from 'react';
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
import { ArrowLeft, Trash2, ChevronRight } from 'lucide-react-native';
import { supabase } from '../../../lib/supabase';

// Interface para os itens de exercícios pertencentes a este treino
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

// Interface principal dos detalhes do treino personalizado
interface CustomWorkoutDetail {
  id: string;
  title: string;
  custom_workout_exercises: WorkoutExerciseItem[];
}

/**
 * Tela de Detalhes do Treino Personalizado com a cor #59C83A
 */
export default function CustomWorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Detecta se o sistema está em modo claro ou escuro
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [workout, setWorkout] = useState<CustomWorkoutDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [deleting, setDeleting] = useState<boolean>(false);

  useEffect(() => {
    if (id) {
      fetchWorkoutDetails();
    }
  }, [id]);

  /**
   * Busca os detalhes do treino e os exercícios vinculados no Supabase
   */
  async function fetchWorkoutDetails() {
    try {
      setLoading(true);

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
        .eq('id', id)
        .single();

      if (error) {
        console.error('Erro ao buscar detalhes do treino:', error.message);
      } else if (data) {
        setWorkout(data as unknown as CustomWorkoutDetail);
      }
    } catch (err) {
      console.error('Erro de conexão:', err);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Exclui o treino personalizado atual do banco de dados
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
                Alert.alert('Sucesso', 'Treino excluído com sucesso!');
                router.replace('/my-workouts');
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
    router.push('/my-workouts');
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
            <Trash2 size={20} color="#e11d48" />
          )}
        </TouchableOpacity>
      </View>

      {/* 2. Conteúdo Principal */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#59C83A" />
          <Text className="mt-3 text-[#414755] dark:text-zinc-400 font-medium">
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
            {workout.custom_workout_exercises.length} Exercícios no Total
          </Text>

          {/* Lista de Exercícios do Treino */}
          {workout.custom_workout_exercises.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              onPress={() =>
                router.push({
                  pathname: '/exercise/[id]',
                  params: {
                    id: item.exercises.id,
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
                <ChevronRight size={16} color="#59C83A" />
              </View>
            </TouchableOpacity>
          ))}

          <View className="h-10" />
        </ScrollView>
      ) : null}
    </View>
  );
}