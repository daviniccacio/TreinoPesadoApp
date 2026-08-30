import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CaretRight } from 'phosphor-react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';

interface Category {
  id: string;
  title: string;
  image_url: string;
}

async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase.from('categories').select('*').order('title');
  if (error) throw new Error(error.message);
  return (data || []) as Category[];
}

export default function PersonalExercisesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories-list'],
    queryFn: fetchCategories,
  });

  return (
    <View className="flex-1 bg-white dark:bg-zinc-950" style={{ paddingTop: insets.top }}>
      <View className="px-5 py-4 border-b border-[#f0edef] dark:border-zinc-800">
        <Text className="text-2xl font-extrabold text-[#1b1b1d] dark:text-white">
          Catálogo de Exercícios
        </Text>
        <Text className="text-xs text-[#71717a] dark:text-zinc-400 mt-0.5">
          Consulte demonstrações e instruções da academia
        </Text>
      </View>

      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#59C83A" />
        </View>
      ) : (
        <ScrollView className="flex-1 px-5 pt-4" showsVerticalScrollIndicator={false}>
          <View className="flex-row flex-wrap justify-between">
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                onPress={() =>
                  router.push({
                    pathname: '/(personal)/category/[id]',
                    params: { id: category.id, title: category.title },
                  })
                }
                className="w-[48%] h-44 rounded-2xl overflow-hidden mb-4 relative bg-[#f8f9fa] dark:bg-zinc-900 border border-[#e2dfe1] dark:border-zinc-800"
                activeOpacity={0.8}
              >
                {category.image_url ? (
                  <Image
                    source={{ uri: category.image_url }}
                    className="w-full h-full absolute inset-0"
                    resizeMode="cover"
                  />
                ) : null}

                <View className="absolute inset-0 bg-black/45 justify-end p-3">
                  <Text className="text-white text-lg font-bold">{category.title}</Text>
                  <View className="flex-row items-center mt-1">
                    <Text className="text-white/90 text-xs font-semibold mr-1">Ver lista</Text>
                    <CaretRight size={12} color="#ffffff" weight="bold" />
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