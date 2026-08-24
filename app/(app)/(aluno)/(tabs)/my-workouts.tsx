import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  useColorScheme,
  Alert,
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
} from "phosphor-react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../../../lib/supabase";

interface WorkoutCardItem {
  id: string;
  title: string;
  type: "personal" | "custom";
  subtitle: string;
}

const CATEGORY_FILTERS = [
  { id: "all", label: "Todos" },
  { id: "personal", label: "Criados pelo Personal" },
  { id: "custom", label: "Criados por Mim" },
] as const;

type FilterType = "all" | "personal" | "custom";

/**
 * Busca e unifica os treinos do aluno no Supabase
 */
async function fetchStudentWorkouts(): Promise<WorkoutCardItem[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Usuário não autenticado");

  const combinedList: WorkoutCardItem[] = [];

  // 1. Busca treinos prescritos pelo Personal Trainer (workout_plans)
  const { data: prescribedData } = await supabase
    .from("workout_plans")
    .select("*")
    .eq("student_id", user.id);

  if (prescribedData) {
    prescribedData.forEach((item: any) => {
      combinedList.push({
        id: item.id,
        title: item.name || item.title || "Treino Prescrito",
        type: "personal",
        subtitle: item.goal || item.description || "Ficha do Personal",
      });
    });
  }

  // 2. Busca treinos criados pelo Aluno (custom_workouts) - Checa user_id e student_id
  const { data: customUser } = await supabase
    .from("custom_workouts")
    .select("*")
    .eq("user_id", user.id);

  const { data: customStudent } = await supabase
    .from("custom_workouts")
    .select("*")
    .eq("student_id", user.id);

  // Unifica e remove duplicados
  const customMap = new Map();
  (customUser || []).forEach((item: any) => customMap.set(item.id, item));
  (customStudent || []).forEach((item: any) => customMap.set(item.id, item));

  customMap.forEach((item: any) => {
    combinedList.push({
      id: item.id,
      title: item.title || item.name || "Treino Personalizado",
      type: "custom",
      subtitle: item.description || item.goal || "Criado por mim",
    });
  });

  return combinedList;
}

export default function MyWorkoutsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const queryClient = useQueryClient();

  const [selectedFilter, setSelectedFilter] = useState<FilterType>("all");

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
      Alert.alert("Sucesso", "Treino excluído com sucesso!");
    },
    onError: (err: any) => {
      Alert.alert("Erro", err.message || "Não foi possível excluir o treino.");
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
    Alert.alert(
      "Excluir Treino",
      `Tem certeza de que deseja apagar o treino "${title}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: () => deleteWorkoutMutation.mutate(workoutId),
        },
      ]
    );
  }

  const filteredWorkouts = workouts.filter((item) => {
    if (selectedFilter === "personal") return item.type === "personal";
    if (selectedFilter === "custom") return item.type === "custom";
    return true;
  });

  return (
    <View
      className="flex-1 bg-white dark:bg-zinc-950 px-5"
      style={{ paddingTop: insets.top + 10 }}
    >
      {/* CABEÇALHO */}
      <View className="flex-row items-center justify-between mb-4">
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
          className="bg-[#59C83A] p-2.5 rounded-xl flex-row items-center"
        >
          <Plus size={18} color="#FFFFFF" weight="bold" />
        </TouchableOpacity>
      </View>

      {/* FILTROS DE CATEGORIA */}
      <View className="mb-5">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingRight: 20 }}
        >
          {CATEGORY_FILTERS.map((filter) => {
            const isActive = selectedFilter === filter.id;
            return (
              <TouchableOpacity
                key={`filter-${filter.id}`}
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
            );
          })}
        </ScrollView>
      </View>

      {/* LISTA DE TREINOS */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor="#59C83A"
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
          <View className="bg-[#f8f9fa] dark:bg-zinc-900 p-8 rounded-2xl border border-dashed border-[#e2dfe1] dark:border-zinc-800 items-center my-2">
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
          </View>
        ) : (
          filteredWorkouts.map((workout) => {
            const isPersonal = workout.type === "personal";

            return (
              <View
                key={`workout-${workout.id}`}
                className="bg-[#f8f9fa] dark:bg-zinc-900 p-4 rounded-2xl mb-3 border border-[#e2dfe1] dark:border-zinc-800 flex-row items-center justify-between"
              >
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    if (isPersonal) {
                      router.push(`/(aluno)/workout-detail?id=${workout.id}`);
                    } else {
                      router.push(`/(aluno)/custom-workout/${workout.id}`);
                    }
                  }}
                  className="flex-row items-center flex-1 mr-2"
                >
                  <View
                    className={`w-11 h-11 rounded-2xl items-center justify-center mr-3 border ${
                      isPersonal
                        ? "bg-[#59C83A]/10 border-[#59C83A]/30"
                        : "bg-blue-500/10 border-blue-500/30"
                    }`}
                  >
                    {isPersonal ? (
                      <UserCheck size={22} color="#59C83A" weight="bold" />
                    ) : (
                      <User size={22} color="#3B82F6" weight="bold" />
                    )}
                  </View>

                  <View className="flex-1">
                    <Text
                      className="text-base font-extrabold text-[#1b1b1d] dark:text-white"
                      numberOfLines={1}
                    >
                      {workout.title}
                    </Text>
                    <Text
                      className="text-xs text-[#71717a] dark:text-zinc-400 mt-0.5 font-medium"
                      numberOfLines={1}
                    >
                      {workout.subtitle}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* AÇÕES CONDICIONAIS */}
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
                          size={16}
                          color={isDark ? "#ffffff" : "#1b1b1d"}
                          weight="bold"
                        />
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() =>
                          handleDeleteCustomWorkout(workout.id, workout.title)
                        }
                        disabled={deleteWorkoutMutation.isPending}
                        className="w-8 h-8 rounded-lg bg-red-500/10 items-center justify-center border border-red-500/20"
                      >
                        <Trash size={16} color="#ef4444" />
                      </TouchableOpacity>
                    </>
                  )}

                  <TouchableOpacity
                    onPress={() => handleOpenWorkout(workout)}
                    className="flex-row items-center gap-1 bg-[#59C83A]/10 border border-[#59C83A]/30 px-2.5 py-1.5 rounded-xl ml-0.5"
                  >
                    <PlayCircle size={16} color="#59C83A" weight="bold" />
                    <Text className="text-xs font-bold text-[#59C83A]">
                      Iniciar
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}