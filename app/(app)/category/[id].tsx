import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';

interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  weight: string;
  category_id: string;
}

export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);

  const fetchExercises = useCallback(async () => {
    if (!id) return;

    try {
      setHasError(false);
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .eq('category_id', id);

      if (error) {
        console.error('Erro ao buscar exercícios:', error.message);
        setHasError(true);
      } else if (data) {
        setExercises(data);
      }
    } catch (err) {
      console.error('Erro de conexão:', err);
      setHasError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchExercises();
  }, [fetchExercises]);

  function handleRefresh() {
    setRefreshing(true);
    fetchExercises();
  }

  const categoryTitle = id ? id.charAt(0).toUpperCase() + id.slice(1) : 'Categoria';

  const filteredExercises = exercises.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  function renderExerciseItem({ item }: { item: Exercise }) {
    return (
      <TouchableOpacity
        onPress={() =>
          router.push({
            pathname: '/exercise/[id]',
            params: { id: item.id, from: 'category', categoryId: id },
          })
        }
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
      {/* Cabeçalho */}
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

      {/* Conteúdo */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#0058bc" />
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
          data={filteredExercises}
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
            <View className="mb-4">
              <Text className="text-xl font-bold text-[#1b1b1d] mb-3">
                Exercícios Disponíveis
              </Text>

              <View className="bg-[#f0edef] flex-row items-center px-4 py-2.5 rounded-2xl border border-[#e2dfe1]">
                <Ionicons name="search-outline" size={18} color="#414755" />
                <TextInput
                  className="flex-1 ml-2.5 text-[#1b1b1d] text-sm"
                  placeholder={`Buscar em ${categoryTitle.toLowerCase()}...`}
                  placeholderTextColor="#a09da1"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={18} color="#808591" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          }
        />
      )}
    </View>
  );
}