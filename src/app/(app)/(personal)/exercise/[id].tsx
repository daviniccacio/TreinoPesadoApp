// ============================================================================
// DOCUMENTAÇÃO: TELA DE DEMONSTRAÇÃO DO EXERCÍCIO (PERSONAL TRAINER) COM SKELETON
// ============================================================================
// Exibe a execução em GIF animado e as instruções técnicas detalhadas de um
// exercício específico selecionado no catálogo com sanitização de dados.
// ============================================================================

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

import { supabase } from '@/lib/supabase';
import { sanitizeInput } from '@/lib/security'; // 🟢 Importação da função de sanitização
import { getExerciseGif } from '@/lib/exerciseGifs';
import { Skeleton } from '@/components/SkeletonLoading';

interface ExerciseDetail {
  id: string;
  name: string;
  category_id: string;
  instructions?: string;
  gif_key?: string;
}

// 🟢 SUBCOMPONENTE DE SKELETON PARA DETALHES DO EXERCÍCIO
function ExerciseDetailSkeleton() {
  return (
    <View className="flex-1 px-5 pt-4">
      {/* Skeleton do Título do Exercício */}
      <Skeleton width="70%" height={28} borderRadius={8} className="mb-4" />

      {/* Skeleton do Container do GIF */}
      <Skeleton width="100%" height={288} borderRadius={24} className="mb-6" />

      {/* Skeleton do Bloco de Instruções */}
      <View className="bg-[#f8f9fa] dark:bg-zinc-900 p-4 rounded-2xl border border-[#e2dfe1] dark:border-zinc-800">
        <Skeleton width={160} height={16} borderRadius={4} className="mb-3" />
        <Skeleton width="100%" height={14} borderRadius={4} className="mb-2" />
        <Skeleton width="90%" height={14} borderRadius={4} className="mb-2" />
        <Skeleton width="60%" height={14} borderRadius={4} />
      </View>
    </View>
  );
}

/**
 * Busca os detalhes do exercício no Supabase com sanitização
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

  const rawData = data as ExerciseDetail;

  return {
    ...rawData,
    name: sanitizeInput(rawData.name || 'Exercício'),
    instructions: rawData.instructions ? sanitizeInput(rawData.instructions) : undefined,
  };
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
        pathname: '/(personal)/category/[id]' as any,
        params: { id: targetCategory, title: categoryTitle },
      });
    } else {
      router.replace('/(personal)/exercises' as any);
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
        } as any}
        className="flex-row items-center justify-between px-5 py-3 border-b border-[#f0edef] dark:border-zinc-800"
      >
        <TouchableOpacity
          onPress={handleGoBack}
          className="w-10 h-10 rounded-full bg-[#f8f9fa] dark:bg-zinc-900 items-center justify-center border border-[#e2dfe1] dark:border-zinc-800"
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color={isDark ? '#59C83A' : '#1b1b1d'} />
        </TouchableOpacity>

        <Text className="text-lg font-outfit text-[#1b1b1d] dark:text-white text-center flex-1" numberOfLines={1}>
          Demonstração do Exercício
        </Text>

        <View className="w-10" />
      </MotiView>

      {/* 2. CONTEÚDO PRINCIPAL (SKELETON OU DEMONSTRAÇÃO) */}
      {isLoading ? (
        <ExerciseDetailSkeleton />
      ) : isError ? (
        <MotiView
          from={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 22, stiffness: 150 } as any}
          className="flex-1 justify-center items-center px-5"
        >
          <WarningCircle size={48} color="#e11d48" />
          <Text className="text-base font-outfit-bold text-[#1b1b1d] dark:text-white mt-2 text-center">
            Não foi possível carregar os detalhes do exercício
          </Text>
          <TouchableOpacity
            onPress={() => refetch()}
            style={{ backgroundColor: '#59C83A' }}
            className="mt-4 px-5 py-2.5 rounded-xl"
          >
            <Text className="text-white font-sans-bold text-xs">Tentar Novamente</Text>
          </TouchableOpacity>
        </MotiView>
      ) : exercise ? (
        <ScrollView
          className="flex-1 px-5 pt-4"
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
          {/* TÍTULO ANIMADO */}
          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 22, stiffness: 150, delay: 20 } as any}
            className="mb-4"
          >
            <Text className="text-2xl font-outfit-extrabold text-[#1b1b1d] dark:text-white mb-1">
              {exercise.name}
            </Text>
          </MotiView>

          {/* GIF DEMONSTRATIVO ANIMADO */}
          <MotiView
            from={{ opacity: 0, scale: 0.95, translateY: 10 }}
            animate={{ opacity: 1, scale: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 22, stiffness: 150, delay: 40 } as any}
            className="w-full h-72 bg-[#fffffffc] dark:bg-[#fffffffc] rounded-3xl overflow-hidden mb-6 items-center justify-center p-2 border border-[#e2dfe1] dark:border-zinc-800 relative"
          >
            {isGifLoading && (
              <View className="absolute inset-0 justify-center items-center bg-[#f8f9fa] dark:bg-zinc-900 z-10">
                <ActivityIndicator size="large" color="#59C83A" />
                <Text className="text-xs text-[#71717a] dark:text-zinc-400 mt-2 font-sans-medium">
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
              onError={(error) => {
                console.log('Erro detalhado do GIF:', JSON.stringify(error, null, 2));  
              }}
            />
          </MotiView>

          {/* INSTRUÇÕES TÉCNICAS ANIMADAS */}
          {exercise.instructions && (
            <MotiView
              from={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'spring', damping: 22, stiffness: 150, delay: 60 } as any}
              className="bg-[#f8f9fa] dark:bg-zinc-900 p-4 rounded-2xl border border-[#e2dfe1] dark:border-zinc-800"
            >
              <Text className="text-sm font-sans-bold text-[#59C83A] mb-1">
                Instruções de Execução:
              </Text>
              <Text className="text-sm text-[#414755] dark:text-zinc-300 leading-6 font-sans-medium">
                {exercise.instructions}
              </Text>
            </MotiView>
          )}
        </ScrollView>
      ) : null}
    </View>
  );
}