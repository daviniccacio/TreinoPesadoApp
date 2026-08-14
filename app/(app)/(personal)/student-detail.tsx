import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  useColorScheme,
  Alert,
} from 'react-[#1b1b1d]';
import {
  View as RNView,
  Text as RNText,
  TouchableOpacity as RNTouchableOpacity,
  ActivityIndicator as RNActivityIndicator,
  ScrollView as RNScrollView,
  useColorScheme as RNuseColorScheme,
  Alert as RNAlert,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
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

export default function StudentDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colorScheme = RNuseColorScheme();
  const isDark = colorScheme === 'dark';

  const params = useLocalSearchParams<{ id?: string; full_name?: string }>();
  const studentId = params.id;

  const [studentName, setStudentName] = useState<string>(params.full_name || '');
  const [loading, setLoading] = useState<boolean>(true);
  const [stats, setStats] = useState<StudentStats>({
    totalWorkouts: 0,
    lastWorkoutDate: null,
  });
  const [workoutPlans, setWorkoutPlans] = useState<StudentWorkoutPlan[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (studentId) {
        fetchStudentData(studentId);
      } else {
        setLoading(false);
      }
    }, [studentId])
  );

  async function fetchStudentData(id: string) {
    try {
      setLoading(true);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', id)
        .single();

      if (profileData?.full_name) {
        setStudentName(profileData.full_name);
      }

      const { count } = await supabase
        .from('workout_logs')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', id);

      const { data: lastWorkout } = await supabase
        .from('workout_logs')
        .select('created_at')
        .eq('student_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: plansData, error: plansError } = await supabase
        .from('workout_plans')
        .select('id, name, description, objective, days_of_week, created_at')
        .eq('student_id', id)
        .order('created_at', { ascending: false });

      if (plansError) {
        console.error('Erro ao buscar planos do aluno:', plansError.message);
      } else if (plansData) {
        setWorkoutPlans(plansData);
      }

      setStats({
        totalWorkouts: count || 0,
        lastWorkoutDate: lastWorkout?.created_at || null,
      });
    } catch (error) {
      console.error('Erro inesperado ao carregar dados do aluno:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleDeletePlan(planId: string, planName: string) {
    RNAlert.alert(
      'Excluir Plano',
      `Tem certeza que deseja excluir o plano "${planName}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('workout_plans')
                .delete()
                .eq('id', planId);

              if (error) {
                RNAlert.alert('Erro', 'Não foi possível excluir o plano de treino.');
              } else {
                setWorkoutPlans((prev) => prev.filter((plan) => plan.id !== planId));
                RNAlert.alert('Sucesso', 'Plano de treino removido!');
              }
            } catch (err) {
              console.error('Erro ao excluir plano:', err);
            }
          },
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

  return (
    <RNView
      className="flex-1 bg-white dark:bg-zinc-950 px-5"
      style={{ paddingTop: insets.top + 10 }}
    >
      {/* Cabeçalho */}
      <RNView className="flex-row items-center mb-6">
        <RNTouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.back()}
          className="w-10 h-10 rounded-xl bg-[#f8f9fa] dark:bg-zinc-900 justify-center items-center mr-3 border border-[#e2dfe1] dark:border-zinc-800"
        >
          <ArrowLeft size={20} color={isDark ? '#ffffff' : '#1b1b1d'} />
        </RNTouchableOpacity>

        <RNView className="flex-1">
          <RNText className="text-xl font-extrabold text-[#1b1b1d] dark:text-white" numberOfLines={1}>
            {loading && !studentName ? 'Carregando...' : studentName || 'Aluno'}
          </RNText>
          <RNText className="text-xs text-[#71717a] dark:text-zinc-400">
            Acompanhamento de progresso
          </RNText>
        </RNView>
      </RNView>

      <RNScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Cartão do Perfil */}
        <RNView className="bg-[#f8f9fa] dark:bg-zinc-900 p-5 rounded-3xl border border-[#e2dfe1] dark:border-zinc-800 flex-row items-center mb-6">
          <RNView className="w-14 h-14 rounded-2xl bg-[#59C83A]/10 items-center justify-center border border-[#59C83A]/30 mr-4">
            <User size={28} color="#59C83A" weight="bold" />
          </RNView>
          <RNView className="flex-1">
            <RNText className="text-lg font-bold text-[#1b1b1d] dark:text-white">
              {studentName || 'Aluno'}
            </RNText>
            <RNText className="text-xs text-[#59C83A] font-semibold mt-0.5">
              Aluno Ativo
            </RNText>
          </RNView>
        </RNView>

        {/* Resumo de Atividades */}
        <RNText className="text-sm font-bold text-[#1b1b1d] dark:text-white mb-3">
          Resumo de Atividades
        </RNText>

        {loading ? (
          <RNView className="p-8 items-center">
            <RNActivityIndicator size="small" color="#59C83A" />
          </RNView>
        ) : (
          <RNView className="flex-row gap-3 mb-6">
            <RNView className="flex-1 bg-[#f8f9fa] dark:bg-zinc-900 p-4 rounded-2xl border border-[#e2dfe1] dark:border-zinc-800">
              <Trophy size={22} color="#59C83A" weight="bold" />
              <RNText className="text-2xl font-black text-[#1b1b1d] dark:text-white mt-2">
                {stats.totalWorkouts}
              </RNText>
              <RNText className="text-[11px] text-[#71717a] dark:text-zinc-400 font-medium">
                Treinos Concluídos
              </RNText>
            </RNView>

            <RNView className="flex-1 bg-[#f8f9fa] dark:bg-zinc-900 p-4 rounded-2xl border border-[#e2dfe1] dark:border-zinc-800">
              <CalendarBlank size={22} color="#59C83A" weight="bold" />
              <RNText className="text-xs font-bold text-[#1b1b1d] dark:text-white mt-2" numberOfLines={1}>
                {formatDate(stats.lastWorkoutDate)}
              </RNText>
              <RNText className="text-[11px] text-[#71717a] dark:text-zinc-400 font-medium mt-1">
                Última Atividade
              </RNText>
            </RNView>
          </RNView>
        )}

        {/* Ações para Prescrever Treino */}
        <RNText className="text-sm font-bold text-[#1b1b1d] dark:text-white mb-3">
          Prescrever Treino
        </RNText>

        {/* Botão 1: Criar Treino do Zero */}
        <RNTouchableOpacity
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
          <RNView className="ml-3 flex-1">
            <RNText className="text-white font-bold text-base">
              Criar Treino do Zero
            </RNText>
            <RNText className="text-white/80 text-xs">
              Monte uma ficha personalizada para este aluno
            </RNText>
          </RNView>
        </RNTouchableOpacity>

        {/* Botão 2: Usar da Biblioteca (RELOCCADO) */}
        <RNTouchableOpacity
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
          <RNView className="ml-3 flex-1">
            <RNText className="text-[#1b1b1d] dark:text-white font-bold text-base">
              Usar Modelo da Biblioteca
            </RNText>
            <RNText className="text-[#71717a] dark:text-zinc-400 text-xs">
              Escolha uma rotina pronta para vincular
            </RNText>
          </RNView>
        </RNTouchableOpacity>

        {/* LISTA DE PLANOS DE TREINO ATRIBUÍDOS */}
        <RNText className="text-sm font-bold text-[#1b1b1d] dark:text-white mb-3">
          Planos de Treino do Aluno ({workoutPlans.length})
        </RNText>

        {workoutPlans.length === 0 ? (
          <RNView className="bg-[#f8f9fa] dark:bg-zinc-900 p-6 rounded-2xl border border-dashed border-[#e2dfe1] dark:border-zinc-800 items-center justify-center">
            <Barbell size={32} color={isDark ? '#71717a' : '#a1a1aa'} />
            <RNText className="text-xs font-bold text-[#1b1b1d] dark:text-white mt-2 text-center">
              Nenhum plano de treino atribuído
            </RNText>
            <RNText className="text-[11px] text-[#71717a] dark:text-zinc-400 text-center mt-1">
              Clica no botão verde acima para prescrever a primeira ficha de treino para este aluno.
            </RNText>
          </RNView>
        ) : (
          workoutPlans.map((plan) => (
            <RNView
              key={plan.id}
              className="bg-[#f8f9fa] dark:bg-zinc-900 p-4 rounded-2xl border border-[#e2dfe1] dark:border-zinc-800 mb-3"
            >
              <RNView className="flex-row items-center justify-between mb-2">
                <RNText className="text-base font-extrabold text-[#1b1b1d] dark:text-white flex-1 mr-2">
                  {plan.name}
                </RNText>

                <RNView className="flex-row items-center gap-2">
                  {/* Botão para EDITAR o Plano */}
                  <RNTouchableOpacity
                    onPress={() =>
                      router.push({
                        pathname: '/(personal)/create-workout',
                        params: { planId: plan.id, studentId, studentName },
                      })
                    }
                    className="w-8 h-8 rounded-lg bg-[#59C83A]/10 items-center justify-center border border-[#59C83A]/30"
                  >
                    <PencilSimple size={16} color="#59C83A" weight="bold" />
                  </RNTouchableOpacity>

                  {/* Botão para APAGAR o Plano */}
                  <RNTouchableOpacity
                    onPress={() => handleDeletePlan(plan.id, plan.name)}
                    className="w-8 h-8 rounded-lg bg-red-500/10 items-center justify-center border border-red-500/20"
                  >
                    <Trash size={16} color="#ef4444" />
                  </RNTouchableOpacity>
                </RNView>
              </RNView>

              {plan.description ? (
                <RNText className="text-xs text-[#71717a] dark:text-zinc-400 mb-3">
                  {plan.description}
                </RNText>
              ) : null}

              <RNView className="flex-row flex-wrap items-center gap-2 pt-2 border-t border-[#e2dfe1] dark:border-zinc-800">
                {plan.objective ? (
                  <RNView className="bg-[#59C83A]/10 px-2.5 py-1 rounded-md flex-row items-center border border-[#59C83A]/30">
                    <Target size={12} color="#59C83A" weight="bold" />
                    <RNText className="text-[10px] font-bold text-[#59C83A] ml-1">
                      {plan.objective}
                    </RNText>
                  </RNView>
                ) : null}

                {plan.days_of_week && plan.days_of_week.length > 0 ? (
                  <RNView className="bg-[#f0f0f0] dark:bg-zinc-800 px-2.5 py-1 rounded-md border border-[#e2dfe1] dark:border-zinc-700">
                    <RNText className="text-[10px] font-bold text-[#71717a] dark:text-zinc-300">
                      {plan.days_of_week.join(', ')}
                    </RNText>
                  </RNView>
                ) : null}
              </RNView>
            </RNView>
          ))
        )}
      </RNScrollView>
    </RNView>
  );
}