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
import { ArrowLeft, Trash, CaretRight, PencilSimple } from 'phosphor-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MotiView } from 'moti';
import { supabase } from '../../../../lib/supabase';
import { CustomModal } from '../../../../components/CustomModal';

interface WorkoutExerciseItem {
  id: string;
  sets: number;
  reps: string;
  weight: string;
  exercises: {
    id: string;
    name: string;
    category_id: string;
  };
}

interface CustomWorkoutDetail {
  id: string;
  title: string;
  custom_workout_exercises: WorkoutExerciseItem[];
}

/**
 * Busca os detalhes do treino personalizado no Supabase
 */
async function fetchCustomWorkoutDetail(workoutId: string): Promise<CustomWorkoutDetail> {
  if (!workoutId) throw new Error('ID do treino não fornecido');

  const { data, error } = await supabase
    .from('custom_workouts')
    .select(`
      id,
      title,
      custom_workout_exercises (
        id,
        sets,
        reps,
        weight,
        exercises (
          id,
          name,
          category_id
        )
      )
    `)
    .eq('id', workoutId)
    .single();

  if (error) throw new Error(error.message);
  return data as unknown as CustomWorkoutDetail;
}

export default function CustomWorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // ESTADO DO MODAL PERSONALIZADO
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
    showCancelButton: true,
    onConfirm: () => {},
  });

  function showAlertModal({
    title,
    message,
    type = 'info',
    confirmText = 'Entendi',
    cancelText = 'Cancelar',
    showCancelButton = true,
    onConfirm,
  }: {
    title: string;
    message: string;
    type?: 'success' | 'danger' | 'info';
    confirmText?: string;
    cancelText?: string;
    showCancelButton?: boolean;
    onConfirm?: () => void;
  }) {
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

  // --- BUSCA DETALHES COM TANSTACK QUERY ---
  const {
    data: workout,
    isLoading,
  } = useQuery({
    queryKey: ['custom-workout-detail', id],
    queryFn: () => fetchCustomWorkoutDetail(id || ''),
    enabled: !!id,
  });

  // --- MUTAÇÃO PARA DELETAR O TREINO ---
  const deleteWorkoutMutation = useMutation({
    mutationFn: async (workoutId: string) => {
      const { error } = await supabase
        .from('custom_workouts')
        .delete()
        .eq('id', workoutId);

      if (error) throw new Error(error.message);
      return workoutId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-workouts'] });
      queryClient.invalidateQueries({ queryKey: ['student-home-data'] });

      showAlertModal({
        title: 'Sucesso! 🎉',
        message: 'Treino excluído com sucesso!',
        type: 'success',
        showCancelButton: false,
        onConfirm: () => router.replace('/(aluno)/(tabs)/my-workouts'),
      });
    },
    onError: (err: any) => {
      showAlertModal({
        title: 'Erro ao Excluir',
        message: err.message || 'Não foi possível excluir o treino.',
        type: 'danger',
        showCancelButton: false,
      });
    },
  });

  function handleDeleteWorkout() {
    showAlertModal({
      title: 'Excluir Treino',
      message: 'Tem certeza de que deseja apagar este treino personalizado? Esta ação não poderá ser desfeita.',
      type: 'danger',
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      showCancelButton: true,
      onConfirm: () => deleteWorkoutMutation.mutate(id || ''),
    });
  }

  function handleGoBack() {
    router.replace('/(aluno)/(tabs)/my-workouts');
  }

  const safeTopPadding = Math.max(insets?.top || 0, 16);

  return (
    <View className="flex-1 bg-white dark:bg-zinc-950" style={{ paddingTop: safeTopPadding }}>
      {/* 1. CABEÇALHO ANIMADO */}
      <MotiView
        from={{ opacity: 0, translateY: -8 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{
          type: 'spring',
          damping: 24,
          stiffness: 160,
        }}
        className="flex-row items-center justify-between px-5 py-3 border-b border-[#f0edef] dark:border-zinc-800"
      >
        <TouchableOpacity
          onPress={handleGoBack}
          className="w-10 h-10 rounded-full bg-[#f8f9fa] dark:bg-zinc-900 items-center justify-center border border-[#e2dfe1] dark:border-zinc-800"
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color={isDark ? '#59C83A' : '#1b1b1d'} />
        </TouchableOpacity>

        <Text
          className="text-lg font-bold text-[#1b1b1d] dark:text-white flex-1 text-center mx-2"
          numberOfLines={1}
        >
          {workout?.title || 'Detalhes do Treino'}
        </Text>

        {/* Botões de Ação (Editar e Excluir) */}
        <View className="flex-row items-center gap-2">
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: '/(aluno)/create-workout',
                params: { planId: id },
              })
            }
            className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 items-center justify-center border border-zinc-200 dark:border-zinc-700"
            activeOpacity={0.7}
          >
            <PencilSimple size={18} color={isDark ? '#ffffff' : '#1b1b1d'} weight="bold" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleDeleteWorkout}
            disabled={deleteWorkoutMutation.isPending}
            className="w-10 h-10 rounded-full bg-[#ffebe8] dark:bg-red-950/40 items-center justify-center border border-transparent dark:border-red-900/30"
            activeOpacity={0.7}
          >
            {deleteWorkoutMutation.isPending ? (
              <ActivityIndicator size="small" color="#e11d48" />
            ) : (
              <Trash size={20} color="#e11d48" />
            )}
          </TouchableOpacity>
        </View>
      </MotiView>

      {/* 2. CONTEÚDO PRINCIPAL */}
      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#59C83A" />
          <Text className="mt-3 text-[#414755] dark:text-zinc-400 font-medium text-xs">
            Carregando exercícios do treino...
          </Text>
        </View>
      ) : workout ? (
        <ScrollView className="flex-1 px-5 pt-4" showsVerticalScrollIndicator={false}>
          {/* TÍTULO E RESUMO ANIMADO */}
          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{
              type: 'spring',
              damping: 22,
              stiffness: 150,
              delay: 30,
            }}
          >
            <Text className="text-2xl font-extrabold text-[#1b1b1d] dark:text-white mb-1">
              {workout.title}
            </Text>
            <Text style={{ color: '#59C83A' }} className="text-xs font-bold uppercase mb-6">
              {workout.custom_workout_exercises?.length || 0} Exercícios no Total
            </Text>
          </MotiView>

          {/* LISTA DE EXERCÍCIOS EM CASCATA */}
          {workout.custom_workout_exercises?.map((item, index) => (
            <MotiView
              key={item.id}
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
                onPress={() =>
                  router.push({
                    pathname: '/(aluno)/exercise/[id]',
                    params: {
                      id: item.exercises?.id,
                      from: 'custom-workout',
                      workoutId: id,
                    },
                  })
                }
                className="bg-[#f8f9fa] dark:bg-zinc-900 p-4 rounded-2xl mb-3 flex-row items-center justify-between border border-[#e2dfe1] dark:border-zinc-800"
                activeOpacity={0.8}
              >
                <View className="flex-1 mr-3">
                  <Text style={{ color: '#59C83A' }} className="text-xs font-bold uppercase mb-0.5">
                    {index + 1}. {item.exercises?.category_id}
                  </Text>
                  <Text className="text-base font-bold text-[#1b1b1d] dark:text-white mb-1">
                    {item.exercises?.name}
                  </Text>
                  <View className="flex-row items-center gap-3">
                    <Text className="text-xs text-[#414755] dark:text-zinc-400">
                      <Text style={{ color: '#59C83A' }} className="font-bold">
                        {item.sets}
                      </Text>{' '}
                      séries
                    </Text>
                    <Text className="text-xs text-[#414755] dark:text-zinc-400">
                      <Text style={{ color: '#59C83A' }} className="font-bold">
                        {item.reps}
                      </Text>{' '}
                      reps
                    </Text>
                    <Text className="text-xs text-[#414755] dark:text-zinc-400">
                      Carga:{' '}
                      <Text style={{ color: '#59C83A' }} className="font-bold">
                        {item.weight}
                      </Text>
                    </Text>
                  </View>
                </View>

                <View className="w-9 h-9 rounded-full bg-white dark:bg-zinc-800 items-center justify-center border border-[#e0dddf] dark:border-zinc-700">
                  <CaretRight size={16} color="#59C83A" />
                </View>
              </TouchableOpacity>
            </MotiView>
          ))}

          <View className="h-10" />
        </ScrollView>
      ) : null}

      {/* COMPONENTE DO MODAL PERSONALIZADO */}
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