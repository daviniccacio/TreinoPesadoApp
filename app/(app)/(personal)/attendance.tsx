import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CalendarCheck, CheckCircle, WarningCircle } from 'phosphor-react-native';
import { supabase } from '../../../lib/supabase';

/**
 * Interface que define a estrutura de um registro de frequência
 */
interface AttendanceLog {
  id: string;
  created_at: string;
  student_id: string;
  workout_title?: string;
  profiles: {
    full_name: string;
  } | null;
}

export default function PersonalAttendanceScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Recarrega os registros de frequência sempre que a tela ganha foco
  useFocusEffect(
    useCallback(() => {
      fetchAttendanceLogs();
    }, [])
  );

  /**
   * Função para buscar o histórico de treinos concluídos no Supabase
   */
  async function fetchAttendanceLogs() {
    try {
      setLoading(true);
      setErrorMessage(null);

      // Consulta no banco trazendo os treinos e o nome do aluno via relacionamento (profiles)
      const { data, error } = await supabase
        .from('workout_logs')
        .select(`
          id,
          created_at,
          student_id,
          workout_title,
          profiles (
            full_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar relatório de frequência:', error.message);
        setErrorMessage(error.message);
      } else if (data) {
        setLogs(data as unknown as AttendanceLog[]);
      }
    } catch (err: any) {
      console.error('Erro inesperado na frequência:', err);
      setErrorMessage('Não foi possível carregar os registros de frequência.');
    } finally {
      setLoading(false);
    }
  }

  /**
   * Converte a string de data (ISO) para o formato brasileiro (DD/MM/AAAA às HH:MM)
   */
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

  return (
    <View
      className="flex-1 bg-white dark:bg-zinc-950 px-5"
      style={{ paddingTop: insets.top + 10 }}
    >
      {/* Cabeçalho da Tela */}
      <View className="mb-6">
        <Text className="text-2xl font-extrabold text-[#1b1b1d] dark:text-white">
          Frequência de Treinos
        </Text>
        <Text className="text-sm text-[#71717a] dark:text-zinc-400 mt-1">
          Histórico de treinos concluídos pelos alunos
        </Text>
      </View>

      {/* Caixa de Mensagem de Erro (caso ocorra) */}
      {errorMessage && (
        <View className="bg-red-500/10 border border-red-500/30 p-4 rounded-2xl mb-4 flex-row items-center">
          <WarningCircle size={20} color="#EF4444" />
          <Text className="text-red-500 text-xs font-bold ml-2 flex-1">
            {errorMessage}
          </Text>
        </View>
      )}

      {/* Lista de Registros */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#59C83A" />
        </View>
      ) : logs.length === 0 ? (
        <View className="flex-1 justify-center items-center px-6">
          <CalendarCheck size={48} color="#808591" />
          <Text className="text-[#1b1b1d] dark:text-white font-bold text-base mt-4 text-center">
            Nenhum registro encontrado
          </Text>
          <Text className="text-xs text-[#71717a] dark:text-zinc-400 text-center mt-1">
            Assim que os alunos finalizarem os treinos no aplicativo, o histórico aparecerá aqui.
          </Text>
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View className="bg-[#f8f9fa] dark:bg-zinc-900 p-4 rounded-2xl mb-3 border border-[#e2dfe1] dark:border-zinc-800 flex-row items-center justify-between">
              <View className="flex-row items-center flex-1">
                {/* Ícone de Concluído */}
                <View className="w-11 h-11 rounded-2xl bg-[#59C83A]/10 items-center justify-center border border-[#59C83A]/30 mr-3">
                  <CheckCircle size={22} color="#59C83A" weight="bold" />
                </View>

                {/* Dados do Treino e Aluno */}
                <View className="flex-1">
                  <Text className="text-base font-bold text-[#1b1b1d] dark:text-white">
                    {item.profiles?.full_name || 'Aluno Não Identificado'}
                  </Text>
                  <Text className="text-xs text-[#59C83A] font-semibold mt-0.5">
                    {item.workout_title || 'Treino Finalizado'}
                  </Text>
                  <Text className="text-[10px] text-[#71717a] dark:text-zinc-400 mt-1">
                    {formatDate(item.created_at)}
                  </Text>
                </View>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}