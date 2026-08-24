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
} from 'phosphor-react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../../lib/supabase';

interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  weight: string;
  category_id: string;
}

/**
 * Função de busca dos exercícios de uma categoria específica no Supabase
 */
async function fetchExercisesByCategory(categoryId: string): Promise<Exercise[]> {
  if (!categoryId) return [];

  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .eq('category_id', categoryId);

  if (error) {
    throw new Error(error.message);
  }

  return (data || []) as Exercise[];
}

export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Estado local apenas para o campo de busca por nome
  const [searchQuery, setSearchQuery] = useState<string>('');

  // --- REQUISITION COM TANSTACK QUERY ---
  const {
    data: exercises = [],
    isLoading,
    isError,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['category-exercises', id],
    queryFn: () => fetchExercisesByCategory(id || ''),
    enabled: !!id, // Só executa a query se o ID da categoria existir
  });

  const categoryTitle = id ? id.charAt(0).toUpperCase() + id.slice(1) : 'Categoria';

  // Filtra os exercícios em memória conforme a busca do usuário
  const filteredExercises = exercises.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  function renderExerciseItem({ item }: { item: Exercise }) {
    return (
      <TouchableOpacity
        onPress={() =>
          router.push({
            pathname: '/(aluno)/exercise/[id]',
            params: { id: item.id, from: 'category', categoryId: id },
          })
        }
        className="bg-[#f8f9fa] dark:bg-zinc-900 p-4 rounded-2xl mb-3 flex-row items-center justify-between border border-[#e2dfe1] dark:border-zinc-800"
        activeOpacity={0.8}
      >
        <View className="flex-1 mr-3">
          <Text className="text-base font-bold text-[#1b1b1d] dark:text-white mb-1">
            {item.name}
          </Text>
          <View className="flex-row items-center gap-3">
            <Text className="text-xs text-[#414755] dark:text-zinc-400">
              <Text style={{ color: '#59C83A' }} className="font-bold">
                {item.sets}
              </Text>{' '}
              séries
            </Text>
            <Text className="text-xs text-[#414755] dark:text-zinc-400">
              <Text style={{ color: '#59C83A' }} className="font-bold">
                {item.reps}
              </Text>{' '}
              reps
            </Text>
            <Text className="text-xs text-[#414755] dark:text-zinc-400">
              <Text style={{ color: '#59C83A' }} className="font-bold">
                {item.weight}
              </Text>
            </Text>
          </View>
        </View>

        <View className="w-9 h-9 rounded-full bg-white dark:bg-zinc-800 items-center justify-center border border-[#e0dddf] dark:border-zinc-700">
          <CaretRight size={16} color="#59C83A" />
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View className="flex-1 bg-white dark:bg-zinc-950" style={{ paddingTop: insets.top }}>
      {/* 1. Cabeçalho */}
      <View className="flex-row items-center justify-between px-5 py-3 border-b border-[#f0edef] dark:border-zinc-800">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-[#f8f9fa] dark:bg-zinc-900 items-center justify-center border border-[#e2dfe1] dark:border-zinc-800"
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color={isDark ? '#59C83A' : '#1b1b1d'} />
        </TouchableOpacity>

        <Text className="text-lg font-bold text-[#1b1b1d] dark:text-white">
          {categoryTitle}
        </Text>

        <View className="w-10" />
      </View>

      {/* 2. Conteúdo Principal */}
      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#59C83A" />
          <Text className="mt-3 text-[#414755] dark:text-zinc-400 font-medium text-xs">
            Carregando exercícios...
          </Text>
        </View>
      ) : isError ? (
        <View className="flex-1 justify-center items-center px-5">
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
        </View>
      ) : (
        <FlatList
          data={filteredExercises}
          keyExtractor={(item) => item.id}
          renderItem={renderExerciseItem}
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
            <View className="mb-4">
              <Text className="text-xl font-bold text-[#1b1b1d] dark:text-white mb-3">
                Exercícios Disponíveis
              </Text>

              {/* Campo de Busca por Exercício */}
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
            </View>
          }
          ListEmptyComponent={
            <View className="py-10 items-center">
              <Text className="text-[#414755] dark:text-zinc-400 font-medium text-center text-xs">
                {searchQuery.trim().length > 0
                  ? `Nenhum exercício encontrado com "${searchQuery}" em ${categoryTitle}.`
                  : 'Nenhum exercício cadastrado para esta categoria.'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}