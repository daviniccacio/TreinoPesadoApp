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
import { supabase } from "../../../../lib/supabase";

// --- TIPAGENS DE DADOS ---
interface Category {
  id: string;
  title: string;
  image_url?: string;
}

interface StudentHomeData {
  userName: string;
  categories: Category[];
}

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=600";

/**
 * Busca o primeiro nome do aluno e as categorias cadastradas no Supabase
 */
async function fetchStudentHomeData(): Promise<StudentHomeData> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userName = "Atleta";

  if (user) {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.log("Erro ao buscar perfil do aluno:", error.message);
    }

    if (profile?.full_name && profile.full_name.trim() !== "") {
      userName = profile.full_name.trim().split(" ")[0];
    }
  }

  const { data: categoriesData } = await supabase
    .from("categories")
    .select("*")
    .order("title", { ascending: true });

  return {
    userName,
    categories: (categoriesData || []) as Category[],
  };
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

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
  const safeTopPadding = Math.max(insets?.top || 0, 16);

  return (
    <View
      className="flex-1 bg-[#f8f9fa] dark:bg-zinc-950 px-4"
      style={{ paddingTop: safeTopPadding }}
    >
      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#59C83A" />
          <Text className="mt-3 text-[#71717a] dark:text-zinc-400 font-medium text-xs">
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
          {/* CABEÇALHO ANIMADO */}
          <MotiView
            from={{ opacity: 0, translateY: -10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{
              type: "spring",
              damping: 18,
              stiffness: 120,
            }}
            className="my-3"
          >
            <Text className="text-xl font-black text-[#1b1b1d] dark:text-white tracking-tight">
              Treino Pesado Academia
            </Text>
            <Text className="text-xs font-semibold text-[#71717a] dark:text-zinc-400 mt-0.5">
              Bem-vindo, {userName}!
            </Text>
          </MotiView>

          {/* BANNER MONTAR MEU TREINO */}
          <MotiView
            from={{ opacity: 0, scale: 0.94, translateY: 8 }}
            animate={{ opacity: 1, scale: 1, translateY: 0 }}
            transition={{
              type: "spring",
              damping: 15,
              stiffness: 130,
              delay: 40,
            }}
            className="mb-5"
          >
            <TouchableOpacity
              onPress={() => router.push("/(aluno)/create-workout")}
              activeOpacity={0.85}
              className="bg-[#59C83A] px-4 py-3.5 rounded-2xl flex-row items-center justify-between shadow-sm"
            >
              <View className="flex-row items-center flex-1 mr-2">
                <View className="w-9 h-9 rounded-xl bg-white/20 items-center justify-center mr-3">
                  <Plus size={20} color="#FFFFFF" weight="bold" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-extrabold text-white">
                    Montar Meu Treino
                  </Text>
                  <Text className="text-[11px] font-medium text-white/90">
                    Crie uma rotina personalizada
                  </Text>
                </View>
              </View>
              <CaretRight size={18} color="#FFFFFF" weight="bold" />
            </TouchableOpacity>
          </MotiView>

          <Text className="text-sm font-extrabold text-[#1b1b1d] dark:text-white mb-3">
            Grupos Musculares
          </Text>

          {/* GRADE DE CATEGORIAS OTIMIZADA */}
          <View className="flex-row flex-wrap justify-between">
            {categories.map((category, index) => (
              <MotiView
                key={category.id}
                from={{ opacity: 0, translateY: 16, scale: 0.95 }}
                animate={{ opacity: 1, translateY: 0, scale: 1 }}
                transition={{
                  type: "spring",
                  damping: 16,     // Maior amortecimento para evitar sobressaltos bruscos
                  stiffness: 110,  // Tensão suave e natural
                  mass: 0.8,       // Peso reduzido para acelerar suavemente
                  delay: index * 40, // Cascata ritmada
                }}
                style={{ width: "48.5%" }}
                className="mb-3"
              >
                <TouchableOpacity
                  onPress={() =>
                    router.push({
                      pathname: "/(aluno)/category/[id]",
                      params: { id: category.id, title: category.title },
                    })
                  }
                  activeOpacity={0.8}
                  className="h-32 rounded-2xl overflow-hidden border border-[#e2dfe1] dark:border-zinc-800 bg-zinc-900 relative"
                >
                  {/* IMAGEM OTIMIZADA COM EXPO-IMAGE */}
                  <Image
                    source={{ uri: category.image_url || FALLBACK_IMAGE }}
                    contentFit="cover"
                    transition={200}
                    style={{
                      position: "absolute",
                      width: "100%",
                      height: "100%",
                      opacity: 0.65,
                    }}
                  />

                  {/* SOBREPOSIÇÃO ESCURA E TEXTOS */}
                  <View className="flex-1 justify-end p-3 bg-black/30">
                    <Text
                      className="text-sm font-black text-white"
                      numberOfLines={1}
                    >
                      {category.title}
                    </Text>
                    <View className="flex-row items-center mt-0.5">
                      <Text className="text-[10px] font-bold text-white/80 mr-1">
                        Ver treinos
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