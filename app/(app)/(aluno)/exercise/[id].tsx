// ============================================================================
// DOCUMENTAÇÃO: TELA DE DETALHES DO EXERCÍCIO (COM SKELETON E TIMER GLOBAL)
// ============================================================================
// Exibe o GIF demonstrativo do exercício, métricas de execução (séries, reps e carga)
// e painel de timer/descanso com estado global, sanitização e esqueletos de carregamento.
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
import {
  ArrowLeft,
  Stack,
  Repeat,
  Barbell,
  Timer as TimerIcon,
  Play,
  Pause,
  ArrowCounterClockwise,
  Plus,
  Minus,
} from 'phosphor-react-native';
import { useQuery } from '@tanstack/react-query';
import { MotiView } from 'moti';
import { Image } from 'expo-image';

import { supabase } from '../../../../lib/supabase';
import { sanitizeInput } from '../../../../lib/security'; // 🟢 Importação da função de sanitização
import { getExerciseGif } from '../../../../lib/exerciseGifs';
import { useTimer } from '../../../../context/TimerContext';
import { Skeleton } from '../../../../components/SkeletonLoading';

interface ExerciseDetail {
  id: string;
  name: string;
  sets: number;
  reps: string;
  weight: string;
  category_id: string;
  gif_key?: string;
}

