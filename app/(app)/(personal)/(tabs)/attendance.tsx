// ============================================================================
// TELA DE FREQUÊNCIA DE TREINOS (PERSONAL TRAINER) COM SKELETON LOADING
// ============================================================================
// Apresenta o histórico de assiduidade e métricas semanais dos alunos
// vinculados ao Personal com busca segura, sanitização e Skeletons animados.
// ============================================================================

import React, { useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  useColorScheme,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CalendarCheck,
  CheckCircle,
  WarningCircle,
  Clock,
  UserCheck,
  TrendUp,
} from 'phosphor-react-native';
import { useQuery } from '@tanstack/react-query';
import { MotiView } from 'moti';

import { supabase } from '../../../../lib/supabase';
import { sanitizeInput } from '../../../../lib/security'; // 🟢 Importação da função de sanitização
import { Skeleton } from '../../../../components/SkeletonLoading';

// --- ESTRUTURA DE DADOS ---
interface AttendanceLog {
  id: string;
  created_at: string;
  student_id: string;
  workout_title?: string;
  duration_seconds?: number;
  profiles: {
    full_name: string;
  } | null;
}

// 🟢 SUBCOMPONENTE DE SKELETON PARA A TELA DE FREQUÊNCIA
function AttendanceScreenSkeleton() {
  return (
    <View className="flex-1">
      {/* Skeleton do Cabeçalho e Métricas */}
      <View className="mb-4">
        <Skeleton width="60%" height={28} borderRadius={8} className="mb-2" />
        <Skeleton width="85%" height={14} borderRadius={6} className="mb-5" />

        {/* Skeleton dos Cartões de Estatísticas Semanais */}
        <View className="flex-row gap-3 mb-5">
          <View className="flex-1 bg-[#f8f9fa] dark:bg-zinc-900 p-4 rounded-2xl border border-[#e2dfe1] dark:border-zinc-800">
            <Skeleton width={32} height={32} borderRadius={12} className="mb-2" />
            <Skeleton width={40} height={24} borderRadius={6} className="mb-1" />
            <Skeleton width="80%" height={12} borderRadius={4} />
          </View>

          <View className="flex-1 bg-[#f8f9fa] dark:bg-zinc-900 p-4 rounded-2xl border border-[#e2dfe1] dark:border-zinc-800">
            <Skeleton width={32} height={32} borderRadius={12} className="mb-2" />
            <Skeleton width={40} height={24} borderRadius={6} className="mb-1" />
            <Skeleton width="80%" height={12} borderRadius={4} />
          </View>
        </View>

        <Skeleton width={180} height={16} borderRadius={6} className="mb-1" />
      </View>

      {/* Skeleton dos Logs de Treino */}
      {Array.from({ length: 4 }).map((_, index) => (
        <View
          key={`attendance-skeleton-${index}`}
          className="bg-[#f8f9fa] dark:bg-zinc-900 p-4 rounded-2xl mb-3 border border-[#e2dfe1] dark:border-zinc-800"
        >
          <View className="flex-row items-center justify-between mb-2">
            <Skeleton width="55%" height={18} borderRadius={6} />
            <Skeleton width={70} height={20} borderRadius={10} />
          </View>
          <Skeleton width="40%" height={14} borderRadius={4} className="mb-3" />
          <View className="flex-row items-center justify-between pt-2 border-t border-[#e2dfe1] dark:border-zinc-800/80">
            <Skeleton width={110} height={12} borderRadius={4} />
            <Skeleton width={60} height={18} borderRadius={6} />
          </View>
        </View>
      ))}
    </View>
  );
}

/**
 * Busca com segurança o histórico de frequência dos alunos vinculados ao Personal logado com sanitização
 */
