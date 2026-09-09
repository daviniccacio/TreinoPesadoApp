// ============================================================================
// DOCUMENTAÇÃO: TELA DE DETALHES DA FICHA DE TREINO (ÁREA DO ALUNO)
// ============================================================================
// Exibe os detalhes completos de uma ficha prescrita pelo Personal Trainer,
// incluindo resumo, objetivo, lista de exercícios ordenados e atalho de execução.
// ============================================================================

import React, { useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Barbell,
  CalendarBlank,
  Target,
  Info,
  UserCheck,
  PlayCircle,
  CaretRight,
} from 'phosphor-react-native';
import { useQuery } from '@tanstack/react-query';
import { MotiView } from 'moti';
import { supabase } from '../../../lib/supabase';

// --- TIPAGENS DE DADOS ---
interface PlanExercise {
  id: string;
  exercise_id: string;
  name: string;
  sets: string;
  reps: string;
  notes: string | null;
  order_index: number;
}

interface WorkoutPlanDetail {
  id: string;
  name: string;
  description: string | null;
  objective: string | null;
  days_of_week: string[] | null;
  plan_exercises: PlanExercise[];
}

/**
 * Função responsável por buscar a ficha prescrita e ordenar seus exercícios no Supabase
 */
async function fetchWorkoutPlanDetail(id?: string): Promise<WorkoutPlanDetail> {
  if (!id) throw new Error('Identificador do treino não encontrado.');

  const { data, error } = await supabase
    .from('workout_plans')
    .select(`
      id,
      name,
      description,
      objective,
      days_of_week,
      plan_exercises (
        id,
        exercise_id,
        name,
        sets,
        reps,
        notes,
        order_index
      )
    `)
    .eq('id', id)
    .single();

  if (error) {
    throw new Error('Não foi possível carregar os detalhes desta ficha.');
  }

  const sortedExercises = (data.plan_exercises || []).sort(
    (a: PlanExercise, b: PlanExercise) => a.order_index - b.order_index
  );

  return {
    ...data,
    plan_exercises: sortedExercises,
  };
}

