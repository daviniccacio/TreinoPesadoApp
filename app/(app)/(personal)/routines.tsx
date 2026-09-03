import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  useColorScheme,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Plus,
  Barbell,
  Trash,
  Books,
  PencilSimple,
  UserPlus,
  X,
  Users,
} from 'phosphor-react-native';

import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { CustomModal } from '../../../components/CustomModal';

// --- TIPAGENS DE DADOS ---
interface RoutineItem {
  id: string;
  name: string;
  description: string | null;
  objective: string | null;
  days_of_week: string[] | null;
  plan_exercises: { id: string }[];
}

interface StudentItem {
  id: string;
  full_name: string;
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

/**
 * Busca os modelos de treino (onde student_id é NULL) do Personal no Supabase
 */
async function fetchLibraryRoutines(): Promise<RoutineItem[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from('workout_plans')
    .select(`
      id,
      name,
      description,
      objective,
      days_of_week,
      plan_exercises (id)
    `)
    .is('student_id', null)
    .eq('personal_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []) as unknown as RoutineItem[];
}

/**
 * Busca APENAS a lista de alunos vinculados ao Personal Trainer logado
 */
async function fetchStudentsList(): Promise<StudentItem[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('personal_id', user.id)
    .order('full_name', { ascending: true });

  if (error) {
    console.error('Erro ao buscar lista de alunos:', error.message);
    throw new Error(error.message);
  }

  return (data || []).map((student) => ({
    id: student.id,
    full_name:
      student.full_name && student.full_name.trim() !== ''
        ? student.full_name.trim()
        : 'Aluno sem nome',
  }));
}

export default function PersonalRoutinesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const queryClient = useQueryClient();

  const params = useLocalSearchParams<{
    assignToStudentId?: string;
    assignToStudentName?: string;
  }>();

  const initialStudentId = params.assignToStudentId;
  const initialStudentName = params.assignToStudentName || 'este aluno';

  // --- ESTADOS LOCAIS ---
  const [studentsModalVisible, setStudentsModalVisible] = useState<boolean>(false);
  const [selectedRoutine, setSelectedRoutine] = useState<RoutineItem | null>(null);

  // ESTADO DO MODAL PERSONALIZADO REUTILIZÁVEL
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

  function handleOpenAssignFlow(routine: RoutineItem) {
    setSelectedRoutine(routine);

    if (initialStudentId) {
      confirmAndAssignToStudent(routine, initialStudentId, initialStudentName);
    } else {
      setStudentsModalVisible(true);
    }
  }

  // --- BUSCA DAS ROTINAS ---
  const {
    data: routines = [],
    isLoading: loadingRoutines,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['personal-library-routines'],
    queryFn: fetchLibraryRoutines,
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  // --- BUSCA DE ALUNOS ---
  const {
    data: students = [],
    isLoading: loadingStudents,
  } = useQuery({
    queryKey: ['personal-students-list'],
    queryFn: fetchStudentsList,
    enabled: studentsModalVisible,
  });

  // --- MUTAÇÃO PARA EXCLUIR MODELO ---
  const deleteRoutineMutation = useMutation({
    mutationFn: async (routineId: string) => {
      const { error } = await supabase
        .from('workout_plans')
        .delete()
        .eq('id', routineId);

      if (error) throw new Error(error.message);
      return routineId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal-library-routines'] });
      queryClient.invalidateQueries({ queryKey: ['personal-profile-data'] });

      showAlertModal({
        title: 'Modelo Removido',
        message: 'O modelo de treino foi removido da sua biblioteca com sucesso.',
        type: 'success',
      });
    },
    onError: (err: any) => {
      showAlertModal({
        title: 'Erro ao Excluir',
        message: err.message || 'Não foi possível excluir o modelo de treino.',
        type: 'danger',
      });
    },
  });

  // --- MUTAÇÃO PARA ATRIBUIR O TREINO AO ALUNO ---
  const assignRoutineMutation = useMutation({
    mutationFn: async ({
      routine,
      studentId,
    }: {
      routine: RoutineItem;
      studentId: string;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data: newPlan, error: planError } = await supabase
        .from('workout_plans')
        .insert({
          name: routine.name,
          description: routine.description,
          objective: routine.objective,
          days_of_week: routine.days_of_week,
          student_id: studentId,
          personal_id: user?.id,
        })
        .select('id')
        .single();

      if (planError) throw new Error(planError.message);

      const { data: originalExercises, error: fetchExError } = await supabase
        .from('plan_exercises')
        .select('*')
        .eq('plan_id', routine.id);

      if (fetchExError) throw new Error(fetchExError.message);

      if (originalExercises && originalExercises.length > 0) {
        const newExercisesPayload = originalExercises.map((ex) => ({
          plan_id: newPlan.id,
          exercise_id: ex.exercise_id,
          name: ex.name,
          sets: ex.sets,
          reps: ex.reps,
          notes: ex.notes,
          order_index: ex.order_index,
        }));

        const { error: insertExError } = await supabase
          .from('plan_exercises')
          .insert(newExercisesPayload);

        if (insertExError) throw new Error(insertExError.message);
      }

      return studentId;
    },
    onSuccess: (studentId) => {
      setStudentsModalVisible(false);

      queryClient.invalidateQueries({
        queryKey: ['personal-student-detail', studentId],
      });
      queryClient.invalidateQueries({ queryKey: ['student-workouts'] });
      queryClient.invalidateQueries({ queryKey: ['personal-profile-data'] });

      showAlertModal({
        title: 'Treino Atribuído! 🎉',
        message: 'A ficha de treino foi vinculada ao aluno com sucesso.',
        type: 'success',
        confirmText: 'OK',
        onConfirm: () => {
          if (initialStudentId) router.back();
        },
      });
    },
    onError: (err: any) => {
      showAlertModal({
        title: 'Erro ao Atribuir',
        message: err.message || 'Ocorreu uma falha ao vincular o treino ao aluno.',
        type: 'danger',
      });
    },
  });

  function handleDeleteRoutine(routineId: string, routineName: string) {
    showAlertModal({
      title: 'Excluir Modelo',
      message: `Tem certeza que deseja apagar o modelo "${routineName}" da biblioteca?`,
      type: 'danger',
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      showCancelButton: true,
      onConfirm: () => deleteRoutineMutation.mutate(routineId),
    });
  }

  function confirmAndAssignToStudent(
    routine: RoutineItem,
    studentId: string,
    studentName: string
  ) {
    showAlertModal({
      title: 'Confirmar Atribuição',
      message: `Deseja atribuir uma cópia de "${routine.name}" para ${studentName}?`,
      type: 'info',
      confirmText: 'Atribuir',
      cancelText: 'Cancelar',
      showCancelButton: true,
      onConfirm: () => assignRoutineMutation.mutate({ routine, studentId }),
    });
  }

  return (
    <View
      className="flex-1 bg-white dark:bg-zinc-950 px-5"
      style={{ paddingTop: insets.top + 10 }}
    >
      {/* CABEÇALHO */}
      <View className="flex-row justify-between items-center mb-6 border-b border-[#f0edef] dark:border-zinc-800 pb-4">
        <View className="flex-1 mr-2">
          <Text className="text-2xl font-extrabold text-[#1b1b1d] dark:text-white">
            Biblioteca de Rotinas
          </Text>
          <Text className="text-sm text-[#71717a] dark:text-zinc-400 mt-1">
            Modelos de fichas reutilizáveis
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push('/(personal)/create-workout')}
          className="bg-[#59C83A] w-11 h-11 rounded-2xl justify-center items-center shadow-sm"
        >
          <Plus size={22} color="#FFFFFF" weight="bold" />
        </TouchableOpacity>
      </View>

      {/* CONTEÚDO DA LISTA */}
      {loadingRoutines ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#59C83A" />
        </View>
      ) : routines.length === 0 ? (
        <View className="flex-1 justify-center items-center px-6">
          <Books size={48} color={isDark ? '#71717a' : '#a1a1aa'} />
          <Text className="text-[#1b1b1d] dark:text-white font-bold text-base mt-4 text-center">
            Nenhum modelo cadastrado
          </Text>
          <Text className="text-xs text-[#71717a] dark:text-zinc-400 text-center mt-1">
            Clique no botão '+' no topo para criar sua primeira ficha modelo reutilizável.
          </Text>
        </View>
      ) : (
        <FlatList
          data={routines}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#59C83A"
            />
          }
          renderItem={({ item }) => {
            const exerciseCount = item.plan_exercises?.length || 0;

            return (
              <View className="bg-[#f8f9fa] dark:bg-zinc-900 p-4 rounded-2xl mb-3 border border-[#e2dfe1] dark:border-zinc-800 flex-row items-center justify-between">
                {/* ÁREA CLICÁVEL DO CARD: NAVEGA PARA OS DETALHES DO TREINO */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() =>
                    router.push({
                      pathname: '/(personal)/routine/[id]',
                      params: { id: item.id },
                    })
                  }
                  className="flex-row items-center flex-1 mr-2"
                >
                  <View className="w-12 h-12 rounded-2xl bg-[#59C83A]/10 items-center justify-center border border-[#59C83A]/30 mr-3">
                    <Barbell size={22} color="#59C83A" weight="bold" />
                  </View>

                  <View className="flex-1">
                    <Text className="text-base font-bold text-[#1b1b1d] dark:text-white">
                      {item.name}
                    </Text>
                    <Text className="text-xs text-[#71717a] dark:text-zinc-400 mt-0.5">
                      {exerciseCount} {exerciseCount === 1 ? 'exercício' : 'exercícios'}
                      {item.objective ? ` • ${item.objective}` : ''}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* AÇÕES DO CARTÃO */}
                <View className="flex-row items-center gap-2">
                  {/* 1. Botão Atribuir a Aluno */}
                  <TouchableOpacity
                    onPress={() => handleOpenAssignFlow(item)}
                    disabled={assignRoutineMutation.isPending}
                    className="w-9 h-9 rounded-xl bg-[#59C83A]/10 items-center justify-center border border-[#59C83A]/30"
                  >
                    <UserPlus size={18} color="#59C83A" weight="bold" />
                  </TouchableOpacity>

                  {/* 2. Botão Editar Modelo */}
                  <TouchableOpacity
                    onPress={() =>
                      router.push({
                        pathname: '/(personal)/create-workout',
                        params: { planId: item.id },
                      })
                    }
                    className="w-9 h-9 rounded-xl bg-zinc-200 dark:bg-zinc-800 items-center justify-center border border-zinc-300 dark:border-zinc-700"
                  >
                    <PencilSimple size={18} color={isDark ? '#ffffff' : '#1b1b1d'} weight="bold" />
                  </TouchableOpacity>

                  {/* 3. Botão Excluir Modelo */}
                  <TouchableOpacity
                    onPress={() => handleDeleteRoutine(item.id, item.name)}
                    disabled={deleteRoutineMutation.isPending}
                    className="w-9 h-9 rounded-xl bg-red-500/10 items-center justify-center border border-red-500/20"
                  >
                    <Trash size={18} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* MODAL DE SELEÇÃO DE ALUNOS */}
      <Modal visible={studentsModalVisible} animationType="slide" transparent>
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-white dark:bg-zinc-900 rounded-t-3xl p-5 h-[60%] border-t border-[#e2dfe1] dark:border-zinc-800">
            <View className="flex-row items-center justify-between mb-4 border-b border-[#e2dfe1] dark:border-zinc-800 pb-3">
              <View>
                <Text className="text-lg font-extrabold text-[#1b1b1d] dark:text-white">
                  Escolha o Aluno
                </Text>
                <Text className="text-xs text-[#59C83A] font-bold">
                  Para o treino: {selectedRoutine?.name}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setStudentsModalVisible(false)}
                className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 items-center justify-center"
              >
                <X size={18} color={isDark ? '#ffffff' : '#1b1b1d'} />
              </TouchableOpacity>
            </View>

            {loadingStudents ? (
              <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="large" color="#59C83A" />
              </View>
            ) : students.length === 0 ? (
              <View className="flex-1 items-center justify-center p-6">
                <Users size={32} color={isDark ? '#71717a' : '#a1a1aa'} />
                <Text className="text-xs text-[#71717a] dark:text-zinc-400 mt-2 text-center">
                  Nenhum aluno cadastrado no sistema.
                </Text>
              </View>
            ) : (
              <FlatList
                data={students}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() =>
                      selectedRoutine &&
                      confirmAndAssignToStudent(selectedRoutine, item.id, item.full_name)
                    }
                    className="p-4 rounded-xl bg-[#f8f9fa] dark:bg-zinc-950 border border-[#e2dfe1] dark:border-zinc-800 mb-2.5 flex-row items-center justify-between"
                  >
                    <Text className="text-sm font-bold text-[#1b1b1d] dark:text-white">
                      {item.full_name}
                    </Text>
                    <Text className="text-xs font-bold text-[#59C83A]">
                      Selecionar →
                    </Text>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* COMPONENTE DO MODAL PERSONALIZADO REUTILIZÁVEL */}
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