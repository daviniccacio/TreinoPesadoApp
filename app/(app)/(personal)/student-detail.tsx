import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  useColorScheme,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  User,
  Trophy,
  CalendarBlank,
  PlusCircle,
  Books,
  Trash,
  Barbell,
  Target,
  PencilSimple,
} from 'phosphor-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';

interface StudentStats {
  totalWorkouts: number;
  lastWorkoutDate: string | null;
}

interface StudentWorkoutPlan {
  id: string;
  name: string;
  description: string | null;
  objective: string | null;
  days_of_week: string[] | null;
  created_at: string;
}

interface StudentDetailData {
  studentName: string;
  stats: StudentStats;
  workoutPlans: StudentWorkoutPlan[];
}

/**
 * Busca consolidada das métricas e das fichas do aluno no Supabase
 */
async function fetchStudentDetailData(
  studentId?: string,
  fallbackName?: string
): Promise<StudentDetailData> {
  if (!studentId) {
    return {
      studentName: fallbackName || 'Aluno',
      stats: { totalWorkouts: 0, lastWorkoutDate: null },
      workoutPlans: [],
    };
  }

  // 1. Perfil do aluno
  const { data: profileData } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', studentId)
    .single();

  const studentName = profileData?.full_name || fallbackName || 'Aluno';

  // 2. Contagem de treinos concluídos
  const { count } = await supabase
    .from('workout_logs')
    .select('*', { count: 'exact', head: true })
    .eq('student_id', studentId);

  // 3. Último treino concluído
  const { data: lastWorkout } = await supabase
    .from('workout_logs')
    .select('created_at')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // 4. Planos de treino atribuídos ao aluno
  const { data: plansData, error: plansError } = await supabase
    .from('workout_plans')
    .select('id, name, description, objective, days_of_week, created_at')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });

  if (plansError) {
    console.error('Erro ao buscar planos do aluno:', plansError.message);
  }

  return {
    studentName,
    stats: {
      totalWorkouts: count || 0,
      lastWorkoutDate: lastWorkout?.created_at || null,
    },
    workoutPlans: plansData || [],
  };
}