export default function StudentWorkoutDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const { id } = useLocalSearchParams<{ id?: string }>();

  // --- BUSCA REATIVA COM TANSTACK QUERY ---
  const {
    data: workoutPlan,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['workout-plan-detail', id],
    queryFn: () => fetchWorkoutPlanDetail(id),
    enabled: !!id,
  });

  const handleNavigateBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(app)/(aluno)' as any);
    }
  }, [router]);

  const safeTopPadding = Math.max(insets?.top || 0, 16);

  return (
    <View
      className="flex-1 bg-white dark:bg-zinc-950 px-5"
      style={{ paddingTop: safeTopPadding + 10 }}
    >
      {/* 1. CABEÇALHO ANIMADO */}
      <MotiView
        from={{ opacity: 0, translateY: -8 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{
          type: 'spring',
          damping: 24,
          stiffness: 160,
        }}
        className="flex-row items-center mb-5"
      >
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleNavigateBack}
          className="w-10 h-10 rounded-xl bg-[#f8f9fa] dark:bg-zinc-900 justify-center items-center mr-3 border border-[#e2dfe1] dark:border-zinc-800"
        >
          <ArrowLeft size={20} color={isDark ? '#ffffff' : '#1b1b1d'} />
        </TouchableOpacity>

        <View className="flex-1">
          {/* Título Principal em Outfit ExtraBold */}
          <Text className="text-xl font-outfit-extrabold text-[#1b1b1d] dark:text-white" numberOfLines={1}>
            Ficha de Treino
          </Text>
          {/* Subtítulo em DM Sans Bold */}
          <Text className="text-xs font-sans-bold text-[#59C83A]">
            Prescrição Profissional
          </Text>
        </View>
      </MotiView>

      {/* 2. CONTEÚDO PRINCIPAL */}
      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#59C83A" />
          {/* Mensagem em DM Sans Medium */}
          <Text className="text-xs font-sans-medium text-[#71717a] dark:text-zinc-400 mt-3">
            Carregando exercícios da ficha...
          </Text>
        </View>
      ) : isError || !workoutPlan ? (
        <MotiView
          from={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'timing', duration: 250 }}
          className="flex-1 justify-center items-center px-6"
        >
          <Info size={40} color="#ef4444" />
          {/* Mensagem de Erro em Outfit Bold */}
          <Text className="text-[#1b1b1d] dark:text-white font-outfit-bold text-base mt-3 text-center">
            {error?.message || 'Ficha de treino não encontrada.'}
          </Text>
          <TouchableOpacity
            onPress={handleNavigateBack}
            className="mt-4 bg-[#59C83A] px-5 py-2.5 rounded-xl"
          >
            {/* Botão Voltar em DM Sans Bold */}
            <Text className="text-white font-sans-bold text-xs">Voltar para Meus Treinos</Text>
          </TouchableOpacity>
        </MotiView>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* CARTÃO RESUMO DA FICHA */}
          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{
              type: 'spring',
              damping: 22,
              stiffness: 150,
              delay: 30,
            }}
            className="bg-[#f8f9fa] dark:bg-zinc-900 p-5 rounded-3xl border border-[#e2dfe1] dark:border-zinc-800 mb-4"
          >
            <View className="flex-row items-center justify-between mb-3">
              <View className="bg-[#59C83A]/10 px-3 py-1 rounded-full border border-[#59C83A]/30 flex-row items-center">
                <UserCheck size={14} color="#59C83A" weight="bold" />
                {/* Rótulo Personal Trainer em DM Sans Bold */}
                <Text className="text-xs font-sans-bold text-[#59C83A] ml-1.5">
                  Personal Trainer
                </Text>
              </View>

              {/* Quantidade de Exercícios em DM Sans Bold */}
              <Text className="text-xs font-sans-bold text-[#71717a] dark:text-zinc-400">
                {workoutPlan.plan_exercises.length} Exercício(s)
              </Text>
            </View>

            {/* Nome da Ficha em Outfit ExtraBold */}
            <Text className="text-2xl font-outfit-extrabold text-[#1b1b1d] dark:text-white mb-2">
              {workoutPlan.name}
            </Text>

            {workoutPlan.description && (
              /* Descrição em DM Sans Medium */
              <Text className="text-xs font-sans-medium text-[#71717a] dark:text-zinc-400 mb-4 leading-5">
                {workoutPlan.description}
              </Text>
            )}

            {/* TAGS DE OBJETIVO E DIAS DA SEMANA */}
            <View className="flex-row flex-wrap gap-2 pt-3 border-t border-[#e2dfe1] dark:border-zinc-800">
              {workoutPlan.objective && (
                <View className="bg-[#59C83A]/10 px-3 py-1.5 rounded-xl flex-row items-center border border-[#59C83A]/30">
                  <Target size={14} color="#59C83A" weight="bold" />
                  {/* Objetivo em DM Sans Bold */}
                  <Text className="text-xs font-sans-bold text-[#59C83A] ml-1.5">
                    {workoutPlan.objective}
                  </Text>
                </View>
              )}

              {workoutPlan.days_of_week && workoutPlan.days_of_week.length > 0 && (
                <View className="bg-white dark:bg-zinc-950 px-3 py-1.5 rounded-xl border border-[#e2dfe1] dark:border-zinc-800 flex-row items-center">
                  <CalendarBlank size={14} color={isDark ? '#a1a1aa' : '#71717a'} />
                  {/* Dias da Semana em DM Sans Bold */}
                  <Text className="text-xs font-sans-bold text-[#71717a] dark:text-zinc-300 ml-1.5">
                    {workoutPlan.days_of_week.join(', ')}
                  </Text>
                </View>
              )}
            </View>
          </MotiView>

          {/* BOTÃO DE INICIAR O TREINO EM TEMPO REAL */}
          <MotiView
            from={{ opacity: 0, translateY: 10, scale: 0.98 }}
            animate={{ opacity: 1, translateY: 0, scale: 1 }}
            transition={{
              type: 'spring',
              damping: 22,
              stiffness: 150,
              delay: 60,
            }}
          >
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() =>
                router.push({
                  pathname: '/(aluno)/execute-workout' as any,
                  params: { id: workoutPlan.id, type: 'personal' },
                })
              }
              className="bg-[#59C83A] p-4 rounded-2xl flex-row items-center justify-center mb-6 shadow-sm"
            >
              <PlayCircle size={24} color="#FFFFFF" weight="bold" />
              {/* Botão de Iniciar em Outfit Bold */}
              <Text className="text-white font-outfit-bold text-base ml-2">
                Iniciar Treino Agora
              </Text>
            </TouchableOpacity>
          </MotiView>

          {/* LISTA DE EXERCÍCIOS */}
          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{
              type: 'spring',
              damping: 22,
              stiffness: 150,
              delay: 90,
            }}
          >
            {/* Título da Seção em Outfit ExtraBold */}
            <Text className="text-base font-outfit-extrabold text-[#1b1b1d] dark:text-white mb-1">
              Exercícios Prescritos
            </Text>
            {/* Dica em DM Sans Medium */}
            <Text className="text-xs font-sans-medium text-[#71717a] dark:text-zinc-400 mb-3">
              Toque em qualquer exercício para ver a demonstração em vídeo/GIF.
            </Text>
          </MotiView>

          {workoutPlan.plan_exercises.length === 0 ? (
            <MotiView
              from={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'timing', duration: 250 }}
              className="p-6 items-center border border-dashed border-[#e2dfe1] dark:border-zinc-800 rounded-2xl"
            >
              <Barbell size={32} color={isDark ? '#71717a' : '#a1a1aa'} />
              {/* Texto de Lista Vazia em DM Sans Bold */}
              <Text className="text-xs font-sans-bold text-[#71717a] dark:text-zinc-400 mt-2 text-center">
                Nenhum exercício registrado nesta ficha.
              </Text>
            </MotiView>
          ) : (
            workoutPlan.plan_exercises.map((exercise, index) => (
              <MotiView
                key={exercise.id || index}
                from={{ opacity: 0, translateY: 14, scale: 0.97 }}
                animate={{ opacity: 1, translateY: 0, scale: 1 }}
                transition={{
                  type: 'spring',
                  damping: 22,
                  stiffness: 150,
                  delay: index * 40,
                }}
              >
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    if (exercise.exercise_id) {
                      router.push(`/(aluno)/exercise/${exercise.exercise_id}` as any);
                    }
                  }}
                  className="bg-[#f8f9fa] dark:bg-zinc-900 p-4 rounded-2xl mb-3 border border-[#e2dfe1] dark:border-zinc-800"
                >
                  <View className="flex-row items-center justify-between mb-2">
                    {/* Nome do Exercício em Outfit Bold */}
                    <Text className="text-sm font-outfit text-[#1b1b1d] dark:text-white flex-1 mr-2">
                      {index + 1}. {exercise.name}
                    </Text>

                    <View className="bg-[#59C83A] px-3 py-1 rounded-lg">
                      {/* Séries e Repetições em DM Sans Bold */}
                      <Text className="text-xs font-sans-bold text-white">
                        {exercise.sets}x {exercise.reps}
                      </Text>
                    </View>
                  </View>

                  {exercise.notes ? (
                    <View className="mt-1 bg-white dark:bg-zinc-950 p-2.5 rounded-xl border border-[#e2dfe1] dark:border-zinc-800 mb-2">
                      {/* Observação em DM Sans Medium/Bold */}
                      <Text className="text-xs font-sans-medium text-[#71717a] dark:text-zinc-400">
                        💬 <Text className="font-sans-bold text-[#1b1b1d] dark:text-white">Observação / Carga:</Text>{' '}
                        {exercise.notes}
                      </Text>
                    </View>
                  ) : null}

                  <View className="flex-row items-center justify-between pt-2.5 border-t border-[#e2dfe1] dark:border-zinc-800/80 mt-1">
                    <View className="flex-row items-center">
                      <PlayCircle size={16} color="#59C83A" weight="bold" />
                      {/* Texto de Ação em DM Sans Bold */}
                      <Text className="text-xs font-sans-bold text-[#59C83A] ml-1.5">
                        Ver execução e postura (GIF)
                      </Text>
                    </View>
                    <CaretRight size={14} color="#59C83A" weight="bold" />
                  </View>
                </TouchableOpacity>
              </MotiView>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}