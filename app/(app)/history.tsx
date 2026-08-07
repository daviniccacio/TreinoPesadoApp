import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

interface HistoryItem {
  id: string;
  weight_used: string;
  sets_completed: number;
  completed_at: string;
  exercises: {
    name: string;
    category_id: string;
  };
}

export default function HistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useFocusEffect(
    useCallback(() => {
      fetchHistory();
    }, [])
  );

  async function fetchHistory() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('workout_history')
        .select(`
          id,
          weight_used,
          sets_completed,
          completed_at,
          exercises (
            name,
            category_id
          )
        `)
        .order('completed_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar histórico:', error.message);
      } else if (data) {
        setHistory(data as unknown as HistoryItem[]);
      }
    } catch (err) {
      console.error('Erro de conexão:', err);
    } finally {
      setLoading(false);
    }
  }

  // Função auxiliar para formatar a data recebida no formato ISO
  function formatDate(isoDateString: string) {
    const date = new Date(isoDateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      {/* Cabeçalho */}
      <View className="flex-row items-center justify-between px-5 py-4 border-b border-[#f0edef]">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-[#f0edef] items-center justify-center"
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color="#1b1b1d" />
        </TouchableOpacity>

        <Text className="text-xl font-extrabold text-[#1b1b1d]">
          Histórico de Treinos
        </Text>

        <View className="w-10" />
      </View>

      {/* Lista de Registros */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#0058bc" />
          <Text className="mt-3 text-[#414755] font-medium">
            Carregando histórico...
          </Text>
        </View>
      ) : (
        <ScrollView className="flex-1 px-5 pt-4" showsVerticalScrollIndicator={false}>
          {history.length === 0 ? (
            <View className="py-16 items-center">
              <Ionicons name="time-outline" size={48} color="#a0a5b1" />
              <Text className="text-[#414755] font-semibold text-center mt-3 text-base">
                Nenhum treino concluído ainda.
              </Text>
              <Text className="text-[#808591] text-xs text-center mt-1">
                Conclua exercícios para acompanhar seu progresso aqui.
              </Text>
            </View>
          ) : (
            history.map((item) => (
              <View
                key={item.id}
                className="bg-[#f0edef] p-4 rounded-2xl mb-3 flex-row items-center justify-between"
              >
                <View className="flex-1 mr-3">
                  <View className="flex-row items-center justify-between mb-1">
                    <Text className="text-xs font-bold text-[#0058bc] uppercase">
                      {item.exercises?.category_id}
                    </Text>
                    <Text className="text-xs text-[#808591]">
                      {formatDate(item.completed_at)}
                    </Text>
                  </View>

                  <Text className="text-base font-bold text-[#1b1b1d] mb-1">
                    {item.exercises?.name}
                  </Text>

                  <View className="flex-row items-center gap-3">
                    <Text className="text-xs text-[#414755]">
                      <Text className="font-bold text-[#0058bc]">{item.sets_completed}</Text> séries
                    </Text>
                    <Text className="text-xs text-[#414755]">
                      Carga: <Text className="font-bold text-[#0058bc]">{item.weight_used}</Text>
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}

          <View className="h-10" />
        </ScrollView>
      )}
    </View>
  );
}