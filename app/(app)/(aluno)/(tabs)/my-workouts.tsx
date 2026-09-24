// ============================================================================
// DOCUMENTAÇÃO: TELA MEUS TREINOS (ÁREA DO ALUNO)
// ============================================================================
// Exibe as fichas de treino do personal e do aluno.
// Corrigida a consulta para a tabela 'workout_exercises' do Supabase.
// Inclui margem de segurança inferior contra sobreposição de navegação nativa.
// ============================================================================

import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  useColorScheme,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Barbell,
  UserCheck,
  User,
  Plus,
  PlayCircle,
  PencilSimple,
  Trash,
  Calendar,
  Target,
  X,
} from "phosphor-react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MotiView } from "moti";
import { supabase } from "../../../../lib/supabase";
import { CustomModal } from "../../../../components/CustomModal";

// --- MAPEAMENTO DE CATEGORIAS MUSCULARES ---
const CATEGORY_MAP: Record<string, string> = {
  gluteo: "Glúteos",
  peito: "Peitoral",
  perna: "Pernas",
  costas: "Costas",
  ombro: "Ombros",
  biceps: "Bíceps",
  triceps: "Tríceps",
  abdomen: "Abdômen",
  cardio: "Cardio",
  panturrilha: "Panturrilhas",
  antebraço: "Antebraço",
  "pernas-posterior": "Posterior de Coxa",
  "perna-posterior": "Posterior de Coxa",
};

// --- TIPAGENS DE DADOS ---
interface WorkoutCardItem {
  id: string;
  title: string;
  type: "personal" | "custom";
  subtitle: string;
  day_of_week: string;
  raw_days?: any;
}

