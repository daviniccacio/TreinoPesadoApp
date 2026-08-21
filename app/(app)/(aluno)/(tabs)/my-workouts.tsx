import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  useColorScheme,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Barbell,
  UserCheck,
  User,
  Plus,
  PlayCircle,
} from "phosphor-react-native";
import { supabase } from "../../../../lib/supabase";

// --- TIPAGENS DE DADOS ---
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

export default function MyWorkoutsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // --- ESTADOS ---
  const [workouts, setWorkouts] = useState<WorkoutCardItem[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<FilterType>("all");
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Recarrega a lista sempre que a tela volta ao foco
  useFocusEffect(
    useCallback(() => {
      fetchStudentWorkouts();
    }, []),
  );

  /**
   * Busca os treinos no Supabase com suporte flexível a colunas
   */
  async function fetchStudentWorkouts() {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      console.log("🔎 Buscando treinos do aluno com ID:", user.id);

      const combinedList: WorkoutCardItem[] = [];

      // 1. Busca treinos prescritos pelo Personal Trainer (workout_plans)
      const { data: prescribedData, error: errorPrescribed } = await supabase
        .from("workout_plans")
        .select("*")
        .eq("student_id", user.id);

      if (errorPrescribed) {
        console.error(
          "❌ Erro na consulta workout_plans:",
          errorPrescribed.message,
        );
      } else if (prescribedData) {
        console.log(
          `✅ ${prescribedData.length} treinos prescritos encontrados.`,
        );
        prescribedData.forEach((item: any) => {
          combinedList.push({
            id: item.id,
            title: item.name || item.title || "Treino Prescrito",
            type: "personal",
            subtitle: item.goal || item.description || "Ficha do Personal",
          });
        });
      }

      // 2. Busca treinos criados pelo próprio Aluno (custom_workouts)
      let { data: customData, error: errorCustom } = await supabase
        .from("custom_workouts")
        .select("*")
        .eq("user_id", user.id);

      // Tenta recuperar por student_id caso user_id não traga registros
      if (errorCustom || !customData || customData.length === 0) {
        const { data: customDataStudent } = await supabase
          .from("custom_workouts")
          .select("*")
          .eq("student_id", user.id);

        if (customDataStudent && customDataStudent.length > 0) {
          customData = customDataStudent;
        }
      }

      if (customData) {
        console.log(
          `✅ ${customData.length} treinos customizados encontrados.`,
        );
        customData.forEach((item: any) => {
          combinedList.push({
            id: item.id,
            title: item.title || item.name || "Treino Personalizado",
            type: "custom",
            subtitle: item.description || item.goal || "Criado por mim",
          });
        });
      }

      setWorkouts(combinedList);
    } catch (err) {
      console.error("Erro inesperado ao buscar treinos:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function handleRefresh() {
    setRefreshing(true);
    fetchStudentWorkouts();
  }

  /**
   * Navega para a execução da ficha selecionada
   */
  function handleOpenWorkout(workout: WorkoutCardItem) {
    if (workout.type === "custom") {
      router.push({
        pathname: "/(aluno)/execute-workout",
        params: { id: workout.id, type: "custom" },
      });
    } else {
      router.push({
        pathname: "/(aluno)/execute-workout",
        params: { id: workout.id, type: "prescribed" },
      });
    }
  }

  // Filtra a lista com base no botão de categoria selecionado
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
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#59C83A"
          />
        }
      >
        {loading && !refreshing ? (
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
              <TouchableOpacity
                key={`workout-${workout.id}`}
                activeOpacity={0.8}
                onPress={() => handleOpenWorkout(workout)}
                className="bg-[#f8f9fa] dark:bg-zinc-900 p-4 rounded-2xl mb-3 border border-[#e2dfe1] dark:border-zinc-800 flex-row items-center justify-between"
              >
                <View className="flex-row items-center flex-1 mr-3">
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
                </View>

                <View className="flex-row items-center gap-1 bg-[#59C83A]/10 border border-[#59C83A]/30 px-3 py-1.5 rounded-xl">
                  <PlayCircle size={16} color="#59C83A" weight="bold" />
                  <Text className="text-xs font-bold text-[#59C83A]">
                    Iniciar
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
