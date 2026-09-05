import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  useColorScheme,
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
  UserMinus,
} from 'phosphor-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MotiView } from 'moti';
import { supabase } from '../../../lib/supabase';
import { CustomModal } from '../../../components/CustomModal';

interface StudentStats {
  prescribedWorkouts: number;
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

interface ShowAlertModalOptions {
  title: string;
  message: string;
  type?: 'success' | 'danger' | 'info';
  confirmText?: string;
  cancelText?: string;
  showCancelButton?: boolean;
  onConfirm?: () => void;
}

async function fetchStudentDetailData(
  studentId?: string,
  fallbackName?: string
): Promise<StudentDetailData> {
  if (!studentId) {
    return {
      studentName: fallbackName || 'Aluno',
      stats: { prescribedWorkouts: 0, totalWorkouts: 0, lastWorkoutDate: null },
      workoutPlans: [],
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('full_name, personal_id')
    .eq('id', studentId)
    .single();

  if (profileError || !profileData) {
    throw new Error('Aluno não encontrado ou acesso não autorizado.');
  }

  if (profileData.personal_id !== user?.id && studentId !== user?.id) {
    throw new Error('Acesso negado: este aluno pertence a outro personal.');
  }

  const studentName = profileData.full_name || fallbackName || 'Aluno';

  const { data: plansData } = await supabase
    .from('workout_plans')
    .select('id, name, description, objective, days_of_week, created_at')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });

  const workoutPlans: StudentWorkoutPlan[] = plansData || [];
  const prescribedPlanNames = new Set(
    workoutPlans.map((plan) => plan.name.trim().toLowerCase())
  );

  const { data: logsData } = await supabase
    .from('workout_logs')
    .select('workout_title, created_at')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });

  const logs = logsData || [];
  const totalWorkouts = logs.length;

  const prescribedWorkouts = logs.filter((log) =>
    prescribedPlanNames.has((log.workout_title || '').trim().toLowerCase())
  ).length;

  const lastWorkoutDate = logs.length > 0 ? logs[0].created_at : null;

  return {
    studentName,
    stats: {
      prescribedWorkouts,
      totalWorkouts,
      lastWorkoutDate,
    },
    workoutPlans,
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

  const [modalConfig, setModalConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'danger' | 'info';
    confirmText: string;
    cancelText: string;
    showCancelButton: boolean;
    onConfirm: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
    confirmText: 'Entendi',
    cancelText: 'Cancelar',
    showCancelButton: false,
    onConfirm: () => {},
  });

  function showAlertModal({
    title,
    message,
    type = 'info',
    confirmText = 'Entendi',
    cancelText = 'Cancelar',
    showCancelButton = false,
    onConfirm,
  }: ShowAlertModalOptions) {
    setModalConfig({
      visible: true,
      title,
      message,
      type,
      confirmText,
      cancelText,
      showCancelButton,
      onConfirm: () => {
        setModalConfig((prev) => ({ ...prev, visible: false }));
        if (onConfirm) onConfirm();
      },
    });
  }

  const { data: detailData, isLoading } = useQuery({
    queryKey: ['personal-student-detail', studentId],
    queryFn: () => fetchStudentDetailData(studentId, params.full_name),
    enabled: !!studentId,
  });

  // --- MUTAÇÃO DUPLA DE SEGURANÇA PARA DESVINCULAR ALUNO ---
  const unlinkStudentMutation = useMutation({
    mutationFn: async () => {
      if (!studentId) throw new Error('ID do aluno não informado');

      // Tentativa 1: Execução via Função RPC
      const { error: rpcError } = await supabase.rpc('unlink_student', {
        p_student_id: studentId,
      });

      // Tentativa 2: Fallback com UPDATE direto no banco
      if (rpcError) {
        console.warn('RPC falhou, executando Fallback direto:', rpcError.message);
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ personal_id: null })
          .eq('id', studentId);

        if (updateError) throw new Error(updateError.message);

        await supabase
          .from('workout_plans')
          .delete()
          .eq('student_id', studentId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries();

      showAlertModal({
        title: 'Aluno Desvinculado',
        message: 'O aluno foi desvinculado com sucesso e o acesso às fichas foi revogado.',
        type: 'success',
        showCancelButton: false,
        onConfirm: () => router.back(),
      });
    },
    onError: (error: any) => {
      showAlertModal({
        title: 'Erro ao Desvincular',
        message: error.message || 'Não foi possível desvincular o aluno.',
        type: 'danger',
      });
    },
  });

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

      showAlertModal({
        title: 'Sucesso',
        message: 'Plano de treino removido com sucesso!',
        type: 'success',
      });
    },
    onError: (error: any) => {
      showAlertModal({
        title: 'Erro',
        message: error.message || 'Não foi possível excluir o plano.',
        type: 'danger',
      });
    },
  });

  function handleUnlinkStudent() {
    showAlertModal({
      title: 'Desvincular Aluno',
      message: `Tem certeza que deseja desvincular ${studentName}? O aluno perderá o vínculo e o acesso às fichas.`,
      type: 'danger',
      confirmText: 'Desvincular',
      cancelText: 'Cancelar',
      showCancelButton: true,
      onConfirm: () => unlinkStudentMutation.mutate(),
    });
  }

  function handleDeletePlan(planId: string, planName: string) {
    showAlertModal({
      title: 'Excluir Plano',
      message: `Tem certeza que deseja excluir o plano "${planName}"?`,
      type: 'danger',
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      showCancelButton: true,
      onConfirm: () => deletePlanMutation.mutate(planId),
    });
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
  const stats = detailData?.stats || {
    prescribedWorkouts: 0,
    totalWorkouts: 0,
    lastWorkoutDate: null,
  };
  const workoutPlans: StudentWorkoutPlan[] = detailData?.workoutPlans || [];

  const safeTopPadding = Math.max(insets?.top || 0, 16);

  return (
    <View
      className="flex-1 bg-white dark:bg-zinc-950 px-5"
      style={{ paddingTop: safeTopPadding + 10 }}
    >
      {/* 1. CABEÇALHO ANIMADO */}
      <MotiView
        from={{ opacity: 0, translateY: -12 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{
          type: 'spring',
          damping: 24,
          stiffness: 160,
        }}
        className="flex-row items-center mb-6"
      >
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.back()}
          className="w-10 h-10 rounded-xl bg-[#f8f9fa] dark:bg-zinc-900 justify-center items-center mr-3 border border-[#e2dfe1] dark:border-zinc-800"
        >
          <ArrowLeft size={20} color={isDark ? '#ffffff' : '#1b1b1d'} />
        </TouchableOpacity>

        <View className="flex-1">
          <Text
            className="text-xl font-extrabold text-[#1b1b1d] dark:text-white"
            numberOfLines={1}
          >
            {isLoading && !studentName ? 'Carregando...' : studentName}
          </Text>
          <Text className="text-xs text-[#71717a] dark:text-zinc-400 font-medium">
            Acompanhamento de progresso
          </Text>
        </View>
      </MotiView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* 2. CARTÃO DO ALUNO ANIMADO */}
        <MotiView
          from={{ opacity: 0, translateY: 10, scale: 0.98 }}
          animate={{ opacity: 1, translateY: 0, scale: 1 }}
          transition={{
            type: 'spring',
            damping: 22,
            stiffness: 150,
            delay: 20,
          }}
          className="bg-[#f8f9fa] dark:bg-zinc-900 p-5 rounded-3xl border border-[#e2dfe1] dark:border-zinc-800 mb-6"
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1 mr-2">
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

            <TouchableOpacity
              onPress={handleUnlinkStudent}
              disabled={unlinkStudentMutation.isPending}
              className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20"
            >
              <UserMinus size={20} color="#ef4444" weight="bold" />
            </TouchableOpacity>
          </View>
        </MotiView>

        {/* 3. RESUMO DE ATIVIDADES ANIMADO */}
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{
            type: 'spring',
            damping: 22,
            stiffness: 150,
            delay: 40,
          }}
        >
          <Text className="text-sm font-bold text-[#1b1b1d] dark:text-white mb-3">
            Resumo de Atividades
          </Text>

          {isLoading ? (
            <View className="p-8 items-center">
              <ActivityIndicator size="small" color="#59C83A" />
            </View>
          ) : (
            <View className="flex-row gap-2.5 mb-6">
              <View className="flex-1 bg-[#f8f9fa] dark:bg-zinc-900 p-3.5 rounded-2xl border border-[#e2dfe1] dark:border-zinc-800">
                <Trophy size={20} color="#59C83A" weight="bold" />
                <Text className="text-xl font-black text-[#1b1b1d] dark:text-white mt-1.5">
                  {stats.prescribedWorkouts}
                </Text>
                <Text className="text-[10px] text-[#71717a] dark:text-zinc-400 font-bold uppercase mt-0.5">
                  Sua Ficha
                </Text>
              </View>

              <View className="flex-1 bg-[#f8f9fa] dark:bg-zinc-900 p-3.5 rounded-2xl border border-[#e2dfe1] dark:border-zinc-800">
                <Barbell size={20} color="#3B82F6" weight="bold" />
                <Text className="text-xl font-black text-[#1b1b1d] dark:text-white mt-1.5">
                  {stats.totalWorkouts}
                </Text>
                <Text className="text-[10px] text-[#71717a] dark:text-zinc-400 font-bold uppercase mt-0.5">
                  Total Geral
                </Text>
              </View>

              <View className="flex-1 bg-[#f8f9fa] dark:bg-zinc-900 p-3.5 rounded-2xl border border-[#e2dfe1] dark:border-zinc-800">
                <CalendarBlank size={20} color="#59C83A" weight="bold" />
                <Text
                  className="text-xs font-bold text-[#1b1b1d] dark:text-white mt-2"
                  numberOfLines={1}
                >
                  {formatDate(stats.lastWorkoutDate)}
                </Text>
                <Text className="text-[10px] text-[#71717a] dark:text-zinc-400 font-bold uppercase mt-0.5">
                  Último Treino
                </Text>
              </View>
            </View>
          )}
        </MotiView>

        {/* 4. BOTÕES DE AÇÃO ANIMADOS */}
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{
            type: 'spring',
            damping: 22,
            stiffness: 150,
            delay: 60,
          }}
        >
          <Text className="text-sm font-bold text-[#1b1b1d] dark:text-white mb-3">
            Prescrever Treino
          </Text>

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
              <Text className="text-white/80 text-xs font-medium">
                Monte uma ficha personalizada para este aluno
              </Text>
            </View>
          </TouchableOpacity>
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{
            type: 'spring',
            damping: 22,
            stiffness: 150,
            delay: 80,
          }}
        >
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() =>
              router.push({
                pathname: '/(personal)/routines',
                params: {
                  assignToStudentId: studentId,
                  assignToStudentName: studentName,
                },
              })
            }
            className="bg-[#f8f9fa] dark:bg-zinc-900 p-4 rounded-2xl border border-[#e2dfe1] dark:border-zinc-800 flex-row items-center mb-6"
          >
            <Books size={24} color="#59C83A" weight="bold" />
            <View className="ml-3 flex-1">
              <Text className="text-[#1b1b1d] dark:text-white font-bold text-base">
                Usar Modelo da Biblioteca
              </Text>
              <Text className="text-[#71717a] dark:text-zinc-400 text-xs font-medium">
                Escolha uma rotina pronta para vincular
              </Text>
            </View>
          </TouchableOpacity>
        </MotiView>

        {/* 5. SEÇÃO DE PLANOS DO ALUNO ANIMADA */}
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{
            type: 'spring',
            damping: 22,
            stiffness: 150,
            delay: 100,
          }}
        >
          <Text className="text-sm font-bold text-[#1b1b1d] dark:text-white mb-3">
            Planos de Treino do Aluno ({workoutPlans.length})
          </Text>
        </MotiView>

        {workoutPlans.length === 0 ? (
          <MotiView
            from={{ opacity: 0, scale: 0.95, translateY: 10 }}
            animate={{ opacity: 1, scale: 1, translateY: 0 }}
            transition={{
              type: 'spring',
              damping: 22,
              stiffness: 150,
            }}
            className="bg-[#f8f9fa] dark:bg-zinc-900 p-6 rounded-2xl border border-dashed border-[#e2dfe1] dark:border-zinc-800 items-center justify-center"
          >
            <Barbell size={32} color={isDark ? '#71717a' : '#a1a1aa'} />
            <Text className="text-xs font-bold text-[#1b1b1d] dark:text-white mt-2 text-center">
              Nenhum plano de treino atribuído
            </Text>
            <Text className="text-[11px] text-[#71717a] dark:text-zinc-400 text-center mt-1 font-medium">
              Clique no botão verde acima para prescrever a primeira ficha de
              treino para este aluno.
            </Text>
          </MotiView>
        ) : (
          workoutPlans.map((plan: StudentWorkoutPlan, index: number) => (
            <MotiView
              key={plan.id}
              from={{ opacity: 0, translateY: 14, scale: 0.97 }}
              animate={{ opacity: 1, translateY: 0, scale: 1 }}
              transition={{
                type: 'spring',
                damping: 22,
                stiffness: 150,
                delay: index * 40,
              }}
              className="bg-[#f8f9fa] dark:bg-zinc-900 p-4 rounded-2xl border border-[#e2dfe1] dark:border-zinc-800 mb-3"
            >
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-base font-extrabold text-[#1b1b1d] dark:text-white flex-1 mr-2">
                  {plan.name}
                </Text>

                <View className="flex-row items-center gap-2">
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
                <Text className="text-xs text-[#71717a] dark:text-zinc-400 mb-3 font-medium">
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
            </MotiView>
          ))
        )}
      </ScrollView>

      <CustomModal
        visible={modalConfig.visible}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        confirmText={modalConfig.confirmText}
        cancelText={modalConfig.cancelText}
        showCancelButton={modalConfig.showCancelButton}
        onConfirm={modalConfig.onConfirm}
        onClose={() => setModalConfig((prev) => ({ ...prev, visible: false }))}
      />
    </View>
  );
}