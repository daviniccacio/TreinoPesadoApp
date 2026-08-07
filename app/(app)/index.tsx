import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase'; // Caminho ajustado para a pasta app/(app)/

// Definição do tipo para a Categoria
interface Category {
  id: string;
  title: string;
  image_url: string;
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  async function fetchCategories() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('categories')
        .select('*');

      if (error) {
        console.error('Erro ao buscar categorias:', error.message);
      } else if (data) {
        setCategories(data);
      }
    } catch (err) {
      console.error('Erro de conexão com o Supabase:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      {/* Cabeçalho */}
      <View className="px-5 py-4 border-b border-[#f0edef] flex-row justify-between items-center">
        <View>
          <Text className="text-sm font-semibold text-[#414755]">
            Bem-vindo de volta!
          </Text>
          <Text className="text-2xl font-extrabold text-[#1b1b1d]">
            Treino Pesado
          </Text>
        </View>

        <TouchableOpacity 
          className="w-10 h-10 rounded-full bg-[#f0edef] items-center justify-center"
          activeOpacity={0.7}
        >
          <Ionicons name="notifications-outline" size={20} color="#1b1b1d" />
        </TouchableOpacity>
      </View>

      {/* Lista de Categorias */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#0058bc" />
          <Text className="mt-3 text-[#414755] font-medium">
            Carregando categorias...
          </Text>
        </View>
      ) : (
        <ScrollView 
          className="flex-1 px-5 pt-4" 
          showsVerticalScrollIndicator={false}
        >
          <Text className="text-xl font-bold text-[#1b1b1d] mb-4">
            Selecione o Grupo Muscular
          </Text>

          <View className="flex-row flex-wrap justify-between">
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                onPress={() => router.push(`/category/${category.id}`)}
                className="w-[48%] h-44 rounded-2xl overflow-hidden mb-4 relative bg-[#f0edef]"
                activeOpacity={0.8}
              >
                {category.image_url ? (
                  <Image
                    source={{ uri: category.image_url }}
                    className="w-full h-full absolute inset-0"
                    resizeMode="cover"
                  />
                ) : null}

                <View className="absolute inset-0 bg-black/40 justify-end p-3">
                  <Text className="text-white text-lg font-bold">
                    {category.title}
                  </Text>
                  <View className="flex-row items-center mt-1">
                    <Text className="text-white/80 text-xs font-medium mr-1">
                      Ver treinos
                    </Text>
                    <Ionicons name="chevron-forward" size={12} color="#ffffff" />
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