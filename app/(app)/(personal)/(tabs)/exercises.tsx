// ============================================================================
// DOCUMENTAÇÃO: CATÁLOGO DE CATEGORIAS DE EXERCÍCIOS (PERSONAL TRAINER)
// ============================================================================
// Exibe uma grade (grid) de categorias de exercícios cadastradas no Supabase
// utilizando animações Moti, sanitização de dados, suporte a modo escuro
// e efeito de carregamento gradual em formato de Skeleton Loading.
// ============================================================================

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CaretRight } from 'phosphor-react-native';
import { useQuery } from '@tanstack/react-query';
import { MotiView } from 'moti';
import { Image } from 'expo-image';

import { supabase } from '../../../../lib/supabase';
import { sanitizeInput } from '../../../../lib/security'; // 🟢 Importação da função de sanitização
import { Skeleton } from '../../../../components/SkeletonLoading';

// --- TIPAGENS DE DADOS ---
interface Category {
  id: string;
  title: string;
  image_url: string;
}

// 🟢 SUBCOMPONENTE DE SKELETON PARA O CARD DE CATEGORIA (GRADE 2 COLUNAS)
function CategoryCardSkeleton() {
  return (
    <View className="w-[48%] mb-4">
      <Skeleton width="100%" height={176} borderRadius={16} />
    </View>
  );
}

/**
 * Busca todas as categorias de exercícios cadastradas no Supabase com sanitização
 */
async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('title');

  if (error) throw new Error(error.message);

  return (data || []).map((cat: Category) => ({
    ...cat,
    title: sanitizeInput(cat.title || 'Categoria'),
  }));
}

export default function PersonalExercisesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // --- CONSULTA COM TANSTACK QUERY ---
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories-list'],
    queryFn: fetchCategories,
  });

  const safeTopPadding = Math.max(insets?.top || 0, 16);

  return (
    <View
      className="flex-1 bg-white dark:bg-zinc-950"
      style={{ paddingTop: safeTopPadding }}
    >
      {/* 1. CABEÇALHO ANIMADO */}
      <MotiView
        from={{ opacity: 0, translateY: -12 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{
          type: 'spring',
          damping: 24,
          stiffness: 160,
        } as any}
        className="px-5 py-4 border-b border-[#f0edef] dark:border-zinc-800"
      >
        <Text className="text-2xl font-outfit-extrabold text-[#1b1b1d] dark:text-white">
          Catálogo de Exercícios
        </Text>
        <Text className="text-xs font-sans-medium text-[#71717a] dark:text-zinc-400 mt-0.5">
          Consulte demonstrações e instruções da academia
        </Text>
      </MotiView>

      {/* 2. CONTEÚDO PRINCIPAL (SKELETON LOADING OU GRADE DE CATEGORIAS) */}
      {isLoading ? (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: 120,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Grade de Skeletons em 2 colunas */}
          <View className="flex-row flex-wrap justify-between">
            {Array.from({ length: 6 }).map((_, index) => (
              <CategoryCardSkeleton key={`category-skeleton-${index}`} />
            ))}
          </View>
        </ScrollView>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: 120,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-row flex-wrap justify-between">
            {categories.map((category, index) => (
              <MotiView
                key={category.id}
                from={{ opacity: 0, translateY: 14, scale: 0.95 }}
                animate={{ opacity: 1, translateY: 0, scale: 1 }}
                transition={{
                  type: 'spring',
                  damping: 22,
                  stiffness: 150,
                  delay: index * 50,
                } as any}
                className="w-[48%] mb-4"
              >
                <TouchableOpacity
                  onPress={() =>
                    router.push({
                      pathname: '/(personal)/category/[id]' as any,
                      params: { id: category.id, title: category.title },
                    })
                  }
                  className="w-full h-44 rounded-2xl overflow-hidden relative bg-[#f8f9fa] dark:bg-zinc-900 border border-[#e2dfe1] dark:border-zinc-800"
                  activeOpacity={0.8}
                >
                  {category.image_url ? (
                    <Image
                      source={{ uri: category.image_url }}
                      style={{ width: '100%', height: '100%', position: 'absolute' }}
                      contentFit="cover"
                      transition={200}
                    />
                  ) : null}

                  <View className="absolute inset-0 bg-black/45 justify-end p-3">
                    <Text className="text-white text-lg font-outfit leading-tight">
                      {category.title}
                    </Text>

                    <View className="flex-row items-center mt-1">
                      <Text className="text-white/90 text-xs font-sans-bold mr-1">
                        Ver lista
                      </Text>
                      <CaretRight size={12} color="#ffffff" weight="bold" />
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