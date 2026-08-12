import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { getExerciseGif } from '../../../lib/exerciseGifs';

interface ExerciseDetail {
  id: string;
  name: string;
  sets: number;
  reps: string;
  weight: string;
  category_id: string;
  gif_key?: string;
}

export default function ExerciseDetailScreen() {
  const { id, from, categoryId, workoutId } = useLocalSearchParams<{
    id: string;
    from?: string;
    categoryId?: string;
    workoutId?: string;
  }>();

  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [exercise, setExercise] = useState<ExerciseDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isFavorite, setIsFavorite] = useState<boolean>(false);

  useEffect(() => {
    if (id) {
      fetchExerciseDetails();
      checkIfFavorite();
    }
  }, [id]);

  async function fetchExerciseDetails() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .eq('id', id)
        .single();

      if (!error && data) {
        setExercise(data);
      }
    } catch (err) {
      console.error('Erro de conexão:', err);
    } finally {
      setLoading(false);
    }
  }

  async function checkIfFavorite() {
    try {
      const { data } = await supabase
        .from('favorites')
        .select('id')
        .eq('exercise_id', id)
        .maybeSingle();

      setIsFavorite(!!data);
    } catch (err) {
      console.error('Erro ao verificar favorito:', err);
    }
  }

  async function toggleFavorite() {
    try {
      if (isFavorite) {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('exercise_id', id);

        if (!error) setIsFavorite(false);
      } else {
        const { error } = await supabase
          .from('favorites')
          .insert({ exercise_id: id });

        if (!error) setIsFavorite(true);
      }
    } catch (err) {
      console.error('Erro ao alternar favorito:', err);
    }
  }

  /**
   * Lógica de retorno baseada no parâmetro 'from'
   */
  function handleGoBack() {
    if (from === 'category' && categoryId) {
      router.push(`/category/${categoryId}`);
    } else if (from === 'custom-workout' && workoutId) {
      router.push(`/custom-workout/${workoutId}`);
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/my-workouts');
    }
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

        <Text className="text-lg font-bold text-[#1b1b1d]">
          Detalhes do Exercício
        </Text>

        <TouchableOpacity
          onPress={toggleFavorite}
          className="w-10 h-10 rounded-full bg-[#f0edef] items-center justify-center"
          activeOpacity={0.7}
        >
          <Ionicons
            name={isFavorite ? 'heart' : 'heart-outline'}
            size={22}
            color={isFavorite ? '#e11d48' : '#1b1b1d'}
          />
        </TouchableOpacity>
      </View>

      {/* Conteúdo */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#0058bc" />
        </View>
      ) : exercise ? (
        <ScrollView
          className="flex-1 px-5 pt-4"
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Título e Grupo */}
          <View className="mb-4">
            <Text className="text-2xl font-extrabold text-[#1b1b1d] mb-2">
              {exercise.name}
            </Text>

            <View className="self-start bg-[#eef2ff] px-3 py-1 rounded-full border border-[#dbeaff]">
              <Text className="text-xs text-[#0058bc] font-bold uppercase tracking-wider">
                Grupo: {exercise.category_id}
              </Text>
            </View>
          </View>

          {/* GIF */}
          <View className="w-full h-72 bg-white rounded-3xl overflow-hidden mb-6 items-center justify-center p-2 border border-[#e2dfe1] shadow-sm">
            <Image
              source={getExerciseGif(exercise.gif_key)}
              className="w-full h-full rounded-2xl"
              resizeMode="contain"
            />
          </View>

          {/* Métricas */}
          <View className="flex-row justify-between mb-6">
            <View className="w-[31%] bg-[#f8f9fa] p-4 rounded-2xl items-center border border-[#e2dfe1]">
              <Ionicons name="layers-outline" size={22} color="#0058bc" />
              <Text className="text-xs text-[#414755] mt-1 font-medium">Séries</Text>
              <Text className="text-lg font-extrabold text-[#1b1b1d] mt-1">
                {exercise.sets}
              </Text>
            </View>

            <View className="w-[31%] bg-[#f8f9fa] p-4 rounded-2xl items-center border border-[#e2dfe1]">
              <Ionicons name="repeat-outline" size={22} color="#0058bc" />
              <Text className="text-xs text-[#414755] mt-1 font-medium">Reps</Text>
              <Text className="text-lg font-extrabold text-[#1b1b1d] mt-1">
                {exercise.reps}
              </Text>
            </View>

            <View className="w-[31%] bg-[#f8f9fa] p-4 rounded-2xl items-center border border-[#e2dfe1]">
              <Ionicons name="fitness-outline" size={22} color="#0058bc" />
              <Text className="text-xs text-[#414755] mt-1 font-medium">Carga</Text>
              <Text className="text-lg font-extrabold text-[#1b1b1d] mt-1">
                {exercise.weight}
              </Text>
            </View>
          </View>
        </ScrollView>
      ) : null}
    </View>
  );
}