interface ExerciseItem {
  id: string;
  name: string;
  sets: number;
  reps: string;
  weight: string;
  category?: string;
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

const CATEGORY_FILTERS = [
  { id: "all", label: "Todos" },
  { id: "personal", label: "Criados pelo Personal" },
  { id: "custom", label: "Criados por Mim" },
] as const;

type FilterType = "all" | "personal" | "custom";

/**
 * Formata os dias da semana para exibição com nomes completos
 */
function formatDaysOfWeek(rawDays: any): string {
  if (!rawDays) return "Ficha Semanal";

  let daysArray: string[] = [];

  if (Array.isArray(rawDays)) {
    daysArray = rawDays;
  } else if (typeof rawDays === "string") {
    if (rawDays.startsWith("[") && rawDays.endsWith("]")) {
      try {
        daysArray = JSON.parse(rawDays);
      } catch {
        daysArray = [rawDays];
      }
    } else {
      daysArray = rawDays.split(",").map((d) => d.trim());
    }
  } else {
    daysArray = [String(rawDays)];
  }

  if (daysArray.length === 0) return "Ficha Semanal";
  if (daysArray.length === 7) return "Todos os dias";

  const fullNames: Record<string, string> = {
    seg: "Segunda-feira",
    segunda: "Segunda-feira",
    "segunda-feira": "Segunda-feira",
    mon: "Segunda-feira",
    ter: "Terça-feira",
    terca: "Terça-feira",
    terça: "Terça-feira",
    "terca-feira": "Terça-feira",
    "terça-feira": "Terça-feira",
    tue: "Terça-feira",
    qua: "Quarta-feira",
    quarta: "Quarta-feira",
    "quarta-feira": "Quarta-feira",
    wed: "Quarta-feira",
    qui: "Quinta-feira",
    quinta: "Quinta-feira",
    "quinta-feira": "Quinta-feira",
    thu: "Quinta-feira",
    sex: "Sexta-feira",
    sexta: "Sexta-feira",
    "sexta-feira": "Sexta-feira",
    fri: "Sexta-feira",
    sab: "Sábado",
    sáb: "Sábado",
    sabado: "Sábado",
    sábado: "Sábado",
    sat: "Sábado",
    dom: "Domingo",
    domingo: "Domingo",
    sun: "Domingo",
  };

  const formattedList = daysArray.map((day) => {
    const lower = String(day).toLowerCase().trim();
    return fullNames[lower] || day;
  });

  return formattedList.join(", ");
}

/**
 * Formata o peso evitando duplicar a unidade "kg"
 */
function formatWeight(rawWeight: any): string {
  if (!rawWeight) return "Carga livre";
  const str = String(rawWeight).trim();
  if (str.toLowerCase().includes("kg")) {
    return str;
  }
  return `${str}kg`;
}

/**
 * Busca as fichas atribuídas pelo personal e os treinos personalizados do aluno
 */
async function fetchStudentWorkouts(): Promise<WorkoutCardItem[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Usuário não autenticado");

  const combinedList: WorkoutCardItem[] = [];

  try {
    const { data: prescribedData, error } = await supabase
      .from("workout_plans")
      .select("*")
      .eq("student_id", user.id);

    if (!error && prescribedData) {
      prescribedData.forEach((item: any) => {
        const rawDay =
          item.day_of_week ||
          item.days_of_week ||
          item.week_day ||
          item.day ||
          item.target_day;

        combinedList.push({
          id: item.id,
          title: item.name || item.title || "Treino do Personal",
          type: "personal",
          subtitle: item.goal || item.description || "Ficha recomendada",
          day_of_week: formatDaysOfWeek(rawDay),
          raw_days: rawDay,
        });
      });
    }
  } catch (e) {
    console.warn("Erro ao carregar workout_plans:", e);
  }

  try {
    const { data: customData, error } = await supabase
      .from("custom_workouts")
      .select("*")
      .or(`user_id.eq.${user.id},student_id.eq.${user.id}`);

    if (!error && customData) {
      const customMap = new Map();
      customData.forEach((item: any) => customMap.set(item.id, item));

      customMap.forEach((item: any) => {
        const rawDay =
          item.day_of_week ||
          item.days_of_week ||
          item.week_day ||
          item.day ||
          item.target_day;

        combinedList.push({
          id: item.id,
          title: item.title || "Treino Personalizado",
          type: "custom",
          subtitle: item.description || "Criado por mim",
          day_of_week: formatDaysOfWeek(rawDay),
          raw_days: rawDay,
        });
      });
    }
  } catch (e) {
    console.warn("Erro ao carregar custom_workouts:", e);
  }

  return combinedList;
}

/**
 * 🟢 BUSCA DE EXERCÍCIOS CORRIGIDA PARA UTILIZAR 'workout_exercises'
 */
async function fetchWorkoutExercises(
  workoutId: string,
  type: "personal" | "custom"
): Promise<ExerciseItem[]> {
  if (!workoutId) return [];

  // Nome da tabela principal no Supabase (corrigido de workout_plan_exercises para workout_exercises)
  const primaryTable = type === "personal" ? "workout_exercises" : "custom_workout_exercises";

  // Tentativa 1: Busca com junção relacional na tabela 'exercises'
  let { data, error } = await supabase
    .from(primaryTable)
    .select("*, exercises(*)")
    .or(`workout_id.eq.${workoutId},workout_plan_id.eq.${workoutId},plan_id.eq.${workoutId}`);

  // Tentativa 2: Fallback para busca direta caso ocorra erro na junção
  if (error || !data || data.length === 0) {
    const fallback = await supabase
      .from(primaryTable)
      .select("*")
      .or(`workout_id.eq.${workoutId},workout_plan_id.eq.${workoutId},plan_id.eq.${workoutId}`);

    data = fallback.data || [];
    if (fallback.error && (!data || data.length === 0)) {
      console.warn(`Erro ao carregar exercícios de ${primaryTable}:`, fallback.error);
      return [];
    }
  }

  return data.map((item: any) => {
    // Mapeamento resiliente do nome do exercício
    const exerciseName =
      item.name ||
      item.exercise_name ||
      item.title ||
      item.exercises?.name ||
      item.exercises?.title ||
      item.exercise?.name ||
      "Exercício";

    // Mapeamento resiliente da categoria muscular
    const rawCategory =
      item.category ||
      item.category_name ||
      item.category_id ||
      item.exercises?.category ||
      item.exercises?.category_name ||
      item.exercises?.category_id ||
      item.exercise?.category ||
      "";

    const catKey = String(rawCategory).toLowerCase().trim();
    const categoryFormatted =
      CATEGORY_MAP[catKey] ||
      (rawCategory
        ? String(rawCategory).charAt(0).toUpperCase() + String(rawCategory).slice(1)
        : undefined);

    return {
      id: item.id,
      name: exerciseName,
      sets: item.sets || 3,
      reps: item.reps || "10-12",
      weight: formatWeight(item.weight || item.load),
      category: categoryFormatted,
    };
  });
}

export default function MyWorkoutsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const queryClient = useQueryClient();

