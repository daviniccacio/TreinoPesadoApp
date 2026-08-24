import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  useColorScheme,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Trophy,
  Clock,
  CalendarBlank,
  Flame,
  Barbell,
  ArrowLeft,
  CheckCircle,
} from 'phosphor-react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../../lib/supabase';

// --- TIPAGEM DE DADOS ---
interface WorkoutLog {
  id: string;
  workout_title: string;
  duration_seconds: number;
  created_at: string;
}

/**
 * Função responsável por buscar os logs de treino do aluno no Supabase.
 * Executada pelo TanStack Query e mantida em cache global.
 */
async function fetchWorkoutHistory(): Promise<WorkoutLog[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Usuário não autenticado');

  const { data, error } = await supabase
    .from('workout_logs')
    .select('id, workout_title, duration_seconds, created_at')
    .eq('student_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []) as WorkoutLog[];
}

/**
 * Converte segundos para um formato legível em Português
 */
function formatDuration(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds <= 0) return '0 min';

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  }
  return `${minutes > 0 ? minutes : 1} min`;
}

/**
 * Formata a data ISO para o padrão brasileiro
 */
function formatDate(isoString: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${day}/${month}/${year} às ${hours}:${minutes}`;
}

export default function StudentWorkoutHistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // --- REQUISITION COM TANSTACK QUERY ---
  const {
    data: logs = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['workout-history'],
    queryFn: fetchWorkoutHistory,
  });

  // --- CÁLCULO DAS ESTATÍSTICAS TOTAIS ---
  const totalWorkouts = logs.length;
  const totalSecondsTrained = logs.reduce(
    (acc, log) => acc + (log.duration_seconds || 0),
    0
  );

  return (
    <View
      className="flex-1 bg-white dark:bg-zinc-950 px-5"
      style={{ paddingTop: insets.top + 10 }}
    >
      {/* CABEÇALHO DA TELA */}
      <View className="flex-row items-center mb-5">
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.back()}
          className="w-10 h-10 rounded-xl bg-[#f8f9fa] dark:bg-zinc-900 justify-center items-center mr-3 border border-[#e2dfe1] dark:border-zinc-800"
        >
          <ArrowLeft size={20} color={isDark ? '#ffffff' : '#1b1b1d'} />
        </TouchableOpacity>

        <View className="flex-1">
          <Text className="text-xl font-extrabold text-[#1b1b1d] dark:text-white">
            Histórico de Treinos
          </Text>
          <Text className="text-xs text-[#71717a] dark:text-zinc-400 font-medium">
            Seu registro de constância e evolução
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={['#59C83A']}
            tintColor="#59C83A"
          />
        }
      >
        {/* CARTÕES DE RESUMO E ESTATÍSTICAS */}
        <View className="flex-row gap-3 mb-6">
          {/* Card 1: Total de Treinos */}
          <View className="flex-1 bg-[#f8f9fa] dark:bg-zinc-900 p-4 rounded-2xl border border-[#e2dfe1] dark:border-zinc-800">
            <View className="w-8 h-8 rounded-lg bg-[#59C83A]/10 items-center justify-center mb-2">
              <Trophy size={18} color="#59C83A" weight="bold" />
            </View>
            <Text className="text-2xl font-black text-[#1b1b1d] dark:text-white">
              {totalWorkouts}
            </Text>
            <Text className="text-xs text-[#71717a] dark:text-zinc-400 font-bold mt-0.5">
              Treinos Feitos
            </Text>
          </View>

          {/* Card 2: Tempo Total Treinado */}
          <View className="flex-1 bg-[#f8f9fa] dark:bg-zinc-900 p-4 rounded-2xl border border-[#e2dfe1] dark:border-zinc-800">
            <View className="w-8 h-8 rounded-lg bg-orange-500/10 items-center justify-center mb-2">
              <Flame size={18} color="#f97316" weight="bold" />
            </View>
            <Text className="text-2xl font-black text-[#1b1b1d] dark:text-white">
              {formatDuration(totalSecondsTrained)}
            </Text>
            <Text className="text-xs text-[#71717a] dark:text-zinc-400 font-bold mt-0.5">
              Tempo Dedicado
            </Text>
          </View>
        </View>

        {/* TÍTULO DA LISTA */}
        <Text className="text-base font-extrabold text-[#1b1b1d] dark:text-white mb-3">
          Sessões Concluídas
        </Text>

        {/* LISTAGEM DOS LOGS */}
        {isLoading ? (
          <View className="py-12 items-center">
            <ActivityIndicator size="large" color="#59C83A" />
            <Text className="text-xs text-[#71717a] dark:text-zinc-400 mt-3 font-medium">
              Carregando seu histórico de treinos...
            </Text>
          </View>
        ) : logs.length === 0 ? (
          <View className="bg-[#f8f9fa] dark:bg-zinc-900 p-8 rounded-2xl border border-dashed border-[#e2dfe1] dark:border-zinc-800 items-center my-2">
            <Barbell size={40} color={isDark ? '#71717a' : '#808591'} />
            <Text className="text-[#1b1b1d] dark:text-white font-bold mt-3 text-base text-center">
              Nenhum treino registrado ainda
            </Text>
            <Text className="text-[#71717a] dark:text-zinc-400 text-xs text-center mt-1">
              Conclua o seu primeiro treino e ele aparecerá salvo aqui no seu histórico!
            </Text>
          </View>
        ) : (
          logs.map((log) => (
            <View
              key={log.id}
              className="bg-[#f8f9fa] dark:bg-zinc-900 p-4 rounded-2xl mb-3 border border-[#e2dfe1] dark:border-zinc-800 flex-row items-center justify-between"
            >
              <View className="flex-1 mr-3">
                <View className="flex-row items-center mb-1">
                  <CheckCircle size={16} color="#59C83A" weight="bold" />
                  <Text className="text-sm font-extrabold text-[#1b1b1d] dark:text-white ml-1.5 flex-1" numberOfLines={1}>
                    {log.workout_title || 'Treino Concluído'}
                  </Text>
                </View>

                <View className="flex-row items-center mt-1">
                  <CalendarBlank size={12} color={isDark ? '#a1a1aa' : '#71717a'} />
                  <Text className="text-xs text-[#71717a] dark:text-zinc-400 ml-1 font-medium">
                    {formatDate(log.created_at)}
                  </Text>
                </View>
              </View>

              {/* Pill do Tempo de Duração */}
              <View className="bg-[#59C83A]/10 border border-[#59C83A]/30 px-3 py-1.5 rounded-xl flex-row items-center">
                <Clock size={13} color="#59C83A" weight="bold" />
                <Text className="text-xs font-black text-[#59C83A] ml-1">
                  {formatDuration(log.duration_seconds)}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}