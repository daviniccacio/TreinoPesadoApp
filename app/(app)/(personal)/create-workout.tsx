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
  Alert,
  useColorScheme,
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
import { supabase } from '../../../lib/supabase';

interface RegisteredExercise {
  id: string;
  name: string;
  sets?: number;
  reps?: string;
  weight?: string;
  category_id?: string;
}

interface SelectedExerciseItem {
  tempId: string;
  exercise_id: string;
  name: string;
  category_id?: string;
  sets: string;
  reps: string;
  notes: string;
}

const DAYS_OF_WEEK = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
const OBJECTIVE_OPTIONS = ['Hipertrofia', 'Emagrecimento', 'Resistência', 'Força', 'Adaptação'];

const CATEGORY_FILTERS = [
  { id: 'todos', label: 'Todos' },
  { id: 'peito', label: 'Peito' },
  { id: 'costas', label: 'Costas' },
  { id: 'bracos', label: 'Braços' },
  { id: 'ombros', label: 'Ombros' },
  { id: 'pernas', label: 'Pernas' },
];

export default function CreateWorkoutPlanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Parâmetros recebidos da navegação
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

  /**
   * Navegação inteligente de retorno
   */
  const handleNavigateBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(app)/(personal)');
    }
  }, [router]);

  /**
   * Reseta ou carrega os dados dependendo de haver um planId
   */
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
  }

  /**
   * Carrega os dados de um plano existente para Edição
   */
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
        .select('*')
        .eq('plan_id', id)
        .order('order_index', { ascending: true });

      if (exercisesError) throw exercisesError;

      if (exercises) {
        const mappedExercises: SelectedExerciseItem[] = exercises.map((ex) => ({
          tempId: ex.id || Date.now().toString() + Math.random().toString(),
          exercise_id: ex.exercise_id,
          name: ex.name,
          sets: String(ex.sets || '3'),
          reps: String(ex.reps || '10'),
          notes: ex.notes || '',
        }));
        setSelectedExercises(mappedExercises);
      }
    } catch (err: any) {
      Alert.alert('Erro', 'Não foi possível carregar os dados do treino para edição.');
      console.error(err);
    } finally {
      setLoadingPlanData(false);
    }
  }

  function toggleDay(day: string) {
    if (selectedDays.includes(day)) {
      if (selectedDays.length === 1) {
        Alert.alert('Atenção', 'Selecione pelo menos um dia da semana para o plano.');
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
      Alert.alert('Erro', 'Não foi possível carregar a lista de exercícios.');
      console.error(err);
    } finally {
      setLoadingModalExercises(false);
    }
  }, []);

  function handleOpenExerciseModal() {
    setIsModalVisible(true);
    fetchRegisteredExercises();
  }

  function handleToggleExerciseFromLibrary(item: RegisteredExercise) {
    const existingIndex = selectedExercises.findIndex((ex) => ex.exercise_id === item.id);

    if (existingIndex >= 0) {
      setSelectedExercises((prev) => prev.filter((ex) => ex.exercise_id !== item.id));
    } else {
      const newExerciseItem: SelectedExerciseItem = {
        tempId: Date.now().toString() + Math.random().toString(),
        exercise_id: item.id,
        name: item.name,
        category_id: item.category_id,
        sets: String(item.sets || '3'),
        reps: item.reps || '10 a 12',
        notes: item.weight ? `Carga sugerida: ${item.weight}` : '',
      };
      setSelectedExercises((prev) => [...prev, newExerciseItem]);
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

  /**
   * Salva ou Atualiza o Plano de Treino no Supabase
   */
  async function handleSavePlan() {
    if (!planName.trim()) {
      Alert.alert('Campo Obrigatório', 'Por favor, informe o nome do plano de treino.');
      return;
    }

    if (selectedExercises.length === 0) {
      Alert.alert('Atenção', 'Adicione pelo menos um exercício ao plano.');
      return;
    }

    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (planId) {
        // --- MODO DE EDIÇÃO (UPDATE) ---
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

        Alert.alert('Sucesso!', 'Plano de treino atualizado com sucesso!', [
          { text: 'OK', onPress: () => handleNavigateBack() },
        ]);
      } else {
        // --- MODO DE CRIAÇÃO (INSERT) ---
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

        Alert.alert('Sucesso!', 'Plano de treino criado com sucesso!', [
          { text: 'OK', onPress: () => handleNavigateBack() },
        ]);
      }
    } catch (error: any) {
      Alert.alert('Erro ao Salvar', error.message || 'Ocorreu um erro ao guardar o plano.');
    } finally {
      setSaving(false);
    }
  }

  const filteredRegisteredExercises = registeredExercises.filter((ex) => {
    const matchesSearch = ex.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
    const matchesCategory =
      selectedCategoryFilter === 'todos' ||
      (ex.category_id && ex.category_id.toLowerCase().includes(selectedCategoryFilter));
    return matchesSearch && matchesCategory;
  });

  const safeTopPadding = Math.max(insets?.top || 0, 16);

  if (loadingPlanData) {
    return (
      <View className="flex-1 bg-white dark:bg-zinc-950 justify-center items-center">
        <ActivityIndicator size="large" color="#59C83A" />
        <Text className="text-xs text-[#71717a] dark:text-zinc-400 mt-2 font-medium">
          Carregando dados do treino...
        </Text>
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
          onPress={handleSavePlan}
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

        {/* LISTA DOS EXERCÍCIOS ADICIONADOS */}
        <Text className="text-base font-extrabold text-[#1b1b1d] dark:text-white mb-3">
          Exercícios Selecionados ({selectedExercises.length})
        </Text>

        {selectedExercises.length === 0 ? (
          <View className="p-8 items-center justify-center border border-dashed border-[#e2dfe1] dark:border-zinc-800 rounded-2xl">
            <Barbell size={32} color={isDark ? '#52525b' : '#a1a1aa'} />
            <Text className="text-xs font-medium text-[#71717a] dark:text-zinc-400 mt-2 text-center">
              Nenhum exercício selecionado.{'\n'}Clica no botão verde para abrir a lista e tocar para adicionar.
            </Text>
          </View>
        ) : (
          selectedExercises.map((item, index) => (
            <View
              key={item.tempId}
              className="bg-[#f8f9fa] dark:bg-zinc-900 p-4 rounded-2xl border border-[#e2dfe1] dark:border-zinc-800 mb-3"
            >
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-sm font-extrabold text-[#1b1b1d] dark:text-white flex-1 mr-2">
                  {index + 1}. {item.name}
                </Text>
                <TouchableOpacity onPress={() => handleRemoveExercise(item.tempId)}>
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

      {/* MODAL DE SELEÇÃO RÁPIDA DE EXERCÍCIOS */}
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

            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row mb-4 max-h-10">
              {CATEGORY_FILTERS.map((cat) => {
                const active = selectedCategoryFilter === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => setSelectedCategoryFilter(cat.id)}
                    className={`px-3 py-1.5 rounded-lg mr-2 border ${
                      active
                        ? 'bg-[#59C83A] border-[#59C83A]'
                        : 'bg-[#f8f9fa] dark:bg-zinc-950 border-[#e2dfe1] dark:border-zinc-800'
                    }`}
                  >
                    <Text className={`text-xs font-bold ${active ? 'text-white' : 'text-[#71717a]'}`}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {loadingModalExercises ? (
              <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="large" color="#59C83A" />
                <Text className="text-xs text-[#71717a] mt-2 font-medium">
                  Carregando lista de exercícios...
                </Text>
              </View>
            ) : (
              <FlatList
                data={filteredRegisteredExercises}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                  const isAdded = selectedExercises.some((ex) => ex.exercise_id === item.id);

                  return (
                    <TouchableOpacity
                      onPress={() => handleToggleExerciseFromLibrary(item)}
                      activeOpacity={0.7}
                      className={`p-3.5 rounded-xl border mb-2.5 flex-row items-center justify-between ${
                        isAdded
                          ? 'bg-[#59C83A]/10 border-[#59C83A]'
                          : 'bg-[#f8f9fa] dark:bg-zinc-950 border-[#e2dfe1] dark:border-zinc-800'
                      }`}
                    >
                      <View className="flex-1 mr-2">
                        <Text className="text-sm font-bold text-[#1b1b1d] dark:text-white">
                          {item.name}
                        </Text>
                        <Text className="text-xs text-[#71717a] dark:text-zinc-400 mt-0.5">
                          Grupo: {item.category_id || 'Geral'} | Séries: {item.sets || 3}
                        </Text>
                      </View>

                      {isAdded ? (
                        <View className="bg-[#59C83A] p-2 rounded-lg">
                          <Check size={16} color="#ffffff" weight="bold" />
                        </View>
                      ) : (
                        <View className="bg-[#59C83A]/10 p-2 rounded-lg border border-[#59C83A]/30">
                          <Plus size={16} color="#59C83A" weight="bold" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  <View className="py-10 items-center">
                    <Text className="text-xs text-[#71717a] dark:text-zinc-400 font-medium text-center">
                      Nenhum exercício encontrado na biblioteca.
                    </Text>
                  </View>
                }
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}