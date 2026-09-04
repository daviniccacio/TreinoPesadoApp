import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Stack, Repeat, Barbell } from 'phosphor-react-native';
import { useQuery } from '@tanstack/react-query';
import { MotiView } from 'moti';

// Componente otimizado para exibição de imagens e GIFs da web
import { Image } from 'expo-image';

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
 * Busca as informações do exercício no Supabase
 */
async function fetchExerciseDetail(exerciseId: string): Promise<ExerciseDetail> {
  if (!exerciseId) throw new Error('ID do exercício não fornecido');

  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .eq('id', exerciseId)
    .single();

  if (error) throw new Error(error.message);
  return data as ExerciseDetail;
}

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const router = useRouter();
  const insets = useSafeAreaInsets();

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Estado local para controlar o indicador de carregamento do GIF
  const [isGifLoading, setIsGifLoading] = useState<boolean>(true);

  // Consulta dos dados do exercício via TanStack Query
  const {
    data: exercise,
    isLoading,
  } = useQuery({
    queryKey: ['exercise-detail', id],
    queryFn: () => fetchExerciseDetail(id || ''),
    enabled: !!id,
  });

  /**
   * Função para retornar à tela anterior da pilha
   */
  function handleGoBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(aluno)/(tabs)/my-workouts');
    }
  }

  const safeTopPadding = Math.max(insets?.top || 0, 16);

  return (
    <View className="flex-1 bg-white dark:bg-zinc-950" style={{ paddingTop: safeTopPadding }}>
      {/* 1. CABEÇALHO SUPERIOR ANIMADO */}
      <MotiView
        from={{ opacity: 0, translateY: -8 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{
          type: 'spring',
          damping: 24,
          stiffness: 160,
        }}
        className="flex-row items-center justify-between px-5 py-3 border-b border-[#f0edef] dark:border-zinc-800"
      >
        <TouchableOpacity
          onPress={handleGoBack}
          className="w-10 h-10 rounded-full bg-[#f8f9fa] dark:bg-zinc-900 items-center justify-center border border-[#e2dfe1] dark:border-zinc-800"
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color={isDark ? '#59C83A' : '#1b1b1d'} />
        </TouchableOpacity>

        <Text className="text-lg font-bold text-[#1b1b1d] dark:text-white text-center flex-1">
          Detalhes do Exercício
        </Text>

        <View className="w-10" />
      </MotiView>

      {/* 2. CONTEÚDO PRINCIPAL */}
      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#59C83A" />
        </View>
      ) : exercise ? (
        <ScrollView
          className="flex-1 px-5 pt-4"
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* TÍTULO E GRUPO MUSCULAR */}
          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{
              type: 'spring',
              damping: 22,
              stiffness: 150,
              delay: 30,
            }}
            className="mb-4"
          >
            <Text className="text-2xl font-extrabold text-[#1b1b1d] dark:text-white mb-2">
              {exercise.name}
            </Text>

            <View className="self-start bg-[#59C83A]/10 px-3 py-1 rounded-full border border-[#59C83A]/30">
              <Text style={{ color: '#59C83A' }} className="text-xs font-bold uppercase tracking-wider">
                Grupo: {exercise.category_id}
              </Text>
            </View>
          </MotiView>

          {/* GIF DEMONSTRATIVO ANIMADO */}
          <MotiView
            from={{ opacity: 0, scale: 0.96, translateY: 10 }}
            animate={{ opacity: 1, scale: 1, translateY: 0 }}
            transition={{
              type: 'spring',
              damping: 22,
              stiffness: 150,
              delay: 60,
            }}
            className="w-full h-72 bg-[#f8f9fa] dark:bg-zinc-900 rounded-3xl overflow-hidden mb-6 items-center justify-center p-2 border border-[#e2dfe1] dark:border-zinc-800 relative"
          >
            {isGifLoading && (
              <View className="absolute inset-0 justify-center items-center bg-[#f8f9fa] dark:bg-zinc-900 z-10">
                <ActivityIndicator size="large" color="#59C83A" />
                <Text className="text-xs text-[#71717a] dark:text-zinc-400 mt-2 font-medium">
                  Carregando via internet...
                </Text>
              </View>
            )}

            <Image
              source={getExerciseGif(exercise.gif_key)}
              style={{ width: '100%', height: '100%', borderRadius: 16 }}
              contentFit="contain"
              autoplay={true}
              transition={200}
              onLoadStart={() => setIsGifLoading(true)}
              onLoad={() => setIsGifLoading(false)}
              onError={() => {
                console.log('⚠️ [Image Error] Não foi possível carregar a imagem do GIF.');
                setIsGifLoading(false);
              }}
            />
          </MotiView>

          {/* CARDS DE MÉTRICAS */}
          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{
              type: 'spring',
              damping: 22,
              stiffness: 150,
              delay: 90,
            }}
            className="flex-row justify-between mb-6"
          >
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
          </MotiView>
        </ScrollView>
      ) : null}
    </View>
  );
}