import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MagnifyingGlass, Users, CaretRight, User } from 'phosphor-react-native';
import { supabase } from '../../../lib/supabase';

/**
 * Estrutura de dados de um aluno
 */
interface Student {
  id: string;
  full_name: string;
  role?: string;
}

/**
 * Tela Principal de Gestão de Alunos do Personal Trainer
 */
export default function PersonalStudentsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Recarrega a lista sempre que a tela ganha foco
  useFocusEffect(
    useCallback(() => {
      fetchStudents();
    }, [])
  );

  /**
   * Busca no Supabase todos os perfis com função de aluno
   */
  async function fetchStudents() {
    try {
      setLoading(true);
      setErrorMessage(null);

      // Busca os perfis no Supabase
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role');

      if (error) {
        console.error('Erro ao buscar no Supabase:', error.message);
        setErrorMessage(error.message);
      } else if (data) {
        console.log('Todos os perfis encontrados:', data);

        // Aceita 'student' ou 'aluno'
        const studentList = data.filter(
          (user) =>
            user.role?.toLowerCase() === 'student' ||
            user.role?.toLowerCase() === 'aluno'
        );

        setStudents(studentList);
      }
    } catch (err: any) {
      console.error('Erro inesperado:', err);
      setErrorMessage('Ocorreu um erro ao carregar os dados.');
    } finally {
      setLoading(false);
    }
  }

  // Filtra os alunos com base na pesquisa
  const filteredStudents = students.filter((student) =>
    student.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View
      className="flex-1 bg-white dark:bg-zinc-950 px-5"
      style={{ paddingTop: insets.top + 10 }}
    >
      {/* Cabeçalho */}
      <View className="mb-4">
        <Text className="text-2xl font-extrabold text-[#1b1b1d] dark:text-white">
          Gestão de Alunos
        </Text>
        <Text className="text-sm text-[#71717a] dark:text-zinc-400 mt-1">
          Lista de atletas cadastrados no sistema
        </Text>
      </View>

      {/* Barra de Pesquisa */}
      <View className="flex-row items-center bg-[#f8f9fa] dark:bg-zinc-900 border border-[#e2dfe1] dark:border-zinc-800 rounded-2xl px-4 py-3 mb-5">
        <MagnifyingGlass size={20} color={isDark ? '#a1a1aa' : '#71717a'} />
        <TextInput
          className="flex-1 ml-3 text-base text-[#1b1b1d] dark:text-white font-medium"
          placeholder="Buscar aluno por nome..."
          placeholderTextColor={isDark ? '#71717a' : '#a09da1'}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Mensagem de Erro */}
      {errorMessage && (
        <View className="bg-red-500/10 border border-red-500/30 p-3 rounded-xl mb-4">
          <Text className="text-red-500 text-xs font-bold text-center">
            {errorMessage}
          </Text>
        </View>
      )}

      {/* Lista de Alunos */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#59C83A" />
        </View>
      ) : filteredStudents.length === 0 ? (
        <View className="flex-1 justify-center items-center px-6">
          <Users size={48} color="#808591" />
          <Text className="text-[#1b1b1d] dark:text-white font-bold text-base mt-4 text-center">
            Nenhum aluno encontrado
          </Text>
          <Text className="text-xs text-[#71717a] dark:text-zinc-400 text-center mt-1">
            {searchQuery
              ? 'Tente buscar por outro nome.'
              : 'Verifique se a coluna "role" no Supabase está definida como "aluno".'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredStudents}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                // CORREÇÃO: Utilizando item.id e item.full_name
                router.push({
                  pathname: '/(personal)/student-detail',
                  params: { id: item.id, full_name: item.full_name },
                });
              }}
              className="bg-[#f8f9fa] dark:bg-zinc-900 p-4 rounded-2xl mb-3 border border-[#e2dfe1] dark:border-zinc-800 flex-row items-center justify-between"
            >
              <View className="flex-row items-center flex-1">
                <View className="w-12 h-12 rounded-full bg-[#59C83A]/10 items-center justify-center border border-[#59C83A]/30 mr-3">
                  <User size={22} color="#59C83A" weight="bold" />
                </View>

                <View className="flex-1">
                  <Text className="text-base font-bold text-[#1b1b1d] dark:text-white">
                    {item.full_name || 'Aluno Sem Nome'}
                  </Text>
                </View>
              </View>

              <CaretRight size={20} color={isDark ? '#71717a' : '#a09da1'} />
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}