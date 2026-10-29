// ============================================================================
// DOCUMENTAÇÃO: TELA DE HISTÓRICO DE TREINOS (ÁREA DO ALUNO) COM SKELETON
// ============================================================================
// Exibe o registro de treinos concluídos pelo aluno, calculando total de
// sessões e tempo acumulado com transição em Skeleton Loading e pull-to-refresh.
// ============================================================================

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
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
import { MotiView } from 'moti';
import { supabase } from '../../../../lib/supabase';
import { Skeleton } from '../../../../components/SkeletonLoading'; // 🟢 Importação do Skeleton

// --- TIPAGEM DE DADOS ---
interface WorkoutLog {
  id: string;
  workout_title: string;
  duration_seconds: number;
  created_at: string;
}

// 🟢 SUBCOMPONENTE DE SKELETON PARA O HISTÓRICO DE TREINOS
function HistorySkeleton() {
  return (
    <View className="flex-1">
      {/* Skeleton dos Cards de Resumo */}
      <View className="flex-row gap-3 mb-6">
        <View className="flex-1 bg-[#f8f9fa] dark:bg-zinc-900 p-4 rounded-2xl border border-[#e2dfe1] dark:border-zinc-800">
          <Skeleton width={32} height={32} borderRadius={8} className="mb-2" />
          <Skeleton width={50} height={28} borderRadius={6} className="mb-1" />
          <Skeleton width={80} height={12} borderRadius={4} />
        </View>

        <View className="flex-1 bg-[#f8f9fa] dark:bg-zinc-900 p-4 rounded-2xl border border-[#e2dfe1] dark:border-zinc-800">
          <Skeleton width={32} height={32} borderRadius={8} className="mb-2" />
          <Skeleton width={70} height={28} borderRadius={6} className="mb-1" />
          <Skeleton width={90} height={12} borderRadius={4} />
        </View>
      </View>

      {/* Skeleton do Título da Seção */}
      <Skeleton width={160} height={20} borderRadius={6} className="mb-3" />

      {/* Skeleton da Lista de Sessões Concluídas */}
      {Array.from({ length: 5 }).map((_, index) => (
        <View
          key={`history-log-skeleton-${index}`}
          className="bg-[#f8f9fa] dark:bg-zinc-900 p-4 rounded-2xl mb-3 border border-[#e2dfe1] dark:border-zinc-800 flex-row items-center justify-between"
        >
          <View className="flex-1 mr-3">
            <View className="flex-row items-center mb-2">
              <Skeleton width={16} height={16} borderRadius={8} className="mr-2" />
              <Skeleton width="65%" height={16} borderRadius={6} />
            </View>
            <Skeleton width="45%" height={12} borderRadius={4} />
          </View>
          <Skeleton width={75} height={28} borderRadius={12} />
        </View>
      ))}
    </View>
  );
}

/**
 * Busca os logs de treino do aluno autenticado no Supabase.
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
 * Converte segundos para um formato legível (Ex: "0 min", "2s", "5 min", "1h 02m")
 */
function formatDuration(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds <= 0) return '0 min';

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  }

  if (minutes > 0) {
    return `${minutes} min`;
  }

  return `${seconds}s`;
}

