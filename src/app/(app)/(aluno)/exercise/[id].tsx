// ============================================================================
// DOCUMENTAÇÃO: TELA DE DETALHES DO EXERCÍCIO (COM RENDERIZAÇÃO CONDICIONAL CARDIO)
// ============================================================================
// Exibe o GIF demonstrativo do exercício, métricas de execução (séries, reps e carga
// APENAS para musculação) e painel de timer/descanso adaptado para exercícios de Cardio.
// ============================================================================

import React, { useState, useEffect } from 'react';
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
  WarningCircle,
  Lightning,
} from 'phosphor-react-native';
import { useQuery } from '@tanstack/react-query';
import { MotiView } from 'moti';
import { Image } from 'expo-image';

import { supabase } from '@/lib/supabase';
import { sanitizeInput } from '@/lib/security';
import { getExerciseGif } from '@/lib/exerciseGifs';
import { useTimer } from '@/context/TimerContext';
import { Skeleton } from '@/components/SkeletonLoading';

export interface ExerciseDetail {
  id: string;
  name: string;
  sets: number;
  reps: string;
  weight: string;
  category_id: string;
  gif_key?: string;
}

// ============================================================================
// DICIONÁRIO DE CATEGORIAS PARA EXIBIÇÃO FORMATADA NA TAG DE GRUPO
// ============================================================================
const CATEGORY_LABEL_MAP: Record<string, string> = {
  gluteo: 'Glúteos',
  gluteos: 'Glúteos',
  peito: 'Peitoral',
  peitoral: 'Peitoral',
  perna: 'Pernas',
  pernas: 'Pernas',
  costas: 'Costas',
  ombro: 'Ombros',
  ombros: 'Ombros',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  abdomen: 'Abdômen',
  cardio: 'Cardio',
  alongamentos: 'Alongamentos',
  'pernas-posterior': 'Posterior de Pernas',
  pernas_posterior: 'Posterior de Pernas',
  pernasposterior: 'Posterior de Pernas',
};

/**
 * Sanitiza textos de repetições e carga mantendo hífens, barras e espaços (ex: "10-12")
 */
function sanitizeReps(input: string): string {
  if (!input) return '';
  return input.replace(/[^a-zA-Z0-9\s\-_/]/g, '').trim();
}

// SUBCOMPONENTE DE SKELETON PARA OS DETALHES DO EXERCÍCIO
function ExerciseDetailSkeleton() {
  return (
    <ScrollView
      className="flex-1 px-5 pt-4"
      contentContainerStyle={{ paddingBottom: 60 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="mb-4">
        <Skeleton width="70%" height={28} borderRadius={8} className="mb-2" />
        <Skeleton width={120} height={24} borderRadius={12} />
      </View>

      <Skeleton width="100%" height={288} borderRadius={24} className="mb-6" />

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

      <Skeleton width="100%" height={180} borderRadius={24} />
    </ScrollView>
  );
}

/**
 * Busca os detalhes do exercício no Supabase com sanitização adequada
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
  const rawCategory = (rawData.category_id || '').toLowerCase().trim();

  return {
    ...rawData,
    name: sanitizeInput(rawData.name || 'Exercício'),
    reps: sanitizeReps(String(rawData.reps || '')),
    weight: sanitizeReps(String(rawData.weight || '')),
    category_id: rawCategory, // Mantém a chave bruta para comparação de regras
  };
}

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [isGifLoading, setIsGifLoading] = useState<boolean>(true);
  const [hasGifError, setHasGifError] = useState<boolean>(false);

  // Consumindo o Timer Global
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

  useEffect(() => {
    setIsGifLoading(true);
    setHasGifError(false);
  }, [exercise?.gif_key]);

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

  // 🟢 IDENTIFICAÇÃO DE EXERCÍCIO DE CARDIO
  const rawCategoryKey = (exercise?.category_id || '').toLowerCase().trim();
  const isCardio = rawCategoryKey === 'cardio';
  const categoryDisplayName = CATEGORY_LABEL_MAP[rawCategoryKey] || exercise?.category_id || 'Geral';

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
                Grupo: {categoryDisplayName}
              </Text>
            </View>
          </MotiView>

          {/* GIF DEMONSTRATIVO */}
          <MotiView
            from={{ opacity: 0, scale: 0.96, translateY: 10 }}
            animate={{ opacity: 1, scale: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 22, stiffness: 150, delay: 60 } as any}
            className="w-full h-72 bg-[#f8f9fa] dark:bg-zinc-900 rounded-3xl overflow-hidden mb-6 items-center justify-center p-2 border border-[#e2dfe1] dark:border-zinc-800 relative"
          >
            {isGifLoading && !hasGifError && (
              <View className="absolute inset-0 justify-center items-center bg-[#f8f9fa] dark:bg-zinc-900 z-10">
                <ActivityIndicator size="large" color="#59C83A" />
                <Text className="text-xs font-sans-medium text-[#71717a] dark:text-zinc-400 mt-2">
                  Carregando demonstração...
                </Text>
              </View>
            )}

            {hasGifError ? (
              <View className="justify-center items-center p-4">
                <WarningCircle size={44} color="#e11d48" />
                <Text className="text-sm font-outfit-bold text-[#1b1b1d] dark:text-white mt-2 text-center">
                  Demonstração indisponível
                </Text>
              </View>
            ) : (
              <Image
                source={getExerciseGif(exercise.gif_key)}
                style={{ width: '100%', height: '100%', borderRadius: 16 }}
                contentFit="contain"
                autoplay={true}
                transition={200}
                onLoadStart={() => {
                  setIsGifLoading(true);
                  setHasGifError(false);
                }}
                onLoad={() => {
                  setIsGifLoading(false);
                  setHasGifError(false);
                }}
                onError={() => {
                  setIsGifLoading(false);
                  setHasGifError(true);
                }}
              />
            )}
          </MotiView>

          {/* 🟢 MÉTRICAS CONDICIONAIS (CARDIO vs MUSCULAÇÃO) */}
          {isCardio ? (
            /* BANNER INFORMATIVO DE CARDIO */
            <MotiView
              from={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'spring', damping: 22, stiffness: 150, delay: 90 } as any}
              className="bg-[#59C83A]/10 p-4 rounded-2xl flex-row items-center justify-center mb-6 border border-[#59C83A]/30"
            >
              <Lightning size={22} color="#59C83A" weight="bold" />
              <Text className="text-sm font-sans-bold text-[#1b1b1d] dark:text-white ml-2.5">
                Exercício de Cardio (Monitorado por Tempo)
              </Text>
            </MotiView>
          ) : (
            /* TRÊS CARDS TRADICIONAIS (SÉRIES, REPS, CARGA) */
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
          )}

          {/* CARD DO TIMER */}
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
                  {isCardio ? 'Cronômetro / Tempo de Cardio' : 'Timer / Descanso'}
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