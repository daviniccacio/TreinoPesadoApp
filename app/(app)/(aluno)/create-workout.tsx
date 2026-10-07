// ============================================================================
// DOCUMENTAÇÃO: TELA DE CRIAÇÃO / EDIÇÃO DE TREINO CUSTOMIZADO (ALUNO - VPS)
// ============================================================================

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  useColorScheme,
  Modal,
  FlatList,
  TouchableWithoutFeedback,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter, useNavigation } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Plus,
  Trash,
  Check,
  Barbell,
  MagnifyingGlass,
  X,
  Calendar,
  Target,
} from "phosphor-react-native";
import { useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { MotiView } from "moti";

import { supabase } from "../../../lib/supabase";
import { api } from "../../../services/api";
import { getExerciseGif } from "../../../lib/exerciseGifs";
import { CustomModal } from "../../../components/CustomModal";

const DAYS_OF_WEEK = [
  "Livre",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
];

function formatCategoryLabel(rawCategory?: string): string {
  if (!rawCategory) return "Geral";
  const normalized = rawCategory.trim().toLowerCase();

  const mapLabels: Record<string, string> = {
    todos: "Todos",
    biceps: "Bíceps",
    triceps: "Tríceps",
    abdomen: "Abdômen",
    gluteo: "Glúteos",
    ombros: "Ombros",
    pernas: "Pernas",
    costas: "Costas",
    peito: "Peitoral",
    cardio: "Cardio",
    alongamento: "Alongamento",
  };

  if (mapLabels[normalized]) return mapLabels[normalized];
  return rawCategory.charAt(0).toUpperCase() + rawCategory.slice(1).toLowerCase();
}

interface ExerciseOption {
  id: string;
  name: string;
  category_id: string;
  gif_key?: string;
}

interface SelectedExercise {
  exercise_id: string;
  name: string;
  category_id: string;
  sets: string;
  reps: string;
  weight: string;
  gif_key?: string;
}

interface ShowAlertModalOptions {
  title: string;
  message: string;
  type?: "success" | "danger" | "info";
  confirmText?: string;
  cancelText?: string;
  showCancelButton?: boolean;
  onConfirm?: () => void;
}

export default function CreateOrEditWorkoutScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const queryClient = useQueryClient();

  const { planId } = useLocalSearchParams<{ planId?: string }>();
  const isEditing = !!planId;

  // ESTADOS DO FORMULÁRIO
  const [workoutTitle, setWorkoutTitle] = useState("");
  const [workoutDescription, setWorkoutDescription] = useState("");
  const [selectedDay, setSelectedDay] = useState("Livre");
  const [selectedExercises, setSelectedExercises] = useState<SelectedExercise[]>([]);
  const [isLoadingWorkout, setIsLoadingWorkout] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // ESTADOS DO MODAL DE SELEÇÃO DE EXERCÍCIOS
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [availableExercises, setAvailableExercises] = useState<ExerciseOption[]>([]);
  const [isLoadingAvailable, setIsLoadingAvailable] = useState(false);

  // FILTROS
  const [selectedCategory, setSelectedCategory] = useState<string>("TODOS");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedModalExerciseId, setExpandedModalExerciseId] = useState<string | null>(null);

  // MODAL DE ALERTA
  const [modalConfig, setModalConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: "success" | "danger" | "info";
    confirmText: string;
    cancelText: string;
    showCancelButton: boolean;
    onConfirm: () => void;
  }>({
    visible: false,
    title: "",
    message: "",
    type: "info",
    confirmText: "Entendi",
    cancelText: "Cancelar",
    showCancelButton: false,
    onConfirm: () => {},
  });

  function showAlertModal({
    title,
    message,
    type = "info",
    confirmText = "Entendi",
    cancelText = "Cancelar",
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

  const isFormDirty =
    selectedExercises.length > 0 ||
    workoutTitle.trim().length > 0 ||
    workoutDescription.trim().length > 0;

  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (e) => {
      if (!isFormDirty || isSaved) return;

      e.preventDefault();

      showAlertModal({
        title: "Descartar alterações? ⚠️",
        message:
          "Você possui exercícios ou informações preenchidas. Se sair agora, todas as alterações serão perdidas.",
        type: "danger",
        confirmText: "Sair sem Salvar",
        cancelText: "Continuar Editando",
        showCancelButton: true,
        onConfirm: () => {
          navigation.dispatch(e.data.action);
        },
      });
    });

    return unsubscribe;
  }, [navigation, isFormDirty, isSaved]);

  // 1. CARREGA O TREINO PARA EDIÇÃO VIA API DA VPS
  useEffect(() => {
    async function loadWorkoutForEditing() {
      if (!planId) return;

      try {
        setIsLoadingWorkout(true);

        const response = await api.get(`/custom-workouts/detail/${planId}`);
        const data = response.data;

        if (data) {
          setWorkoutTitle(data.title || "");
          setWorkoutDescription(data.description || "");
          setSelectedDay(data.day_of_week || "Livre");

          const formattedExercises: SelectedExercise[] = (
            data.custom_workout_exercises || []
          ).map((item: any) => ({
            exercise_id: item.exercises?.id || item.exercise_id,
            name: item.exercises?.name || "Exercício",
            category_id: item.exercises?.category_id || "GERAL",
            sets: String(item.sets || "3"),
            reps: String(item.reps || "10"),
            weight: String(item.weight || "0kg"),
            gif_key: item.exercises?.gif_key || null,
          }));

          setSelectedExercises(formattedExercises);
        }
      } catch (err: any) {
        showAlertModal({
          title: "Erro ao carregar treino",
          message: err?.response?.data?.erro || "Não foi possível carregar os dados.",
          type: "danger",
        });
      } finally {
        setIsLoadingWorkout(false);
      }
    }

    loadWorkoutForEditing();
  }, [planId]);

  // 2. BUSCA A LISTA DE EXERCÍCIOS DISPONÍVEIS VIA API DA VPS
  async function handleOpenAddExerciseModal() {
    setIsModalOpen(true);
    setExpandedModalExerciseId(null);
    setSelectedCategory("TODOS");
    setSearchQuery("");

    if (availableExercises.length > 0) return;

    try {
      setIsLoadingAvailable(true);
      const response = await api.get("/exercises");
      setAvailableExercises(response.data || []);
    } catch (err: any) {
      showAlertModal({
        title: "Erro",
        message: "Não foi possível carregar a lista de exercícios.",
        type: "danger",
      });
    } finally {
      setIsLoadingAvailable(false);
    }
  }

  const categoriesList = useMemo(() => {
    const rawCategories = availableExercises
      .map((item) => item.category_id)
      .filter(Boolean);
    const uniqueCategories = Array.from(new Set(rawCategories.map((c) => c.trim()))).sort();
    return ["TODOS", ...uniqueCategories];
  }, [availableExercises]);

  const filteredExercises = useMemo(() => {
    return availableExercises.filter((item) => {
      const matchesCategory =
        selectedCategory === "TODOS" ||
        item.category_id?.toLowerCase().trim() === selectedCategory.toLowerCase().trim();

      const matchesSearch = item.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase().trim());

      return matchesCategory && matchesSearch;
    });
  }, [availableExercises, selectedCategory, searchQuery]);

  function handleSelectExercise(exercise: ExerciseOption) {
    const alreadyExists = selectedExercises.some(
      (e) => e.exercise_id === exercise.id
    );

    if (alreadyExists) {
      setSelectedExercises((prev) =>
        prev.filter((e) => e.exercise_id !== exercise.id)
      );
      if (expandedModalExerciseId === exercise.id) {
        setExpandedModalExerciseId(null);
      }
    } else {
      setSelectedExercises((prev) => [
        ...prev,
        {
          exercise_id: exercise.id,
          name: exercise.name,
          category_id: exercise.category_id,
          sets: "3",
          reps: "10",
          weight: "0kg",
          gif_key: exercise.gif_key,
        },
      ]);
      setExpandedModalExerciseId(exercise.id);
    }
  }

  function handleUpdateExerciseField(
    index: number,
    field: "sets" | "reps" | "weight",
    value: string
  ) {
    setSelectedExercises((prev) => {
      const updated = [...prev];
      updated[index][field] = value;
      return updated;
    });
  }

  function handleRemoveExercise(index: number) {
    setSelectedExercises((prev) => prev.filter((_, i) => i !== index));
  }

  const renderModalExerciseItem = useCallback(
    ({ item }: { item: ExerciseOption }) => {
      const isAdded = selectedExercises.some((e) => e.exercise_id === item.id);
      const isGifExpanded = expandedModalExerciseId === item.id;

      return (
        <View
          className={`p-3.5 rounded-2xl border mb-2.5 overflow-hidden ${
            isAdded
              ? "bg-[#59C83A]/10 border-[#59C83A]"
              : "bg-[#f8f9fa] dark:bg-zinc-950 border-[#e2dfe1] dark:border-zinc-800"
          }`}
        >
          <TouchableOpacity
            onPress={() => handleSelectExercise(item)}
            activeOpacity={0.7}
            className="flex-row justify-between items-center"
          >
            <View className="flex-1 mr-2">
              <Text className="text-xs font-sans-bold text-[#59C83A]">
                {formatCategoryLabel(item.category_id)}
              </Text>
              <Text className="text-sm font-outfit text-[#1b1b1d] dark:text-white">
                {item.name}
              </Text>
            </View>

            {isAdded ? (
              <View className="bg-[#59C83A] p-2 rounded-xl">
                <Check size={16} color="#ffffff" weight="bold" />
              </View>
            ) : (
              <View className="bg-[#59C83A]/10 p-2 rounded-xl border border-[#59C83A]/30">
                <Plus size={18} color="#59C83A" weight="bold" />
              </View>
            )}
          </TouchableOpacity>

          {isGifExpanded && (
            <MotiView
              from={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "timing", duration: 200 }}
              className="w-full h-52 bg-white dark:bg-zinc-900 rounded-xl overflow-hidden mt-3 border border-[#e2dfe1] dark:border-zinc-800 items-center justify-center"
            >
              <Image
                source={getExerciseGif(item.gif_key)}
                style={{ width: "100%", height: "100%" }}
                contentFit="contain"
                autoplay={true}
              />
            </MotiView>
          )}
        </View>
      );
    },
    [selectedExercises, expandedModalExerciseId]
  );

  // 3. SALVA OU ATUALIZA O TREINO VIA API DA VPS
  async function handleSaveWorkout() {
    if (!workoutTitle.trim()) {
      showAlertModal({
        title: "Campo Obrigatório",
        message: "Por favor, informe o nome do treino.",
        type: "info",
      });
      return;
    }

    if (selectedExercises.length === 0) {
      showAlertModal({
        title: "Nenhum Exercício",
        message: "Adicione pelo menos um exercício ao seu treino.",
        type: "info",
      });
      return;
    }

    try {
      setIsSaving(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Sessão expirada. Faça login novamente.");

      const payload = {
        userId: user.id,
        title: workoutTitle.trim(),
        description: workoutDescription.trim(),
        day_of_week: selectedDay,
        exercises: selectedExercises,
      };

      if (isEditing && planId) {
        await api.put(`/custom-workouts/${planId}`, payload);
      } else {
        await api.post("/custom-workouts", payload);
      }

      queryClient.invalidateQueries({ queryKey: ["student-workouts"] });
      queryClient.invalidateQueries({ queryKey: ["student-home-data"] });
      queryClient.invalidateQueries({ queryKey: ["workout-details-exercises"] });
      if (planId) {
        queryClient.invalidateQueries({
          queryKey: ["custom-workout-detail", planId],
        });
      }

      setIsSaved(true);

      showAlertModal({
        title: "Sucesso! 🎉",
        message: isEditing
          ? "Seu treino foi atualizado com sucesso!"
          : "Seu novo treino foi criado com sucesso!",
        type: "success",
        showCancelButton: false,
        onConfirm: () => {
          router.replace("/(aluno)/(tabs)/my-workouts" as any);
        },
      });
    } catch (err: any) {
      showAlertModal({
        title: "Erro ao Salvar",
        message: err?.response?.data?.erro || err.message || "Ocorreu um erro inesperado.",
        type: "danger",
      });
    } finally {
      setIsSaving(false);
    }
  }

  const safeTopPadding = Math.max(insets?.top || 0, 16);

  return (
    <View
      className="flex-1 bg-white dark:bg-zinc-950 px-5"
      style={{ paddingTop: safeTopPadding + 10 }}
    >
      {/* 1. CABEÇALHO */}
      <MotiView
        from={{ opacity: 0, translateY: -8 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{
          type: "spring",
          damping: 24,
          stiffness: 160,
        }}
        className="flex-row items-center justify-between mb-5"
      >
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.back()}
          className="w-10 h-10 rounded-xl bg-[#f8f9fa] dark:bg-zinc-900 justify-center items-center border border-[#e2dfe1] dark:border-zinc-800"
        >
          <ArrowLeft size={20} color={isDark ? "#ffffff" : "#1b1b1d"} />
        </TouchableOpacity>

        <Text className="text-xl font-outfit-extrabold text-[#1b1b1d] dark:text-white">
          {isEditing ? "Editar Treino" : "Montar Novo Treino"}
        </Text>

        <View className="w-10" />
      </MotiView>

      {isLoadingWorkout ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#59C83A" />
          <Text className="text-xs font-sans-medium text-[#71717a] dark:text-zinc-400 mt-3">
            Carregando informações do treino...
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* 2. FORMULÁRIO */}
          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{
              type: "spring",
              damping: 22,
              stiffness: 150,
              delay: 30,
            }}
          >
            <Text className="text-xs font-sans-bold text-[#71717a] dark:text-zinc-400 uppercase mb-1.5">
              Nome do Treino
            </Text>
            <TextInput
              className="bg-[#f8f9fa] dark:bg-zinc-900 border border-[#e2dfe1] dark:border-zinc-800 rounded-2xl px-4 py-3.5 text-base font-sans-medium text-[#1b1b1d] dark:text-white mb-4"
              placeholder="Ex: Treino A - Peito e Tríceps"
              placeholderTextColor={isDark ? "#71717a" : "#a1a1aa"}
              value={workoutTitle}
              onChangeText={setWorkoutTitle}
            />

            <View className="flex-row items-center mb-1.5">
              <Target size={14} color="#59C83A" weight="bold" />
              <Text className="text-xs font-sans-bold text-[#71717a] dark:text-zinc-400 uppercase ml-1">
                Propósito / Para que serve
              </Text>
            </View>
            <TextInput
              className="bg-[#f8f9fa] dark:bg-zinc-900 border border-[#e2dfe1] dark:border-zinc-800 rounded-2xl px-4 py-3 text-sm font-sans-medium text-[#1b1b1d] dark:text-white mb-4"
              placeholder="Ex: Hipertrofia de peitorais e ganho de força no tríceps"
              placeholderTextColor={isDark ? "#71717a" : "#a1a1aa"}
              value={workoutDescription}
              onChangeText={setWorkoutDescription}
            />

            <View className="flex-row items-center mb-2">
              <Calendar size={14} color="#59C83A" weight="bold" />
              <Text className="text-xs font-sans-bold text-[#71717a] dark:text-zinc-400 uppercase ml-1">
                Dia Sugerido / Frequência
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
              className="mb-6"
            >
              {DAYS_OF_WEEK.map((day) => {
                const isActive = selectedDay === day;
                return (
                  <TouchableOpacity
                    key={day}
                    onPress={() => setSelectedDay(day)}
                    className={`px-4 py-2 rounded-xl border ${
                      isActive
                        ? "bg-[#59C83A] border-[#59C83A]"
                        : "bg-[#f8f9fa] dark:bg-zinc-900 border-[#e2dfe1] dark:border-zinc-800"
                    }`}
                  >
                    <Text
                      className={`text-xs font-sans-bold ${
                        isActive ? "text-white" : "text-[#71717a] dark:text-zinc-400"
                      }`}
                    >
                      {day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </MotiView>

          {/* 3. SEÇÃO DE EXERCÍCIOS */}
          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{
              type: "spring",
              damping: 22,
              stiffness: 150,
              delay: 60,
            }}
            className="flex-row items-center justify-between mb-3"
          >
            <Text className="text-base font-outfit-extrabold text-[#1b1b1d] dark:text-white">
              Exercícios ({selectedExercises.length})
            </Text>

            <TouchableOpacity
              onPress={handleOpenAddExerciseModal}
              className="bg-[#59C83A]/10 border border-[#59C83A]/30 px-3 py-1.5 rounded-xl flex-row items-center"
            >
              <Plus size={16} color="#59C83A" weight="bold" />
              <Text className="text-xs font-sans-bold text-[#59C83A] ml-1">
                Adicionar
              </Text>
            </TouchableOpacity>
          </MotiView>

          {/* 4. LISTA DE EXERCÍCIOS SELECIONADOS */}
          {selectedExercises.length === 0 ? (
            <MotiView
              from={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "timing", duration: 250 }}
            >
              <TouchableOpacity
                onPress={handleOpenAddExerciseModal}
                className="bg-[#f8f9fa] dark:bg-zinc-900 p-8 rounded-2xl border border-dashed border-[#e2dfe1] dark:border-zinc-800 items-center mb-6"
              >
                <Barbell size={36} color={isDark ? "#71717a" : "#a1a1aa"} />
                <Text className="font-outfit text-[#1b1b1d] dark:text-white mt-2 text-sm">
                  Nenhum exercício adicionado
                </Text>
                <Text className="font-sans-medium text-[#71717a] dark:text-zinc-400 text-xs text-center mt-1">
                  Toque para escolher exercícios para o seu treino.
                </Text>
              </TouchableOpacity>
            </MotiView>
          ) : (
            selectedExercises.map((exercise, index) => (
              <MotiView
                key={`selected-${exercise.exercise_id}-${index}`}
                from={{ opacity: 0, translateY: 14, scale: 0.97 }}
                animate={{ opacity: 1, translateY: 0, scale: 1 }}
                transition={{
                  type: "spring",
                  damping: 22,
                  stiffness: 150,
                  delay: index * 40,
                }}
                className="bg-[#f8f9fa] dark:bg-zinc-900 p-4 rounded-2xl mb-3 border border-[#e2dfe1] dark:border-zinc-800"
              >
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-1 mr-2">
                    <Text className="text-xs font-sans-bold text-[#59C83A]">
                      {formatCategoryLabel(exercise.category_id)}
                    </Text>
                    <Text className="text-base font-outfit text-[#1b1b1d] dark:text-white">
                      {exercise.name}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => handleRemoveExercise(index)}
                    className="w-8 h-8 rounded-lg bg-red-500/10 items-center justify-center border border-red-500/20"
                  >
                    <Trash size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>

                {/* SÉRIES, REPS E CARGA */}
                <View className="flex-row justify-between gap-2">
                  <View className="flex-1">
                    <Text className="text-[10px] font-sans-bold text-[#71717a] dark:text-zinc-400 mb-1">
                      SÉRIES
                    </Text>
                    <TextInput
                      className="bg-white dark:bg-zinc-950 border border-[#e2dfe1] dark:border-zinc-800 rounded-xl px-3 py-2 text-center text-sm font-sans-bold text-[#1b1b1d] dark:text-white"
                      keyboardType="numeric"
                      value={exercise.sets}
                      onChangeText={(val) =>
                        handleUpdateExerciseField(index, "sets", val)
                      }
                    />
                  </View>

                  <View className="flex-1">
                    <Text className="text-[10px] font-sans-bold text-[#71717a] dark:text-zinc-400 mb-1">
                      REPS
                    </Text>
                    <TextInput
                      className="bg-white dark:bg-zinc-950 border border-[#e2dfe1] dark:border-zinc-800 rounded-xl px-3 py-2 text-center text-sm font-sans-bold text-[#1b1b1d] dark:text-white"
                      value={exercise.reps}
                      onChangeText={(val) =>
                        handleUpdateExerciseField(index, "reps", val)
                      }
                    />
                  </View>

                  <View className="flex-1">
                    <Text className="text-[10px] font-sans-bold text-[#71717a] dark:text-zinc-400 mb-1">
                      CARGA
                    </Text>
                    <TextInput
                      className="bg-white dark:bg-zinc-950 border border-[#e2dfe1] dark:border-zinc-800 rounded-xl px-3 py-2 text-center text-sm font-sans-bold text-[#1b1b1d] dark:text-white"
                      value={exercise.weight}
                      onChangeText={(val) =>
                        handleUpdateExerciseField(index, "weight", val)
                      }
                    />
                  </View>
                </View>
              </MotiView>
            ))
          )}

          {/* 5. BOTÃO SALVAR */}
          <MotiView
            from={{ opacity: 0, translateY: 12 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{
              type: "spring",
              damping: 22,
              stiffness: 150,
              delay: 90,
            }}
          >
            <TouchableOpacity
              onPress={handleSaveWorkout}
              disabled={isSaving}
              className="bg-[#59C83A] p-4 rounded-2xl flex-row items-center justify-center mt-4 shadow-sm"
              activeOpacity={0.8}
            >
              {isSaving ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Check size={20} color="#FFFFFF" weight="bold" />
                  <Text className="text-white font-outfit text-base ml-2">
                    {isEditing ? "Salvar Alterações" : "Concluir e Criar Treino"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </MotiView>
        </ScrollView>
      )}

      {/* MODAL PARA SELEÇÃO DE EXERCÍCIOS */}
      <Modal
        visible={isModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsModalOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsModalOpen(false)}>
          <View className="flex-1 bg-black/60 justify-end">
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View className="bg-white dark:bg-zinc-900 rounded-t-3xl p-6 h-[85%] border-t border-[#e2dfe1] dark:border-zinc-800">
                {/* CABEÇALHO DO MODAL */}
                <View className="flex-row items-center justify-between mb-4 pb-3 border-b border-[#e2dfe1] dark:border-zinc-800">
                  <View>
                    <Text className="text-lg font-outfit-extrabold text-[#1b1b1d] dark:text-white">
                      Selecione o Exercício
                    </Text>
                    <Text className="text-xs font-sans-bold text-[#59C83A]">
                      {selectedExercises.length} selecionado(s)
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => setIsModalOpen(false)}
                    className="bg-[#59C83A] px-4 py-2 rounded-xl"
                  >
                    <Text className="text-white font-sans-bold text-xs">Concluir</Text>
                  </TouchableOpacity>
                </View>

                {/* BUSCA */}
                <View className="flex-row items-center bg-[#f8f9fa] dark:bg-zinc-950 border border-[#e2dfe1] dark:border-zinc-800 rounded-xl px-3 py-2.5 mb-3">
                  <MagnifyingGlass size={18} color={isDark ? "#71717a" : "#a1a1aa"} />
                  <TextInput
                    className="flex-1 ml-2 text-sm font-sans-medium text-[#1b1b1d] dark:text-white"
                    placeholder="Buscar exercício pelo nome..."
                    placeholderTextColor={isDark ? "#71717a" : "#a1a1aa"}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery("")}>
                      <X size={16} color={isDark ? "#71717a" : "#a1a1aa"} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* FILTRO DE CATEGORIAS */}
                <View className="mb-4">
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 8 }}
                  >
                    {categoriesList.map((cat) => {
                      const isActive = selectedCategory === cat;
                      const displayLabel = cat === "TODOS" ? "Todos" : formatCategoryLabel(cat);

                      return (
                        <TouchableOpacity
                          key={cat}
                          onPress={() => setSelectedCategory(cat)}
                          className={`px-3.5 py-1.5 rounded-xl border ${
                            isActive
                              ? "bg-[#59C83A] border-[#59C83A]"
                              : "bg-[#f8f9fa] dark:bg-zinc-950 border-[#e2dfe1] dark:border-zinc-800"
                          }`}
                        >
                          <Text
                            className={`text-xs font-sans-bold ${
                              isActive
                                ? "text-white"
                                : "text-[#71717a] dark:text-zinc-400"
                            }`}
                          >
                            {displayLabel}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* LISTA DE EXERCÍCIOS */}
                {isLoadingAvailable ? (
                  <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#59C83A" />
                  </View>
                ) : filteredExercises.length === 0 ? (
                  <View className="flex-1 justify-center items-center py-10">
                    <Barbell size={32} color={isDark ? "#71717a" : "#a1a1aa"} />
                    <Text className="text-[#71717a] dark:text-zinc-400 font-sans-medium text-sm mt-2">
                      Nenhum exercício encontrado.
                    </Text>
                  </View>
                ) : (
                  <FlatList
                    data={filteredExercises}
                    keyExtractor={(item) => item.id}
                    showsVerticalScrollIndicator={false}
                    renderItem={renderModalExerciseItem}
                    initialNumToRender={10}
                    maxToRenderPerBatch={10}
                    windowSize={5}
                    removeClippedSubviews={Platform.OS === "android"}
                  />
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

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