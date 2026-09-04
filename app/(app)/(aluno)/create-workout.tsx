import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  useColorScheme,
  Modal,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
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

  // ESTADOS DO MODAL DE SELEÇÃO DE EXERCÍCIOS
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [availableExercises, setAvailableExercises] = useState<ExerciseOption[]>([]);
  const [isLoadingAvailable, setIsLoadingAvailable] = useState(false);

  // ESTADOS DE FILTRO E BUSCA DO MODAL
  const [selectedCategory, setSelectedCategory] = useState<string>("TODOS");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // ESTADO QUE GUARDA APENAS 1 GIF EXPANDIDO POR VEZ
  const [expandedModalExerciseId, setExpandedModalExerciseId] = useState<string | null>(null);

  // ESTADO DO MODAL PERSONALIZADO DE ALERTA
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

  // 1. CARREGA OS DADOS DO TREINO SE ESTIVER NO MODO DE EDIÇÃO
  useEffect(() => {
    async function loadWorkoutForEditing() {
      if (!planId) return;

      try {
        setIsLoadingWorkout(true);

        const { data, error } = await supabase
          .from("custom_workouts")
          .select(`
            id,
            title,
            description,
            day_of_week,
            custom_workout_exercises (
              id,
              sets,
              reps,
              weight,
              exercise_id,
              exercises (
                id,
                name,
                category_id,
                gif_key
              )
            )
          `)
          .eq("id", planId)
          .single();

        if (error) throw new Error(error.message);

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
          message: err.message || "Não foi possível carregar os dados.",
          type: "danger",
        });
      } finally {
        setIsLoadingWorkout(false);
      }
    }

    loadWorkoutForEditing();
  }, [planId]);

  // 2. BUSCA A LISTA DE TODOS OS EXERCÍCIOS DISPONÍVEIS
  async function handleOpenAddExerciseModal() {
    setIsModalOpen(true);
    setExpandedModalExerciseId(null);
    setSelectedCategory("TODOS");
    setSearchQuery("");

    if (availableExercises.length > 0) return;

    try {
      setIsLoadingAvailable(true);
      const { data, error } = await supabase
        .from("exercises")
        .select("id, name, category_id, gif_key")
        .order("name", { ascending: true });

      if (error) throw new Error(error.message);
      setAvailableExercises(data || []);
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

  // 3. EXTRAÇÃO DINÂMICA DE CATEGORIAS DISPONÍVEIS
  const categoriesList = useMemo(() => {
    const rawCategories = availableExercises.map((item) => item.category_id).filter(Boolean);
    const uniqueCategories = Array.from(new Set(rawCategories)).sort();
    return ["TODOS", ...uniqueCategories];
  }, [availableExercises]);

  // 4. FILTRAGEM DE EXERCÍCIOS POR CATEGORIA E BUSCA
  const filteredExercises = useMemo(() => {
    return availableExercises.filter((item) => {
      const matchesCategory =
        selectedCategory === "TODOS" ||
        item.category_id?.toUpperCase() === selectedCategory.toUpperCase();

      const matchesSearch = item.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase().trim());

      return matchesCategory && matchesSearch;
    });
  }, [availableExercises, selectedCategory, searchQuery]);

  // 5. SELEÇÃO DE EXERCÍCIO
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

  // 6. ATUALIZA SÉRIES, REPETIÇÕES OU CARGA
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

  // 7. REMOVE UM EXERCÍCIO DA LISTA LOCAL
  function handleRemoveExercise(index: number) {
    setSelectedExercises((prev) => prev.filter((_, i) => i !== index));
  }

  // 8. SALVA OU ATUALIZA O TREINO NO SUPABASE
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

      let currentWorkoutId = planId;

      const payload = {
        title: workoutTitle.trim(),
        description: workoutDescription.trim(),
        day_of_week: selectedDay,
      };

      if (isEditing && planId) {
        let { error: updateError } = await supabase
          .from("custom_workouts")
          .update(payload)
          .eq("id", planId);

        if (updateError) {
          const { error: fallbackUpdateError } = await supabase
            .from("custom_workouts")
            .update({ title: workoutTitle.trim() })
            .eq("id", planId);

          if (fallbackUpdateError) throw new Error(fallbackUpdateError.message);
        }

        const { error: deleteError } = await supabase
          .from("custom_workout_exercises")
          .delete()
          .eq("custom_workout_id", planId);

        if (deleteError) {
          await supabase
            .from("custom_workout_exercises")
            .delete()
            .eq("workout_id", planId);
        }
      } else {
        let newWorkoutData = null;

        const fullInsert = await supabase
          .from("custom_workouts")
          .insert({
            ...payload,
            user_id: user.id,
            student_id: user.id,
          })
          .select("id")
          .single();

        if (fullInsert.error) {
          const fallbackInsert = await supabase
            .from("custom_workouts")
            .insert({
              title: workoutTitle.trim(),
              user_id: user.id,
              student_id: user.id,
            })
            .select("id")
            .single();

          if (fallbackInsert.error) throw new Error(fallbackInsert.error.message);
          newWorkoutData = fallbackInsert.data;
        } else {
          newWorkoutData = fullInsert.data;
        }

        currentWorkoutId = newWorkoutData.id;
      }

      if (currentWorkoutId) {
        const exercisesToInsert = selectedExercises.map((item) => ({
          custom_workout_id: currentWorkoutId,
          exercise_id: item.exercise_id,
          sets: parseInt(item.sets, 10) || 3,
          reps: item.reps || "10",
          weight: item.weight || "0kg",
        }));

        const { error: exercisesError } = await supabase
          .from("custom_workout_exercises")
          .insert(exercisesToInsert);

        if (exercisesError) {
          const fallbackToInsert = selectedExercises.map((item) => ({
            workout_id: currentWorkoutId,
            exercise_id: item.exercise_id,
            sets: parseInt(item.sets, 10) || 3,
            reps: item.reps || "10",
            weight: item.weight || "0kg",
          }));

          const { error: fallbackError } = await supabase
            .from("custom_workout_exercises")
            .insert(fallbackToInsert);

          if (fallbackError) {
            throw new Error(
              `Falha ao salvar exercícios: ${fallbackError.message}`
            );
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: ["student-workouts"] });
      queryClient.invalidateQueries({ queryKey: ["student-home-data"] });
      if (planId) {
        queryClient.invalidateQueries({
          queryKey: ["custom-workout-detail", planId],
        });
      }

      showAlertModal({
        title: "Sucesso! 🎉",
        message: isEditing
          ? "Seu treino foi atualizado com sucesso!"
          : "Seu novo treino foi criado com sucesso!",
        type: "success",
        showCancelButton: false,
        onConfirm: () => {
          router.replace("/(aluno)/(tabs)/my-workouts");
        },
      });
    } catch (err: any) {
      showAlertModal({
        title: "Erro ao Salvar",
        message: err.message || "Ocorreu um erro inesperado.",
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
      {/* 1. CABEÇALHO ANIMADO */}
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

        <Text className="text-xl font-extrabold text-[#1b1b1d] dark:text-white">
          {isEditing ? "Editar Treino" : "Montar Novo Treino"}
        </Text>

        <View className="w-10" />
      </MotiView>

      {isLoadingWorkout ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#59C83A" />
          <Text className="text-xs text-[#71717a] dark:text-zinc-400 mt-3 font-medium">
            Carregando informações do treino...
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* 2. CAMPOS DO FORMULÁRIO ANIMADOS */}
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
            {/* CAMPO NOME DO TREINO */}
            <Text className="text-xs font-bold text-[#71717a] dark:text-zinc-400 uppercase mb-1.5">
              Nome do Treino
            </Text>
            <TextInput
              className="bg-[#f8f9fa] dark:bg-zinc-900 border border-[#e2dfe1] dark:border-zinc-800 rounded-2xl px-4 py-3.5 text-base font-medium text-[#1b1b1d] dark:text-white mb-4"
              placeholder="Ex: Treino A - Peito e Tríceps"
              placeholderTextColor={isDark ? "#71717a" : "#a1a1aa"}
              value={workoutTitle}
              onChangeText={setWorkoutTitle}
            />

            {/* CAMPO PROPÓSITO / PARA QUE SERVE */}
            <View className="flex-row items-center mb-1.5">
              <Target size={14} color="#59C83A" weight="bold" />
              <Text className="text-xs font-bold text-[#71717a] dark:text-zinc-400 uppercase ml-1">
                Propósito / Para que serve
              </Text>
            </View>
            <TextInput
              className="bg-[#f8f9fa] dark:bg-zinc-900 border border-[#e2dfe1] dark:border-zinc-800 rounded-2xl px-4 py-3 text-sm font-semibold text-[#1b1b1d] dark:text-white mb-4"
              placeholder="Ex: Hipertrofia de peitorais e ganho de força no tríceps"
              placeholderTextColor={isDark ? "#71717a" : "#a1a1aa"}
              value={workoutDescription}
              onChangeText={setWorkoutDescription}
            />

            {/* SELEÇÃO DIA DA SEMANA */}
            <View className="flex-row items-center mb-2">
              <Calendar size={14} color="#59C83A" weight="bold" />
              <Text className="text-xs font-bold text-[#71717a] dark:text-zinc-400 uppercase ml-1">
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
                      className={`text-xs font-bold ${
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

          {/* 3. CABEÇALHO DA SEÇÃO DE EXERCÍCIOS ANIMADO */}
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
            <Text className="text-base font-extrabold text-[#1b1b1d] dark:text-white">
              Exercícios ({selectedExercises.length})
            </Text>

            <TouchableOpacity
              onPress={handleOpenAddExerciseModal}
              className="bg-[#59C83A]/10 border border-[#59C83A]/30 px-3 py-1.5 rounded-xl flex-row items-center"
            >
              <Plus size={16} color="#59C83A" weight="bold" />
              <Text className="text-xs font-bold text-[#59C83A] ml-1">
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
                <Text className="text-[#1b1b1d] dark:text-white font-bold mt-2 text-sm">
                  Nenhum exercício adicionado
                </Text>
                <Text className="text-[#71717a] dark:text-zinc-400 text-xs text-center mt-1">
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
                    <Text className="text-xs font-bold text-[#59C83A] uppercase">
                      {exercise.category_id}
                    </Text>
                    <Text className="text-base font-bold text-[#1b1b1d] dark:text-white">
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

                {/* CAMPOS DE SÉRIES, REPS E CARGA */}
                <View className="flex-row justify-between gap-2">
                  <View className="flex-1">
                    <Text className="text-[10px] font-bold text-[#71717a] dark:text-zinc-400 mb-1">
                      SÉRIES
                    </Text>
                    <TextInput
                      className="bg-white dark:bg-zinc-950 border border-[#e2dfe1] dark:border-zinc-800 rounded-xl px-3 py-2 text-center text-sm font-bold text-[#1b1b1d] dark:text-white"
                      keyboardType="numeric"
                      value={exercise.sets}
                      onChangeText={(val) =>
                        handleUpdateExerciseField(index, "sets", val)
                      }
                    />
                  </View>

                  <View className="flex-1">
                    <Text className="text-[10px] font-bold text-[#71717a] dark:text-zinc-400 mb-1">
                      REPS
                    </Text>
                    <TextInput
                      className="bg-white dark:bg-zinc-950 border border-[#e2dfe1] dark:border-zinc-800 rounded-xl px-3 py-2 text-center text-sm font-bold text-[#1b1b1d] dark:text-white"
                      value={exercise.reps}
                      onChangeText={(val) =>
                        handleUpdateExerciseField(index, "reps", val)
                      }
                    />
                  </View>

                  <View className="flex-1">
                    <Text className="text-[10px] font-bold text-[#71717a] dark:text-zinc-400 mb-1">
                      CARGA
                    </Text>
                    <TextInput
                      className="bg-white dark:bg-zinc-950 border border-[#e2dfe1] dark:border-zinc-800 rounded-xl px-3 py-2 text-center text-sm font-bold text-[#1b1b1d] dark:text-white"
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

          {/* 5. BOTÃO SALVAR / ATUALIZAR ANIMADO */}
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
                  <Text className="text-white font-extrabold text-base ml-2">
                    {isEditing ? "Salvar Alterações" : "Concluir e Criar Treino"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </MotiView>
        </ScrollView>
      )}

      {/* MODAL PARA SELEÇÃO DE EXERCÍCIOS */}
      <Modal visible={isModalOpen} animationType="slide" transparent>
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-white dark:bg-zinc-900 rounded-t-3xl p-6 h-[85%] border-t border-[#e2dfe1] dark:border-zinc-800">
            {/* CABEÇALHO DO MODAL DE SELEÇÃO */}
            <View className="flex-row items-center justify-between mb-4 pb-3 border-b border-[#e2dfe1] dark:border-zinc-800">
              <View>
                <Text className="text-lg font-extrabold text-[#1b1b1d] dark:text-white">
                  Selecione o Exercício
                </Text>
                <Text className="text-xs text-[#59C83A] font-bold">
                  {selectedExercises.length} selecionado(s)
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setIsModalOpen(false)}
                className="bg-[#59C83A] px-4 py-2 rounded-xl"
              >
                <Text className="text-white font-bold text-xs">Concluir</Text>
              </TouchableOpacity>
            </View>

            {/* CAMPO DE BUSCA */}
            <View className="flex-row items-center bg-[#f8f9fa] dark:bg-zinc-950 border border-[#e2dfe1] dark:border-zinc-800 rounded-xl px-3 py-2.5 mb-3">
              <MagnifyingGlass size={18} color={isDark ? "#71717a" : "#a1a1aa"} />
              <TextInput
                className="flex-1 ml-2 text-sm font-semibold text-[#1b1b1d] dark:text-white"
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

            {/* FILTRO DE CATEGORIAS HORIZONTAL */}
            <View className="mb-4">
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
              >
                {categoriesList.map((cat) => {
                  const isActive = selectedCategory === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => {
                        setSelectedCategory(cat);
                      }}
                      className={`px-3.5 py-1.5 rounded-xl border ${
                        isActive
                          ? "bg-[#59C83A] border-[#59C83A]"
                          : "bg-[#f8f9fa] dark:bg-zinc-950 border-[#e2dfe1] dark:border-zinc-800"
                      }`}
                    >
                      <Text
                        className={`text-xs font-bold uppercase ${
                          isActive
                            ? "text-white"
                            : "text-[#71717a] dark:text-zinc-400"
                        }`}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* LISTA DE EXERCÍCIOS DISPONÍVEIS */}
            {isLoadingAvailable ? (
              <View className="flex-1 justify-center items-center">
                <ActivityIndicator size="large" color="#59C83A" />
              </View>
            ) : filteredExercises.length === 0 ? (
              <View className="flex-1 justify-center items-center py-10">
                <Barbell size={32} color={isDark ? "#71717a" : "#a1a1aa"} />
                <Text className="text-[#71717a] dark:text-zinc-400 font-bold text-sm mt-2">
                  Nenhum exercício encontrado.
                </Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {filteredExercises.map((item) => {
                  const isAdded = selectedExercises.some(
                    (e) => e.exercise_id === item.id
                  );
                  const isGifExpanded = expandedModalExerciseId === item.id;

                  return (
                    <View
                      key={item.id}
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
                          <Text className="text-xs font-bold text-[#59C83A] uppercase">
                            {item.category_id || "GERAL"}
                          </Text>
                          <Text className="text-sm font-bold text-[#1b1b1d] dark:text-white">
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
                })}
              </ScrollView>
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