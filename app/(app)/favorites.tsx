import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, CaretRight, HeartBreak } from 'phosphor-react-native';
import { supabase } from '../../lib/supabase';

interface FavoriteItem {
  id: string;
  exercise_id: string;
  exercises: {
    id: string;
    name: string;
    sets: number;
    reps: string;
    weight: string;
    category_id: string;
  };
}

/**
 * Tela de Exercícios Favoritados com Phosphor Icons
 */
export default function FavoritesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useFocusEffect(
    useCallback(() => {
      fetchFavorites();
    }, [])
  );

  async function fetchFavorites() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('favorites')
        .select(`
          id,
          exercise_id,
          exercises (
            id,
            name,
            sets,
            reps,
            weight,
            category_id
          )
        `);

      if (error) {
        console.error('Erro ao buscar favoritos:', error.message);
      } else if (data) {
        setFavorites(data as unknown as FavoriteItem[]);
      }
    } catch (err) {
      console.error('Erro de conexão:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="flex-1 bg-white dark:bg-zinc-950" style={{ paddingTop: insets.top }}>
      {/* Cabeçalho Superior */}
      <View className="flex-row items-center justify-between px-5 py-4 border-b border-[#f0edef] dark:border-zinc-800">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-[#f8f9fa] dark:bg-zinc-900 items-center justify-center border border-[#e2dfe1] dark:border-zinc-800"
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color={isDark ? '#59C83A' : '#1b1b1d'} />
        </TouchableOpacity>

        <Text className="text-xl font-extrabold text-[#1b1b1d] dark:text-white">
          Meus Favoritos
        </Text>

        <View className="w-10" />
      </View>

      {/* Conteúdo Principal */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#59C83A" />
          <Text className="mt-3 text-[#414755] dark:text-zinc-400 font-medium">
            Carregando favoritos...
          </Text>
        </View>
      ) : (
        <ScrollView className="flex-1 px-5 pt-4" showsVerticalScrollIndicator={false}>
          {favorites.length === 0 ? (
            <View className="py-16 items-center">
              <HeartBreak size={48} color="#a0a5b1" />
              <Text className="text-[#414755] dark:text-zinc-300 font-semibold text-center mt-3 text-base">
                Nenhum exercício favoritado ainda.
              </Text>
              <Text className="text-[#808591] dark:text-zinc-500 text-xs text-center mt-1">
                Toque no ícone de coração em qualquer exercício para salvá-lo aqui.
              </Text>
            </View>
          ) : (
            favorites.map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => router.push(`/exercise/${item.exercises.id}`)}
                className="bg-[#f8f9fa] dark:bg-zinc-900 p-4 rounded-2xl mb-3 flex-row items-center justify-between border border-[#e2dfe1] dark:border-zinc-800"
                activeOpacity={0.8}
              >
                <View className="flex-1 mr-3">
                  <Text
                    style={{ color: '#59C83A' }}
                    className="text-xs font-bold uppercase mb-1"
                  >
                    {item.exercises.category_id}
                  </Text>
                  <Text className="text-base font-bold text-[#1b1b1d] dark:text-white mb-1">
                    {item.exercises.name}
                  </Text>
                  <View className="flex-row items-center gap-3">
                    <Text className="text-xs text-[#414755] dark:text-zinc-400">
                      <Text style={{ color: '#59C83A' }} className="font-bold">
                        {item.exercises.sets}
                      </Text>{' '}
                      séries
                    </Text>
                    <Text className="text-xs text-[#414755] dark:text-zinc-400">
                      <Text style={{ color: '#59C83A' }} className="font-bold">
                        {item.exercises.reps}
                      </Text>{' '}
                      reps
                    </Text>
                    <Text className="text-xs text-[#414755] dark:text-zinc-400">
                      <Text style={{ color: '#59C83A' }} className="font-bold">
                        {item.exercises.weight}
                      </Text>
                    </Text>
                  </View>
                </View>

                <View className="w-9 h-9 rounded-full bg-white dark:bg-zinc-800 items-center justify-center border border-[#e0dddf] dark:border-zinc-700">
                  <CaretRight size={18} color="#59C83A" />
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