/**
 * Formata a data ISO para o padrão brasileiro (DD/MM/AAAA às HH:MM)
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

  // --- REQUISIÇÃO COM TANSTACK QUERY ---
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

  const safeTopPadding = Math.max(insets?.top || 0, 16);

  return (
    <View
      className="flex-1 bg-white dark:bg-zinc-950 px-5"
      style={{ paddingTop: safeTopPadding + 10 }}
    >
      {/* CABEÇALHO DA TELA COM ANIMAÇÃO */}
      <MotiView
        from={{ opacity: 0, translateY: -8 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{
          type: 'spring',
          damping: 24,
          stiffness: 160,
        } as any}
        className="flex-row items-center mb-5"
      >
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.back()}
          className="w-10 h-10 rounded-xl bg-[#f8f9fa] dark:bg-zinc-900 justify-center items-center mr-3 border border-[#e2dfe1] dark:border-zinc-800"
        >
          <ArrowLeft size={20} color={isDark ? '#ffffff' : '#1b1b1d'} />
        </TouchableOpacity>

        <View className="flex-1">
          <Text className="text-xl font-outfit-extrabold text-[#1b1b1d] dark:text-white">
            Histórico de Treinos
          </Text>
          <Text className="text-xs font-sans-medium text-[#71717a] dark:text-zinc-400">
            Seu registro de constância e evolução
          </Text>
        </View>
      </MotiView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => {
              void refetch();
            }}
            colors={['#59C83A']}
            tintColor="#59C83A"
          />
        }
      >
        {isLoading ? (
          <HistorySkeleton />
        ) : (
          <>
            {/* CARTÕES DE RESUMO E ESTATÍSTICAS */}
            <MotiView
              from={{ opacity: 0, scale: 0.96, translateY: 10 }}
              animate={{ opacity: 1, scale: 1, translateY: 0 }}
              transition={{
                type: 'spring',
                damping: 22,
                stiffness: 150,
                delay: 40,
              } as any}
              className="flex-row gap-3 mb-6"
            >
              {/* Card 1: Total de Treinos */}
              <View className="flex-1 bg-[#f8f9fa] dark:bg-zinc-900 p-4 rounded-2xl border border-[#e2dfe1] dark:border-zinc-800">
                <View className="w-8 h-8 rounded-lg bg-[#59C83A]/10 items-center justify-center mb-2">
                  <Trophy size={18} color="#59C83A" weight="bold" />
                </View>
                <Text className="text-2xl font-outfit-extrabold text-[#1b1b1d] dark:text-white">
                  {totalWorkouts}
                </Text>
                <Text className="text-xs font-sans-bold text-[#71717a] dark:text-zinc-400 mt-0.5">
                  Treinos Feitos
                </Text>
              </View>

              {/* Card 2: Tempo Total Treinado */}
              <View className="flex-1 bg-[#f8f9fa] dark:bg-zinc-900 p-4 rounded-2xl border border-[#e2dfe1] dark:border-zinc-800">
                <View className="w-8 h-8 rounded-lg bg-orange-500/10 items-center justify-center mb-2">
                  <Flame size={18} color="#f97316" weight="bold" />
                </View>
                <Text className="text-2xl font-outfit-extrabold text-[#1b1b1d] dark:text-white">
                  {formatDuration(totalSecondsTrained)}
                </Text>
                <Text className="text-xs font-sans-bold text-[#71717a] dark:text-zinc-400 mt-0.5">
                  Tempo Dedicado
                </Text>
              </View>
            </MotiView>

            {/* TÍTULO DA LISTA */}
            <MotiView
              from={{ opacity: 0, translateX: -10 }}
              animate={{ opacity: 1, translateX: 0 }}
              transition={{
                type: 'spring',
                damping: 22,
                stiffness: 160,
                delay: 80,
              } as any}
            >
              <Text className="text-base font-outfit-extrabold text-[#1b1b1d] dark:text-white mb-3">
                Sessões Concluídas
              </Text>
            </MotiView>

            {/* LISTAGEM DOS LOGS */}
            {logs.length === 0 ? (
              <MotiView
                from={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'timing', duration: 250 } as any}
                className="bg-[#f8f9fa] dark:bg-zinc-900 p-8 rounded-2xl border border-dashed border-[#e2dfe1] dark:border-zinc-800 items-center my-2"
              >
                <Barbell size={40} color={isDark ? '#71717a' : '#808591'} />
                <Text className="font-outfit-bold text-[#1b1b1d] dark:text-white mt-3 text-base text-center">
                  Nenhum treino registrado ainda
                </Text>
                <Text className="font-sans-medium text-[#71717a] dark:text-zinc-400 text-xs text-center mt-1">
                  Conclua o seu primeiro treino e ele aparecerá salvo aqui no seu histórico!
                </Text>
              </MotiView>
            ) : (
              logs.map((log, index) => (
                <MotiView
                  key={log.id}
                  from={{ opacity: 0, translateY: 14, scale: 0.97 }}
                  animate={{ opacity: 1, translateY: 0, scale: 1 }}
                  transition={{
                    type: 'spring',
                    damping: 22,
                    stiffness: 150,
                    delay: index * 40,
                  } as any}
                  className="bg-[#f8f9fa] dark:bg-zinc-900 p-4 rounded-2xl mb-3 border border-[#e2dfe1] dark:border-zinc-800 flex-row items-center justify-between"
                >
                  <View className="flex-1 mr-3">
                    <View className="flex-row items-center mb-1">
                      <CheckCircle size={16} color="#59C83A" weight="bold" />
                      <Text className="text-sm font-outfit text-[#1b1b1d] dark:text-white ml-1.5 flex-1" numberOfLines={1}>
                        {log.workout_title || 'Treino Concluído'}
                      </Text>
                    </View>

                    <View className="flex-row items-center mt-1">
                      <CalendarBlank size={12} color={isDark ? '#a1a1aa' : '#71717a'} />
                      <Text className="text-xs font-sans-medium text-[#71717a] dark:text-zinc-400 ml-1">
                        {formatDate(log.created_at)}
                      </Text>
                    </View>
                  </View>

                  <View className="bg-[#59C83A]/10 border border-[#59C83A]/30 px-3 py-1.5 rounded-xl flex-row items-center">
                    <Clock size={13} color="#59C83A" weight="bold" />
                    <Text className="text-xs font-sans-bold text-[#59C83A] ml-1">
                      {formatDuration(log.duration_seconds)}
                    </Text>
                  </View>
                </MotiView>
              ))
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}