async function fetchAttendanceLogs(): Promise<AttendanceLog[]> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return [];
  }

  const { data: linkedStudents, error: studentsError } = await supabase
    .from('profiles')
    .select('id')
    .eq('personal_id', user.id);

  if (studentsError) {
    console.error('Erro ao buscar alunos vinculados:', studentsError.message);
    throw new Error('Não foi possível identificar seus alunos vinculados.');
  }

  if (!linkedStudents || linkedStudents.length === 0) {
    return [];
  }

  const studentIds = linkedStudents.map((student) => student.id);

  const { data, error } = await supabase
    .from('workout_logs')
    .select(
      `
      id,
      created_at,
      student_id,
      workout_title,
      duration_seconds,
      profiles (
        full_name
      )
    `
    )
    .in('student_id', studentIds)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar histórico de frequência:', error.message);
    throw new Error('Não foi possível carregar o histórico de frequência.');
  }

  return (data || []).map((log: any) => ({
    ...log,
    workout_title: log.workout_title ? sanitizeInput(log.workout_title) : 'Treino Finalizado',
    profiles: log.profiles
      ? {
          ...log.profiles,
          full_name: sanitizeInput(log.profiles.full_name || 'Aluno Não Identificado'),
        }
      : null,
  })) as AttendanceLog[];
}

