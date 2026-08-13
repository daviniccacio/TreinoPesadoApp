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
import { ArrowLeft, Heart, Layers, Repeat, Dumbbell } from 'lucide-react-native';
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

  // Detecta se o sistema está em modo claro ou escuro
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [exercise, setExercise] = useState<ExerciseDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isFavorite, setIsFavorite] = useState<boolean>(false);

  useEffect(() => {
    if (id) {
      fetchExerciseDetails();
      checkIfFavorite();
    }
  }, [id]);

  /**
   * Busca as informações detalhadas do exercício no Supabase
   */
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

  /**
   * Verifica se o exercício atual está na tabela de favoritos do usuário
   */
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

  /**
   * Adiciona ou remove o exercício dos favoritos no Supabase
   */
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
   * Lógica de navegação de retorno baseada na origem da navegação (from)
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
    <View className="flex-1 bg-white dark:bg-zinc-950" style={{ paddingTop: insets.top }}>
      {/* 1. Cabeçalho */}
      <View className="flex-row items-center justify-between px-5 py-3 border-b border-[#f0edef] dark:border-zinc-800">
        <TouchableOpacity
          onPress={handleGoBack}
          className="w-10 h-10 rounded-full bg-[#f0edef] dark:bg-zinc-900 items-center justify-center border border-transparent dark:border-zinc-800"
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color={isDark ? '#ffffff' : '#1b1b1d'} />
        </TouchableOpacity>

        <Text className="text-lg font-bold text-[#1b1b1d] dark:text-white">
          Detalhes do Exercício
        </Text>

        <TouchableOpacity
          onPress={toggleFavorite}
          className="w-10 h-10 rounded-full bg-[#f0edef] dark:bg-zinc-900 items-center justify-center border border-transparent dark:border-zinc-800"
          activeOpacity={0.7}
        >
          <Heart
            size={20}
            color={isFavorite ? '#e11d48' : isDark ? '#ffffff' : '#1b1b1d'}
            fill={isFavorite ? '#e11d48' : 'none'}
          />
        </TouchableOpacity>
      </View>

      {/* 2. Conteúdo Principal */}
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
          {/* Título e Grupo Muscular */}
          <View className="mb-4">
            <Text className="text-2xl font-extrabold text-[#1b1b1d] dark:text-white mb-2">
              {exercise.name}
            </Text>

            <View className="self-start bg-[#eef2ff] dark:bg-sky-950/40 px-3 py-1 rounded-full border border-[#dbeaff] dark:border-sky-900/50">
              <Text className="text-xs text-[#0058bc] dark:text-sky-400 font-bold uppercase tracking-wider">
                Grupo: {exercise.category_id}
              </Text>
            </View>
          </View>

          {/* GIF Demonstrativo (Removida classe shadow-sm para estabilidade) */}
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
              <Layers size={22} color={isDark ? '#38bdf8' : '#0058bc'} />
              <Text className="text-xs text-[#414755] dark:text-zinc-400 mt-1 font-medium">
                Séries
              </Text>
              <Text className="text-lg font-extrabold text-[#1b1b1d] dark:text-white mt-1">
                {exercise.sets}
              </Text>
            </View>

            <View className="w-[31%] bg-[#f8f9fa] dark:bg-zinc-900 p-4 rounded-2xl items-center border border-[#e2dfe1] dark:border-zinc-800">
              <Repeat size={22} color={isDark ? '#38bdf8' : '#0058bc'} />
              <Text className="text-xs text-[#414755] dark:text-zinc-400 mt-1 font-medium">
                Reps
              </Text>
              <Text className="text-lg font-extrabold text-[#1b1b1d] dark:text-white mt-1">
                {exercise.reps}
              </Text>
            </View>

            <View className="w-[31%] bg-[#f8f9fa] dark:bg-zinc-900 p-4 rounded-2xl items-center border border-[#e2dfe1] dark:border-zinc-800">
              <Dumbbell size={22} color={isDark ? '#38bdf8' : '#0058bc'} />
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