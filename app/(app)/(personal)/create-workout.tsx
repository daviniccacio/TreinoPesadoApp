// ============================================================================
// DOCUMENTAÇÃO: TELA DE CRIAÇÃO / EDIÇÃO DE PLANO DE TREINO (INTEGRADA À VPS)
// ============================================================================
// Inclui proteção contra saída acidental com alterações não salvas, modal
// com fecho instantâneo, persistência de exercícios, categorias dinâmicas
// e invalidação suave de cache (sem travamento do spinner de RefreshControl).
// ============================================================================

import React, { useState, useCallback, useEffect } from 'react';
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
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect, useNavigation } from 'expo-router';
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
import { MotiView } from 'moti';

// IMPORTAÇÕES DE CONTEXTO E API VPS
import { api } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import { getExerciseGif } from '../../../lib/exerciseGifs';
import { useThrottledCallback } from '../../../lib/useThrottle';
import { CustomModal } from '../../../components/CustomModal';
import { createWorkoutPlanSchema } from '../../../lib/validations/workout';

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

interface CategoryOption {
  id: string;
  label: string;
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

export default function CreateWorkoutPlanScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const queryClient = useQueryClient();
  const { user } = useAuth(); // ID do Personal Logado

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
  const [isSaved, setIsSaved] = useState(false);

  // --- ESTADOS DO MODAL DE EXERCÍCIOS ---
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [registeredExercises, setRegisteredExercises] = useState<RegisteredExercise[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // CATEGORIAS DINÂMICAS
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([
    { id: 'todos', label: 'Todos' },
  ]);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('todos');
  const [loadingModalExercises, setLoadingModalExercises] = useState(false);

  // ESTADO DO GIF EXPANDIDO NO MODAL
  const [expandedModalExerciseId, setExpandedModalExerciseId] = useState<string | null>(null);

  // --- ESTADO DO CUSTOM MODAL DE ALERTA ---
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
    onConfirm: () => { },
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

  // IDENTIFICA SE HÁ ALTERAÇÕES NÃO SALVAS NO FORMULÁRIO
  const isFormDirty = selectedExercises.length > 0 || planName.trim().length > 0 || description.trim().length > 0;

  // INTERCEPTA A TENTATIVA DE SAÍDA DA TELA SE HOUVER MUDANÇAS
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!isFormDirty || isSaved) {
        return;
      }

      e.preventDefault();

