import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  useColorScheme,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, Barbell, CaretRight, Trash, Books, PencilSimple } from 'phosphor-react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { supabase } from '../../../lib/supabase';

/**
 * Estrutura de dados de uma rotina modelo da biblioteca
 */
interface RoutineItem {
  id: string;
  name: string;
  description: string | null;
  objective: string | null;
  days_of_week: string[] | null;
  plan_exercises: { id: string }[];
}

export default function PersonalRoutinesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Captura o parâmetro de atribuição se a tela for aberta pelo perfil do aluno
  const params = useLocalSearchParams<{ assignToStudentId?: string }>();
  const assignToStudentId = params.assignToStudentId;

  const [routines, setRoutines] = useState<RoutineItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Recarrega a biblioteca sempre que a tela entra em foco
  useFocusEffect(
    useCallback(() => {
      fetchLibraryRoutines();
    }, [])
  );

  /**
   * Busca os modelos de treino (student_id IS NULL) do Personal Trainer no Supabase
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
      console.error('Erro inesperado ao buscar biblioteca:', err);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Apaga uma rotina modelo da biblioteca no Supabase
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
   * Lida com o toque em uma rotina (Atribuição a Aluno ou Edição do Modelo)
   */
  async function handleSelectRoutine(routine: RoutineItem) {
    // Se a tela foi aberta para atribuir a um aluno
    if (assignToStudentId) {
      Alert.alert(
        'Atribuir Treino',
        `Deseja copiar a ficha "${routine.name}" e atribuí-la a este aluno?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Atribuir',
            onPress: async () => {
              try {
                setLoading(true);
                const { data: { user } } = await supabase.auth.getUser();

                // 1. Cria uma nova cópia do plano associada ao student_id
                const { data: newPlan, error: planError } = await supabase
                  .from('workout_plans')
                  .insert({
                    name: routine.name,
                    description: routine.description,
                    objective: routine.objective,
                    days_of_week: routine.days_of_week,
                    student_id: assignToStudentId,
                    personal_id: user?.id,
                  })
                  .select('id')
                  .single();

                if (planError) throw planError;

                // 2. Busca os exercícios da rotina modelo
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

                Alert.alert('Sucesso! 🎉', 'Ficha atribuída ao aluno com sucesso!', [
                  { text: 'OK', onPress: () => router.back() },
                ]);
              } catch (err: any) {
                Alert.alert('Erro', err.message || 'Não foi possível atribuir o treino.');
              } finally {
                setLoading(false);
              }
            },
          },
        ]
      );
    } else {
      // Se for acedido normalmente, abre a tela de edição do modelo
      router.push({
        pathname: '/(personal)/create-workout',
        params: { planId: routine.id },
      });
    }
  }

  return (
    <View 
      className="flex-1 bg-white dark:bg-zinc-950 px-5" 
      style={{ paddingTop: insets.top + 10 }}
    >
      {/* Cabeçalho */}
      <View className="flex-row justify-between items-center mb-6 border-b border-[#f0edef] dark:border-zinc-800 pb-4">
        <View className="flex-1 mr-2">
          <Text className="text-2xl font-extrabold text-[#1b1b1d] dark:text-white">
            Biblioteca de Rotinas
          </Text>
          <Text className="text-sm text-[#71717a] dark:text-zinc-400 mt-1">
            {assignToStudentId
              ? 'Selecione um modelo para atribuir ao aluno'
              : 'Modelos de fichas reutilizáveis'}
          </Text>
        </View>

        {/* Botão de Adicionar Novo Modelo */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push('/(personal)/create-workout')}
          className="bg-[#59C83A] w-11 h-11 rounded-2xl justify-center items-center shadow-sm"
        >
          <Plus size={22} color="#FFFFFF" weight="bold" />
        </TouchableOpacity>
      </View>

      {/* Conteúdo da Lista */}
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
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => handleSelectRoutine(item)}
                className="bg-[#f8f9fa] dark:bg-zinc-900 p-4 rounded-2xl mb-3 border border-[#e2dfe1] dark:border-zinc-800 flex-row items-center justify-between"
              >
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

                {/* Ações do Cartão */}
                <View className="flex-row items-center gap-2">
                  {!assignToStudentId && (
                    <TouchableOpacity
                      onPress={() => handleDeleteRoutine(item.id, item.name)}
                      className="w-8 h-8 rounded-lg bg-red-500/10 items-center justify-center border border-red-500/20"
                    >
                      <Trash size={16} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                  <CaretRight size={20} color={isDark ? '#71717a' : '#a09da1'} />
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}