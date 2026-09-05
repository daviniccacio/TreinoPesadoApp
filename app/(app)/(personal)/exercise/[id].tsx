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
import { ArrowLeft, WarningCircle } from 'phosphor-react-native';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { MotiView } from 'moti';

import { supabase } from '../../../../lib/supabase';
import { getExerciseGif } from '../../../../lib/exerciseGifs';

interface ExerciseDetail {
  id: string;
  name: string;
  category_id: string;
  instructions?: string;
  gif_key?: string;
}

/**
 * Busca os detalhes do exercício no Supabase
 */
async function fetchExerciseDetail(exerciseId: string): Promise<ExerciseDetail> {
  if (!exerciseId) throw new Error('ID do exercício não fornecido');

  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .eq('id', exerciseId)
    .single();

  if (error) {
    console.error('Erro ao buscar detalhe do exercício:', error.message);
    throw new Error(error.message);
  }

  return data as ExerciseDetail;
}

export default function PersonalExerciseDetailScreen() {
  const { id, categoryId, categoryTitle } = useLocalSearchParams<{
    id: string;
    categoryId?: string;
    categoryTitle?: string;
  }>();

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [isGifLoading, setIsGifLoading] = useState<boolean>(true);

  const {
    data: exercise,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['personal-exercise-detail', id],
    queryFn: () => fetchExerciseDetail(id || ''),
    enabled: !!id,
  });

  function handleGoBack() {
    const targetCategory = categoryId || exercise?.category_id;

    if (targetCategory) {
      router.replace({
        pathname: '/(personal)/category/[id]',
        params: { id: targetCategory, title: categoryTitle },
      });
    } else {
      router.replace('/(personal)/exercises');
    }
  }

  const safeTopPadding = Math.max(insets?.top || 0, 16);

  return (
    <View className="flex-1 bg-white dark:bg-zinc-950" style={{ paddingTop: safeTopPadding }}>
      {/* 1. CABEÇALHO ANIMADO */}
      <MotiView
        from={{ opacity: 0, translateY: -12 }}
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

        <Text className="text-lg font-bold text-[#1b1b1d] dark:text-white text-center flex-1" numberOfLines={1}>
          Demonstração do Exercício
        </Text>

        <View className="w-10" />
      </MotiView>

      {/* 2. CONTEÚDO PRINCIPAL */}
      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#59C83A" />
          <Text className="mt-3 text-[#414755] dark:text-zinc-400 font-medium text-xs">
            Carregando demonstração...
          </Text>
        </View>
      ) : isError ? (
        <MotiView
          from={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 22, stiffness: 150 }}
          className="flex-1 justify-center items-center px-5"
        >
          <WarningCircle size={48} color="#e11d48" />
          <Text className="text-base font-bold text-[#1b1b1d] dark:text-white mt-2 text-center">
            Não foi possível carregar os detalhes do exercício
          </Text>
          <TouchableOpacity
            onPress={() => refetch()}
            style={{ backgroundColor: '#59C83A' }}
            className="mt-4 px-5 py-2.5 rounded-xl"
          >
            <Text className="text-white font-bold text-xs">Tentar Novamente</Text>
          </TouchableOpacity>
        </MotiView>
      ) : exercise ? (
        <ScrollView
          className="flex-1 px-5 pt-4"
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* TÍTULO ANIMADO */}
          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 22, stiffness: 150, delay: 20 }}
            className="mb-4"
          >
            <Text className="text-2xl font-extrabold text-[#1b1b1d] dark:text-white mb-1">
              {exercise.name}
            </Text>
          </MotiView>

          {/* GIF DEMONSTRATIVO ANIMADO */}
          <MotiView
            from={{ opacity: 0, scale: 0.95, translateY: 10 }}
            animate={{ opacity: 1, scale: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 22, stiffness: 150, delay: 40 }}
            className="w-full h-72 bg-[#f8f9fa] dark:bg-zinc-900 rounded-3xl overflow-hidden mb-6 items-center justify-center p-2 border border-[#e2dfe1] dark:border-zinc-800 relative"
          >
            {isGifLoading && (
              <View className="absolute inset-0 justify-center items-center bg-[#f8f9fa] dark:bg-zinc-900 z-10">
                <ActivityIndicator size="large" color="#59C83A" />
                <Text className="text-xs text-[#71717a] dark:text-zinc-400 mt-2 font-medium">
                  Carregando GIF...
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
              onError={() => setIsGifLoading(false)}
            />
          </MotiView>

          {/* INSTRUÇÕES TÉCNICAS ANIMADAS */}
          {exercise.instructions && (
            <MotiView
              from={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'spring', damping: 22, stiffness: 150, delay: 60 }}
              className="bg-[#f8f9fa] dark:bg-zinc-900 p-4 rounded-2xl border border-[#e2dfe1] dark:border-zinc-800"
            >
              <Text className="text-sm font-bold text-[#59C83A] mb-1">
                Instruções de Execução:
              </Text>
              <Text className="text-sm text-[#414755] dark:text-zinc-300 leading-6 font-medium">
                {exercise.instructions}
              </Text>
            </MotiView>
          )}
        </ScrollView>
      ) : null}
    </View>
  );
}