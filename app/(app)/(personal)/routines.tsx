import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  useColorScheme,
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
import { supabase } from '../../../lib/supabase';

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

export default function PersonalRoutinesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Parâmetro opcional caso venha do perfil de um aluno específico
  const params = useLocalSearchParams<{ assignToStudentId?: string }>();
  const initialStudentId = params.assignToStudentId;

  // --- ESTADOS DA TELA ---
  const [routines, setRoutines] = useState<RoutineItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // --- ESTADOS DO MODAL DE SELEÇÃO DE ALUNOS ---
  const [studentsModalVisible, setStudentsModalVisible] = useState<boolean>(false);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [loadingStudents, setLoadingStudents] = useState<boolean>(false);
  const [selectedRoutine, setSelectedRoutine] = useState<RoutineItem | null>(null);

  // Carrega as rotinas sempre que a tela entra em foco
  useFocusEffect(
    useCallback(() => {
      fetchLibraryRoutines();
    }, [])
  );

  /**
   * Busca os modelos de treino (onde student_id é NULL) do Personal no Supabase
   */
  async function fetchLibraryRoutines() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

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

      if (error) {
        console.error('Erro ao buscar rotinas da biblioteca:', error.message);
      } else if (data) {
        setRoutines(data as unknown as RoutineItem[]);
      }
    } catch (err) {
      console.error('Erro inesperado ao carregar biblioteca:', err);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Apaga um modelo de treino da biblioteca no Supabase
   */
  function handleDeleteRoutine(routineId: string, routineName: string) {
    Alert.alert(
      'Excluir Modelo',
      `Tem certeza que deseja apagar o modelo "${routineName}" da biblioteca?`,
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
                .eq('id', routineId);

              if (error) {
                Alert.alert('Erro', 'Não foi possível excluir o modelo.');
              } else {
                setRoutines((prev) => prev.filter((item) => item.id !== routineId));
                Alert.alert('Sucesso', 'Modelo removido da biblioteca!');
              }
            } catch (err) {
              console.error('Erro ao deletar modelo:', err);
            }
          },
        },
      ]
    );
  }

  /**
   * Abre a seleção de alunos para vincular o treino
   */
  async function handleOpenAssignFlow(routine: RoutineItem) {
    setSelectedRoutine(routine);

    // Se já sabemos qual é o aluno (veio da tela do aluno)
    if (initialStudentId) {
      confirmAndAssignToStudent(routine, initialStudentId, 'este aluno');
      return;
    }

    // Se não sabemos, abre o Modal para listar todos os alunos cadastrados
    try {
      setStudentsModalVisible(true);
      setLoadingStudents(true);

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'aluno')
        .order('full_name', { ascending: true });

      if (error) throw error;
      if (data) setStudents(data);
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível carregar a lista de alunos.');
      setStudentsModalVisible(false);
    } finally {
      setLoadingStudents(false);
    }
  }

  /**
   * Executa a clonagem do treino modelo para o aluno escolhido
   */
  function confirmAndAssignToStudent(routine: RoutineItem, studentId: string, studentName: string) {
    Alert.alert(
      'Confirmar Atribuição',
      `Deseja atribuir uma cópia de "${routine.name}" para ${studentName}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Atribuir',
          onPress: async () => {
            try {
              setLoading(true);
              setStudentsModalVisible(false);
              const { data: { user } } = await supabase.auth.getUser();

              // 1. Cria a nova ficha com o student_id preenchido
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

              if (planError) throw planError;

              // 2. Busca os exercícios do modelo original
              const { data: originalExercises, error: fetchExError } = await supabase
                .from('plan_exercises')
                .select('*')
                .eq('plan_id', routine.id);

              if (fetchExError) throw fetchExError;

              // 3. Copia os exercícios para o novo plano do aluno
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

                if (insertExError) throw insertExError;
              }

              Alert.alert('Sucesso! 🎉', `Treino atribuído com sucesso para ${studentName}!`, [
                {
                  text: 'OK',
                  onPress: () => {
                    if (initialStudentId) router.back();
                  },
                },
              ]);
            } catch (err: any) {
              Alert.alert('Erro ao Atribuir', err.message || 'Ocorreu uma falha.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
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

        {/* Botão de Criar Novo Modelo */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push('/(personal)/create-workout')}
          className="bg-[#59C83A] w-11 h-11 rounded-2xl justify-center items-center shadow-sm"
        >
          <Plus size={22} color="#FFFFFF" weight="bold" />
        </TouchableOpacity>
      </View>

      {/* CONTEÚDO DA LISTA */}
      {loading ? (
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
          renderItem={({ item }) => {
            const exerciseCount = item.plan_exercises?.length || 0;

            return (
              <View className="bg-[#f8f9fa] dark:bg-zinc-900 p-4 rounded-2xl mb-3 border border-[#e2dfe1] dark:border-zinc-800 flex-row items-center justify-between">
                <View className="flex-row items-center flex-1 mr-2">
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
                </View>

                {/* AÇÕES EXPLÍCITAS DO CARTÃO */}
                <View className="flex-row items-center gap-2">
                  {/* 1. Botão Atribuir a Aluno */}
                  <TouchableOpacity
                    onPress={() => handleOpenAssignFlow(item)}
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
                      Selecionar $\rightarrow$
                    </Text>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}