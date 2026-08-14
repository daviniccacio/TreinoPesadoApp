import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  useColorScheme,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Stack, Repeat, Barbell } from 'phosphor-react-native';
import { supabase } from '../../../../lib/supabase';
import { getExerciseGif } from '../../../../lib/exerciseGifs';

interface ExerciseDetail {
  id: string;
  name: string;
  sets: number;
  reps: string;
  weight: string;
  category_id: string;
  gif_key?: string;
}

/**
 * Tela de Detalhes do Exercício (Sem favoritos e com título centralizado)
 */
export default function ExerciseDetailScreen() {
  const { id, from, categoryId, workoutId } = useLocalSearchParams<{
    id: string;
    from?: string;
    categoryId?: string;
    workoutId?: string;
  }>();

  const router = useRouter();
  const insets = useSafeAreaInsets();

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [exercise, setExercise] = useState<ExerciseDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (id) {
      fetchExerciseDetails();
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
    <View className="flex-1 bg-white dark:bg-zinc-950" style={{ paddingTop: insets.top }}>
      {/* 1. Cabeçalho com Título Centralizado */}
      <View className="flex-row items-center justify-between px-5 py-3 border-b border-[#f0edef] dark:border-zinc-800">
        <TouchableOpacity
          onPress={handleGoBack}
          className="w-10 h-10 rounded-full bg-[#f8f9fa] dark:bg-zinc-900 items-center justify-center border border-[#e2dfe1] dark:border-zinc-800"
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color={isDark ? '#59C83A' : '#1b1b1d'} />
        </TouchableOpacity>

        {/* Título perfeitamente centralizado */}
        <Text className="text-lg font-bold text-[#1b1b1d] dark:text-white text-center flex-1">
          Detalhes do Exercício
        </Text>

        {/* Espaçador invisível para equilibrar o layout do cabeçalho */}
        <View className="w-10" />
      </View>

      {/* 2. Conteúdo Principal */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#59C83A" />
        </View>
      ) : exercise ? (
        <ScrollView
          className="flex-1 px-5 pt-4"
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Título e Grupo Muscular */}
          <View className="mb-4">
            <Text className="text-2xl font-extrabold text-[#1b1b1d] dark:text-white mb-2">
              {exercise.name}
            </Text>

            <View className="self-start bg-[#59C83A]/10 px-3 py-1 rounded-full border border-[#59C83A]/30">
              <Text style={{ color: '#59C83A' }} className="text-xs font-bold uppercase tracking-wider">
                Grupo: {exercise.category_id}
              </Text>
            </View>
          </View>

          {/* GIF Demonstrativo */}
          <View className="w-full h-72 bg-white dark:bg-white rounded-3xl overflow-hidden mb-6 items-center justify-center p-2 border border-[#e2dfe1] dark:border-zinc-800">
            <Image
              source={getExerciseGif(exercise.gif_key)}
              className="w-full h-full rounded-2xl"
              resizeMode="contain"
            />
          </View>

          {/* Cards de Métricas (Séries, Repetições, Carga) */}
          <View className="flex-row justify-between mb-6">
            <View className="w-[31%] bg-[#f8f9fa] dark:bg-zinc-900 p-4 rounded-2xl items-center border border-[#e2dfe1] dark:border-zinc-800">
              <Stack size={22} color="#59C83A" />
              <Text className="text-xs text-[#414755] dark:text-zinc-400 mt-1 font-medium">
                Séries
              </Text>
              <Text className="text-lg font-extrabold text-[#1b1b1d] dark:text-white mt-1">
                {exercise.sets}
              </Text>
            </View>

            <View className="w-[31%] bg-[#f8f9fa] dark:bg-zinc-900 p-4 rounded-2xl items-center border border-[#e2dfe1] dark:border-zinc-800">
              <Repeat size={22} color="#59C83A" />
              <Text className="text-xs text-[#414755] dark:text-zinc-400 mt-1 font-medium">
                Reps
              </Text>
              <Text className="text-lg font-extrabold text-[#1b1b1d] dark:text-white mt-1">
                {exercise.reps}
              </Text>
            </View>

            <View className="w-[31%] bg-[#f8f9fa] dark:bg-zinc-900 p-4 rounded-2xl items-center border border-[#e2dfe1] dark:border-zinc-800">
              <Barbell size={22} color="#59C83A" />
              <Text className="text-xs text-[#414755] dark:text-zinc-400 mt-1 font-medium">
                Carga
              </Text>
              <Text className="text-lg font-extrabold text-[#1b1b1d] dark:text-white mt-1">
                {exercise.weight}
              </Text>
            </View>
          </View>
        </ScrollView>
      ) : null}
    </View>
  );
}