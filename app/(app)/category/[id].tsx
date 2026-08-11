import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';

/**
 * Estrutura de dados que representa um Exercício vindo da tabela 'exercises' do Supabase.
 */
interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  weight: string;
  category_id: string;
}

export default function CategoryScreen() {
  // Resgata o parâmetro dinâmico da rota (ex: /category/peito)
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Estados locais da aplicação
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);

  /**
   * Busca os exercícios cadastrados na categoria específica no Supabase
   */
  const fetchExercises = useCallback(async () => {
    if (!id) return;

    try {
      setHasError(false);
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .eq('category_id', id);

      if (error) {
        console.error('Erro ao buscar exercícios no Supabase:', error.message);
        setHasError(true);
      } else if (data) {
        setExercises(data);
      }
    } catch (err) {
      console.error('Erro de conexão ao carregar treinos:', err);
      setHasError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  // Carrega a lista sempre que o ID da categoria for alterado
  useEffect(() => {
    fetchExercises();
  }, [fetchExercises]);

  /**
   * Função acionada quando o utilizador puxa a lista para recarregar os dados
   */
  function handleRefresh() {
    setRefreshing(true);
    fetchExercises();
  }

  // Formatação do título da categoria (ex: "costas" -> "Costas")
  const categoryTitle = id ? id.charAt(0).toUpperCase() + id.slice(1) : 'Categoria';

  /**
   * Renderiza cada um dos cards de exercício na lista
   */
  function renderExerciseItem({ item }: { item: Exercise }) {
    return (
      <TouchableOpacity
        onPress={() => router.push(`/exercise/${item.id}`)}
        className="bg-[#f0edef] p-4 rounded-2xl mb-3 flex-row items-center justify-between"
        activeOpacity={0.8}
      >
        <View className="flex-1 mr-3">
          <Text className="text-base font-bold text-[#1b1b1d] mb-1">
            {item.name}
          </Text>
          <View className="flex-row items-center gap-3">
            <Text className="text-xs text-[#414755]">
              <Text className="font-bold text-[#0058bc]">{item.sets}</Text> séries
            </Text>
            <Text className="text-xs text-[#414755]">
              <Text className="font-bold text-[#0058bc]">{item.reps}</Text> reps
            </Text>
            <Text className="text-xs text-[#414755]">
              <Text className="font-bold text-[#0058bc]">{item.weight}</Text>
            </Text>
          </View>
        </View>

        <View className="w-9 h-9 rounded-full bg-white items-center justify-center border border-[#e0dddf]">
          <Ionicons name="chevron-forward" size={16} color="#0058bc" />
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      {/* 1. Cabeçalho */}
      <View className="flex-row items-center justify-between px-5 py-3 border-b border-[#f0edef]">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-[#f0edef] items-center justify-center"
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color="#1b1b1d" />
        </TouchableOpacity>

        <Text className="text-lg font-bold text-[#1b1b1d]">
          {categoryTitle}
        </Text>

        <View className="w-10" />
      </View>

      {/* 2. Conteúdo Principal */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#0058bc" />
          <Text className="mt-3 text-[#414755] font-medium">
            Carregando treinos...
          </Text>
        </View>
      ) : hasError ? (
        <View className="flex-1 justify-center items-center px-5">
          <Ionicons name="alert-circle-outline" size={48} color="#e11d48" />
          <Text className="text-base font-bold text-[#1b1b1d] mt-2 text-center">
            Não foi possível carregar os exercícios
          </Text>
          <TouchableOpacity
            onPress={fetchExercises}
            className="mt-4 bg-[#0058bc] px-5 py-2.5 rounded-xl"
          >
            <Text className="text-white font-bold">Tentar Novamente</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={exercises}
          keyExtractor={(item) => item.id}
          renderItem={renderExerciseItem}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#0058bc']}
            />
          }
          ListHeaderComponent={
            <Text className="text-xl font-bold text-[#1b1b1d] mb-4">
              Exercícios Disponíveis
            </Text>
          }
          ListEmptyComponent={
            <View className="py-10 items-center">
              <Text className="text-[#414755] font-medium text-center">
                Nenhum exercício cadastrado para esta categoria.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}