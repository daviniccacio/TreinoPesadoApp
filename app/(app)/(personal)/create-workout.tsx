import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Modal,
  ActivityIndicator,
  useColorScheme,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Plus,
  Trash,
  CheckCircle,
  MagnifyingGlass,
  X,
  Barbell,
  Check,
} from 'phosphor-react-native';

import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';

import { supabase } from '../../../lib/supabase';
import { getExerciseGif } from '../../../lib/exerciseGifs';
import { useThrottledCallback } from '../../../lib/useThrottle';
import { CustomModal } from '../../../components/CustomModal';
import { createWorkoutPlanSchema } from '../../../lib/validations/workout';

// Habilita animações de layout suaves no Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// --- TIPAGENS DE DADOS ---
interface RegisteredExercise {
  id: string;
  name: string;
  sets?: number;
  reps?: string;
  weight?: string;
  category_id?: string;
  gif_key?: string;
}

interface SelectedExerciseItem {
  tempId: string;
  exercise_id: string;
  name: string;
  category_id?: string;
  sets: string;
  reps: string;
  notes: string;
  gif_key?: string;
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

const DAYS_OF_WEEK = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];
const OBJECTIVE_OPTIONS = ['Hipertrofia', 'Emagrecimento', 'Resistência', 'Força', 'Adaptação'];

// LISTA FIXA DE CATEGORIAS VÁLIDAS DO SUPABASE (Sem "Braços")
const CATEGORY_FILTERS = [
  { id: 'todos', label: 'Todos' },
  { id: 'peito', label: 'Peito' },
  { id: 'costas', label: 'Costas' },
  { id: 'ombros', label: 'Ombros' },
  { id: 'pernas', label: 'Pernas' },
  { id: 'gluteo', label: 'Glúteo' },
  { id: 'abdomen', label: 'Abdômen' },
];

