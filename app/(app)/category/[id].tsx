import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase'; // Ajuste o caminho relativo se necessário

// Interface para a estrutura do Exercício
interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  weight: string;
  category_id: string;
}

export default function CategoryScreen() {
  // Resgata o id ("peito", "costas", etc.) passado pela URL
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Executa a busca sempre que o parâmetro 'id' da URL mudar
  useEffect(() => {
    if (id) {
      fetchExercises();
    }
  }, [id]);

  // Função responsável por buscar os exercícios no Supabase
  async function fetchExercises() {
    try {
      setLoading(true);

      // Consulta a tabela 'exercises' onde 'category_id' corresponde ao texto da URL (ex: 'peito')
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .eq('category_id', id);

      if (error) {
        console.error('Erro ao buscar exercícios:', error.message);
      } else if (data) {
        setExercises(data);
      }
    } catch (err) {
      console.error('Erro de conexão:', err);
    } finally {
      setLoading(false);
    }
  }

  // Formata o título para exibir com a primeira letra maiúscula (ex: "peito" -> "Peito")
  const categoryTitle = id ? id.charAt(0).toUpperCase() + id.slice(1) : 'Categoria';

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

      {/* Conteúdo com os Exercícios */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#0058bc" />
          <Text className="mt-3 text-[#414755] font-medium">
            Carregando treinos...
          </Text>
        </View>
      ) : (
        <ScrollView className="flex-1 px-5 pt-4" showsVerticalScrollIndicator={false}>
          <Text className="text-xl font-bold text-[#1b1b1d] mb-4">
            Exercícios Disponíveis
          </Text>

          {exercises.length === 0 ? (
            <View className="py-10 items-center">
              <Text className="text-[#414755] font-medium">
                Nenhum exercício cadastrado para esta categoria.
              </Text>
            </View>
          ) : (
            exercises.map((item) => (
              <TouchableOpacity
                key={item.id}
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
            ))
          )}

          <View className="h-10" />
        </ScrollView>
      )}
    </View>
  );
}