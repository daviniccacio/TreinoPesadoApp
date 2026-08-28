import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  useColorScheme,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MagnifyingGlass, Users, CaretRight, X, Sparkle } from 'phosphor-react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';

interface Student {
  id: string;
  full_name: string;
  role?: string;
}

/**
 * Busca estritamente os alunos vinculados ao ID do Personal Trainer autenticado
 */
async function fetchMyStudents(): Promise<Student[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  // Consulta estrita: busca apenas onde personal_id é IGUAL ao ID do Personal logado
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('personal_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar alunos vinculados:', error.message);
    throw new Error(error.message);
  }

  const formattedStudents = (data || []).map((item: any) => ({
    id: item.id,
    full_name: item.full_name || 'Aluno Sem Nome',
    role: item.role,
  }));

  return formattedStudents as Student[];
}

export default function PersonalStudentsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [searchQuery, setSearchQuery] = useState('');

  // --- CONSULTA TANSTACK QUERY ---
  const {
    data: students = [],
    isLoading,
    isError,
    error,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['personal-students'],
    queryFn: fetchMyStudents,
  });

  function getInitials(full_name: string) {
    if (!full_name) return 'A';
    return full_name.trim().charAt(0).toUpperCase();
  }

  const filteredStudents = students.filter((student) =>
    student.full_name?.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  return (
    <View
      className="flex-1 bg-white dark:bg-zinc-950 px-5"
      style={{ paddingTop: insets.top + 10 }}
    >
      {/* CABEÇALHO */}
      <View className="flex-row items-center justify-between mb-5">
        <View className="flex-1 mr-2">
          <Text className="text-2xl font-extrabold text-[#1b1b1d] dark:text-white">
            Gestão de Alunos
          </Text>
          <Text className="text-xs text-[#71717a] dark:text-zinc-400 mt-0.5">
            Seus alunos vinculados
          </Text>
        </View>

        <View className="bg-[#59C83A]/10 border border-[#59C83A]/30 px-3 py-1.5 rounded-full flex-row items-center">
          <Sparkle size={14} color="#59C83A" weight="bold" />
          <Text className="text-xs font-extrabold text-[#59C83A] ml-1.5">
            {students.length} {students.length === 1 ? 'Aluno' : 'Alunos'}
          </Text>
        </View>
      </View>

      {/* BARRA DE PESQUISA */}
      <View className="flex-row items-center bg-[#f8f9fa] dark:bg-zinc-900 border border-[#e2dfe1] dark:border-zinc-800 rounded-2xl px-4 py-3 mb-5">
        <MagnifyingGlass size={20} color={isDark ? '#59C83A' : '#71717a'} />
        <TextInput
          className="flex-1 ml-3 text-sm text-[#1b1b1d] dark:text-white font-semibold"
          placeholder="Buscar aluno por nome..."
          placeholderTextColor={isDark ? '#71717a' : '#a09da1'}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} className="p-1">
            <X size={18} color={isDark ? '#a1a1aa' : '#71717a'} />
          </TouchableOpacity>
        )}
      </View>

      {isError && (
        <View className="bg-red-500/10 border border-red-500/30 p-3.5 rounded-2xl mb-4">
          <Text className="text-red-500 text-xs font-bold text-center">
            {error?.message || 'Erro ao carregar lista de alunos.'}
          </Text>
        </View>
      )}

      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#59C83A" />
        </View>
      ) : filteredStudents.length === 0 ? (
        <View className="flex-1 justify-center items-center px-6">
          <View className="w-16 h-16 rounded-3xl bg-[#f8f9fa] dark:bg-zinc-900 items-center justify-center border border-[#e2dfe1] dark:border-zinc-800 mb-3">
            <Users size={32} color={isDark ? '#71717a' : '#a1a1aa'} />
          </View>
          <Text className="text-[#1b1b1d] dark:text-white font-extrabold text-base text-center">
            Nenhum aluno vinculado
          </Text>
          <Text className="text-xs text-[#71717a] dark:text-zinc-400 text-center mt-1">
            Peça aos seus alunos para inserirem o seu código no perfil deles.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredStudents}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#59C83A"
              colors={['#59C83A']}
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                router.push({
                  pathname: '/(personal)/student-detail',
                  params: { id: item.id, full_name: item.full_name },
                });
              }}
              className="bg-[#f8f9fa] dark:bg-zinc-900 p-4 rounded-2xl mb-3 border border-[#e2dfe1] dark:border-zinc-800 flex-row items-center justify-between"
            >
              <View className="flex-row items-center flex-1 mr-2">
                <View className="w-12 h-12 rounded-2xl bg-[#59C83A]/10 items-center justify-center border border-[#59C83A]/30 mr-3.5">
                  <Text className="text-lg font-black color-[#59C83A]">
                    {getInitials(item.full_name)}
                  </Text>
                </View>

                <View className="flex-1">
                  <Text
                    className="text-base font-extrabold text-[#1b1b1d] dark:text-white"
                    numberOfLines={1}
                  >
                    {item.full_name}
                  </Text>
                  <View className="flex-row items-center mt-1">
                    <View className="w-2 h-2 rounded-full bg-[#59C83A] mr-1.5" />
                    <Text className="text-[11px] font-bold text-[#71717a] dark:text-zinc-400">
                      Atleta Ativo
                    </Text>
                  </View>
                </View>
              </View>

              <View className="w-8 h-8 rounded-xl bg-white dark:bg-zinc-950 items-center justify-center border border-[#e2dfe1] dark:border-zinc-800">
                <CaretRight size={16} color={isDark ? '#ffffff' : '#1b1b1d'} />
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}