export default function CreateWorkoutPlanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const queryClient = useQueryClient();

  const { planId, studentId, studentName } = useLocalSearchParams<{
    planId?: string;
    studentId?: string;
    studentName?: string;
  }>();

  // --- ESTADOS DO FORMULÁRIO ---
  const [planName, setPlanName] = useState('');
  const [description, setDescription] = useState('');
  const [objective, setObjective] = useState('Hipertrofia');
  const [selectedDays, setSelectedDays] = useState<string[]>(['Segunda']);
  const [selectedExercises, setSelectedExercises] = useState<SelectedExerciseItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingPlanData, setLoadingPlanData] = useState(false);

  // --- ESTADOS DO MODAL DE EXERCÍCIOS ---
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [registeredExercises, setRegisteredExercises] = useState<RegisteredExercise[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('todos');
  const [loadingModalExercises, setLoadingModalExercises] = useState(false);

  // ESTADO DO GIF EXPANDIDO NO MODAL
  const [expandedModalExerciseId, setExpandedModalExerciseId] = useState<string | null>(null);

  // --- ESTADO DO CUSTOM MODAL ---
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

  // NAVEGAÇÃO DE RETORNO EXPLÍCITA
  const handleNavigateBack = useCallback(() => {
    if (studentId) {
      router.replace({
        pathname: '/(personal)/student-detail',
        params: { id: studentId, name: studentName },
      });
    } else {
      router.replace('/(personal)/routines');
    }
  }, [router, studentId, studentName]);

  const handleSavePlanThrottled = useThrottledCallback(handleSavePlan, 2000);

  useFocusEffect(
    useCallback(() => {
      if (planId) {
        loadExistingPlanData(planId);
      } else {
        resetForm();
      }
    }, [planId])
  );

  function resetForm() {
    setPlanName('');
    setDescription('');
    setObjective('Hipertrofia');
    setSelectedDays(['Segunda']);
    setSelectedExercises([]);
    setExpandedModalExerciseId(null);
  }

  async function loadExistingPlanData(id: string) {
    try {
      setLoadingPlanData(true);

      const { data: plan, error: planError } = await supabase
        .from('workout_plans')
        .select('*')
        .eq('id', id)
        .single();

      if (planError) throw planError;

      if (plan) {
        setPlanName(plan.name || '');
        setDescription(plan.description || '');
        setObjective(plan.objective || 'Hipertrofia');
        setSelectedDays(plan.days_of_week || ['Segunda']);
      }

      const { data: exercises, error: exercisesError } = await supabase
        .from('plan_exercises')
        .select(`
          *,
          exercise:exercises (
            gif_key
          )
        `)
        .eq('plan_id', id)
        .order('order_index', { ascending: true });

      if (exercisesError) throw exercisesError;

      if (exercises) {
        const mappedExercises: SelectedExerciseItem[] = exercises.map((ex: any) => ({
          tempId: ex.id || Date.now().toString() + Math.random().toString(),
          exercise_id: ex.exercise_id,
          name: ex.name,
          sets: String(ex.sets || '3'),
          reps: String(ex.reps || '10'),
          notes: ex.notes || '',
          gif_key: ex.exercise?.gif_key || null,
        }));
        setSelectedExercises(mappedExercises);
      }
    } catch (err: any) {
      showAlertModal({
        title: 'Erro',
        message: 'Não foi possível carregar os dados do treino para edição.',
        type: 'danger',
      });
    } finally {
      setLoadingPlanData(false);
    }
  }

  function toggleDay(day: string) {
    if (selectedDays.includes(day)) {
      if (selectedDays.length === 1) {
        showAlertModal({
          title: 'Atenção',
          message: 'Selecione pelo menos um dia da semana para o plano.',
          type: 'info',
        });
        return;
      }
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  }

  const fetchRegisteredExercises = useCallback(async () => {
    try {
      setLoadingModalExercises(true);
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      if (data) setRegisteredExercises(data);
    } catch (err: any) {
      showAlertModal({
        title: 'Erro',
        message: 'Não foi possível carregar a lista de exercícios.',
        type: 'danger',
      });
    } finally {
      setLoadingModalExercises(false);
    }
  }, []);

  function handleOpenExerciseModal() {
    setIsModalVisible(true);
    setExpandedModalExerciseId(null);
    fetchRegisteredExercises();
  }

  function handleToggleExerciseFromLibrary(item: RegisteredExercise) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    const existingIndex = selectedExercises.findIndex((ex) => ex.exercise_id === item.id);

    if (existingIndex >= 0) {
      setSelectedExercises((prev) => prev.filter((ex) => ex.exercise_id !== item.id));
      if (expandedModalExerciseId === item.id) {
        setExpandedModalExerciseId(null);
      }
    } else {
      const newExerciseItem: SelectedExerciseItem = {
        tempId: Date.now().toString() + Math.random().toString(),
        exercise_id: item.id,
        name: item.name,
        category_id: item.category_id,
        sets: String(item.sets || '3'),
        reps: item.reps || '10 a 12',
        notes: item.weight ? `Carga sugerida: ${item.weight}` : '',
        gif_key: item.gif_key,
      };

      setSelectedExercises((prev) => [...prev, newExerciseItem]);
      setExpandedModalExerciseId(item.id);
    }
  }

  function handleUpdateExercise(tempId: string, field: keyof SelectedExerciseItem, value: string) {
    setSelectedExercises((prev) =>
      prev.map((item) => (item.tempId === tempId ? { ...item, [field]: value } : item))
    );
  }

  function handleRemoveExercise(tempId: string) {
    setSelectedExercises((prev) => prev.filter((item) => item.tempId !== tempId));
  }

  async function handleSavePlan() {
    const payload = {
      name: planName.trim(),
      description: description.trim() || null,
      objective,
      days_of_week: selectedDays,
      exercises: selectedExercises.map((ex) => ({
        exercise_id: ex.exercise_id,
        sets: ex.sets.trim(),
        reps: ex.reps.trim(),
        notes: ex.notes.trim() || null,
      })),
    };

    const validation = createWorkoutPlanSchema.safeParse(payload);

    if (!validation.success) {
      const firstError = validation.error.issues[0].message;
      showAlertModal({
        title: 'Dados Inválidos',
        message: firstError,
        type: 'info',
      });
      return;
    }

    try {
      setSaving(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (planId) {
        const { error: planError } = await supabase
          .from('workout_plans')
          .update({
            name: planName.trim(),
            description: description.trim() || null,
            objective: objective,
            days_of_week: selectedDays,
          })
          .eq('id', planId);

        if (planError) throw planError;

        await supabase.from('plan_exercises').delete().eq('plan_id', planId);

        const exercisesPayload = selectedExercises.map((ex, index) => ({
          plan_id: planId,
          exercise_id: ex.exercise_id,
          name: ex.name,
          sets: ex.sets.trim() || '3',
          reps: ex.reps.trim() || '10',
          notes: ex.notes.trim() || null,
          order_index: index,
        }));

        const { error: exercisesError } = await supabase
          .from('plan_exercises')
          .insert(exercisesPayload);

        if (exercisesError) throw exercisesError;

        queryClient.invalidateQueries({ queryKey: ['personal-student-detail', studentId] });
        queryClient.invalidateQueries({ queryKey: ['student-workouts'] });
        queryClient.invalidateQueries({ queryKey: ['personal-profile-data'] });
        queryClient.invalidateQueries({ queryKey: ['personal-library-routines'] });

        showAlertModal({
          title: 'Sucesso! 🎉',
          message: 'Plano de treino atualizado com sucesso!',
          type: 'success',
          confirmText: 'OK',
          onConfirm: () => handleNavigateBack(),
        });
      } else {
        const { data: planData, error: planError } = await supabase
          .from('workout_plans')
          .insert({
            name: planName.trim(),
            description: description.trim() || null,
            objective: objective,
            days_of_week: selectedDays,
            student_id: studentId || null,
            personal_id: user?.id,
          })
          .select('id')
          .single();

        if (planError) throw planError;

        const exercisesPayload = selectedExercises.map((ex, index) => ({
          plan_id: planData.id,
          exercise_id: ex.exercise_id,
          name: ex.name,
          sets: ex.sets.trim() || '3',
          reps: ex.reps.trim() || '10',
          notes: ex.notes.trim() || null,
          order_index: index,
        }));

        const { error: exercisesError } = await supabase
          .from('plan_exercises')
          .insert(exercisesPayload);

        if (exercisesError) throw exercisesError;

        queryClient.invalidateQueries({ queryKey: ['personal-student-detail', studentId] });
        queryClient.invalidateQueries({ queryKey: ['student-workouts'] });
        queryClient.invalidateQueries({ queryKey: ['personal-profile-data'] });

        showAlertModal({
          title: 'Sucesso! 🎉',
          message: 'Plano de treino criado com sucesso!',
          type: 'success',
          confirmText: 'OK',
          onConfirm: () => handleNavigateBack(),
        });
      }
    } catch (error: any) {
      showAlertModal({
        title: 'Erro ao Salvar',
        message: error.message || 'Ocorreu um erro ao guardar o plano.',
        type: 'danger',
      });
    } finally {
      setSaving(false);
    }
  }

  const filteredRegisteredExercises = registeredExercises.filter((ex: RegisteredExercise) => {
    const matchesSearch = ex.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
    const matchesCategory =
      selectedCategoryFilter === 'todos' ||
      (ex.category_id && ex.category_id.toLowerCase().includes(selectedCategoryFilter.toLowerCase()));
    return matchesSearch && matchesCategory;
  });

  const safeTopPadding = Math.max(insets?.top || 0, 16);

  if (loadingPlanData) {
    return (
      <View className="flex-1 bg-white dark:bg-zinc-950 justify-center items-center">
        <ActivityIndicator size="large" color="#59C83A" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white dark:bg-zinc-950 px-5" style={{ paddingTop: safeTopPadding }}>
      {/* CABEÇALHO */}
      <View className="flex-row items-center justify-between my-4">
        <View className="flex-row items-center flex-1 mr-2">
          <TouchableOpacity
            onPress={handleNavigateBack}
            className="w-10 h-10 rounded-xl bg-[#f8f9fa] dark:bg-zinc-900 justify-center items-center mr-3 border border-[#e2dfe1] dark:border-zinc-800"
          >
            <ArrowLeft size={20} color={isDark ? '#ffffff' : '#1b1b1d'} />
          </TouchableOpacity>

          <View className="flex-1">
            <Text className="text-xl font-extrabold text-[#1b1b1d] dark:text-white" numberOfLines={1}>
              {planId ? 'Editar Plano de Treino' : 'Criar Plano de Treino'}
            </Text>
            {studentName && (
              <Text className="text-xs text-[#59C83A] font-bold" numberOfLines={1}>
                Para: {studentName}
              </Text>
            )}
          </View>
        </View>

        <TouchableOpacity
          onPress={handleSavePlanThrottled}
          disabled={saving}
          className="bg-[#59C83A] px-4 py-2.5 rounded-xl flex-row items-center"
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <CheckCircle size={18} color="#FFFFFF" weight="bold" />
              <Text className="text-white font-bold ml-1.5 text-sm">
                {planId ? 'Atualizar' : 'Salvar'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 50 }}>
        {/* INFORMAÇÕES DO PLANO */}
        <View className="bg-[#f8f9fa] dark:bg-zinc-900 p-4 rounded-2xl border border-[#e2dfe1] dark:border-zinc-800 mb-5">
          <Text className="text-xs font-bold text-[#1b1b1d] dark:text-white mb-1.5">
            Nome do Plano *
          </Text>
          <TextInput
            className="bg-white dark:bg-zinc-950 border border-[#e2dfe1] dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-[#1b1b1d] dark:text-white mb-4"
            placeholder="Ex: Treino A - Peito e Tríceps"
            placeholderTextColor={isDark ? '#71717a' : '#a09da1'}
            value={planName}
            onChangeText={setPlanName}
          />

          <Text className="text-xs font-bold text-[#1b1b1d] dark:text-white mb-1.5">
            Para que serve / Observações
          </Text>
          <TextInput
            className="bg-white dark:bg-zinc-950 border border-[#e2dfe1] dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-[#1b1b1d] dark:text-white mb-4"
            placeholder="Ex: Foco na execução e hipertrofia"
            placeholderTextColor={isDark ? '#71717a' : '#a09da1'}
            value={description}
            onChangeText={setDescription}
          />

          <Text className="text-xs font-bold text-[#1b1b1d] dark:text-white mb-2">
            Objetivo do Treino
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row mb-4">
            {OBJECTIVE_OPTIONS.map((item) => {
              const active = objective === item;
              return (
                <TouchableOpacity
                  key={item}
                  onPress={() => setObjective(item)}
                  className={`px-3.5 py-2 rounded-xl mr-2 border ${
                    active
                      ? 'bg-[#59C83A] border-[#59C83A]'
                      : 'bg-white dark:bg-zinc-950 border-[#e2dfe1] dark:border-zinc-800'
                  }`}
                >
                  <Text className={`text-xs font-bold ${active ? 'text-white' : 'text-[#414755] dark:text-zinc-400'}`}>
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text className="text-xs font-bold text-[#1b1b1d] dark:text-white mb-2">
            Dias da Semana:
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {DAYS_OF_WEEK.map((day) => {
              const isSelected = selectedDays.includes(day);
              return (
                <TouchableOpacity
                  key={day}
                  onPress={() => toggleDay(day)}
                  className={`px-3 py-1.5 rounded-lg border ${
                    isSelected
                      ? 'bg-[#59C83A]/20 border-[#59C83A]'
                      : 'bg-white dark:bg-zinc-950 border-[#e2dfe1] dark:border-zinc-800'
                  }`}
                >
                  <Text className={`text-xs font-bold ${isSelected ? 'text-[#59C83A]' : 'text-[#71717a]'}`}>
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* BOTÃO PARA ABRIR O MODAL DE SELEÇÃO */}
        <TouchableOpacity
          onPress={handleOpenExerciseModal}
          className="bg-[#59C83A] p-4 rounded-2xl flex-row items-center justify-center mb-5"
          activeOpacity={0.8}
        >
          <Plus size={20} color="#FFFFFF" weight="bold" />
          <Text className="text-white font-bold text-sm ml-2">
            Selecionar Exercícios da Biblioteca ({selectedExercises.length})
          </Text>
        </TouchableOpacity>

        {/* LISTA DOS EXERCÍCIOS ADICIONADOS AO PLANO */}
        <Text className="text-base font-extrabold text-[#1b1b1d] dark:text-white mb-3">
          Exercícios Selecionados ({selectedExercises.length})
        </Text>

        {selectedExercises.length === 0 ? (
          <View className="p-8 items-center justify-center border border-dashed border-[#e2dfe1] dark:border-zinc-800 rounded-2xl">
            <Barbell size={32} color={isDark ? '#52525b' : '#a1a1aa'} />
            <Text className="text-xs font-medium text-[#71717a] dark:text-zinc-400 mt-2 text-center">
              Nenhum exercício selecionado.{'\n'}Clique no botão verde para abrir a lista e selecionar.
            </Text>
          </View>
        ) : (
          selectedExercises.map((item, index) => (
            <View
              key={item.tempId}
              className="bg-[#f8f9fa] dark:bg-zinc-900 p-4 rounded-2xl border border-[#e2dfe1] dark:border-zinc-800 mb-3"
            >
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-sm font-extrabold text-[#1b1b1d] dark:text-white flex-1 mr-2" numberOfLines={1}>
                  {index + 1}. {item.name}
                </Text>

                <TouchableOpacity
                  onPress={() => handleRemoveExercise(item.tempId)}
                  className="p-1"
                >
                  <Trash size={18} color="#ef4444" />
                </TouchableOpacity>
              </View>

              <View className="flex-row gap-3 mb-2.5">
                <View className="flex-1">
                  <Text className="text-[10px] font-bold text-[#71717a] dark:text-zinc-400 mb-1">
                    Séries
                  </Text>
                  <TextInput
                    className="bg-white dark:bg-zinc-950 border border-[#e2dfe1] dark:border-zinc-800 rounded-xl px-3 py-2 text-xs font-bold text-[#1b1b1d] dark:text-white"
                    placeholder="Ex: 3"
                    placeholderTextColor={isDark ? '#71717a' : '#a09da1'}
                    value={item.sets}
                    onChangeText={(text) => handleUpdateExercise(item.tempId, 'sets', text)}
                  />
                </View>

                <View className="flex-1">
                  <Text className="text-[10px] font-bold text-[#71717a] dark:text-zinc-400 mb-1">
                    Repetições
                  </Text>
                  <TextInput
                    className="bg-white dark:bg-zinc-950 border border-[#e2dfe1] dark:border-zinc-800 rounded-xl px-3 py-2 text-xs font-bold text-[#1b1b1d] dark:text-white"
                    placeholder="Ex: 10 a 12"
                    placeholderTextColor={isDark ? '#71717a' : '#a09da1'}
                    value={item.reps}
                    onChangeText={(text) => handleUpdateExercise(item.tempId, 'reps', text)}
                  />
                </View>
              </View>

              <Text className="text-[10px] font-bold text-[#71717a] dark:text-zinc-400 mb-1">
                Observações / Carga
              </Text>
              <TextInput
                className="bg-white dark:bg-zinc-950 border border-[#e2dfe1] dark:border-zinc-800 rounded-xl px-3 py-2 text-xs font-medium text-[#1b1b1d] dark:text-white"
                placeholder="Ex: Carga inicial recomendada"
                placeholderTextColor={isDark ? '#71717a' : '#a09da1'}
                value={item.notes}
                onChangeText={(text) => handleUpdateExercise(item.tempId, 'notes', text)}
              />
            </View>
          ))
        )}
      </ScrollView>

      {/* MODAL DA BIBLIOTECA DE EXERCÍCIOS */}
      <Modal visible={isModalVisible} animationType="slide" transparent>
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-white dark:bg-zinc-900 rounded-t-3xl p-5 h-[85%] border-t border-[#e2dfe1] dark:border-zinc-800">
            <View className="flex-row items-center justify-between mb-3">
              <View>
                <Text className="text-lg font-extrabold text-[#1b1b1d] dark:text-white">
                  Biblioteca de Exercícios
                </Text>
                <Text className="text-xs text-[#59C83A] font-bold">
                  {selectedExercises.length} selecionado(s)
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsModalVisible(false)}
                className="bg-[#59C83A] px-4 py-2 rounded-xl"
              >
                <Text className="text-white font-bold text-xs">Concluir</Text>
              </TouchableOpacity>
            </View>

            {/* BARRINHA DE PESQUISA */}
            <View className="bg-[#f8f9fa] dark:bg-zinc-950 flex-row items-center px-3.5 py-2.5 rounded-xl border border-[#e2dfe1] dark:border-zinc-800 mb-3">
              <MagnifyingGlass size={18} color={isDark ? '#59C83A' : '#71717a'} />
              <TextInput
                className="flex-1 ml-2.5 text-sm text-[#1b1b1d] dark:text-white font-medium"
                placeholder="Buscar por nome ou grupo muscular..."
                placeholderTextColor={isDark ? '#71717a' : '#a09da1'}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <X size={16} color={isDark ? '#a1a1aa' : '#71717a'} />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* FILTROS DE CATEGORIA */}
            <View className="mb-4">
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingVertical: 4, alignItems: 'center' }}
              >
                {CATEGORY_FILTERS.map((cat) => {
                  const active = selectedCategoryFilter === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      onPress={() => setSelectedCategoryFilter(cat.id)}
                      className={`px-4 py-2 rounded-xl mr-2 border ${
                        active
                          ? 'bg-[#59C83A] border-[#59C83A]'
                          : 'bg-[#f8f9fa] dark:bg-zinc-800 border-[#e2dfe1] dark:border-zinc-700'
                      }`}
                    >
                      <Text
                        className={`text-xs font-extrabold ${
                          active ? 'text-white' : 'text-[#414755] dark:text-zinc-200'
                        }`}
                      >
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* LISTA DE EXERCÍCIOS NO MODAL */}
            {loadingModalExercises ? (
              <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="large" color="#59C83A" />
              </View>
            ) : (
              <FlatList
                data={filteredRegisteredExercises}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                  const isAdded = selectedExercises.some((ex) => ex.exercise_id === item.id);
                  const isGifExpanded = expandedModalExerciseId === item.id;

                  return (
                    <View
                      className={`p-3.5 rounded-2xl border mb-2.5 overflow-hidden ${
                        isAdded
                          ? 'bg-[#59C83A]/10 border-[#59C83A]'
                          : 'bg-[#f8f9fa] dark:bg-zinc-950 border-[#e2dfe1] dark:border-zinc-800'
                      }`}
                    >
                      <TouchableOpacity
                        onPress={() => handleToggleExerciseFromLibrary(item)}
                        activeOpacity={0.7}
                        className="flex-row items-center justify-between"
                      >
                        <View className="flex-1 mr-2">
                          <Text className="text-sm font-bold text-[#1b1b1d] dark:text-white" numberOfLines={1}>
                            {item.name}
                          </Text>
                          <Text className="text-xs text-[#71717a] dark:text-zinc-400 mt-0.5">
                            Grupo: {item.category_id || 'Geral'} | Séries: {item.sets || 3}
                          </Text>
                        </View>

                        {isAdded ? (
                          <View className="bg-[#59C83A] p-2 rounded-xl">
                            <Check size={16} color="#ffffff" weight="bold" />
                          </View>
                        ) : (
                          <View className="bg-[#59C83A]/10 p-2 rounded-xl border border-[#59C83A]/30">
                            <Plus size={16} color="#59C83A" weight="bold" />
                          </View>
                        )}
                      </TouchableOpacity>

                      {isGifExpanded && (
                        <View className="w-full h-52 bg-white dark:bg-zinc-900 rounded-xl overflow-hidden mt-3 border border-[#e2dfe1] dark:border-zinc-800 items-center justify-center">
                          <Image
                            source={getExerciseGif(item.gif_key)}
                            style={{ width: '100%', height: '100%' }}
                            contentFit="contain"
                            autoplay={true}
                          />
                        </View>
                      )}
                    </View>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL PERSONALIZADO */}
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