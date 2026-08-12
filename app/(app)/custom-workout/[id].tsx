import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';

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

export default function CustomWorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [workout, setWorkout] = useState<CustomWorkoutDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [deleting, setDeleting] = useState<boolean>(false);

  useEffect(() => {
    if (id) {
      fetchWorkoutDetails();
    }
  }, [id]);

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
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      {/* Cabeçalho */}
      <View className="flex-row items-center justify-between px-5 py-3 border-b border-[#f0edef]">
        <TouchableOpacity
          onPress={handleGoBack}
          className="w-10 h-10 rounded-full bg-[#f0edef] items-center justify-center"
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color="#1b1b1d" />
        </TouchableOpacity>

        <Text className="text-lg font-bold text-[#1b1b1d]" numberOfLines={1}>
          {workout?.title || 'Detalhes do Treino'}
        </Text>

        <TouchableOpacity
          onPress={handleDeleteWorkout}
          disabled={deleting}
          className="w-10 h-10 rounded-full bg-[#ffebe8] items-center justify-center"
          activeOpacity={0.7}
        >
          <Ionicons name="trash-outline" size={20} color="#e11d48" />
        </TouchableOpacity>
      </View>

      {/* Conteúdo */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#0058bc" />
          <Text className="mt-3 text-[#414755] font-medium">
            Carregando exercícios do treino...
          </Text>
        </View>
      ) : workout ? (
        <ScrollView className="flex-1 px-5 pt-4" showsVerticalScrollIndicator={false}>
          <Text className="text-2xl font-extrabold text-[#1b1b1d] mb-1">
            {workout.title}
          </Text>
          <Text className="text-xs text-[#0058bc] font-bold uppercase mb-6">
            {workout.custom_workout_exercises.length} Exercícios no Total
          </Text>

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
              className="bg-[#f0edef] p-4 rounded-2xl mb-3 flex-row items-center justify-between"
              activeOpacity={0.8}
            >
              <View className="flex-1 mr-3">
                <Text className="text-xs font-bold text-[#0058bc] uppercase mb-0.5">
                  {index + 1}. {item.exercises?.category_id}
                </Text>
                <Text className="text-base font-bold text-[#1b1b1d] mb-1">
                  {item.exercises?.name}
                </Text>
                <View className="flex-row items-center gap-3">
                  <Text className="text-xs text-[#414755]">
                    <Text className="font-bold text-[#0058bc]">{item.sets}</Text> séries
                  </Text>
                  <Text className="text-xs text-[#414755]">
                    <Text className="font-bold text-[#0058bc]">{item.reps}</Text> reps
                  </Text>
                  <Text className="text-xs text-[#414755]">
                    Carga: <Text className="font-bold text-[#0058bc]">{item.weight}</Text>
                  </Text>
                </View>
              </View>

              <View className="w-9 h-9 rounded-full bg-white items-center justify-center border border-[#e0dddf]">
                <Ionicons name="chevron-forward" size={16} color="#0058bc" />
              </View>
            </TouchableOpacity>
          ))}

          <View className="h-10" />
        </ScrollView>
      ) : null}
    </View>
  );
}