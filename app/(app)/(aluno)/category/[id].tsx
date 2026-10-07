// ============================================================================
// DOCUMENTAÇÃO: TELA DE EXERCÍCIOS POR CATEGORIA (OTIMIZADA PARA A VPS)
// ============================================================================
// Exibe a lista de exercícios com cache persistente no TanStack Query para
// evitar telas vazias por atraso de resposta (Cold Start) da VPS.
// ============================================================================

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
import { MotiView } from 'moti';

import { api } from '../../../../services/api';

const CATEGORY_MAP: Record<string, string> = {
  gluteo: 'Glúteos',
  peito: 'Peitoral',
  perna: 'Pernas',
  costas: 'Costas',
  ombro: 'Ombros',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  abdomen: 'Abdômen',
  cardio: 'Cardio',
  alongamentos: 'Alongamentos',
  'pernas-posterior': 'Posterior de Pernas',
};

interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  weight: string;
  category_id: string;
}

/**
 * Busca os exercícios na VPS com tratamento robusto de falhas
 */
async function fetchExercisesByCategory(categoryId: string): Promise<Exercise[]> {
  if (!categoryId) return [];

  const response = await api.get('/api/exercises');
  const allExercises = response.data || [];

  const filtered = allExercises.filter(
    (ex: any) => String(ex.category_id || '').toLowerCase() === categoryId.toLowerCase()
  );

  return filtered.map((item: any) => ({
    id: item.id,
    name: item.name || item.exercise_name || 'Exercício',
    sets: item.sets || 3,
    reps: item.reps || '10-12',
    weight: item.weight || 'Carga livre',
    category_id: item.category_id || categoryId,
  }));
}

