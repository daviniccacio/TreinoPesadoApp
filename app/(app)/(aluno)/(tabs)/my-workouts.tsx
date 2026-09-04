import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
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
} from "phosphor-react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MotiView } from "moti";
import { supabase } from "../../../../lib/supabase";
import { CustomModal } from "../../../../components/CustomModal";

interface WorkoutCardItem {
  id: string;
  title: string;
  type: "personal" | "custom";
  subtitle: string;
  day_of_week?: string;
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
        combinedList.push({
          id: item.id,
          title: item.name || item.title || "Treino do Personal",
          type: "personal",
          subtitle: item.goal || item.description || "Ficha recomendada",
          day_of_week: item.day_of_week || "Ficha",
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
        combinedList.push({
          id: item.id,
          title: item.title || "Treino Personalizado",
          type: "custom",
          subtitle: item.description || "Criado por mim",
          day_of_week: item.day_of_week || "Livre",
        });
      });
    }
  } catch (e) {
    console.warn("Erro ao carregar custom_workouts:", e);
  }

  return combinedList;
}

export default function MyWorkoutsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const queryClient = useQueryClient();

  const [selectedFilter, setSelectedFilter] = useState<FilterType>("all");

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
    router.push({
      pathname: "/(aluno)/execute-workout",
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

  const safeTopPadding = Math.max(insets?.top || 0, 16);

  return (
    <View
      className="flex-1 bg-white dark:bg-zinc-950 px-5"
      style={{ paddingTop: safeTopPadding + 10 }}
    >
      {/* CABEÇALHO COM TRAVAMENTO FIRME */}
      <MotiView
        from={{ opacity: 0, translateY: -8 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{
          type: "spring",
          damping: 24, // Fricção alta para travar sem balanço
          stiffness: 160,
        }}
        className="flex-row items-center justify-between mb-4"
      >
        <View>
          <Text className="text-2xl font-black text-[#1b1b1d] dark:text-white">
            Meus Treinos
          </Text>
          <Text className="text-xs text-[#71717a] dark:text-zinc-400 font-medium mt-0.5">
            Suas fichas de exercícios e rotinas
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push("/(aluno)/create-workout")}
          className="bg-[#59C83A] p-3 rounded-2xl shadow-sm"
        >
          <Plus size={20} color="#FFFFFF" weight="bold" />
        </TouchableOpacity>
      </MotiView>

      {/* FILTROS DE CATEGORIA SEM OSCILAÇÃO EXTRA */}
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
                    className={`text-xs font-bold ${
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

      {/* LISTA DE TREINOS COM ENTRADA SUAVE E PARADA IMEDIATA */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
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
            <Text className="text-xs text-[#71717a] dark:text-zinc-400 mt-3 font-medium">
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
            <Text className="text-[#1b1b1d] dark:text-white font-bold mt-3 text-base text-center">
              Nenhum treino encontrado
            </Text>
            <Text className="text-[#71717a] dark:text-zinc-400 text-xs text-center mt-1 leading-5">
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
                  damping: 22,     // Damping mais alto remove o balanço final!
                  stiffness: 150,  // Mantém o início ágil e preciso
                  delay: index * 40,
                }}
                className="bg-[#f8f9fa] dark:bg-zinc-900 p-4 rounded-2xl mb-3 border border-[#e2dfe1] dark:border-zinc-800"
              >
                {/* CABEÇALHO DO CARD */}
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center flex-1 mr-2 gap-2">
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
                      className="text-base font-extrabold text-[#1b1b1d] dark:text-white flex-1"
                      numberOfLines={1}
                    >
                      {workout.title}
                    </Text>
                  </View>

                  {/* TAG DO DIA DA SEMANA */}
                  <View className="bg-[#59C83A]/15 border border-[#59C83A]/30 px-2.5 py-1 rounded-lg flex-row items-center">
                    <Calendar size={12} color="#59C83A" weight="bold" />
                    <Text className="text-[11px] font-black text-[#59C83A] ml-1.5 capitalize">
                      {workout.day_of_week}
                    </Text>
                  </View>
                </View>

                {/* DESCRIÇÃO / PROPÓSITO DO TREINO */}
                <View className="flex-row items-center my-1">
                  <Target size={14} color={isDark ? "#a1a1aa" : "#71717a"} />
                  <Text
                    className="text-xs text-[#71717a] dark:text-zinc-400 font-medium ml-1.5 flex-1"
                    numberOfLines={1}
                  >
                    {workout.subtitle}
                  </Text>
                </View>

                {/* RODAPÉ DO CARD */}
                <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-[#e2dfe1]/60 dark:border-zinc-800">
                  <Text className="text-[10px] font-bold text-[#71717a] dark:text-zinc-500 uppercase tracking-wider">
                    {isPersonal ? "Ficha do Personal" : "Criado por mim"}
                  </Text>

                  <View className="flex-row items-center gap-1.5">
                    {!isPersonal && (
                      <>
                        <TouchableOpacity
                          onPress={() =>
                            router.push({
                              pathname: "/(aluno)/create-workout",
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
                      className="flex-row items-center gap-1 bg-[#59C83A] px-3 py-1.5 rounded-xl ml-1"
                      activeOpacity={0.8}
                    >
                      <PlayCircle size={16} color="#FFFFFF" weight="bold" />
                      <Text className="text-xs font-bold text-white">
                        Iniciar
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </MotiView>
            );
          })
        )}
      </ScrollView>

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