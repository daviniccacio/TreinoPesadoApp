import React, { useState, useCallback } from 'react';
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
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MagnifyingGlass, Users, CaretRight, User, X, Sparkle } from 'phosphor-react-native';
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

  // --- ESTADOS DA TELA ---
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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
      setErrorMessage(null);

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role');

      if (error) {
        console.error('Erro ao buscar no Supabase:', error.message);
        setErrorMessage(error.message);
      } else if (data) {
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
      setRefreshing(false);
    }
  }

  /**
   * Executado quando o usuário puxa a lista para baixo
   */
  function handleRefresh() {
    setRefreshing(true);
    fetchStudents();
  }

  /**
   * Função auxiliar para pegar a primeira letra do nome
   */
  function getInitials(name: string) {
    if (!name) return 'A';
    return name.trim().charAt(0).toUpperCase();
  }

  // Filtra os alunos com base na pesquisa por nome
  const filteredStudents = students.filter((student) =>
    student.full_name?.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  return (
    <View
      className="flex-1 bg-white dark:bg-zinc-950 px-5"
      style={{ paddingTop: insets.top + 10 }}
    >
      {/* CABEÇALHO COM CONTADOR DE ALUNOS */}
      <View className="flex-row items-center justify-between mb-5">
        <View className="flex-1 mr-2">
          <Text className="text-2xl font-extrabold text-[#1b1b1d] dark:text-white">
            Gestão de Alunos
          </Text>
          <Text className="text-xs text-[#71717a] dark:text-zinc-400 mt-0.5">
            Acompanhe a evolução da sua equipe
          </Text>
        </View>

        {/* Badge com a contagem total de alunos */}
        <View className="bg-[#59C83A]/10 border border-[#59C83A]/30 px-3 py-1.5 rounded-full flex-row items-center">
          <Sparkle size={14} color="#59C83A" weight="bold" />
          <Text className="text-xs font-extrabold text-[#59C83A] ml-1.5">
            {students.length} {students.length === 1 ? 'Aluno' : 'Alunos'}
          </Text>
        </View>
      </View>

      {/* BARRA DE PESQUISA REPINADA */}
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

      {/* MENSAGEM DE ERRO (SE HOUVER) */}
      {errorMessage && (
        <View className="bg-red-500/10 border border-red-500/30 p-3.5 rounded-2xl mb-4">
          <Text className="text-red-500 text-xs font-bold text-center">
            {errorMessage}
          </Text>
        </View>
      )}

      {/* LISTA DE ALUNOS */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#59C83A" />
          <Text className="text-xs font-medium text-[#71717a] dark:text-zinc-400 mt-3">
            Carregando lista de alunos...
          </Text>
        </View>
      ) : filteredStudents.length === 0 ? (
        <View className="flex-1 justify-center items-center px-6">
          <View className="w-16 h-16 rounded-3xl bg-[#f8f9fa] dark:bg-zinc-900 items-center justify-center border border-[#e2dfe1] dark:border-zinc-800 mb-3">
            <Users size={32} color={isDark ? '#71717a' : '#a1a1aa'} />
          </View>
          <Text className="text-[#1b1b1d] dark:text-white font-extrabold text-base text-center">
            Nenhum aluno encontrado
          </Text>
          <Text className="text-xs text-[#71717a] dark:text-zinc-400 text-center mt-1">
            {searchQuery
              ? 'Nenhum resultado corresponde à sua pesquisa.'
              : 'Verifique se a coluna "role" no Supabase está cadastrada como "aluno".'}
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
              refreshing={refreshing}
              onRefresh={handleRefresh}
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
                {/* Avatar com a Inicial do Nome */}
                <View className="w-12 h-12 rounded-2xl bg-[#59C83A]/10 items-center justify-center border border-[#59C83A]/30 mr-3.5">
                  <Text className="text-lg font-black color-[#59C83A]">
                    {getInitials(item.full_name)}
                  </Text>
                </View>

                {/* Nome e Tag de Status */}
                <View className="flex-1">
                  <Text
                    className="text-base font-extrabold text-[#1b1b1d] dark:text-white"
                    numberOfLines={1}
                  >
                    {item.full_name || 'Aluno Sem Nome'}
                  </Text>
                  <View className="flex-row items-center mt-1">
                    <View className="w-2 h-2 rounded-full bg-[#59C83A] mr-1.5" />
                    <Text className="text-[11px] font-bold text-[#71717a] dark:text-zinc-400">
                      Atleta Ativo
                    </Text>
                  </View>
                </View>
              </View>

              {/* Seta Indicativa */}
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