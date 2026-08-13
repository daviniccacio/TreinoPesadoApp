import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Heart, Plus, ChevronRight } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';

interface Category {
  id: string;
  title: string;
  image_url: string;
}

interface CustomWorkout {
  id: string;
  title: string;
  created_at: string;
  custom_workout_exercises: { id: string }[];
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [categories, setCategories] = useState<Category[]>([]);
  const [customWorkouts, setCustomWorkouts] = useState<CustomWorkout[]>([]);
  const [userName, setUserName] = useState<string>('Atleta');
  const [loading, setLoading] = useState<boolean>(true);

  useFocusEffect(
    useCallback(() => {
      loadAllData();
    }, [])
  );

  async function loadAllData() {
    setLoading(true);
    await Promise.all([fetchUserData(), fetchCategories(), fetchCustomWorkouts()]);
    setLoading(false);
  }

  async function fetchUserData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const metadata = user.user_metadata || {};
        const firstName = metadata.first_name || '';
        if (firstName.trim()) {
          setUserName(firstName.trim());
        } else {
          setUserName('Atleta');
        }
      }
    } catch (err) {
      console.error('Erro ao buscar dados do usuário:', err);
    }
  }

  async function fetchCategories() {
    try {
      const { data, error } = await supabase.from('categories').select('*');
      if (!error && data) setCategories(data);
    } catch (err) {
      console.error('Erro ao buscar categorias:', err);
    }
  }

  async function fetchCustomWorkouts() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('custom_workouts')
        .select(`
          id,
          title,
          created_at,
          custom_workout_exercises (id)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setCustomWorkouts(data as unknown as CustomWorkout[]);
      }
    } catch (err) {
      console.error('Erro ao buscar treinos customizados:', err);
    }
  }

  return (
    <View className="flex-1 bg-white dark:bg-zinc-950" style={{ paddingTop: insets.top }}>
      {/* Cabeçalho */}
      <View className="px-5 py-4 border-b border-[#f0edef] dark:border-zinc-800 flex-row justify-between items-center">
        <View>
          <Text className="text-2xl font-extrabold text-[#1b1b1d] dark:text-white">
            Treino Pesado Academia
          </Text>
          <Text className="text-sm font-semibold text-[#414755] dark:text-zinc-400 mt-0.5">
            Bem-vindo, {userName}!
          </Text>
        </View>

        <View className="flex-row items-center gap-2">
          <TouchableOpacity
            onPress={() => router.push('/favorites')}
            className="w-10 h-10 rounded-full bg-[#f0edef] dark:bg-zinc-900 items-center justify-center border border-transparent dark:border-zinc-800"
            activeOpacity={0.7}
          >
            <Heart size={20} color="#1b1b1d" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Conteúdo */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#0058bc" />
          <Text className="mt-3 text-[#414755] dark:text-zinc-400 font-medium">
            Carregando seus treinos...
          </Text>
        </View>
      ) : (
        <ScrollView className="flex-1 px-5 pt-4" showsVerticalScrollIndicator={false}>
          {/* Botão Montar Meu Treino */}
          <TouchableOpacity
            onPress={() => router.push('/create-workout')}
            className="bg-[#0058bc] p-4 rounded-2xl flex-row items-center justify-between mb-6 border border-[#004bb0]"
            activeOpacity={0.8}
          >
            <View className="flex-row items-center gap-3">
              <View className="w-10 h-10 rounded-full bg-white/20 items-center justify-center">
                <Plus size={24} color="#ffffff" />
              </View>
              <View>
                <Text className="text-white font-bold text-base">Montar Meu Treino</Text>
                <Text className="text-white/80 text-xs">Crie uma rotina personalizada</Text>
              </View>
            </View>
            <ChevronRight size={20} color="#ffffff" />
          </TouchableOpacity>

          {/* Treinos Personalizados */}
          {customWorkouts.length > 0 && (
            <View className="mb-6">
              <Text className="text-xl font-bold text-[#1b1b1d] dark:text-white mb-3">
                Meus Treinos Personalizados
              </Text>
              {customWorkouts.map((workout) => (
                <TouchableOpacity
                  key={workout.id}
                  onPress={() => router.push(`/custom-workout/${workout.id}`)}
                  className="bg-[#f0edef] dark:bg-zinc-900 p-4 rounded-2xl mb-3 flex-row items-center justify-between border border-[#e2dfe1] dark:border-zinc-800"
                  activeOpacity={0.8}
                >
                  <View className="flex-1 mr-3">
                    <Text className="text-base font-bold text-[#1b1b1d] dark:text-white mb-1">
                      {workout.title}
                    </Text>
                    <Text className="text-xs text-[#0058bc] dark:text-sky-400 font-bold">
                      {workout.custom_workout_exercises?.length || 0} exercícios cadastrados
                    </Text>
                  </View>
                  <View className="w-9 h-9 rounded-full bg-white dark:bg-zinc-800 items-center justify-center border border-[#e0dddf] dark:border-zinc-700">
                    <ChevronRight size={18} color="#0058bc" />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Grupos Musculares */}
          <Text className="text-xl font-bold text-[#1b1b1d] dark:text-white mb-4">
            Grupos Musculares
          </Text>

          <View className="flex-row flex-wrap justify-between">
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                onPress={() => router.push(`/category/${category.id}`)}
                className="w-[48%] h-44 rounded-2xl overflow-hidden mb-4 relative bg-[#f0edef] dark:bg-zinc-900 border border-transparent dark:border-zinc-800"
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
                    <ChevronRight size={12} color="#ffffff" />
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