// 🟢 SUBCOMPONENTE DE SKELETON PARA OS DETALHES DO EXERCÍCIO
function ExerciseDetailSkeleton() {
  return (
    <ScrollView
      className="flex-1 px-5 pt-4"
      contentContainerStyle={{ paddingBottom: 60 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Skeleton de Título e Categoria */}
      <View className="mb-4">
        <Skeleton width="70%" height={28} borderRadius={8} className="mb-2" />
        <Skeleton width={120} height={24} borderRadius={12} />
      </View>

      {/* Skeleton do GIF Demonstrativo */}
      <Skeleton width="100%" height={288} borderRadius={24} className="mb-6" />

      {/* Skeleton das Métricas (3 colunas) */}
      <View className="flex-row justify-between mb-6">
        <View className="w-[31%]">
          <Skeleton width="100%" height={85} borderRadius={16} />
        </View>
        <View className="w-[31%]">
          <Skeleton width="100%" height={85} borderRadius={16} />
        </View>
        <View className="w-[31%]">
          <Skeleton width="100%" height={85} borderRadius={16} />
        </View>
      </View>

      {/* Skeleton do Card do Timer */}
      <Skeleton width="100%" height={180} borderRadius={24} />
    </ScrollView>
  );
}

/**
 * Busca os detalhes do exercício no Supabase com sanitização de campos
 */
async function fetchExerciseDetail(exerciseId: string): Promise<ExerciseDetail> {
  if (!exerciseId) throw new Error('ID do exercício não fornecido');

  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .eq('id', exerciseId)
    .single();

  if (error) throw new Error(error.message);

  const rawData = data as ExerciseDetail;

  return {
    ...rawData,
    name: sanitizeInput(rawData.name || 'Exercício'),
    reps: sanitizeInput(String(rawData.reps || '')),
    weight: sanitizeInput(String(rawData.weight || '')),
    category_id: sanitizeInput(rawData.category_id || ''),
  };
}

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [isGifLoading, setIsGifLoading] = useState<boolean>(true);

  // 🟢 CONSUMINDO O TIMER GLOBAL
  const {
    timeLeft,
    targetTime,
    isRunning,
    startTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    addSeconds,
    adjustMinutes,
  } = useTimer();

  const { data: exercise, isLoading } = useQuery({
    queryKey: ['exercise-detail', id],
    queryFn: () => fetchExerciseDetail(id || ''),
    enabled: !!id,
  });

  function formatDisplayTime(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  function handleTogglePlayPause() {
    if (isRunning) {
      pauseTimer();
    } else {
      if (timeLeft === 0 || timeLeft === targetTime) {
        startTimer(targetTime, exercise?.name);
      } else {
        resumeTimer();
      }
    }
  }

  function handleGoBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(aluno)/(tabs)/my-workouts' as any);
    }
  }

  const safeTopPadding = Math.max(insets?.top || 0, 16);

  return (
    <View className="flex-1 bg-white dark:bg-zinc-950" style={{ paddingTop: safeTopPadding }}>
      {/* CABEÇALHO */}
      <MotiView
        from={{ opacity: 0, translateY: -8 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'spring', damping: 24, stiffness: 160 } as any}
        className="flex-row items-center justify-between px-5 py-3 border-b border-[#f0edef] dark:border-zinc-800"
      >
        <TouchableOpacity
          onPress={handleGoBack}
          className="w-10 h-10 rounded-full bg-[#f8f9fa] dark:bg-zinc-900 items-center justify-center border border-[#e2dfe1] dark:border-zinc-800"
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color={isDark ? '#59C83A' : '#1b1b1d'} />
        </TouchableOpacity>

        <Text className="text-lg font-outfit text-[#1b1b1d] dark:text-white text-center flex-1">
          Detalhes do Exercício
        </Text>

        <View className="w-10" />
      </MotiView>

      {/* CONTEÚDO PRINCIPAL */}
      {isLoading ? (
        <ExerciseDetailSkeleton />
      ) : exercise ? (
        <ScrollView
          className="flex-1 px-5 pt-4"
          contentContainerStyle={{ paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
        >
          {/* TÍTULO E GRUPO */}
          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 22, stiffness: 150, delay: 30 } as any}
            className="mb-4"
          >
            <Text className="text-2xl font-outfit-extrabold text-[#1b1b1d] dark:text-white mb-2">
              {exercise.name}
            </Text>

            <View className="self-start bg-[#59C83A]/10 px-3 py-1 rounded-full border border-[#59C83A]/30">
              <Text style={{ color: '#59C83A' }} className="text-xs font-sans-bold uppercase tracking-wider">
                Grupo: {exercise.category_id}
              </Text>
            </View>
          </MotiView>

          {/* GIF DEMONSTRATIVO */}
          <MotiView
            from={{ opacity: 0, scale: 0.96, translateY: 10 }}
            animate={{ opacity: 1, scale: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 22, stiffness: 150, delay: 60 } as any}
            className="w-full h-72 bg-white dark:bg-white rounded-3xl overflow-hidden mb-6 items-center justify-center p-2 border border-[#e2dfe1] dark:border-zinc-800 relative"
          >
            {isGifLoading && (
              <View className="absolute inset-0 justify-center items-center bg-white dark:bg-white z-10">
                <ActivityIndicator size="large" color="#59C83A" />
                <Text className="text-xs font-sans-medium text-[#71717a] mt-2">
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
              onError={() => setIsGifLoading(false)}
            />
          </MotiView>

          {/* MÉTRICAS */}
          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 22, stiffness: 150, delay: 90 } as any}
            className="flex-row justify-between mb-6"
          >
            <View className="w-[31%] bg-[#f8f9fa] dark:bg-zinc-900 p-4 rounded-2xl items-center border border-[#e2dfe1] dark:border-zinc-800">
              <Stack size={22} color="#59C83A" />
              <Text className="text-xs font-sans-bold text-[#414755] dark:text-zinc-400 mt-1">Séries</Text>
              <Text className="text-lg font-outfit-extrabold text-[#1b1b1d] dark:text-white mt-1">{exercise.sets}</Text>
            </View>

            <View className="w-[31%] bg-[#f8f9fa] dark:bg-zinc-900 p-4 rounded-2xl items-center border border-[#e2dfe1] dark:border-zinc-800">
              <Repeat size={22} color="#59C83A" />
              <Text className="text-xs font-sans-bold text-[#414755] dark:text-zinc-400 mt-1">Reps</Text>
              <Text className="text-lg font-outfit-extrabold text-[#1b1b1d] dark:text-white mt-1">{exercise.reps}</Text>
            </View>

            <View className="w-[31%] bg-[#f8f9fa] dark:bg-zinc-900 p-4 rounded-2xl items-center border border-[#e2dfe1] dark:border-zinc-800">
              <Barbell size={22} color="#59C83A" />
              <Text className="text-xs font-sans-bold text-[#414755] dark:text-zinc-400 mt-1">Carga</Text>
              <Text className="text-lg font-outfit-extrabold text-[#1b1b1d] dark:text-white mt-1">{exercise.weight}</Text>
            </View>
          </MotiView>

          {/* CARD DO TIMER CONECTADO AO ESTADO GLOBAL */}
          <MotiView
            from={{ opacity: 0, translateY: 12 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 22, stiffness: 150, delay: 120 } as any}
            className="bg-[#f8f9fa] dark:bg-zinc-900 p-5 rounded-3xl border border-[#e2dfe1] dark:border-zinc-800"
          >
            <View className="flex-row items-center justify-between mb-4 pb-3 border-b border-[#e2dfe1] dark:border-zinc-800/80">
              <View className="flex-row items-center">
                <View className="w-8 h-8 rounded-xl bg-[#59C83A]/10 items-center justify-center mr-2.5">
                  <TimerIcon size={18} color="#59C83A" weight="bold" />
                </View>
                <Text className="text-base font-outfit-extrabold text-[#1b1b1d] dark:text-white">
                  Timer / Descanso
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => addSeconds(30)}
                activeOpacity={0.7}
                className="bg-[#59C83A]/15 border border-[#59C83A]/40 px-3 py-1.5 rounded-xl flex-row items-center"
              >
                <Plus size={14} color="#59C83A" weight="bold" />
                <Text className="text-xs font-sans-bold text-[#59C83A] ml-1">30s</Text>
              </TouchableOpacity>
            </View>

            <View className="flex-row items-center justify-between my-2 px-2">
              <TouchableOpacity
                onPress={() => adjustMinutes(-1)}
                className="w-10 h-10 rounded-2xl bg-white dark:bg-zinc-950 items-center justify-center border border-[#e2dfe1] dark:border-zinc-800"
                activeOpacity={0.7}
              >
                <Minus size={18} color={isDark ? '#a1a1aa' : '#71717a'} weight="bold" />
              </TouchableOpacity>

              <View className="items-center">
                <Text className="text-4xl font-outfit-extrabold text-[#59C83A] tracking-wider">
                  {formatDisplayTime(timeLeft)}
                </Text>
                <Text className="text-[10px] font-sans-bold text-[#71717a] dark:text-zinc-400 mt-0.5 uppercase tracking-widest">
                  {isRunning ? 'Em Contagem' : 'Pausado'}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => adjustMinutes(1)}
                className="w-10 h-10 rounded-2xl bg-white dark:bg-zinc-950 items-center justify-center border border-[#e2dfe1] dark:border-zinc-800"
                activeOpacity={0.7}
              >
                <Plus size={18} color={isDark ? '#a1a1aa' : '#71717a'} weight="bold" />
              </TouchableOpacity>
            </View>

            <View className="flex-row gap-3 mt-4 pt-3 border-t border-[#e2dfe1] dark:border-zinc-800/80">
              <TouchableOpacity
                onPress={resetTimer}
                activeOpacity={0.7}
                className="flex-1 bg-white dark:bg-zinc-950 py-3 rounded-2xl flex-row items-center justify-center border border-[#e2dfe1] dark:border-zinc-800"
              >
                <ArrowCounterClockwise size={18} color={isDark ? '#ffffff' : '#1b1b1d'} weight="bold" />
                <Text className="text-sm font-sans-bold text-[#1b1b1d] dark:text-white ml-2">Zerar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleTogglePlayPause}
                activeOpacity={0.8}
                className="flex-1 bg-[#59C83A] py-3 rounded-2xl flex-row items-center justify-center shadow-sm"
              >
                {isRunning ? (
                  <>
                    <Pause size={18} color="#FFFFFF" weight="bold" />
                    <Text className="text-sm font-sans-bold text-white ml-2">Pausar</Text>
                  </>
                ) : (
                  <>
                    <Play size={18} color="#FFFFFF" weight="bold" />
                    <Text className="text-sm font-sans-bold text-white ml-2">
                      {timeLeft < targetTime && timeLeft > 0 ? 'Continuar' : 'Iniciar'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </MotiView>
        </ScrollView>
      ) : null}
    </View>
  );
}