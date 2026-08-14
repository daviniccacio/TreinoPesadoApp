import React from 'react';
import { View, Text, FlatList, TouchableOpacity, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, Barbell, CaretRight } from 'phosphor-react-native';
import { useRouter } from 'expo-router';

/**
 * Estrutura de dados para representar uma rotina de treino
 */
interface RoutineItem {
  id: string;
  title: string;
  exercisesCount: number;
}

/**
 * Tela de Gestão de Rotinas de Treino do Personal
 */
export default function PersonalRoutinesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Lista de rotinas de exemplo (posteriormente será conectada ao Supabase)
  const routines: RoutineItem[] = [
    { id: '1', title: 'Treino A - Peito e Tríceps', exercisesCount: 6 },
    { id: '2', title: 'Treino B - Costas e Bíceps', exercisesCount: 5 },
    { id: '3', title: 'Treino C - Pernas Completo', exercisesCount: 7 },
  ];

  return (
    <View 
      className="flex-1 bg-white dark:bg-zinc-950 px-5" 
      style={{ paddingTop: insets.top + 10 }}
    >
      {/* Cabeçalho */}
      <View className="flex-row justify-between items-center mb-6">
        <View>
          <Text className="text-2xl font-extrabold text-[#1b1b1d] dark:text-white">
            Rotinas de Treino
          </Text>
          <Text className="text-sm text-[#71717a] dark:text-zinc-400 mt-1">
            Modelos de fichas cadastradas
          </Text>
        </View>

        {/* Botão de Adicionar Nova Rotina */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push('/(personal)/create-workout')}
          className="bg-[#59C83A] w-11 h-11 rounded-2xl justify-center items-center shadow-sm"
        >
          <Plus size={22} color="#FFFFFF" weight="bold" />
        </TouchableOpacity>
      </View>

      {/* Lista de Rotinas Cadastradas */}
      <FlatList
        data={routines}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.7}
            className="bg-[#f8f9fa] dark:bg-zinc-900 p-4 rounded-2xl mb-3 border border-[#e2dfe1] dark:border-zinc-800 flex-row items-center justify-between"
          >
            <View className="flex-row items-center flex-1">
              <View className="w-12 h-12 rounded-full bg-[#59C83A]/10 items-center justify-center border border-[#59C83A]/30 mr-3">
                <Barbell size={22} color="#59C83A" weight="bold" />
              </View>

              <View className="flex-1">
                <Text className="text-base font-bold text-[#1b1b1d] dark:text-white">
                  {item.title}
                </Text>
                <Text className="text-xs text-[#71717a] dark:text-zinc-400 mt-0.5">
                  {item.exercisesCount} exercícios
                </Text>
              </View>
            </View>

            <CaretRight size={20} color={isDark ? '#71717a' : '#a09da1'} />
          </TouchableOpacity>
        )}
      />
    </View>
  );
}