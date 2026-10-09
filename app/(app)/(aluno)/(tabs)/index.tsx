// ============================================================================
// DOCUMENTAÇÃO: TELA INICIAL / HOME (ÁREA DO ALUNO - CONSUMINDO DA API VPS)
// ============================================================================
// Busca as categorias dinâmicas gravadas no banco de dados da VPS.
// ============================================================================

import React from "react";
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
import { Plus, CaretRight } from "phosphor-react-native";
import { useQuery } from "@tanstack/react-query";
import { MotiView } from "moti";
import { Image } from "expo-image";

// IMPORTAÇÃO DA API DA VPS E DO CONTEXTO DE AUTENTICAÇÃO
import { api } from "../../../../services/api";
import { useAuth } from "../../../../context/AuthContext";

interface Category {
  id: string;
  title: string;
  image_url: string;
}

interface StudentHomeData {
  userName: string;
  categories: Category[];
}

/**
 * Busca o nome do usuário e a lista de categorias salvas na VPS
 */
async function fetchStudentHomeData(userId?: string): Promise<StudentHomeData> {
  let userName = "Atleta";

  try {
    if (userId) {
      const profileRes = await api.get(`/api/profiles/me?userId=${userId}`);
      const profile = profileRes.data;

      if (profile?.name || profile?.full_name) {
        const fullName = profile.name || profile.full_name;
        userName = fullName.trim().split(" ")[0];
      }
    }
  } catch (err: any) {
    console.error("⚠️ [Home] Erro ao buscar perfil na VPS:", err.message);
  }

  let categories: Category[] = [];

  try {
    const categoriesRes = await api.get("/api/categories");
    categories = categoriesRes.data || [];
  } catch (err: any) {
    console.error("⚠️ [Home] Erro ao buscar categorias:", err.message);
  }

  return {
    userName,
    categories,
  };
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const { user } = useAuth();

  const {
    data,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["student-home-data-v4", user?.id],
    queryFn: () => fetchStudentHomeData(user?.id),
    enabled: !!user?.id,
  });

  const userName = data?.userName || user?.name?.split(" ")[0] || "Atleta";
  const categories = data?.categories || [];
  const safeTopPadding = Math.max(insets?.top || 0, 16);

  return (
    <View
      className="flex-1 bg-[#f8f9fa] dark:bg-zinc-950 px-4"
      style={{ paddingTop: safeTopPadding }}
    >
      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#59C83A" />
          <Text className="mt-3 text-[#71717a] dark:text-zinc-400 font-sans-medium text-xs">
            Carregando seus treinos...
          </Text>
        </View>
      ) : (
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
          {/* 1. CABEÇALHO ANIMADO */}
          <MotiView
            from={{ opacity: 0, translateY: -10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "spring", damping: 18, stiffness: 120 }}
            className="my-3"
          >
            <Text className="text-xl font-outfit text-[#1b1b1d] dark:text-white tracking-tight">
              Treino Pesado Academia
            </Text>
            <Text className="text-xs font-sans-semibold text-[#71717a] dark:text-zinc-400 mt-0.5">
              Bem-vindo, {userName}!
            </Text>
          </MotiView>

          {/* 2. BANNER MONTAR MEU TREINO */}
          <MotiView
            from={{ opacity: 0, scale: 0.94, translateY: 8 }}
            animate={{ opacity: 1, scale: 1, translateY: 0 }}
            transition={{ type: "spring", damping: 15, stiffness: 130, delay: 40 }}
            className="mb-5"
          >
            <TouchableOpacity
              onPress={() => router.push("/(aluno)/create-workout" as any)}
              activeOpacity={0.85}
              className="bg-[#59C83A] px-4 py-3.5 rounded-2xl flex-row items-center justify-between shadow-sm"
            >
              <View className="flex-row items-center flex-1 mr-2">
                <View className="w-9 h-9 rounded-xl bg-white/20 items-center justify-center mr-3">
                  <Plus size={20} color="#FFFFFF" weight="bold" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-outfit text-white">
                    Montar Meu Treino
                  </Text>
                  <Text className="text-[11px] font-sans-medium text-white/90">
                    Crie uma rotina personalizada
                  </Text>
                </View>
              </View>
              <CaretRight size={18} color="#FFFFFF" weight="bold" />
            </TouchableOpacity>
          </MotiView>

          <Text className="text-sm font-outfit text-[#1b1b1d] dark:text-white mb-3">
            Grupos Musculares
          </Text>

          {/* 3. GRADE DE CATEGORIAS DINÂMICAS */}
          <View className="flex-row flex-wrap justify-between">
            {categories.map((category, index) => (
              <MotiView
                key={category.id}
                from={{ opacity: 0, translateY: 16, scale: 0.95 }}
                animate={{ opacity: 1, translateY: 0, scale: 1 }}
                transition={{
                  type: "spring",
                  damping: 16,
                  stiffness: 110,
                  mass: 0.8,
                  delay: index * 40,
                }}
                style={{ width: "48.5%" }}
                className="mb-3"
              >
                <TouchableOpacity
                  onPress={() =>
                    router.push({
                      pathname: "/(aluno)/category/[id]" as any,
                      params: { id: category.id, title: category.title },
                    })
                  }
                  activeOpacity={0.8}
                  className="h-32 rounded-2xl overflow-hidden border border-[#e2dfe1] dark:border-zinc-800 bg-zinc-900 relative"
                >
                  <Image
                    source={{ uri: category.image_url }}
                    contentFit="cover"
                    transition={200}
                    style={{
                      position: "absolute",
                      width: "100%",
                      height: "100%",
                      opacity: 0.65,
                    }}
                  />

                  <View className="flex-1 justify-end p-3 bg-black/30">
                    <Text
                      className="text-lg font-outfit text-white"
                      numberOfLines={1}
                    >
                      {category.title}
                    </Text>
                    <View className="flex-row items-center mt-0.5">
                      <Text className="text-[10px] font-sans-bold text-white/80 mr-1">
                        Ver lista
                      </Text>
                      <CaretRight size={10} color="#FFFFFF" weight="bold" />
                    </View>
                  </View>
                </TouchableOpacity>
              </MotiView>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}