export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [searchQuery, setSearchQuery] = useState<string>('');

  // 🟢 CONFIGURAÇÃO OTIMIZADA DO TANSTACK QUERY (CACHE PERSISTENTE)
  const {
    data: exercises = [],
    isLoading,
    isError,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['category-exercises', id],
    queryFn: () => fetchExercisesByCategory(id || ''),
    enabled: !!id,
    staleTime: 1000 * 60 * 10, // Mantém os dados frescos por 10 minutos
    gcTime: 1000 * 60 * 30,    // Mantém em cache por 30 minutos na memória
    retry: 3,                  // Tenta reconectar até 3 vezes se a VPS estiver a acordar
    retryDelay: 1000,          // Intervalo de 1 segundo entre as tentativas
  });

  const categoryTitle = React.useMemo(() => {
    if (!id) return 'Categoria';
    const normalizedKey = id.toLowerCase().trim();
    return CATEGORY_MAP[normalizedKey] || (id.charAt(0).toUpperCase() + id.slice(1));
  }, [id]);

  const filteredExercises = exercises.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const safeTopPadding = Math.max(insets?.top || 0, 16);

  function renderExerciseItem({ item, index }: { item: Exercise; index: number }) {
    return (
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
              pathname: '/(aluno)/exercise/[id]' as any,
              params: { id: item.id, from: 'category', categoryId: id },
            })
          }
          className="bg-[#f8f9fa] dark:bg-zinc-900 p-4 rounded-2xl mb-3 flex-row items-center justify-between border border-[#e2dfe1] dark:border-zinc-800"
          activeOpacity={0.8}
        >
          <View className="flex-1 mr-3">
            <Text className="text-base font-outfit text-[#1b1b1d] dark:text-white mb-1">
              {item.name}
            </Text>

            <View className="flex-row items-center gap-3">
              <Text className="text-xs font-sans-medium text-[#414755] dark:text-zinc-400">
                <Text style={{ color: '#59C83A' }} className="font-sans-bold">
                  {item.sets}
                </Text>{' '}
                séries
              </Text>
              <Text className="text-xs font-sans-medium text-[#414755] dark:text-zinc-400">
                <Text style={{ color: '#59C83A' }} className="font-sans-bold">
                  {item.reps}
                </Text>{' '}
                reps
              </Text>
              <Text className="text-xs font-sans-medium text-[#414755] dark:text-zinc-400">
                <Text style={{ color: '#59C83A' }} className="font-sans-bold">
                  {item.weight}
                </Text>
              </Text>
            </View>
          </View>

          <View className="w-9 h-9 rounded-full bg-white dark:bg-zinc-800 items-center justify-center border border-[#e0dddf] dark:border-zinc-700">
            <CaretRight size={16} color="#59C83A" />
          </View>
        </TouchableOpacity>
      </MotiView>
    );
  }

  return (
    <View className="flex-1 bg-white dark:bg-zinc-950" style={{ paddingTop: safeTopPadding }}>
      {/* 1. CABEÇALHO ANIMADO */}
      <MotiView
        from={{ opacity: 0, translateY: -8 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'spring', damping: 24, stiffness: 160 }}
        className="flex-row items-center justify-between px-5 py-3 border-b border-[#f0edef] dark:border-zinc-800"
      >
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-[#f8f9fa] dark:bg-zinc-900 items-center justify-center border border-[#e2dfe1] dark:border-zinc-800"
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color={isDark ? '#59C83A' : '#1b1b1d'} />
        </TouchableOpacity>

        <Text className="text-lg font-outfit text-[#1b1b1d] dark:text-white">
          {categoryTitle}
        </Text>

        <View className="w-10" />
      </MotiView>

      {/* 2. CONTEÚDO PRINCIPAL */}
      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#59C83A" />
          <Text className="mt-3 text-[#414755] dark:text-zinc-400 font-sans-medium text-xs">
            A conectar com o servidor e carregar exercícios...
          </Text>
        </View>
      ) : isError ? (
        <MotiView
          from={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'timing', duration: 250 }}
          className="flex-1 justify-center items-center px-5"
        >
          <WarningCircle size={48} color="#e11d48" />
          <Text className="text-base font-outfit-bold text-[#1b1b1d] dark:text-white mt-2 text-center">
            Não foi possível carregar os exercícios
          </Text>
          <TouchableOpacity
            onPress={() => refetch()}
            style={{ backgroundColor: '#59C83A' }}
            className="mt-4 px-5 py-2.5 rounded-xl"
          >
            <Text className="text-white font-sans-bold text-xs">Tentar Novamente</Text>
          </TouchableOpacity>
        </MotiView>
      ) : (
        <FlatList
          data={filteredExercises}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => renderExerciseItem({ item, index })}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 80 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#59C83A"
              colors={['#59C83A']}
            />
          }
          ListHeaderComponent={
            <MotiView
              from={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'spring', damping: 22, stiffness: 150, delay: 30 }}
              className="mb-4"
            >
              <Text className="text-xl font-outfit-extrabold text-[#1b1b1d] dark:text-white mb-3">
                Exercícios Disponíveis
              </Text>

              <View className="bg-[#f8f9fa] dark:bg-zinc-900 flex-row items-center px-4 py-2.5 rounded-2xl border border-[#e2dfe1] dark:border-zinc-800">
                <MagnifyingGlass size={18} color={isDark ? '#59C83A' : '#414755'} />
                <TextInput
                  className="flex-1 ml-2.5 text-[#1b1b1d] dark:text-white text-sm font-sans-medium"
                  placeholder={`Buscar em ${categoryTitle}...`}
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
              from={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ type: 'timing', duration: 200 }}
              className="py-10 items-center"
            >
              <Text className="text-[#414755] dark:text-zinc-400 font-sans-medium text-center text-xs">
                {searchQuery.trim().length > 0
                  ? `Nenhum exercício encontrado com "${searchQuery}" em ${categoryTitle}.`
                  : 'Nenhum exercício cadastrado para esta categoria.'}
              </Text>
            </MotiView>
          }
        />
      )}
    </View>
  );
}