export default function StudentDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const queryClient = useQueryClient();

  const params = useLocalSearchParams<{ id?: string; full_name?: string }>();
  const studentId = params.id;

  // --- BUSCA REATIVA COM TANSTACK QUERY ---
  const {
    data: detailData,
    isLoading,
  } = useQuery({
    queryKey: ['personal-student-detail', studentId],
    queryFn: () => fetchStudentDetailData(studentId, params.full_name),
    enabled: !!studentId,
  });

  // --- MUTAÇÃO PARA EXCLUIR PLANO DE TREINO ---
  const deletePlanMutation = useMutation({
    mutationFn: async (planId: string) => {
      const { error } = await supabase
        .from('workout_plans')
        .delete()
        .eq('id', planId);

      if (error) throw new Error(error.message);
      return planId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['personal-student-detail', studentId],
      });
      queryClient.invalidateQueries({ queryKey: ['student-workouts'] });
      queryClient.invalidateQueries({ queryKey: ['personal-profile-data'] });
      Alert.alert('Sucesso', 'Plano de treino removido!');
    },
    onError: (error: any) => {
      Alert.alert('Erro', error.message || 'Não foi possível excluir o plano.');
    },
  });

  function handleDeletePlan(planId: string, planName: string) {
    Alert.alert(
      'Excluir Plano',
      `Tem certeza que deseja excluir o plano "${planName}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => deletePlanMutation.mutate(planId),
        },
      ]
    );
  }

  function formatDate(isoString: string | null) {
    if (!isoString) return 'Sem registros';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return 'Data inválida';
    }
  }

  const studentName = detailData?.studentName || params.full_name || 'Aluno';
  const stats = detailData?.stats || { totalWorkouts: 0, lastWorkoutDate: null };
  const workoutPlans = detailData?.workoutPlans || [];

  return (
    <View
      className="flex-1 bg-white dark:bg-zinc-950 px-5"
      style={{ paddingTop: insets.top + 10 }}
    >
      {/* Cabeçalho */}
      <View className="flex-row items-center mb-6">
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.back()}
          className="w-10 h-10 rounded-xl bg-[#f8f9fa] dark:bg-zinc-900 justify-center items-center mr-3 border border-[#e2dfe1] dark:border-zinc-800"
        >
          <ArrowLeft size={20} color={isDark ? '#ffffff' : '#1b1b1d'} />
        </TouchableOpacity>

        <View className="flex-1">
          <Text className="text-xl font-extrabold text-[#1b1b1d] dark:text-white" numberOfLines={1}>
            {isLoading && !studentName ? 'Carregando...' : studentName}
          </Text>
          <Text className="text-xs text-[#71717a] dark:text-zinc-400">
            Acompanhamento de progresso
          </Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Cartão do Perfil */}
        <View className="bg-[#f8f9fa] dark:bg-zinc-900 p-5 rounded-3xl border border-[#e2dfe1] dark:border-zinc-800 flex-row items-center mb-6">
          <View className="w-14 h-14 rounded-2xl bg-[#59C83A]/10 items-center justify-center border border-[#59C83A]/30 mr-4">
            <User size={28} color="#59C83A" weight="bold" />
          </View>
          <View className="flex-1">
            <Text className="text-lg font-bold text-[#1b1b1d] dark:text-white">
              {studentName}
            </Text>
            <Text className="text-xs text-[#59C83A] font-semibold mt-0.5">
              Aluno Ativo
            </Text>
          </View>
        </View>

        {/* Resumo de Atividades */}
        <Text className="text-sm font-bold text-[#1b1b1d] dark:text-white mb-3">
          Resumo de Atividades
        </Text>

        {isLoading ? (
          <View className="p-8 items-center">
            <ActivityIndicator size="small" color="#59C83A" />
          </View>
        ) : (
          <View className="flex-row gap-3 mb-6">
            <View className="flex-1 bg-[#f8f9fa] dark:bg-zinc-900 p-4 rounded-2xl border border-[#e2dfe1] dark:border-zinc-800">
              <Trophy size={22} color="#59C83A" weight="bold" />
              <Text className="text-2xl font-black text-[#1b1b1d] dark:text-white mt-2">
                {stats.totalWorkouts}
              </Text>
              <Text className="text-[11px] text-[#71717a] dark:text-zinc-400 font-medium">
                Treinos Concluídos
              </Text>
            </View>

            <View className="flex-1 bg-[#f8f9fa] dark:bg-zinc-900 p-4 rounded-2xl border border-[#e2dfe1] dark:border-zinc-800">
              <CalendarBlank size={22} color="#59C83A" weight="bold" />
              <Text className="text-xs font-bold text-[#1b1b1d] dark:text-white mt-2" numberOfLines={1}>
                {formatDate(stats.lastWorkoutDate)}
              </Text>
              <Text className="text-[11px] text-[#71717a] dark:text-zinc-400 font-medium mt-1">
                Última Atividade
              </Text>
            </View>
          </View>
        )}

        {/* Ações para Prescrever Treino */}
        <Text className="text-sm font-bold text-[#1b1b1d] dark:text-white mb-3">
          Prescrever Treino
        </Text>

        {/* Botão 1: Criar Treino do Zero */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() =>
            router.push({
              pathname: '/(personal)/create-workout',
              params: { studentId, studentName },
            })
          }
          className="bg-[#59C83A] p-4 rounded-2xl flex-row items-center mb-3 shadow-sm"
        >
          <PlusCircle size={24} color="#FFFFFF" weight="bold" />
          <View className="ml-3 flex-1">
            <Text className="text-white font-bold text-base">
              Criar Treino do Zero
            </Text>
            <Text className="text-white/80 text-xs">
              Monte uma ficha personalizada para este aluno
            </Text>
          </View>
        </TouchableOpacity>

        {/* Botão 2: Usar da Biblioteca */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() =>
            router.push({
              pathname: '/(personal)/routines',
              params: { assignToStudentId: studentId },
            })
          }
          className="bg-[#f8f9fa] dark:bg-zinc-900 p-4 rounded-2xl border border-[#e2dfe1] dark:border-zinc-800 flex-row items-center mb-6"
        >
          <Books size={24} color="#59C83A" weight="bold" />
          <View className="ml-3 flex-1">
            <Text className="text-[#1b1b1d] dark:text-white font-bold text-base">
              Usar Modelo da Biblioteca
            </Text>
            <Text className="text-[#71717a] dark:text-zinc-400 text-xs">
              Escolha uma rotina pronta para vincular
            </Text>
          </View>
        </TouchableOpacity>

        {/* LISTA DE PLANOS DE TREINO ATRIBUÍDOS */}
        <Text className="text-sm font-bold text-[#1b1b1d] dark:text-white mb-3">
          Planos de Treino do Aluno ({workoutPlans.length})
        </Text>

        {workoutPlans.length === 0 ? (
          <View className="bg-[#f8f9fa] dark:bg-zinc-900 p-6 rounded-2xl border border-dashed border-[#e2dfe1] dark:border-zinc-800 items-center justify-center">
            <Barbell size={32} color={isDark ? '#71717a' : '#a1a1aa'} />
            <Text className="text-xs font-bold text-[#1b1b1d] dark:text-white mt-2 text-center">
              Nenhum plano de treino atribuído
            </Text>
            <Text className="text-[11px] text-[#71717a] dark:text-zinc-400 text-center mt-1">
              Clique no botão verde acima para prescrever a primeira ficha de treino para este aluno.
            </Text>
          </View>
        ) : (
          workoutPlans.map((plan) => (
            <View
              key={plan.id}
              className="bg-[#f8f9fa] dark:bg-zinc-900 p-4 rounded-2xl border border-[#e2dfe1] dark:border-zinc-800 mb-3"
            >
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-base font-extrabold text-[#1b1b1d] dark:text-white flex-1 mr-2">
                  {plan.name}
                </Text>

                <View className="flex-row items-center gap-2">
                  {/* Botão para EDITAR o Plano */}
                  <TouchableOpacity
                    onPress={() =>
                      router.push({
                        pathname: '/(personal)/create-workout',
                        params: { planId: plan.id, studentId, studentName },
                      })
                    }
                    className="w-8 h-8 rounded-lg bg-[#59C83A]/10 items-center justify-center border border-[#59C83A]/30"
                  >
                    <PencilSimple size={16} color="#59C83A" weight="bold" />
                  </TouchableOpacity>

                  {/* Botão para APAGAR o Plano */}
                  <TouchableOpacity
                    onPress={() => handleDeletePlan(plan.id, plan.name)}
                    disabled={deletePlanMutation.isPending}
                    className="w-8 h-8 rounded-lg bg-red-500/10 items-center justify-center border border-red-500/20"
                  >
                    <Trash size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>

              {plan.description ? (
                <Text className="text-xs text-[#71717a] dark:text-zinc-400 mb-3">
                  {plan.description}
                </Text>
              ) : null}

              <View className="flex-row flex-wrap items-center gap-2 pt-2 border-t border-[#e2dfe1] dark:border-zinc-800">
                {plan.objective ? (
                  <View className="bg-[#59C83A]/10 px-2.5 py-1 rounded-md flex-row items-center border border-[#59C83A]/30">
                    <Target size={12} color="#59C83A" weight="bold" />
                    <Text className="text-[10px] font-bold text-[#59C83A] ml-1">
                      {plan.objective}
                    </Text>
                  </View>
                ) : null}

                {plan.days_of_week && plan.days_of_week.length > 0 ? (
                  <View className="bg-[#f0f0f0] dark:bg-zinc-800 px-2.5 py-1 rounded-md border border-[#e2dfe1] dark:border-zinc-700">
                    <Text className="text-[10px] font-bold text-[#71717a] dark:text-zinc-300">
                      {plan.days_of_week.join(', ')}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}