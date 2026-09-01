import React, { useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  CalendarCheck,
  CheckCircle,
  WarningCircle,
  Clock,
  UserCheck,
  TrendUp,
} from "phosphor-react-native";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../../lib/supabase";

/**
 * Estrutura de um registro de frequência
 */
interface AttendanceLog {
  id: string;
  created_at: string;
  student_id: string;
  workout_title?: string;
  duration_seconds?: number;
  profiles: {
    full_name: string;
    personal_id?: string;
  } | null;
}

/**
 * Busca o histórico de frequência estritamente dos alunos vinculados ao Personal logado
 */
async function fetchAttendanceLogs(): Promise<AttendanceLog[]> {
  // 1. Obtém o utilizador/Personal autenticado na sessão atual
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return [];
  }

  // 2. Realiza a busca com Inner Join (profiles!inner) e filtro por personal_id
  const { data, error } = await supabase
    .from("workout_logs")
    .select(
      `
      id,
      created_at,
      student_id,
      workout_title,
      duration_seconds,
      profiles!inner (
        full_name,
        personal_id
      )
    `,
    )
    .eq("profiles.personal_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao buscar histórico de frequência:", error.message);
    throw new Error("Não foi possível carregar o histórico de frequência.");
  }

  return (data || []) as unknown as AttendanceLog[];
}

export default function PersonalAttendanceScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // --- BUSCA REATIVA COM TANSTACK QUERY ---
  const {
    data: logs = [],
    isLoading,
    isError,
    error,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["personal-attendance-logs"],
    queryFn: fetchAttendanceLogs,
  });

  /**
   * Calcula as estatísticas de assiduidade da semana atual (Segunda a Domingo)
   */
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
    if (!isoString) return "Data não disponível";

    try {
      const date = new Date(isoString);
      return date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return "Data inválida";
    }
  }

  function formatDuration(seconds?: number): string {
    if (!seconds || seconds <= 0) return "Duração N/D";
    const mins = Math.floor(seconds / 60);
    if (mins < 1) return "Menos de 1 min";
    return `${mins} min`;
  }

  function renderHeader() {
    return (
      <View className="mb-4">
        <Text className="text-2xl font-black text-[#1b1b1d] dark:text-white">
          Frequência de Treinos
        </Text>
        <Text className="text-xs text-[#71717a] dark:text-zinc-400 mt-0.5 mb-5 font-medium">
          Acompanhamento em tempo real da assiduidade dos seus alunos
        </Text>

        <View className="flex-row gap-3 mb-5">
          <View className="flex-1 bg-[#f8f9fa] dark:bg-zinc-900 p-4 rounded-2xl border border-[#e2dfe1] dark:border-zinc-800">
            <View className="w-8 h-8 rounded-xl bg-[#59C83A]/10 items-center justify-center mb-2 border border-[#59C83A]/30">
              <UserCheck size={18} color="#59C83A" weight="bold" />
            </View>
            <Text className="text-2xl font-black text-[#1b1b1d] dark:text-white">
              {weeklyStats.activeStudentsCount}
            </Text>
            <Text className="text-[11px] font-bold text-[#71717a] dark:text-zinc-400 mt-0.5">
              Alunos Ativos (Semana)
            </Text>
          </View>

          <View className="flex-1 bg-[#f8f9fa] dark:bg-zinc-900 p-4 rounded-2xl border border-[#e2dfe1] dark:border-zinc-800">
            <View className="w-8 h-8 rounded-xl bg-[#59C83A]/10 items-center justify-center mb-2 border border-[#59C83A]/30">
              <TrendUp size={18} color="#59C83A" weight="bold" />
            </View>
            <Text className="text-2xl font-black text-[#1b1b1d] dark:text-white">
              {weeklyStats.workoutsThisWeekCount}
            </Text>
            <Text className="text-[11px] font-bold text-[#71717a] dark:text-zinc-400 mt-0.5">
              Treinos nesta Semana
            </Text>
          </View>
        </View>

        <Text className="text-sm font-extrabold text-[#1b1b1d] dark:text-white mb-1">
          Últimos Treinos Finalizados ({logs.length})
        </Text>
      </View>
    );
  }

  return (
    <View
      className="flex-1 bg-white dark:bg-zinc-950 px-5"
      style={{ paddingTop: insets.top + 10 }}
    >
      {isError && (
        <View className="bg-red-500/10 border border-red-500/30 p-4 rounded-2xl mb-4 flex-row items-center">
          <WarningCircle size={20} color="#EF4444" />
          <Text className="text-red-500 text-xs font-bold ml-2 flex-1">
            {error?.message || "Não foi possível carregar o histórico."}
          </Text>
        </View>
      )}

      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#59C83A" />
          <Text className="text-xs text-[#71717a] dark:text-zinc-400 mt-3 font-medium">
            Carregando assiduidade dos alunos...
          </Text>
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#59C83A"
            />
          }
          ListEmptyComponent={
            <View className="bg-[#f8f9fa] dark:bg-zinc-900 p-8 rounded-2xl border border-dashed border-[#e2dfe1] dark:border-zinc-800 items-center my-2">
              <CalendarCheck size={40} color={isDark ? "#71717a" : "#808591"} />
              <Text className="text-[#1b1b1d] dark:text-white font-bold text-base mt-3 text-center">
                Nenhum treino registrado
              </Text>
              <Text className="text-xs text-[#71717a] dark:text-zinc-400 text-center mt-1 leading-5">
                Assim que os seus alunos finalizarem os treinos no aplicativo, a
                frequência aparecerá automaticamente aqui.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View className="bg-[#f8f9fa] dark:bg-zinc-900 p-4 rounded-2xl mb-3 border border-[#e2dfe1] dark:border-zinc-800">
              <View className="flex-row items-center justify-between mb-1.5">
                <Text
                  className="text-base font-extrabold text-[#1b1b1d] dark:text-white flex-1 mr-2"
                  numberOfLines={1}
                >
                  {item.profiles?.full_name || "Aluno Não Identificado"}
                </Text>

                <View className="bg-[#59C83A]/10 border border-[#59C83A]/30 px-2.5 py-0.5 rounded-full flex-row items-center">
                  <CheckCircle size={12} color="#59C83A" weight="bold" />
                  <Text className="text-[10px] font-extrabold text-[#59C83A] ml-1">
                    Concluído
                  </Text>
                </View>
              </View>

              <Text className="text-xs text-[#59C83A] font-bold mb-2">
                {item.workout_title || "Treino Finalizado"}
              </Text>

              <View className="flex-row items-center justify-between pt-2 border-t border-[#e2dfe1] dark:border-zinc-800/80">
                <Text className="text-[11px] font-medium text-[#71717a] dark:text-zinc-400">
                  {formatDate(item.created_at)}
                </Text>

                {item.duration_seconds ? (
                  <View className="flex-row items-center bg-white dark:bg-zinc-950 px-2 py-0.5 rounded-md border border-[#e2dfe1] dark:border-zinc-800">
                    <Clock size={11} color="#59C83A" weight="bold" />
                    <Text className="text-[10px] font-bold text-[#1b1b1d] dark:text-white ml-1">
                      {formatDuration(item.duration_seconds)}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}