  const [selectedFilter, setSelectedFilter] = useState<FilterType>("all");
  const [selectedWorkoutForDetails, setSelectedWorkoutForDetails] = useState<WorkoutCardItem | null>(null);

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

  const {
    data: workouts = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["student-workouts"],
    queryFn: fetchStudentWorkouts,
  });

  const { data: exercisesForDetails = [], isLoading: isLoadingExercises } = useQuery({
    queryKey: ["workout-details-exercises", selectedWorkoutForDetails?.id],
    queryFn: () =>
      fetchWorkoutExercises(
        selectedWorkoutForDetails!.id,
        selectedWorkoutForDetails!.type
      ),
    enabled: !!selectedWorkoutForDetails?.id,
  });

  const deleteWorkoutMutation = useMutation({
    mutationFn: async (workoutId: string) => {
      const { error } = await supabase
        .from("custom_workouts")
        .delete()
        .eq("id", workoutId);

      if (error) throw new Error(error.message);
      return workoutId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student-workouts"] });
      queryClient.invalidateQueries({ queryKey: ["student-home-data"] });
      showAlertModal({
        title: "Sucesso! 🎉",
        message: "O treino foi excluído com sucesso!",
        type: "success",
        showCancelButton: false,
      });
    },
    onError: (err: any) => {
      showAlertModal({
        title: "Erro ao Excluir",
        message: err.message || "Não foi possível excluir o treino.",
        type: "danger",
        showCancelButton: false,
      });
    },
  });

  function handleOpenWorkout(workout: WorkoutCardItem) {
    setSelectedWorkoutForDetails(null);
    router.push({
      pathname: "/(aluno)/execute-workout" as any,
      params: {
        id: workout.id,
        type: workout.type === "custom" ? "custom" : "prescribed",
      },
    });
  }

  function handleDeleteCustomWorkout(workoutId: string, title: string) {
    showAlertModal({
      title: "Excluir Treino",
      message: `Tem certeza de que deseja apagar o treino "${title}"? Esta ação não poderá ser desfeita.`,
      type: "danger",
      confirmText: "Excluir",
      cancelText: "Cancelar",
      showCancelButton: true,
      onConfirm: () => deleteWorkoutMutation.mutate(workoutId),
    });
  }

  const filteredWorkouts = workouts.filter((item) => {
    if (selectedFilter === "personal") return item.type === "personal";
    if (selectedFilter === "custom") return item.type === "custom";
    return true;
  });

  // Espaçamentos de segurança para topo e rodapé nativos
  const safeTopPadding = Math.max(insets?.top || 0, 16);
  const safeBottomPadding = Math.max(insets?.bottom || 0, 20);

  return (
    <View
      className="flex-1 bg-white dark:bg-zinc-950 px-5"
      style={{ paddingTop: safeTopPadding + 10 }}
    >
      {/* CABEÇALHO ANIMADO */}
      <MotiView
        from={{ opacity: 0, translateY: -8 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: "spring", damping: 24, stiffness: 160 }}
        className="flex-row items-center justify-between mb-4"
      >
        <View>
          <Text className="text-2xl font-outfit-extrabold text-[#1b1b1d] dark:text-white">
            Meus Treinos
          </Text>
          <Text className="text-xs font-sans-medium text-[#71717a] dark:text-zinc-400 mt-0.5">
            Suas fichas de exercícios e rotinas
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push("/(aluno)/create-workout" as any)}
          className="bg-[#59C83A] p-3 rounded-2xl shadow-sm"
        >
          <Plus size={20} color="#FFFFFF" weight="bold" />
        </TouchableOpacity>
      </MotiView>

      {/* FILTROS DE CATEGORIA */}
      <View className="mb-4">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingRight: 20 }}
        >
          {CATEGORY_FILTERS.map((filter, index) => {
            const isActive = selectedFilter === filter.id;
            return (
              <MotiView
                key={`filter-${filter.id}`}
                from={{ opacity: 0, translateX: -10 }}
                animate={{ opacity: 1, translateX: 0 }}
                transition={{
                  type: "spring",
                  damping: 22,
                  stiffness: 160,
                  delay: index * 40,
                }}
              >
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setSelectedFilter(filter.id)}
                  className={`px-4 py-2.5 rounded-xl mr-2 border ${
                    isActive
                      ? "bg-[#59C83A] border-[#59C83A]"
                      : "bg-[#f8f9fa] dark:bg-zinc-900 border-[#e2dfe1] dark:border-zinc-800"
                  }`}
                >
                  <Text
                    className={`text-xs font-sans-bold ${
                      isActive
                        ? "text-white"
                        : "text-[#1b1b1d] dark:text-zinc-300"
                    }`}
                  >
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              </MotiView>
            );
          })}
        </ScrollView>
      </View>

      {/* LISTA DE TREINOS COM SAFE BOTTOM PADDING */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 + safeBottomPadding }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor="#59C83A"
            colors={["#59C83A"]}
          />
        }
      >
        {isLoading ? (
          <View className="py-12 items-center">
            <ActivityIndicator size="large" color="#59C83A" />
            <Text className="text-xs font-sans-medium text-[#71717a] dark:text-zinc-400 mt-3">
              Carregando seus treinos...
            </Text>
          </View>
        ) : filteredWorkouts.length === 0 ? (
          <MotiView
            from={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "timing", duration: 250 }}
            className="bg-[#f8f9fa] dark:bg-zinc-900 p-8 rounded-2xl border border-dashed border-[#e2dfe1] dark:border-zinc-800 items-center my-2"
          >
            <Barbell size={40} color={isDark ? "#71717a" : "#a1a1aa"} />
            <Text className="font-outfit text-[#1b1b1d] dark:text-white mt-3 text-base text-center">
              Nenhum treino encontrado
            </Text>
            <Text className="font-sans-medium text-[#71717a] dark:text-zinc-400 text-xs text-center mt-1 leading-5">
              {selectedFilter === "personal"
                ? "Seu personal trainer ainda não prescreveu fichas nesta categoria."
                : selectedFilter === "custom"
                ? "Você ainda não criou nenhum treino personalizado."
                : "Nenhuma ficha de treino cadastrada até o momento."}
            </Text>
          </MotiView>
        ) : (
          filteredWorkouts.map((workout, index) => {
            const isPersonal = workout.type === "personal";

            return (
              <MotiView
                key={`workout-${workout.id}`}
                from={{ opacity: 0, translateY: 14, scale: 0.97 }}
                animate={{ opacity: 1, translateY: 0, scale: 1 }}
                transition={{
                  type: "spring",
                  damping: 22,
                  stiffness: 150,
                  delay: index * 40,
                }}
              >
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setSelectedWorkoutForDetails(workout)}
                  className="bg-[#f8f9fa] dark:bg-zinc-900 p-4 rounded-2xl mb-3 border border-[#e2dfe1] dark:border-zinc-800"
                >
                  <View className="flex-row items-center justify-between mb-2">
                    <View className="flex-row items-center flex-1 mr-2 gap-2.5">
                      <View
                        className={`w-9 h-9 rounded-xl items-center justify-center border ${
                          isPersonal
                            ? "bg-[#59C83A]/10 border-[#59C83A]/30"
                            : "bg-blue-500/10 border-blue-500/30"
                        }`}
                      >
                        {isPersonal ? (
                          <UserCheck size={18} color="#59C83A" weight="bold" />
                        ) : (
                          <User size={18} color="#3B82F6" weight="bold" />
                        )}
                      </View>

                      <Text
                        className="text-base font-outfit-extrabold text-[#1b1b1d] dark:text-white flex-1"
                        numberOfLines={1}
                      >
                        {workout.title}
                      </Text>
                    </View>

                    <View className="bg-[#59C83A]/15 border border-[#59C83A]/30 px-2.5 py-1 rounded-lg flex-row items-center">
                      <Calendar size={12} color="#59C83A" weight="bold" />
                      <Text className="text-[11px] font-sans-bold text-[#59C83A] ml-1.5">
                        {workout.day_of_week}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row items-center my-1">
                    <Target size={14} color={isDark ? "#a1a1aa" : "#71717a"} />
                    <Text
                      className="text-xs font-sans-medium text-[#71717a] dark:text-zinc-400 ml-1.5 flex-1"
                      numberOfLines={1}
                    >
                      {workout.subtitle}
                    </Text>
                  </View>

                  <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-[#e2dfe1]/60 dark:border-zinc-800">
                    <Text className="text-[10px] font-sans-bold text-[#71717a] dark:text-zinc-500 uppercase tracking-wider">
                      {isPersonal ? "Ficha do Personal" : "Criado por mim"}
                    </Text>

                    <View className="flex-row items-center gap-1.5">
                      {!isPersonal && (
                        <>
                          <TouchableOpacity
                            onPress={() =>
                              router.push({
                                pathname: "/(aluno)/create-workout" as any,
                                params: { planId: workout.id },
                              })
                            }
                            className="w-8 h-8 rounded-lg bg-zinc-200 dark:bg-zinc-800 items-center justify-center border border-zinc-300 dark:border-zinc-700"
                          >
                            <PencilSimple
                              size={14}
                              color={isDark ? "#ffffff" : "#1b1b1d"}
                              weight="bold"
                            />
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() =>
                              handleDeleteCustomWorkout(
                                workout.id,
                                workout.title
                              )
                            }
                            disabled={deleteWorkoutMutation.isPending}
                            className="w-8 h-8 rounded-lg bg-red-500/10 items-center justify-center border border-red-500/20"
                          >
                            <Trash size={14} color="#ef4444" />
                          </TouchableOpacity>
                        </>
                      )}

                      <TouchableOpacity
                        onPress={() => handleOpenWorkout(workout)}
                        className="flex-row items-center gap-1 bg-[#59C83A] px-3.5 py-1.5 rounded-xl ml-1"
                        activeOpacity={0.8}
                      >
                        <PlayCircle size={16} color="#FFFFFF" weight="bold" />
                        <Text className="text-xs font-sans-bold text-white">
                          Iniciar
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              </MotiView>
            );
          })
        )}
      </ScrollView>

      {/* MODAL DE PRÉ-VISUALIZAÇÃO COM MARGEM INFERIOR NATIVA */}
      <Modal
        visible={!!selectedWorkoutForDetails}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedWorkoutForDetails(null)}
      >
        <View className="flex-1 bg-black/70 justify-end">
          <View className="bg-white dark:bg-zinc-900 rounded-t-[32px] p-6 max-h-[85%] border-t border-zinc-200 dark:border-zinc-800">
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center flex-1 mr-2">
                <Barbell size={24} color="#59C83A" weight="bold" />
                <Text
                  className="text-lg font-outfit-extrabold text-[#1b1b1d] dark:text-white ml-2 flex-1"
                  numberOfLines={1}
                >
                  {selectedWorkoutForDetails?.title}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setSelectedWorkoutForDetails(null)}
                className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 items-center justify-center"
              >
                <X size={18} color={isDark ? "#ffffff" : "#1b1b1d"} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="space-y-4">
              <View className="bg-[#f8f9fa] dark:bg-zinc-950 p-4 rounded-2xl border border-[#e2dfe1] dark:border-zinc-800 mb-4">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-xs font-sans-medium text-[#71717a] dark:text-zinc-400">
                    Dias da Semana:
                  </Text>
                  <Text className="text-xs font-sans-bold text-[#59C83A]">
                    {selectedWorkoutForDetails?.day_of_week}
                  </Text>
                </View>

                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-xs font-sans-medium text-[#71717a] dark:text-zinc-400">
                    Origem do Treino:
                  </Text>
                  <Text className="text-xs font-sans-bold text-[#1b1b1d] dark:text-white">
                    {selectedWorkoutForDetails?.type === "personal"
                      ? "Prescrito pelo Personal"
                      : "Personalizado"}
                  </Text>
                </View>

                <View className="pt-2 border-t border-[#e2dfe1] dark:border-zinc-800/80">
                  <Text className="text-[11px] font-sans-bold text-[#71717a] dark:text-zinc-400 mb-1">
                    Objetivo / Descrição:
                  </Text>
                  <Text className="text-xs font-sans-medium text-[#1b1b1d] dark:text-zinc-300 leading-relaxed">
                    {selectedWorkoutForDetails?.subtitle}
                  </Text>
                </View>
              </View>

              <View className="mb-2">
                <Text className="text-sm font-outfit text-[#1b1b1d] dark:text-white mb-3">
                  Exercícios da Ficha
                </Text>

                {isLoadingExercises ? (
                  <View className="py-6 items-center">
                    <ActivityIndicator size="small" color="#59C83A" />
                    <Text className="text-xs font-sans-medium text-[#71717a] dark:text-zinc-400 mt-2">
                      Carregando exercícios...
                    </Text>
                  </View>
                ) : exercisesForDetails.length === 0 ? (
                  <Text className="text-xs font-sans-medium text-[#71717a] dark:text-zinc-400 text-center py-4">
                    Nenhum exercício encontrado nesta ficha.
                  </Text>
                ) : (
                  exercisesForDetails.map((exercise, idx) => (
                    <View
                      key={exercise.id}
                      className="bg-[#f8f9fa] dark:bg-zinc-950 p-3.5 rounded-2xl mb-2 flex-row items-center justify-between border border-[#e2dfe1] dark:border-zinc-800"
                    >
                      <View className="flex-row items-center flex-1 mr-2">
                        <View className="w-6 h-6 rounded-full bg-[#59C83A]/20 items-center justify-center mr-2.5">
                          <Text className="text-[11px] font-outfit text-[#59C83A]">
                            {idx + 1}
                          </Text>
                        </View>
                        <View className="flex-1">
                          <Text
                            className="text-xs font-outfit text-[#1b1b1d] dark:text-white"
                            numberOfLines={1}
                          >
                            {exercise.name}
                          </Text>
                          {exercise.category ? (
                            <Text className="text-[10px] font-sans-bold text-[#59C83A] mt-0.5">
                              {exercise.category}
                            </Text>
                          ) : null}
                        </View>
                      </View>

                      <View className="flex-row items-center gap-2">
                        <Text className="text-[11px] font-sans-bold text-[#59C83A]">
                          {exercise.sets}x
                        </Text>
                        <Text className="text-[11px] font-sans-medium text-[#71717a] dark:text-zinc-400">
                          {exercise.reps} reps
                        </Text>
                        <Text className="text-[11px] font-sans-bold text-[#1b1b1d] dark:text-zinc-300 ml-1">
                          ({exercise.weight})
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </ScrollView>

            {/* BOTÃO DO MODAL COM MARGEM INFERIOR DE SEGURANÇA */}
            <View
              className="pt-4 border-t border-[#e2dfe1] dark:border-zinc-800 mt-2"
              style={{ paddingBottom: safeBottomPadding }}
            >
              <TouchableOpacity
                onPress={() =>
                  selectedWorkoutForDetails &&
                  handleOpenWorkout(selectedWorkoutForDetails)
                }
                style={{ backgroundColor: "#59C83A" }}
                className="py-3.5 rounded-2xl items-center flex-row justify-center shadow-md active:opacity-90"
              >
                <PlayCircle size={18} color="#FFFFFF" weight="bold" />
                <Text className="text-white font-outfit text-sm ml-2">
                  Iniciar Este Treino Agora
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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