      showAlertModal({
        title: 'Descartar alterações? ⚠️',
        message: 'Você possui exercícios ou informações preenchidas. Se sair agora, todas as alterações serão perdidas.',
        type: 'danger',
        confirmText: 'Sair sem Salvar',
        cancelText: 'Continuar Editando',
        showCancelButton: true,
        onConfirm: () => {
          navigation.dispatch(e.data.action);
        },
      });
    });

    return unsubscribe;
  }, [navigation, isFormDirty, isSaved]);

  // NAVEGAÇÃO DE RETORNO COM INVALIDAÇÃO SUAVE DE CACHE
  const handleNavigateBack = useCallback(() => {
    // Invalidação suave de cache (marca como stale para atualizar sem travar o spinner nativo)
    queryClient.invalidateQueries({ queryKey: ['personal-student-detail', studentId], refetchType: 'none' });
    queryClient.invalidateQueries({ queryKey: ['student-workouts'], refetchType: 'none' });
    queryClient.invalidateQueries({ queryKey: ['personal-profile-data'], refetchType: 'none' });
    queryClient.invalidateQueries({ queryKey: ['personal-library-routines'], refetchType: 'none' });

    if (studentId) {
      router.replace({
        pathname: '/(personal)/student-detail',
        params: { id: studentId, name: studentName },
      } as any);
    } else {
      router.replace('/(personal)/routines' as any);
    }
  }, [router, studentId, studentName, queryClient]);

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
    setIsSaved(false);
  }

  // CARREGA DADOS DO PLANO VIA API VPS
  async function loadExistingPlanData(id: string) {
    try {
      setLoadingPlanData(true);

      const response = await api.get(`/api/workout-plans/detail/${id}`);
      const data = response.data;

      if (data) {
        setPlanName(data.name || '');
        setDescription(data.description || '');
        setObjective(data.objective || 'Hipertrofia');
        setSelectedDays(data.days_of_week || ['Segunda']);

        const mappedExercises: SelectedExerciseItem[] = (data.plan_exercises || []).map((ex: any) => {
          const generatedTempId = String(ex.id || Date.now().toString() + Math.random().toString());
          return {
            tempId: generatedTempId,
            exercise_id: String(ex.exercise_id || ex.id || generatedTempId),
            name: String(ex.name || 'Exercício'),
            sets: String(ex.sets || '3'),
            reps: String(ex.reps || '10'),
            notes: String(ex.notes || ''),
            gif_key: ex.gif_key || null,
          };
        });

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

  function formatCategoryLabel(rawCategory: string): string {
    const normalized = rawCategory.trim().toLowerCase();
    const mapLabels: Record<string, string> = {
      biceps: 'Bíceps',
      triceps: 'Tríceps',
      abdomen: 'Abdômen',
      gluteo: 'Glúteos',
      ombros: 'Ombros',
      pernas: 'Pernas',
      costas: 'Costas',
      peito: 'Peitoral',
      cardio: 'Cardio',
      alongamento: 'Alongamento',
    };

    if (mapLabels[normalized]) return mapLabels[normalized];
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }

  // BUSCA DE EXERCÍCIOS E CATEGORIAS DINÂMICAS VIA API VPS
  const fetchRegisteredExercises = useCallback(async () => {
    try {
      setLoadingModalExercises(true);

      const response = await api.get('/api/exercises');
      const data = response.data || [];

      setRegisteredExercises(data);

      const rawCategories: string[] = data
        .map((item: RegisteredExercise) => item.category_id)
        .filter((cat: unknown): cat is string => typeof cat === 'string' && cat.trim().length > 0);

      const uniqueCategories: string[] = Array.from(new Set<string>(rawCategories));

      const dynamicFilters: CategoryOption[] = [
        { id: 'todos', label: 'Todos' },
        ...uniqueCategories.map((catKey: string) => ({
          id: catKey.toLowerCase(),
          label: formatCategoryLabel(catKey),
        })),
      ];

      setCategoryOptions(dynamicFilters);
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
    const existingIndex = selectedExercises.findIndex(
      (ex) =>
        ex.exercise_id === item.id ||
        ex.name.trim().toLowerCase() === item.name.trim().toLowerCase()
    );

    if (existingIndex >= 0) {
      setSelectedExercises((prev) => prev.filter((_, index) => index !== existingIndex));
      if (expandedModalExerciseId === item.id) {
        setExpandedModalExerciseId(null);
      }
    } else {
      const newExerciseItem: SelectedExerciseItem = {
        tempId: Date.now().toString() + Math.random().toString(),
        exercise_id: String(item.id),
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
      prev.map((item) => (item.tempId === tempId ? { ...item, [field]: value ?? '' } : item))
    );
  }

  function handleRemoveExercise(tempId: string) {
    setSelectedExercises((prev) => prev.filter((item) => item.tempId !== tempId));
  }

  // SALVAR / ATUALIZAR O PLANO VIA API VPS
  async function handleSavePlan() {
    const safeExercises = selectedExercises.map((ex) => ({
      exercise_id: String(ex.exercise_id || ex.tempId || 'ex-id'),
      name: String(ex.name || 'Exercício').trim(),
      sets: String(ex.sets || '3').trim() || '3',
      reps: String(ex.reps || '10').trim() || '10',
      notes: ex.notes ? String(ex.notes).trim() : '',
    }));

    const payload = {
      name: planName.trim(),
      description: description ? description.trim() : '',
      objective: objective || 'Hipertrofia',
      days_of_week: selectedDays.length > 0 ? selectedDays : ['Segunda'],
      exercises: safeExercises,
    };

    const validation = createWorkoutPlanSchema.safeParse(payload);

    if (!validation.success) {
      const firstError = validation.error.issues[0]?.message || 'Verifique os campos preenchidos.';
      showAlertModal({
        title: 'Dados Inválidos',
        message: firstError,
        type: 'info',
      });
      return;
    }

    try {
      setSaving(true);

      if (planId) {
        // MODO EDIÇÃO
        await api.put(`/api/workout-plans/${planId}`, {
          name: planName.trim(),
          description: description.trim() || null,
          objective,
          days_of_week: selectedDays,
          exercises: safeExercises,
        });

        setIsSaved(true);
        showAlertModal({
          title: 'Sucesso! 🎉',
          message: 'Plano de treino atualizado com sucesso!',
          type: 'success',
          confirmText: 'OK',
          onConfirm: () => handleNavigateBack(),
        });
      } else {
        // MODO CRIAÇÃO
        await api.post('/api/workout-plans', {
          name: planName.trim(),
          description: description.trim() || null,
          objective,
          days_of_week: selectedDays,
          studentId: studentId || null,
          personalId: user?.id || null,
          exercises: safeExercises,
        });

        setIsSaved(true);
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
        message: error?.response?.data?.erro || error.message || 'Ocorreu um erro ao guardar o plano.',
        type: 'danger',
      });
    } finally {
      setSaving(false);
    }
  }

  // FILTRAGEM DINÂMICA DE EXERCÍCIOS
  const filteredRegisteredExercises = registeredExercises.filter((ex: RegisteredExercise) => {
    const matchesSearch = ex.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
    const matchesCategory =
      selectedCategoryFilter === 'todos' ||
      (ex.category_id && ex.category_id.toLowerCase().trim() === selectedCategoryFilter.toLowerCase().trim());
    return matchesSearch && matchesCategory;
  });

  const renderModalExerciseItem = useCallback(
    ({ item }: { item: RegisteredExercise }) => {
      const isAdded = selectedExercises.some(
        (ex) =>
          ex.exercise_id === item.id ||
          ex.name.trim().toLowerCase() === item.name.trim().toLowerCase()
      );
      const isGifExpanded = expandedModalExerciseId === item.id;

      return (
        <View
          className={`p-3.5 rounded-2xl border mb-2.5 overflow-hidden ${isAdded
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
              <Text className="text-sm font-outfit text-[#1b1b1d] dark:text-white" numberOfLines={1}>
                {item.name}
              </Text>
              <Text className="text-xs font-sans-medium text-[#71717a] dark:text-zinc-400 mt-0.5">
                Grupo: {item.category_id ? formatCategoryLabel(item.category_id) : 'Geral'} | Séries: {item.sets || 3}
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
    },
    [selectedExercises, expandedModalExerciseId]
  );

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
      {/* CABEÇALHO ANIMADO */}
      <MotiView
        from={{ opacity: 0, translateY: -12 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{
          type: 'spring',
          damping: 24,
          stiffness: 160,
        }}
        className="flex-row items-center justify-between my-4"
      >
        <View className="flex-row items-center flex-1 mr-2">
          <TouchableOpacity
            onPress={handleNavigateBack}
            className="w-10 h-10 rounded-xl bg-[#f8f9fa] dark:bg-zinc-900 justify-center items-center mr-3 border border-[#e2dfe1] dark:border-zinc-800"
          >
            <ArrowLeft size={20} color={isDark ? '#ffffff' : '#1b1b1d'} />
          </TouchableOpacity>

          <View className="flex-1">
            <Text className="text-xl font-outfit-extrabold text-[#1b1b1d] dark:text-white" numberOfLines={1}>
              {planId ? 'Editar Plano de Treino' : 'Criar Plano de Treino'}
            </Text>
            {studentName && (
              <Text className="text-xs font-sans-bold text-[#59C83A]" numberOfLines={1}>
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
              <Text className="text-white font-sans-bold ml-1.5 text-sm">
                {planId ? 'Atualizar' : 'Salvar'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </MotiView>

      {/* FORMULÁRIO */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* INFORMAÇÕES DO PLANO */}
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{
            type: 'spring',
            damping: 22,
            stiffness: 150,
            delay: 20,
          }}
          className="bg-[#f8f9fa] dark:bg-zinc-900 p-4 rounded-2xl border border-[#e2dfe1] dark:border-zinc-800 mb-5"
        >
          <Text className="text-xs font-sans-bold text-[#1b1b1d] dark:text-white mb-1.5">
            Nome do Plano *
          </Text>
          <TextInput
            className="bg-white dark:bg-zinc-950 border border-[#e2dfe1] dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-[#1b1b1d] dark:text-white mb-4 font-sans-medium"
            placeholder="Ex: Treino A - Peito e Tríceps"
            placeholderTextColor={isDark ? '#71717a' : '#a09da1'}
            value={planName}
            onChangeText={setPlanName}
          />

          <Text className="text-xs font-sans-bold text-[#1b1b1d] dark:text-white mb-1.5">
            Para que serve / Observações
          </Text>
          <TextInput
            className="bg-white dark:bg-zinc-950 border border-[#e2dfe1] dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-[#1b1b1d] dark:text-white mb-4 font-sans-medium"
            placeholder="Ex: Foco na execução e hipertrofia"
            placeholderTextColor={isDark ? '#71717a' : '#a09da1'}
            value={description}
            onChangeText={setDescription}
          />

          <Text className="text-xs font-sans-bold text-[#1b1b1d] dark:text-white mb-2">
            Objetivo do Treino
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row mb-4">
            {OBJECTIVE_OPTIONS.map((item) => {
              const active = objective === item;
              return (
                <TouchableOpacity
                  key={item}
                  onPress={() => setObjective(item)}
                  className={`px-3.5 py-2 rounded-xl mr-2 border ${active
                      ? 'bg-[#59C83A] border-[#59C83A]'
                      : 'bg-white dark:bg-zinc-950 border-[#e2dfe1] dark:border-zinc-800'
                    }`}
                >
                  <Text className={`text-xs font-sans-bold ${active ? 'text-white' : 'text-[#414755] dark:text-zinc-400'}`}>
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text className="text-xs font-sans-bold text-[#1b1b1d] dark:text-white mb-2">
            Dias da Semana:
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {DAYS_OF_WEEK.map((day) => {
              const isSelected = selectedDays.includes(day);
              return (
                <TouchableOpacity
                  key={day}
                  onPress={() => toggleDay(day)}
                  className={`px-3 py-1.5 rounded-lg border ${isSelected
                      ? 'bg-[#59C83A]/20 border-[#59C83A]'
                      : 'bg-white dark:bg-zinc-950 border-[#e2dfe1] dark:border-zinc-800'
                    }`}
                >
                  <Text className={`text-xs font-sans-bold ${isSelected ? 'text-[#59C83A]' : 'text-[#71717a]'}`}>
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </MotiView>

        {/* BOTÃO PARA ABRIR O MODAL DE SELEÇÃO */}
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{
            type: 'spring',
            damping: 22,
            stiffness: 150,
            delay: 40,
          }}
          className="mb-5"
        >
          <TouchableOpacity
            onPress={handleOpenExerciseModal}
            className="bg-[#59C83A] p-4 rounded-2xl flex-row items-center justify-center"
            activeOpacity={0.8}
          >
            <Plus size={20} color="#FFFFFF" weight="bold" />
            <Text className="text-white font-sans-bold text-sm ml-2">
              Selecionar Exercícios da Biblioteca ({selectedExercises.length})
            </Text>
          </TouchableOpacity>
        </MotiView>

        {/* LISTA DOS EXERCÍCIOS ADICIONADOS AO PLANO */}
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
          <Text className="text-base font-outfit-extrabold text-[#1b1b1d] dark:text-white mb-3">
            Exercícios Selecionados ({selectedExercises.length})
          </Text>
        </MotiView>

        {selectedExercises.length === 0 ? (
          <MotiView
            from={{ opacity: 0, scale: 0.95, translateY: 10 }}
            animate={{ opacity: 1, scale: 1, translateY: 0 }}
            transition={{
              type: 'spring',
              damping: 22,
              stiffness: 150,
            }}
            className="p-8 items-center justify-center border border-dashed border-[#e2dfe1] dark:border-zinc-800 rounded-2xl"
          >
            <Barbell size={32} color={isDark ? '#52525b' : '#a1a1aa'} />
            <Text className="text-xs font-sans-medium text-[#71717a] dark:text-zinc-400 mt-2 text-center">
              Nenhum exercício selecionado.{'\n'}Clique no botão verde para abrir a lista e selecionar.
            </Text>
          </MotiView>
        ) : (
          selectedExercises.map((item, index) => (
            <MotiView
              key={item.tempId}
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
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-sm font-outfit text-[#1b1b1d] dark:text-white flex-1 mr-2" numberOfLines={1}>
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
                  <Text className="text-[10px] font-sans-bold text-[#71717a] dark:text-zinc-400 mb-1">
                    Séries
                  </Text>
                  <TextInput
                    className="bg-white dark:bg-zinc-950 border border-[#e2dfe1] dark:border-zinc-800 rounded-xl px-3 py-2 text-xs font-sans-bold text-[#1b1b1d] dark:text-white"
                    placeholder="Ex: 3"
                    placeholderTextColor={isDark ? '#71717a' : '#a09da1'}
                    value={item.sets}
                    onChangeText={(text) => handleUpdateExercise(item.tempId, 'sets', text)}
                  />
                </View>

                <View className="flex-1">
                  <Text className="text-[10px] font-sans-bold text-[#71717a] dark:text-zinc-400 mb-1">
                    Repetições
                  </Text>
                  <TextInput
                    className="bg-white dark:bg-zinc-950 border border-[#e2dfe1] dark:border-zinc-800 rounded-xl px-3 py-2 text-xs font-sans-bold text-[#1b1b1d] dark:text-white"
                    placeholder="Ex: 10 a 12"
                    placeholderTextColor={isDark ? '#71717a' : '#a09da1'}
                    value={item.reps}
                    onChangeText={(text) => handleUpdateExercise(item.tempId, 'reps', text)}
                  />
                </View>
              </View>

              <Text className="text-[10px] font-sans-bold text-[#71717a] dark:text-zinc-400 mb-1">
                Observações / Carga
              </Text>
              <TextInput
                className="bg-white dark:bg-zinc-950 border border-[#e2dfe1] dark:border-zinc-800 rounded-xl px-3 py-2 text-xs font-sans-medium text-[#1b1b1d] dark:text-white"
                placeholder="Ex: Carga inicial recomendada"
                placeholderTextColor={isDark ? '#71717a' : '#a09da1'}
                value={item.notes}
                onChangeText={(text) => handleUpdateExercise(item.tempId, 'notes', text)}
              />
            </MotiView>
          ))
        )}
      </ScrollView>

      {/* MODAL DA BIBLIOTECA DE EXERCÍCIOS OTIMIZADO */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsModalVisible(false)}>
          <View className="flex-1 bg-black/60 justify-end">
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View className="bg-white dark:bg-zinc-900 rounded-t-3xl p-5 h-[85%] border-t border-[#e2dfe1] dark:border-zinc-800">
                <View className="flex-row items-center justify-between mb-3">
                  <View>
                    <Text className="text-lg font-outfit-extrabold text-[#1b1b1d] dark:text-white">
                      Biblioteca de Exercícios
                    </Text>
                    <Text className="text-xs font-sans-bold text-[#59C83A]">
                      {selectedExercises.length} selecionado(s)
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setIsModalVisible(false)}
                    className="bg-[#59C83A] px-4 py-2 rounded-xl"
                  >
                    <Text className="text-white font-sans-bold text-xs">Concluir</Text>
                  </TouchableOpacity>
                </View>

                {/* BARRINHA DE PESQUISA */}
                <View className="bg-[#f8f9fa] dark:bg-zinc-950 flex-row items-center px-3.5 py-2.5 rounded-xl border border-[#e2dfe1] dark:border-zinc-800 mb-3">
                  <MagnifyingGlass size={18} color={isDark ? '#59C83A' : '#71717a'} />
                  <TextInput
                    className="flex-1 ml-2.5 text-sm font-sans-medium text-[#1b1b1d] dark:text-white"
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

                {/* FILTROS DE CATEGORIA DINÂMICOS */}
                <View className="mb-4">
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingVertical: 4, alignItems: 'center' }}
                  >
                    {categoryOptions.map((cat) => {
                      const active = selectedCategoryFilter === cat.id;
                      return (
                        <TouchableOpacity
                          key={cat.id}
                          onPress={() => setSelectedCategoryFilter(cat.id)}
                          className={`px-4 py-2 rounded-xl mr-2 border ${active
                              ? 'bg-[#59C83A] border-[#59C83A]'
                              : 'bg-[#f8f9fa] dark:bg-zinc-800 border-[#e2dfe1] dark:border-zinc-700'
                            }`}
                        >
                          <Text
                            className={`text-xs font-sans-bold ${active ? 'text-white' : 'text-[#414755] dark:text-zinc-200'
                              }`}
                          >
                            {cat.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* LISTA DE EXERCÍCIOS OTIMIZADA */}
                {loadingModalExercises ? (
                  <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#59C83A" />
                  </View>
                ) : (
                  <FlatList
                    data={filteredRegisteredExercises}
                    keyExtractor={(item) => item.id}
                    showsVerticalScrollIndicator={false}
                    renderItem={renderModalExerciseItem}
                    initialNumToRender={10}
                    maxToRenderPerBatch={10}
                    windowSize={5}
                    removeClippedSubviews={Platform.OS === 'android'}
                  />
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
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