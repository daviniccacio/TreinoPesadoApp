import React, { useState } from 'react';
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

import { supabase } from '../../../../lib/supabase';
import { getExerciseGif } from '../../../../lib/exerciseGifs';

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

/**
 * Busca os detalhes do modelo de treino e a lista de exercícios
 */
async function fetchRoutineWithExercises(planId: string) {
  if (!planId) throw new Error('ID da rotina não fornecido');

  // 1. Busca os dados do plano/modelo
  const { data: plan, error: planError } = await supabase
    .from('workout_plans')
    .select('*')
    .eq('id', planId)
    .single();

  if (planError) throw new Error(planError.message);

  // 2. Busca os exercícios associados e a gif_key da tabela exercises
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

  // Estado para controlar o exercício selecionado no Modal
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

  return (
    <View className="flex-1 bg-white dark:bg-zinc-950" style={{ paddingTop: insets.top }}>
      {/* Cabeçalho */}
      <View className="flex-row items-center justify-between px-5 py-3 border-b border-[#f0edef] dark:border-zinc-800">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-[#f8f9fa] dark:bg-zinc-900 items-center justify-center border border-[#e2dfe1] dark:border-zinc-800"
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color={isDark ? '#59C83A' : '#1b1b1d'} />
        </TouchableOpacity>

        <Text className="text-lg font-bold text-[#1b1b1d] dark:text-white text-center flex-1" numberOfLines={1}>
          {data?.plan.name || 'Detalhes do Treino'}
        </Text>

        <View className="w-10" />
      </View>

      {/* Conteúdo do Treino */}
      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#59C83A" />
        </View>
      ) : (
        <FlatList
          data={data?.exercises || []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View className="mb-6">
              <Text className="text-2xl font-black text-[#1b1b1d] dark:text-white mb-2">
                {data?.plan.name}
              </Text>
              {data?.plan.objective && (
                <View className="self-start bg-[#59C83A]/10 px-3 py-1 rounded-full border border-[#59C83A]/30 mb-2">
                  <Text style={{ color: '#59C83A' }} className="text-xs font-bold uppercase">
                    Objetivo: {data.plan.objective}
                  </Text>
                </View>
              )}
              {data?.plan.description && (
                <Text className="text-sm text-[#71717a] dark:text-zinc-400 font-medium">
                  {data.plan.description}
                </Text>
              )}

              <Text className="text-lg font-bold text-[#1b1b1d] dark:text-white mt-6 mb-1">
                Exercícios da Ficha ({data?.exercises.length || 0})
              </Text>
            </View>
          }
          renderItem={({ item, index }) => {
            const gifKey = item.exercise?.gif_key;

            return (
              <View className="bg-[#f8f9fa] dark:bg-zinc-900 p-4 rounded-2xl mb-3 border border-[#e2dfe1] dark:border-zinc-800">
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center flex-1 mr-2">
                    <View className="w-8 h-8 rounded-lg bg-[#59C83A]/10 items-center justify-center mr-2 border border-[#59C83A]/30">
                      <Text className="text-xs font-black text-[#59C83A]">{index + 1}</Text>
                    </View>
                    <Text className="text-base font-bold text-[#1b1b1d] dark:text-white flex-1" numberOfLines={1}>
                      {item.name}
                    </Text>
                  </View>

                  {/* BOTÃO PARA ABRIR O GIF EM MODAL */}
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
                    <Text style={{ color: '#59C83A' }} className="text-xs font-bold ml-1.5">
                      Ver GIF
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Séries e Repetições */}
                <View className="flex-row items-center gap-4 border-t border-[#e2dfe1] dark:border-zinc-800 pt-2">
                  <View className="flex-row items-center">
                    <Stack size={14} color="#59C83A" weight="bold" />
                    <Text className="text-xs font-medium text-[#71717a] dark:text-zinc-400 ml-1">
                      <Text className="font-bold text-[#1b1b1d] dark:text-white">{item.sets}</Text> séries
                    </Text>
                  </View>

                  <View className="flex-row items-center">
                    <Repeat size={14} color="#59C83A" weight="bold" />
                    <Text className="text-xs font-medium text-[#71717a] dark:text-zinc-400 ml-1">
                      <Text className="font-bold text-[#1b1b1d] dark:text-white">{item.reps}</Text> reps
                    </Text>
                  </View>
                </View>
              </View>
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
              <Text className="text-lg font-black text-[#1b1b1d] dark:text-white flex-1 pr-2">
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
                  <Text className="text-xs text-[#71717a] dark:text-zinc-400 mt-2 font-medium">
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
              <Text className="text-white font-extrabold text-sm">Fechar Visualização</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}