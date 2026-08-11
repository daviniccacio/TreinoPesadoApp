import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useKeepAwake } from 'expo-keep-awake';
import { supabase } from '../../../lib/supabase';
import { getExerciseGif } from '../../../lib/exerciseGifs';

/**
 * Estrutura de dados do Exercício vindo do Supabase.
 */
interface ExerciseDetail {
  id: string;
  name: string;
  sets: number;
  reps: string;
  weight: string;
  category_id: string;
  gif_key?: string;
}

export default function ExerciseDetailScreen() {
  // Mantém a tela ligada durante o treino
  useKeepAwake();

  // Hooks de navegação e layout
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Estados
  const [exercise, setExercise] = useState<ExerciseDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [savingHistory, setSavingHistory] = useState<boolean>(false);

  // Estados do Cronômetro de Descanso
  const [timer, setTimer] = useState<number>(60);
  const [isTimerActive, setIsTimerActive] = useState<boolean>(false);

  // Temporizador de descanso
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    if (isTimerActive && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      setIsTimerActive(false);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerActive, timer]);

  // Carrega os dados do exercício ao abrir a tela
  useEffect(() => {
    if (id) {
      fetchExerciseDetails();
      checkIfFavorite();
    }
  }, [id]);

  /**
   * Busca os detalhes do exercício no Supabase
   */
  async function fetchExerciseDetails() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .eq('id', id)
        .single();

      if (!error && data) {
        setExercise(data);
      } else if (error) {
        console.error('Erro ao buscar dados no Supabase:', error.message);
      }
    } catch (err) {
      console.error('Erro de conexão:', err);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Verifica se o exercício é favorito
   */
  async function checkIfFavorite() {
    try {
      const { data } = await supabase
        .from('favorites')
        .select('id')
        .eq('exercise_id', id)
        .maybeSingle();

      setIsFavorite(!!data);
    } catch (err) {
      console.error('Erro ao verificar favorito:', err);
    }
  }

  /**
   * Alterna o estado de favorito
   */
  async function toggleFavorite() {
    try {
      if (isFavorite) {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('exercise_id', id);

        if (!error) setIsFavorite(false);
      } else {
        const { error } = await supabase
          .from('favorites')
          .insert({ exercise_id: id });

        if (!error) setIsFavorite(true);
      }
    } catch (err) {
      console.error('Erro ao alternar favorito:', err);
    }
  }

  /**
   * Registra a conclusão do exercício no Supabase
   */
  async function handleFinishExercise() {
    if (!exercise) return;

    try {
      setSavingHistory(true);

      const { error } = await supabase.from('workout_history').insert({
        exercise_id: exercise.id,
        weight_used: exercise.weight,
        sets_completed: exercise.sets,
      });

      if (error) {
        Alert.alert('Erro', 'Não foi possível registrar o treino.');
        console.error('Erro ao registrar histórico:', error.message);
      } else {
        Alert.alert('Parabéns! 🎉', 'Treino registrado no seu histórico!');
      }
    } catch (err) {
      console.error('Erro de conexão ao salvar histórico:', err);
    } finally {
      setSavingHistory(false);
    }
  }

  /**
   * Lógica de retorno para a tela da Categoria correspondente
   */
  function handleGoBack() {
    // 1. Prioridade: Se soubermos o ID da categoria do exercício, navegamos direto para ela
    if (exercise?.category_id) {
      router.push(`/category/${exercise.category_id}`);
    } 
    // 2. Se por algum motivo não houver ID da categoria, tenta voltar no histórico
    else if (router.canGoBack()) {
      router.back();
    } 
    // 3. Caso contrário, redireciona para a tela inicial
    else {
      router.replace('/');
    }
  }

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      {/* Cabeçalho */}
      <View className="flex-row items-center justify-between px-5 py-3 border-b border-[#f0edef]">
        <TouchableOpacity
          onPress={handleGoBack}
          className="w-10 h-10 rounded-full bg-[#f0edef] items-center justify-center"
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color="#1b1b1d" />
        </TouchableOpacity>

        <Text className="text-lg font-bold text-[#1b1b1d]">
          Detalhes do Exercício
        </Text>

        <TouchableOpacity
          onPress={toggleFavorite}
          className="w-10 h-10 rounded-full bg-[#f0edef] items-center justify-center"
          activeOpacity={0.7}
        >
          <Ionicons
            name={isFavorite ? 'heart' : 'heart-outline'}
            size={22}
            color={isFavorite ? '#e11d48' : '#1b1b1d'}
          />
        </TouchableOpacity>
      </View>

      {/* Conteúdo */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#0058bc" />
        </View>
      ) : exercise ? (
        <ScrollView
          className="flex-1 px-5 pt-4"
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Título e Grupo */}
          <View className="mb-4">
            <Text className="text-2xl font-extrabold text-[#1b1b1d] mb-2">
              {exercise.name}
            </Text>

            <View className="self-start bg-[#eef2ff] px-3 py-1 rounded-full border border-[#dbeaff]">
              <Text className="text-xs text-[#0058bc] font-bold uppercase tracking-wider">
                Grupo: {exercise.category_id}
              </Text>
            </View>
          </View>

          {/* GIF de Execução */}
          <View className="w-full h-72 bg-white rounded-3xl overflow-hidden mb-6 items-center justify-center p-2 border border-[#e2dfe1] shadow-sm">
            <Image
              source={getExerciseGif(exercise.gif_key)}
              className="w-full h-full rounded-2xl"
              resizeMode="contain"
            />
          </View>

          {/* Métricas */}
          <View className="flex-row justify-between mb-6">
            <View className="w-[31%] bg-[#f8f9fa] p-4 rounded-2xl items-center border border-[#e2dfe1]">
              <Ionicons name="layers-outline" size={22} color="#0058bc" />
              <Text className="text-xs text-[#414755] mt-1 font-medium">Séries</Text>
              <Text className="text-lg font-extrabold text-[#1b1b1d] mt-1">
                {exercise.sets}
              </Text>
            </View>

            <View className="w-[31%] bg-[#f8f9fa] p-4 rounded-2xl items-center border border-[#e2dfe1]">
              <Ionicons name="repeat-outline" size={22} color="#0058bc" />
              <Text className="text-xs text-[#414755] mt-1 font-medium">Reps</Text>
              <Text className="text-lg font-extrabold text-[#1b1b1d] mt-1">
                {exercise.reps}
              </Text>
            </View>

            <View className="w-[31%] bg-[#f8f9fa] p-4 rounded-2xl items-center border border-[#e2dfe1]">
              <Ionicons name="fitness-outline" size={22} color="#0058bc" />
              <Text className="text-xs text-[#414755] mt-1 font-medium">Carga</Text>
              <Text className="text-lg font-extrabold text-[#1b1b1d] mt-1">
                {exercise.weight}
              </Text>
            </View>
          </View>

          {/* Cronômetro */}
          <View className="bg-[#f8f9fa] p-5 rounded-2xl mb-6 items-center border border-[#e2dfe1]">
            <Text className="text-sm font-bold text-[#414755] mb-1">
              Descanso entre Séries
            </Text>

            <Text className="text-4xl font-extrabold text-[#0058bc] my-2">
              {timer}s
            </Text>

            <View className="flex-row gap-3 mt-2">
              {!isTimerActive ? (
                <TouchableOpacity
                  onPress={() => {
                    setTimer(60);
                    setIsTimerActive(true);
                  }}
                  className="bg-[#0058bc] px-6 py-3 rounded-xl flex-row items-center shadow-sm"
                  activeOpacity={0.8}
                >
                  <Ionicons name="timer-outline" size={18} color="#ffffff" />
                  <Text className="text-white font-bold ml-2">Iniciar Descanso</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() => {
                    setIsTimerActive(false);
                    setTimer(60);
                  }}
                  className="bg-[#1b1b1d] px-6 py-3 rounded-xl flex-row items-center"
                  activeOpacity={0.8}
                >
                  <Ionicons name="refresh-outline" size={18} color="#ffffff" />
                  <Text className="text-white font-bold ml-2">Reiniciar</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Botão Concluir */}
          <TouchableOpacity
            onPress={handleFinishExercise}
            disabled={savingHistory}
            className="bg-[#10b981] p-4 rounded-2xl items-center flex-row justify-center shadow-sm"
            activeOpacity={0.8}
          >
            {savingHistory ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={22} color="#ffffff" />
                <Text className="text-white font-bold text-base ml-2">
                  Concluir e Registrar Treino
                </Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      ) : null}
    </View>
  );
}