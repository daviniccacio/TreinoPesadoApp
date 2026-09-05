import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  useColorScheme,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  CaretRight,
  MagnifyingGlass,
  XCircle,
  WarningCircle,
  Barbell,
} from 'phosphor-react-native';
import { useQuery } from '@tanstack/react-query';
import { MotiView } from 'moti';
import { supabase } from '../../../../lib/supabase';

interface Exercise {
  id: string;
  name: string;
  category_id: string;
}

/**
 * Busca os exercícios de uma categoria no Supabase
 */
async function fetchExercisesByCategory(categoryId: string): Promise<Exercise[]> {
  if (!categoryId) return [];

  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .eq('category_id', categoryId)
    .order('name');

  if (error) {
    console.error('Erro ao buscar exercícios da categoria:', error.message);
    throw new Error(error.message);
  }

  return (data || []) as Exercise[];
}

export default function PersonalCategoryScreen() {
  const { id, title } = useLocalSearchParams<{ id: string; title?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [searchQuery, setSearchQuery] = useState<string>('');

  const {
    data: exercises = [],
    isLoading,
    isError,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['personal-category-exercises', id],
    queryFn: () => fetchExercisesByCategory(id || ''),
    enabled: !!id,
  });

  const categoryTitle = title || (id ? id.charAt(0).toUpperCase() + id.slice(1) : 'Categoria');

  const filteredExercises = exercises.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  function handleGoBack() {
    router.replace('/(personal)/exercises');
  }

  const safeTopPadding = Math.max(insets?.top || 0, 16);

  return (
    <View className="flex-1 bg-white dark:bg-zinc-950" style={{ paddingTop: safeTopPadding }}>
      {/* 1. CABEÇALHO ANIMADO */}
      <MotiView
        from={{ opacity: 0, translateY: -12 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{
          type: 'spring',
          damping: 24,
          stiffness: 160,
        }}
        className="flex-row items-center justify-between px-5 py-3 border-b border-[#f0edef] dark:border-zinc-800"
      >
        <TouchableOpacity
          onPress={handleGoBack}
          className="w-10 h-10 rounded-full bg-[#f8f9fa] dark:bg-zinc-900 items-center justify-center border border-[#e2dfe1] dark:border-zinc-800"
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color={isDark ? '#59C83A' : '#1b1b1d'} />
        </TouchableOpacity>

        <Text className="text-lg font-bold text-[#1b1b1d] dark:text-white">
          {categoryTitle}
        </Text>

        <View className="w-10" />
      </MotiView>

      {/* 2. CONTEÚDO PRINCIPAL */}
      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#59C83A" />
          <Text className="mt-3 text-[#414755] dark:text-zinc-400 font-medium text-xs">
            Carregando exercícios...
          </Text>
        </View>
      ) : isError ? (
        <MotiView
          from={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 22, stiffness: 150 }}
          className="flex-1 justify-center items-center px-5"
        >
          <WarningCircle size={48} color="#e11d48" />
          <Text className="text-base font-bold text-[#1b1b1d] dark:text-white mt-2 text-center">
            Não foi possível carregar os exercícios
          </Text>
          <TouchableOpacity
            onPress={() => refetch()}
            style={{ backgroundColor: '#59C83A' }}
            className="mt-4 px-5 py-2.5 rounded-xl"
          >
            <Text className="text-white font-bold text-xs">Tentar Novamente</Text>
          </TouchableOpacity>
        </MotiView>
      ) : (
        <FlatList
          data={filteredExercises}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#59C83A"
            />
          }
          ListHeaderComponent={
            <MotiView
              from={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{
                type: 'spring',
                damping: 22,
                stiffness: 150,
                delay: 20,
              }}
              className="mb-4"
            >
              <Text className="text-xl font-bold text-[#1b1b1d] dark:text-white mb-3">
                Exercícios Disponíveis
              </Text>

              <View className="bg-[#f8f9fa] dark:bg-zinc-900 flex-row items-center px-4 py-2.5 rounded-2xl border border-[#e2dfe1] dark:border-zinc-800">
                <MagnifyingGlass size={18} color={isDark ? '#59C83A' : '#414755'} />
                <TextInput
                  className="flex-1 ml-2.5 text-[#1b1b1d] dark:text-white text-sm font-medium"
                  placeholder={`Buscar em ${categoryTitle.toLowerCase()}...`}
                  placeholderTextColor={isDark ? '#71717a' : '#a09da1'}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <XCircle size={18} color={isDark ? '#71717a' : '#808591'} />
                  </TouchableOpacity>
                )}
              </View>
            </MotiView>
          }
          ListEmptyComponent={
            <MotiView
              from={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', damping: 22, stiffness: 150 }}
              className="py-10 items-center"
            >
              <Text className="text-[#414755] dark:text-zinc-400 font-medium text-center text-xs">
                {searchQuery.trim().length > 0
                  ? `Nenhum exercício encontrado com "${searchQuery}".`
                  : 'Nenhum exercício cadastrado para esta categoria.'}
              </Text>
            </MotiView>
          }
          renderItem={({ item, index }) => (
            <MotiView
              from={{ opacity: 0, translateY: 14, scale: 0.97 }}
              animate={{ opacity: 1, translateY: 0, scale: 1 }}
              transition={{
                type: 'spring',
                damping: 22,
                stiffness: 150,
                delay: index * 40,
              }}
            >
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: '/(personal)/exercise/[id]',
                    params: {
                      id: item.id,
                      categoryId: id,
                      categoryTitle: categoryTitle,
                    },
                  })
                }
                className="bg-[#f8f9fa] dark:bg-zinc-900 p-4 rounded-2xl mb-3 flex-row items-center justify-between border border-[#e2dfe1] dark:border-zinc-800"
                activeOpacity={0.8}
              >
                <View className="flex-row items-center flex-1 mr-3">
                  <View className="w-10 h-10 rounded-xl bg-[#59C83A]/10 items-center justify-center mr-3 border border-[#59C83A]/30">
                    <Barbell size={20} color="#59C83A" weight="bold" />
                  </View>
                  <Text className="text-base font-bold text-[#1b1b1d] dark:text-white flex-1">
                    {item.name}
                  </Text>
                </View>

                <View className="w-9 h-9 rounded-full bg-white dark:bg-zinc-800 items-center justify-center border border-[#e0dddf] dark:border-zinc-700">
                  <CaretRight size={16} color="#59C83A" />
                </View>
              </TouchableOpacity>
            </MotiView>
          )}
        />
      )}
    </View>
  );
}