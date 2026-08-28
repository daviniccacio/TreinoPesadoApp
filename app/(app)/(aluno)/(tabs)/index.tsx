import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Plus, CaretRight } from "phosphor-react-native";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../../../lib/supabase";

// --- TIPAGENS DE DADOS ---
interface Category {
  id: string;
  title: string;
  image_url: string;
}

interface CustomWorkout {
  id: string;
  title: string;
  created_at: string;
  custom_workout_exercises: { id: string }[];
}

interface StudentHomeData {
  userName: string;
  categories: Category[];
  customWorkouts: CustomWorkout[];
}

/**
 * Função responsável por buscar os dados da tela inicial do aluno.
 * Consulta o nome na coluna 'full_name' da tabela 'profiles' do Supabase.
 */
async function fetchStudentHomeData(): Promise<StudentHomeData> {
  // 1. Obtém o usuário logado na sessão atual
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userName = "Atleta";

  if (user) {
    // 2. Consulta o registro do usuário na tabela 'profiles' usando full_name
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.log("Erro ao buscar perfil do aluno:", error.message);
    }

    // 3. Se encontrou o nome completo, pega o primeiro nome para a saudação
    if (profile?.full_name && profile.full_name.trim() !== "") {
      userName = profile.full_name.trim().split(" ")[0]; // Transforma "Davi Nicacio" em "Davi"
    }
  }

  // 4. Executa as consultas de Categorias e Treinos em paralelo
  const [categoriesRes, workoutsRes] = await Promise.all([
    supabase.from("categories").select("*"),
    user
      ? supabase
          .from("custom_workouts")
          .select(
            `
            id,
            title,
            created_at,
            custom_workout_exercises (id)
          `
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);

  return {
    userName,
    categories: (categoriesRes.data || []) as Category[],
    customWorkouts: (workoutsRes.data || []) as unknown as CustomWorkout[],
  };
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // --- REQUISIÇÃO COM TANSTACK QUERY ---
  const {
    data,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["student-home-data"],
    queryFn: fetchStudentHomeData,
  });

  const userName = data?.userName || "Atleta";
  const categories = data?.categories || [];
  const customWorkouts = data?.customWorkouts || [];

  return (
    <View
      className="flex-1 bg-white dark:bg-zinc-950"
      style={{ paddingTop: insets.top }}
    >
      {/* Cabeçalho Superior */}
      <View className="px-5 py-4 border-b border-[#f0edef] dark:border-zinc-800 flex-row justify-between items-center">
        <View>
          <Text className="text-2xl font-extrabold text-[#1b1b1d] dark:text-white">
            Treino Pesado Academia
          </Text>
          <Text className="text-sm font-semibold text-[#414755] dark:text-zinc-400 mt-0.5">
            Bem-vindo, {userName}!
          </Text>
        </View>
      </View>

      {/* Conteúdo com Carregamento e Pull-to-Refresh */}
      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#59C83A" />
          <Text className="mt-3 text-[#414755] dark:text-zinc-400 font-medium text-xs">
            Carregando seus treinos...
          </Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-5 pt-4"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#59C83A"
            />
          }
        >
          {/* Botão Principal: Montar Meu Treino */}
          <TouchableOpacity
            onPress={() => router.push("/(aluno)/create-workout")}
            style={{ backgroundColor: "#59C83A" }}
            className="p-4 rounded-2xl flex-row items-center justify-between mb-6 shadow-sm active:opacity-90"
            activeOpacity={0.8}
          >
            <View className="flex-row items-center gap-3">
              <View className="w-10 h-10 rounded-full bg-white/20 items-center justify-center">
                <Plus size={24} color="#ffffff" weight="bold" />
              </View>
              <View>
                <Text className="text-white font-extrabold text-base">
                  Montar Meu Treino
                </Text>
                <Text className="text-white/90 text-xs font-medium">
                  Crie uma rotina personalizada
                </Text>
              </View>
            </View>
            <CaretRight size={20} color="#ffffff" weight="bold" />
          </TouchableOpacity>

          {/* Treinos Personalizados do Usuário */}
          {customWorkouts.length > 0 && (
            <View className="mb-6">
              <Text className="text-xl font-bold text-[#1b1b1d] dark:text-white mb-3">
                Meus Treinos Personalizados
              </Text>
              {customWorkouts.map((workout) => (
                <TouchableOpacity
                  key={workout.id}
                  onPress={() =>
                    router.push({
                      pathname: "/(aluno)/execute-workout",
                      params: { id: workout.id, type: "custom" },
                    })
                  }
                  className="bg-[#f8f9fa] dark:bg-zinc-900 p-4 rounded-2xl mb-3 flex-row items-center justify-between border border-[#e2dfe1] dark:border-zinc-800"
                  activeOpacity={0.8}
                >
                  <View className="flex-1 mr-3">
                    <Text className="text-base font-bold text-[#1b1b1d] dark:text-white mb-1">
                      {workout.title}
                    </Text>
                    <Text
                      style={{ color: "#59C83A" }}
                      className="text-xs font-extrabold"
                    >
                      {workout.custom_workout_exercises?.length || 0} exercícios
                      cadastrados
                    </Text>
                  </View>
                  <View className="w-9 h-9 rounded-full bg-white dark:bg-zinc-800 items-center justify-center border border-[#e0dddf] dark:border-zinc-700">
                    <CaretRight size={18} color="#59C83A" />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Lista de Grupos Musculares */}
          <Text className="text-xl font-bold text-[#1b1b1d] dark:text-white mb-4">
            Grupos Musculares
          </Text>

          <View className="flex-row flex-wrap justify-between">
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                onPress={() =>
                  router.push({
                    pathname: "/(aluno)/category/[id]",
                    params: { id: category.id, title: category.title },
                  })
                }
                className="w-[48%] h-44 rounded-2xl overflow-hidden mb-4 relative bg-[#f8f9fa] dark:bg-zinc-900 border border-[#e2dfe1] dark:border-zinc-800"
                activeOpacity={0.8}
              >
                {category.image_url ? (
                  <Image
                    source={{ uri: category.image_url }}
                    className="w-full h-full absolute inset-0"
                    resizeMode="cover"
                  />
                ) : null}

                <View className="absolute inset-0 bg-black/45 justify-end p-3">
                  <Text className="text-white text-lg font-bold">
                    {category.title}
                  </Text>
                  <View className="flex-row items-center mt-1">
                    <Text className="text-white/90 text-xs font-semibold mr-1">
                      Ver treinos
                    </Text>
                    <CaretRight size={12} color="#ffffff" weight="bold" />
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <View className="h-10" />
        </ScrollView>
      )}
    </View>
  );
}