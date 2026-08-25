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
      router.replace('/(app)/(aluno)');
    }
  }, [router]);

  return (
    <View
      className="flex-1 bg-white dark:bg-zinc-950 px-5"
      style={{ paddingTop: insets.top + 10 }}
    >
      {/* CABEÇALHO */}
      <View className="flex-row items-center mb-5">
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleNavigateBack}
          className="w-10 h-10 rounded-xl bg-[#f8f9fa] dark:bg-zinc-900 justify-center items-center mr-3 border border-[#e2dfe1] dark:border-zinc-800"
        >
          <ArrowLeft size={20} color={isDark ? '#ffffff' : '#1b1b1d'} />
        </TouchableOpacity>

        <View className="flex-1">
          <Text className="text-xl font-extrabold text-[#1b1b1d] dark:text-white" numberOfLines={1}>
            Ficha de Treino
          </Text>
          <Text className="text-xs text-[#59C83A] font-bold">
            Prescrição Profissional
          </Text>
        </View>
      </View>

      {/* CONTEÚDO PRINCIPAL */}
      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#59C83A" />
          <Text className="text-xs text-[#71717a] dark:text-zinc-400 mt-3 font-medium">
            Carregando exercícios da ficha...
          </Text>
        </View>
      ) : isError || !workoutPlan ? (
        <View className="flex-1 justify-center items-center px-6">
          <Info size={40} color="#ef4444" />
          <Text className="text-[#1b1b1d] dark:text-white font-bold text-base mt-3 text-center">
            {error?.message || 'Ficha de treino não encontrada.'}
          </Text>
          <TouchableOpacity
            onPress={handleNavigateBack}
            className="mt-4 bg-[#59C83A] px-5 py-2.5 rounded-xl"
          >
            <Text className="text-white font-bold text-xs">Voltar para Meus Treinos</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* CARTÃO RESUMO DA FICHA */}
          <View className="bg-[#f8f9fa] dark:bg-zinc-900 p-5 rounded-3xl border border-[#e2dfe1] dark:border-zinc-800 mb-4">
            <View className="flex-row items-center justify-between mb-3">
              <View className="bg-[#59C83A]/10 px-3 py-1 rounded-full border border-[#59C83A]/30 flex-row items-center">
                <UserCheck size={14} color="#59C83A" weight="bold" />
                <Text className="text-xs font-extrabold text-[#59C83A] ml-1.5">
                  Personal Trainer
                </Text>
              </View>

              <Text className="text-xs font-bold text-[#71717a] dark:text-zinc-400">
                {workoutPlan.plan_exercises.length} Exercício(s)
              </Text>
            </View>

            <Text className="text-2xl font-black text-[#1b1b1d] dark:text-white mb-2">
              {workoutPlan.name}
            </Text>

            {workoutPlan.description && (
              <Text className="text-xs text-[#71717a] dark:text-zinc-400 mb-4 font-medium leading-5">
                {workoutPlan.description}
              </Text>
            )}

            {/* TAGS DE OBJETIVO E DIAS DA SEMANA */}
            <View className="flex-row flex-wrap gap-2 pt-3 border-t border-[#e2dfe1] dark:border-zinc-800">
              {workoutPlan.objective && (
                <View className="bg-[#59C83A]/10 px-3 py-1.5 rounded-xl flex-row items-center border border-[#59C83A]/30">
                  <Target size={14} color="#59C83A" weight="bold" />
                  <Text className="text-xs font-bold text-[#59C83A] ml-1.5">
                    {workoutPlan.objective}
                  </Text>
                </View>
              )}

              {workoutPlan.days_of_week && workoutPlan.days_of_week.length > 0 && (
                <View className="bg-white dark:bg-zinc-950 px-3 py-1.5 rounded-xl border border-[#e2dfe1] dark:border-zinc-800 flex-row items-center">
                  <CalendarBlank size={14} color={isDark ? '#a1a1aa' : '#71717a'} />
                  <Text className="text-xs font-bold text-[#71717a] dark:text-zinc-300 ml-1.5">
                    {workoutPlan.days_of_week.join(', ')}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* BOTÃO DE INICIAR O TREINO EM TEMPO REAL */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() =>
              router.push({
                pathname: '/(aluno)/execute-workout',
                params: { id: workoutPlan.id, type: 'personal' },
              })
            }
            className="bg-[#59C83A] p-4 rounded-2xl flex-row items-center justify-center mb-6 shadow-sm"
          >
            <PlayCircle size={24} color="#FFFFFF" weight="bold" />
            <Text className="text-white font-extrabold text-base ml-2">
              Iniciar Treino Agora
            </Text>
          </TouchableOpacity>

          {/* LISTA DE EXERCÍCIOS */}
          <Text className="text-base font-extrabold text-[#1b1b1d] dark:text-white mb-1">
            Exercícios Prescritos
          </Text>
          <Text className="text-xs text-[#71717a] dark:text-zinc-400 mb-3 font-medium">
            Toque em qualquer exercício para ver a demonstração em vídeo/GIF.
          </Text>

          {workoutPlan.plan_exercises.length === 0 ? (
            <View className="p-6 items-center border border-dashed border-[#e2dfe1] dark:border-zinc-800 rounded-2xl">
              <Barbell size={32} color={isDark ? '#71717a' : '#a1a1aa'} />
              <Text className="text-xs font-bold text-[#71717a] dark:text-zinc-400 mt-2 text-center">
                Nenhum exercício registrado nesta ficha.
              </Text>
            </View>
          ) : (
            workoutPlan.plan_exercises.map((exercise, index) => (
              <TouchableOpacity
                key={exercise.id || index}
                activeOpacity={0.7}
                onPress={() => {
                  if (exercise.exercise_id) {
                    router.push(`/(aluno)/exercise/${exercise.exercise_id}`);
                  }
                }}
                className="bg-[#f8f9fa] dark:bg-zinc-900 p-4 rounded-2xl mb-3 border border-[#e2dfe1] dark:border-zinc-800"
              >
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-sm font-extrabold text-[#1b1b1d] dark:text-white flex-1 mr-2">
                    {index + 1}. {exercise.name}
                  </Text>

                  <View className="bg-[#59C83A] px-3 py-1 rounded-lg">
                    <Text className="text-xs font-black text-white">
                      {exercise.sets}x {exercise.reps}
                    </Text>
                  </View>
                </View>

                {exercise.notes ? (
                  <View className="mt-1 bg-white dark:bg-zinc-950 p-2.5 rounded-xl border border-[#e2dfe1] dark:border-zinc-800 mb-2">
                    <Text className="text-xs text-[#71717a] dark:text-zinc-400 font-medium">
                      💬 <Text className="font-bold text-[#1b1b1d] dark:text-white">Observação / Carga:</Text>{' '}
                      {exercise.notes}
                    </Text>
                  </View>
                ) : null}

                <View className="flex-row items-center justify-between pt-2.5 border-t border-[#e2dfe1] dark:border-zinc-800/80 mt-1">
                  <View className="flex-row items-center">
                    <PlayCircle size={16} color="#59C83A" weight="bold" />
                    <Text className="text-xs font-bold text-[#59C83A] ml-1.5">
                      Ver execução e postura (GIF)
                    </Text>
                  </View>
                  <CaretRight size={14} color="#59C83A" weight="bold" />
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}