export default function PersonalAttendanceScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // --- CONSULTA COM TANSTACK QUERY ---
  const {
    data: logs = [],
    isLoading,
    isError,
    error,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['personal-attendance-logs'],
    queryFn: fetchAttendanceLogs,
  });

  const weeklyStats = useMemo(() => {
    const now = new Date();
    const currentDay = now.getDay();
    const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - distanceToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const logsThisWeek = logs.filter((log) => {
      const logDate = new Date(log.created_at);
      return logDate >= startOfWeek;
    });

    const uniqueStudents = new Set(logsThisWeek.map((l) => l.student_id));

    return {
      workoutsThisWeekCount: logsThisWeek.length,
      activeStudentsCount: uniqueStudents.size,
    };
  }, [logs]);

  function formatDate(isoString: string) {
    if (!isoString) return 'Data não disponível';

    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return 'Data inválida';
    }
  }

  function formatDuration(seconds?: number): string {
    if (!seconds || seconds <= 0) return 'Duração N/D';
    const mins = Math.floor(seconds / 60);
    if (mins < 1) return 'Menos de 1 min';
    return `${mins} min`;
  }

  function renderHeader() {
    return (
      <View className="mb-4">
        {/* TÍTULO ANIMADO */}
        <MotiView
          from={{ opacity: 0, translateY: -12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{
            type: 'spring',
            damping: 24,
            stiffness: 160,
          } as any}
        >
          <Text className="text-2xl font-outfit-extrabold text-[#1b1b1d] dark:text-white">
            Frequência de Treinos
          </Text>
          <Text className="text-xs font-sans-medium text-[#71717a] dark:text-zinc-400 mt-0.5 mb-5">
            Acompanhamento em tempo real da assiduidade dos seus alunos
          </Text>
        </MotiView>

        {/* CARTÕES DE ESTATÍSTICAS ANIMADOS */}
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{
            type: 'spring',
            damping: 22,
            stiffness: 150,
            delay: 30,
          } as any}
          className="flex-row gap-3 mb-5"
        >
          <View className="flex-1 bg-[#f8f9fa] dark:bg-zinc-900 p-4 rounded-2xl border border-[#e2dfe1] dark:border-zinc-800">
            <View className="w-8 h-8 rounded-xl bg-[#59C83A]/10 items-center justify-center mb-2 border border-[#59C83A]/30">
              <UserCheck size={18} color="#59C83A" weight="bold" />
            </View>
            <Text className="text-2xl font-outfit-extrabold text-[#1b1b1d] dark:text-white">
              {weeklyStats.activeStudentsCount}
            </Text>
            <Text className="text-[11px] font-sans-bold text-[#71717a] dark:text-zinc-400 mt-0.5">
              Alunos Ativos (Semana)
            </Text>
          </View>

          <View className="flex-1 bg-[#f8f9fa] dark:bg-zinc-900 p-4 rounded-2xl border border-[#e2dfe1] dark:border-zinc-800">
            <View className="w-8 h-8 rounded-xl bg-[#59C83A]/10 items-center justify-center mb-2 border border-[#59C83A]/30">
              <TrendUp size={18} color="#59C83A" weight="bold" />
            </View>
            <Text className="text-2xl font-outfit-extrabold text-[#1b1b1d] dark:text-white">
              {weeklyStats.workoutsThisWeekCount}
            </Text>
            <Text className="text-[11px] font-sans-bold text-[#71717a] dark:text-zinc-400 mt-0.5">
              Treinos nesta Semana
            </Text>
          </View>
        </MotiView>

        {/* TÍTULO DA SEÇÃO */}
        <Text className="text-sm font-outfit text-[#1b1b1d] dark:text-white mb-1">
          Últimos Treinos Finalizados ({logs.length})
        </Text>
      </View>
    );
  }

  const safeTopPadding = Math.max(insets?.top || 0, 16);

  return (
    <View
      className="flex-1 bg-white dark:bg-zinc-950 px-5"
      style={{ paddingTop: safeTopPadding + 10 }}
    >
      {isError && (
        <View className="bg-red-500/10 border border-red-500/30 p-4 rounded-2xl mb-4 flex-row items-center">
          <WarningCircle size={20} color="#EF4444" />
          <Text className="text-red-500 text-xs font-sans-bold ml-2 flex-1">
            {error?.message || 'Não foi possível carregar o histórico.'}
          </Text>
        </View>
      )}

      {/* 🟢 EXIBIÇÃO DE SKELETON CARREGANDO OU CONTEÚDO REAL */}
      {isLoading ? (
        <AttendanceScreenSkeleton />
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={{ paddingBottom: 120 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => {
                void refetch();
              }}
              tintColor="#59C83A"
            />
          }
          ListEmptyComponent={
            <MotiView
              from={{ opacity: 0, scale: 0.95, translateY: 10 }}
              animate={{ opacity: 1, scale: 1, translateY: 0 }}
              transition={{
                type: 'spring',
                damping: 22,
                stiffness: 150,
              } as any}
              className="bg-[#f8f9fa] dark:bg-zinc-900 p-8 rounded-2xl border border-dashed border-[#e2dfe1] dark:border-zinc-800 items-center my-2"
            >
              <CalendarCheck size={40} color={isDark ? '#71717a' : '#808591'} />
              <Text className="text-[#1b1b1d] dark:text-white font-outfit text-base mt-3 text-center">
                Nenhum treino registrado
              </Text>
              <Text className="text-xs text-[#71717a] dark:text-zinc-400 text-center mt-1 leading-5 font-sans-medium">
                Assim que os seus alunos finalizarem os treinos no aplicativo, a
                frequência aparecerá automaticamente aqui.
              </Text>
            </MotiView>
          }
          renderItem={({ item, index }) => (
            <MotiView
              from={{ opacity: 0, translateY: 14, scale: 0.97 }}
              animate={{ opacity: 1, translateY: 0, scale: 1 }}
              transition={{
                type: 'spring',
                damping: 22,
                stiffness: 150,
                delay: index * 40,
              } as any}
            >
              <View className="bg-[#f8f9fa] dark:bg-zinc-900 p-4 rounded-2xl mb-3 border border-[#e2dfe1] dark:border-zinc-800">
                <View className="flex-row items-center justify-between mb-1.5">
                  <Text
                    className="text-base font-outfit text-[#1b1b1d] dark:text-white flex-1 mr-2"
                    numberOfLines={1}
                  >
                    {item.profiles?.full_name || 'Aluno Não Identificado'}
                  </Text>

                  <View className="bg-[#59C83A]/10 border border-[#59C83A]/30 px-2.5 py-0.5 rounded-full flex-row items-center">
                    <CheckCircle size={12} color="#59C83A" weight="bold" />
                    <Text className="text-[10px] font-sans-bold text-[#59C83A] ml-1">
                      Concluído
                    </Text>
                  </View>
                </View>

                <Text className="text-xs text-[#59C83A] font-sans-bold mb-2">
                  {item.workout_title || 'Treino Finalizado'}
                </Text>

                <View className="flex-row items-center justify-between pt-2 border-t border-[#e2dfe1] dark:border-zinc-800/80">
                  <Text className="text-[11px] font-sans-medium text-[#71717a] dark:text-zinc-400">
                    {formatDate(item.created_at)}
                  </Text>

                  {item.duration_seconds ? (
                    <View className="flex-row items-center bg-white dark:bg-zinc-950 px-2 py-0.5 rounded-md border border-[#e2dfe1] dark:border-zinc-800">
                      <Clock size={11} color="#59C83A" weight="bold" />
                      <Text className="text-[10px] font-sans-bold text-[#1b1b1d] dark:text-white ml-1">
                        {formatDuration(item.duration_seconds)}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </MotiView>
          )}
        />
      )}
    </View>
  );
}