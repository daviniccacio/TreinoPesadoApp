// ============================================================================
// DOCUMENTAÇÃO: TELA DE DETALHES DO MODELO DE TREINO (PERSONAL TRAINER) COM SKELETON
// ============================================================================
// Exibe as informações gerais do modelo da biblioteca (objetivo e descrição)
// juntamente com a lista de exercícios, séries, repetições e modal de GIF.
// ============================================================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Modal,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Eye,
  X,
  Stack,
  Repeat,
} from 'phosphor-react-native';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { MotiView } from 'moti';

import { supabase } from '../../../../lib/supabase';
import { getExerciseGif } from '../../../../lib/exerciseGifs';
import { Skeleton } from '../../../../components/SkeletonLoading'; // 🟢 Importação do Skeleton

interface PlanExerciseItem {
  id: string;
  name: string;
  sets: number;
  reps: string;
  exercise_id: string;
  exercise?: {
    gif_key?: string;
  };
}

interface RoutineDetail {
  id: string;
  name: string;
  description: string;
  objective: string;
}

// 🟢 SUBCOMPONENTE DE SKELETON PARA OS DETALHES DO TREINO
function RoutineDetailSkeleton() {
  return (
    <View className="flex-1 px-5 pt-4">
      {/* Skeleton do Título do Treino */}
      <Skeleton width="65%" height={28} borderRadius={8} className="mb-2" />
      {/* Skeleton do Badge de Objetivo */}
      <Skeleton width={130} height={24} borderRadius={12} className="mb-2" />
      {/* Skeleton da Descrição */}
      <Skeleton width="85%" height={16} borderRadius={6} className="mb-6" />

      {/* Skeleton do Título da Seção */}
      <Skeleton width={180} height={20} borderRadius={6} className="mb-4" />

      {/* Lista de Skeletons dos Exercícios */}
      {Array.from({ length: 4 }).map((_, index) => (
        <View
          key={`routine-exercise-skeleton-${index}`}
          className="bg-[#f8f9fa] dark:bg-zinc-900 p-4 rounded-2xl mb-3 border border-[#e2dfe1] dark:border-zinc-800"
        >
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center flex-1 mr-2">
              <Skeleton width={32} height={32} borderRadius={8} className="mr-2" />
              <Skeleton width="60%" height={16} borderRadius={6} />
            </View>
            <Skeleton width={75} height={28} borderRadius={12} />
          </View>
          <View className="flex-row items-center gap-4 border-t border-[#e2dfe1] dark:border-zinc-800 pt-2">
            <Skeleton width={80} height={14} borderRadius={4} />
            <Skeleton width={80} height={14} borderRadius={4} />
          </View>
        </View>
      ))}
    </View>
  );
}

/**
 * Busca os detalhes do modelo de treino e a lista de exercícios vinculados
 */
async function fetchRoutineWithExercises(planId: string) {
  if (!planId) throw new Error('ID da rotina não fornecido');

  const { data: plan, error: planError } = await supabase
    .from('workout_plans')
    .select('*')
    .eq('id', planId)
    .single();

  if (planError) throw new Error(planError.message);

  const { data: exercises, error: exercisesError } = await supabase
    .from('plan_exercises')
    .select(`
      id,
      name,
      sets,
      reps,
      order_index,
      exercise_id,
      exercise:exercises (
        gif_key
      )
    `)
    .eq('plan_id', planId)
    .order('order_index', { ascending: true });

  if (exercisesError) throw new Error(exercisesError.message);

  return {
    plan: plan as RoutineDetail,
    exercises: (exercises || []) as PlanExerciseItem[],
  };
}

export default function PersonalRoutineDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const handleBack = useCallback(() => {
    router.navigate('/(personal)/routines');
  }, [router]);

  const [selectedExerciseForGif, setSelectedExerciseForGif] = useState<{
    name: string;
    gif_key?: string;
  } | null>(null);

  const [isGifLoading, setIsGifLoading] = useState<boolean>(true);

  const { data, isLoading } = useQuery({
    queryKey: ['personal-routine-detail', id],
    queryFn: () => fetchRoutineWithExercises(id || ''),
    enabled: !!id,
  });

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
          onPress={handleBack}
          className="w-10 h-10 rounded-full bg-[#f8f9fa] dark:bg-zinc-900 items-center justify-center border border-[#e2dfe1] dark:border-zinc-800"
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color={isDark ? '#59C83A' : '#1b1b1d'} />
        </TouchableOpacity>

        <Text className="text-lg font-outfit text-[#1b1b1d] dark:text-white text-center flex-1" numberOfLines={1}>
          {data?.plan.name || 'Detalhes do Treino'}
        </Text>

        <View className="w-10" />
      </MotiView>

      {/* 2. CONTEÚDO DO TREINO (SKELETON OU CONTEÚDO REAL) */}
      {isLoading ? (
        <RoutineDetailSkeleton />
      ) : (
        <FlatList
          data={data?.exercises || []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <MotiView
              from={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{
                type: 'spring',
                damping: 22,
                stiffness: 150,
                delay: 20,
              } as any}
              className="mb-6"
            >
              <Text className="text-2xl font-outfit-extrabold text-[#1b1b1d] dark:text-white mb-2">
                {data?.plan.name}
              </Text>

              {data?.plan.objective && (
                <View className="self-start bg-[#59C83A]/10 px-3 py-1 rounded-full border border-[#59C83A]/30 mb-2">
                  <Text style={{ color: '#59C83A' }} className="text-xs font-sans-bold uppercase">
                    Objetivo: {data.plan.objective}
                  </Text>
                </View>
              )}

              {data?.plan.description && (
                <Text className="text-sm font-sans-medium text-[#71717a] dark:text-zinc-400">
                  {data.plan.description}
                </Text>
              )}

              <Text className="text-lg font-outfit text-[#1b1b1d] dark:text-white mt-6 mb-1">
                Exercícios da Ficha ({data?.exercises.length || 0})
              </Text>
            </MotiView>
          }
          renderItem={({ item, index }) => {
            const gifKey = item.exercise?.gif_key;

            return (
              <MotiView
                from={{ opacity: 0, translateY: 14, scale: 0.97 }}
                animate={{ opacity: 1, translateY: 0, scale: 1 }}
                transition={{
                  type: 'spring',
                  damping: 22,
                  stiffness: 150,
                  delay: index * 40,
                } as any}
              >
                <View className="bg-[#f8f9fa] dark:bg-zinc-900 p-4 rounded-2xl mb-3 border border-[#e2dfe1] dark:border-zinc-800">
                  <View className="flex-row items-center justify-between mb-3">
                    <View className="flex-row items-center flex-1 mr-2">
                      <View className="w-8 h-8 rounded-lg bg-[#59C83A]/10 items-center justify-center mr-2 border border-[#59C83A]/30">
                        <Text className="text-xs font-outfit text-[#59C83A]">{index + 1}</Text>
                      </View>
                      <Text className="text-base font-outfit text-[#1b1b1d] dark:text-white flex-1" numberOfLines={1}>
                        {item.name}
                      </Text>
                    </View>

                    <TouchableOpacity
                      onPress={() => {
                        setIsGifLoading(true);
                        setSelectedExerciseForGif({
                          name: item.name,
                          gif_key: gifKey,
                        });
                      }}
                      className="flex-row items-center bg-[#59C83A]/10 px-3 py-1.5 rounded-xl border border-[#59C83A]/30"
                      activeOpacity={0.7}
                    >
                      <Eye size={16} color="#59C83A" weight="bold" />
                      <Text style={{ color: '#59C83A' }} className="text-xs font-sans-bold ml-1.5">
                        Ver GIF
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View className="flex-row items-center gap-4 border-t border-[#e2dfe1] dark:border-zinc-800 pt-2">
                    <View className="flex-row items-center">
                      <Stack size={14} color="#59C83A" weight="bold" />
                      <Text className="text-xs font-sans-medium text-[#71717a] dark:text-zinc-400 ml-1">
                        <Text className="font-sans-bold text-[#1b1b1d] dark:text-white">{item.sets}</Text> séries
                      </Text>
                    </View>

                    <View className="flex-row items-center">
                      <Repeat size={14} color="#59C83A" weight="bold" />
                      <Text className="text-xs font-sans-medium text-[#71717a] dark:text-zinc-400 ml-1">
                        <Text className="font-sans-bold text-[#1b1b1d] dark:text-white">{item.reps}</Text> reps
                      </Text>
                    </View>
                  </View>
                </View>
              </MotiView>
            );
          }}
        />
      )}

      {/* MODAL PARA EXIBIR O GIF */}
      <Modal
        visible={!!selectedExerciseForGif}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedExerciseForGif(null)}
      >
        <View className="flex-1 bg-black/80 justify-center items-center px-5">
          <View className="w-full bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-[#e2dfe1] dark:border-zinc-800 shadow-2xl">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-outfit-extrabold text-[#1b1b1d] dark:text-white flex-1 pr-2">
                {selectedExerciseForGif?.name}
              </Text>
              <TouchableOpacity
                onPress={() => setSelectedExerciseForGif(null)}
                className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 items-center justify-center"
              >
                <X size={20} color={isDark ? '#ffffff' : '#1b1b1d'} weight="bold" />
              </TouchableOpacity>
            </View>

            <View className="w-full h-72 bg-[#f8f9fa] dark:bg-zinc-950 rounded-2xl overflow-hidden items-center justify-center relative border border-[#e2dfe1] dark:border-zinc-800">
              {isGifLoading && (
                <View className="absolute inset-0 justify-center items-center bg-[#f8f9fa] dark:bg-zinc-950 z-10">
                  <ActivityIndicator size="large" color="#59C83A" />
                  <Text className="text-xs text-[#71717a] dark:text-zinc-400 mt-2 font-sans-medium">
                    Carregando demonstração...
                  </Text>
                </View>
              )}

              <Image
                source={getExerciseGif(selectedExerciseForGif?.gif_key)}
                style={{ width: '100%', height: '100%' }}
                contentFit="contain"
                autoplay={true}
                transition={200}
                onLoadStart={() => setIsGifLoading(true)}
                onLoad={() => setIsGifLoading(false)}
                onError={() => setIsGifLoading(false)}
              />
            </View>

            <TouchableOpacity
              onPress={() => setSelectedExerciseForGif(null)}
              style={{ backgroundColor: '#59C83A' }}
              className="mt-5 py-3 rounded-xl items-center"
            >
              <Text className="text-white font-sans-bold text-sm">Fechar Visualização</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}