import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  useColorScheme,
} from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Check,
  CheckCircle,
  Timer,
  Clock,
  PlayCircle,
  X,
  Barbell,
  Pause,
  Play,
} from "phosphor-react-native";
import { supabase } from "../../../lib/supabase";

interface ExerciseItem {
  id: string;
  exercise_id: string;
  name: string;
  sets: string;
  reps: string;
  notes?: string | null;
}

interface DemoExerciseData {
  name: string;
  gif_url?: string | null;
  description?: string | null;
}

export default function ExecuteWorkoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const { id, type } = useLocalSearchParams<{ id?: string; type?: string }>();

  // --- ESTADOS DE DADOS DO TREINO ---
  const [workoutName, setWorkoutName] = useState<string>("Treino");
  const [exercises, setExercises] = useState<ExerciseItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  // --- CRONÔMETRO PRINCIPAL DO TREINO ---
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isTimerPaused, setIsTimerPaused] = useState<boolean>(false);

  // --- CONTROLE DE SÉRIES CONCLUÍDAS ---
  const [completedSets, setCompletedSets] = useState<Set<string>>(new Set());

  // --- CRONÔMETRO DE DESCANSO ---
  const [isResting, setIsResting] = useState<boolean>(false);
  const [restSecondsLeft, setRestSecondsLeft] = useState<number>(60);
  const DEFAULT_REST_TIME = 60;

  // --- MODAL DE DEMONSTRAÇÃO DO GIF DO EXERCÍCIO ---
  const [demoModalVisible, setDemoModalVisible] = useState<boolean>(false);
  const [loadingDemo, setLoadingDemo] = useState<boolean>(false);
  const [demoExercise, setDemoExercise] = useState<DemoExerciseData | null>(
    null,
  );

  // Referências dos intervalos
  const workoutTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const restTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /**
   * Navegação segura para a tela anterior
   */
  const handleNavigateBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(app)/(aluno)");
    }
  }, [router]);

  /**
   * Zera completamente o temporizador e limpa todos os cronômetros e estados do treino
   */
  const resetWorkoutState = useCallback(() => {
    if (workoutTimerRef.current) {
      clearInterval(workoutTimerRef.current);
      workoutTimerRef.current = null;
    }
    if (restTimerRef.current) {
      clearInterval(restTimerRef.current);
      restTimerRef.current = null;
    }
    setElapsedSeconds(0);
    setIsTimerPaused(false);
    setCompletedSets(new Set());
    setIsResting(false);
    setRestSecondsLeft(DEFAULT_REST_TIME);
  }, []);

  // Recarrega os dados e ZERA o temporizador sempre que a tela entra em foco
  useFocusEffect(
    useCallback(() => {
      resetWorkoutState();
      fetchWorkoutData();

      return () => {
        resetWorkoutState();
      };
    }, [id, type, resetWorkoutState]),
  );

  // Cronômetro Geral do Treino
  useEffect(() => {
    if (!loading && !isTimerPaused) {
      workoutTimerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (workoutTimerRef.current) {
        clearInterval(workoutTimerRef.current);
        workoutTimerRef.current = null;
      }
    }

    return () => {
      if (workoutTimerRef.current) {
        clearInterval(workoutTimerRef.current);
      }
    };
  }, [loading, isTimerPaused]);

  // Timer de Descanso entre séries
  useEffect(() => {
    if (isResting && restSecondsLeft > 0) {
      restTimerRef.current = setInterval(() => {
        setRestSecondsLeft((prev) => prev - 1);
      }, 1000);
    } else if (restSecondsLeft === 0) {
      setIsResting(false);
      if (restTimerRef.current) clearInterval(restTimerRef.current);
    }

    return () => {
      if (restTimerRef.current) clearInterval(restTimerRef.current);
    };
  }, [isResting, restSecondsLeft]);

  /**
   * Converte o valor de gif_url numa URL https:// válida
   */
  function formatGifUrl(rawUrl: string | null | undefined): string | null {
    if (!rawUrl || typeof rawUrl !== "string") return null;

    const trimmed = rawUrl.trim();
    if (!trimmed) return null;

    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      return trimmed;
    }

    try {
      const fileName = trimmed.endsWith(".gif") ? trimmed : `${trimmed}.gif`;
      const { data } = supabase.storage
        .from("exercises")
        .getPublicUrl(fileName);
      return data?.publicUrl || null;
    } catch (e) {
      console.error("Erro ao formatar URL do Storage:", e);
      return null;
    }
  }

  /**
   * Carrega os exercícios do treino no Supabase
   */
  async function fetchWorkoutData() {
    if (!id) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);

      if (type === "custom") {
        const { data } = await supabase
          .from("custom_workouts")
          .select(
            `
            title,
            custom_workout_exercises (
              id,
              exercise_id,
              sets,
              reps,
              weight,
              exercises ( name )
            )
          `,
          )
          .eq("id", id)
          .single();

        if (data) {
          setWorkoutName(data.title);
          const formatted: ExerciseItem[] = (
            data.custom_workout_exercises || []
          ).map((item: any) => ({
            id: item.id,
            exercise_id: item.exercise_id,
            name: item.exercises?.name || "Exercício",
            sets: String(item.sets || 3),
            reps: String(item.reps || 10),
            notes: item.weight ? `Carga: ${item.weight}` : null,
          }));
          setExercises(formatted);
        }
      } else {
        const { data } = await supabase
          .from("workout_plans")
          .select(
            `
            name,
            plan_exercises (
              id,
              exercise_id,
              name,
              sets,
              reps,
              notes,
              order_index
            )
          `,
          )
          .eq("id", id)
          .single();

        if (data) {
          setWorkoutName(data.name);
          const sorted = (data.plan_exercises || []).sort(
            (a: any, b: any) => a.order_index - b.order_index,
          );
          setExercises(sorted);
        }
      }
    } catch (err) {
      console.error("Erro ao carregar treino:", err);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Confirmação de saída do treino com retorno à tela anterior
   */
  function handleExitWorkout() {
    Alert.alert(
      "Sair do Treino",
      "Deseja cancelar o treino em andamento? O tempo e progresso atual não serão salvos.",
      [
        {
          text: "Continuar Treinando",
          style: "cancel",
        },
        {
          text: "Sair sem Salvar",
          style: "destructive",
          onPress: () => {
            resetWorkoutState();
            handleNavigateBack();
          },
        },
      ],
    );
  }

  /**
   * Busca os detalhes do exercício e formata o GIF
   */
  async function handleOpenExerciseDemo(
    exerciseId: string,
    fallbackName: string,
  ) {
    try {
      setDemoModalVisible(true);
      setLoadingDemo(true);
      setDemoExercise({ name: fallbackName });

      if (!exerciseId) {
        setLoadingDemo(false);
        return;
      }

      const { data, error } = await supabase
        .from("exercises")
        .select("name, gif_url")
        .eq("id", exerciseId)
        .single();

      if (error) {
        console.error("Erro no Supabase:", error.message);
      } else if (data) {
        const validGifUrl = formatGifUrl(data.gif_url);
        setDemoExercise({
          name: data.name || fallbackName,
          gif_url: validGifUrl,
          description: null,
        });
      }
    } catch (err) {
      console.error("Erro ao buscar GIF do exercício:", err);
    } finally {
      setLoadingDemo(false);
    }
  }

  function toggleSetCompletion(exerciseIndex: number, setIndex: number) {
    const key = `${exerciseIndex}-${setIndex}`;
    const nextCompleted = new Set(completedSets);

    if (nextCompleted.has(key)) {
      nextCompleted.delete(key);
    } else {
      nextCompleted.add(key);
      startRestTimer(DEFAULT_REST_TIME);
    }

    setCompletedSets(nextCompleted);
  }

  function startRestTimer(seconds: number) {
    setRestSecondsLeft(seconds);
    setIsResting(true);
  }

  function addRestTime(secondsToAdd: number) {
    setRestSecondsLeft((prev) => prev + secondsToAdd);
  }

  function skipRest() {
    setIsResting(false);
    setRestSecondsLeft(0);
  }

  function formatTime(seconds: number) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    const pad = (num: number) => String(num).padStart(2, "0");

    if (hrs > 0) {
      return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  }

  async function handleFinishWorkout() {
    try {
      setSaving(true);

      if (workoutTimerRef.current) clearInterval(workoutTimerRef.current);
      if (restTimerRef.current) clearInterval(restTimerRef.current);
      setIsResting(false);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert("Erro", "Usuário não autenticado.");
        setSaving(false);
        return;
      }

      const { error } = await supabase.from("workout_logs").insert({
        student_id: user.id,
        workout_title: workoutName,
        duration_seconds: elapsedSeconds,
      });

      if (error) {
        console.error("Erro ao salvar log de treino:", error.message);
        Alert.alert(
          "Erro ao Salvar",
          "Não foi possível registrar o treino concluído.",
        );
      } else {
        const finalTime = elapsedSeconds;
        resetWorkoutState();

        Alert.alert(
          "Treino Concluído! 🎉",
          `Parabéns! Você completou o "${workoutName}" em ${formatTime(finalTime)}.`,
          [
            {
              text: "Voltar",
              onPress: () => handleNavigateBack(),
            },
          ],
        );
      }
    } catch (err) {
      console.error("Erro ao finalizar treino:", err);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View className="flex-1 bg-white dark:bg-zinc-950 justify-center items-center">
        <ActivityIndicator size="large" color="#59C83A" />
        <Text className="text-xs text-[#71717a] dark:text-zinc-400 mt-2 font-medium">
          Iniciando sessão de treino...
        </Text>
      </View>
    );
  }

  return (
    <View
      className="flex-1 bg-white dark:bg-zinc-950 px-5"
      style={{ paddingTop: insets.top + 10 }}
    >
      {/* CABEÇALHO */}
      <View className="flex-row items-center justify-between mb-4 border-b border-[#e2dfe1] dark:border-zinc-800 pb-3">
        <TouchableOpacity
          onPress={handleExitWorkout}
          className="w-10 h-10 rounded-xl bg-[#f8f9fa] dark:bg-zinc-900 justify-center items-center border border-[#e2dfe1] dark:border-zinc-800"
        >
          <X size={20} color={isDark ? "#ffffff" : "#1b1b1d"} />
        </TouchableOpacity>

        <View className="flex-row items-center gap-2">
          <View className="items-center">
            <Text className="text-[10px] font-bold text-[#59C83A] uppercase tracking-wider">
              {isTimerPaused ? "Treino Pausado" : "Treino em Andamento"}
            </Text>
            <View className="flex-row items-center mt-0.5">
              <Clock
                size={16}
                color={isTimerPaused ? "#EAB308" : "#59C83A"}
                weight="bold"
              />
              <Text className="text-lg font-black text-[#1b1b1d] dark:text-white ml-1.5">
                {formatTime(elapsedSeconds)}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => setIsTimerPaused((prev) => !prev)}
            className="w-9 h-9 rounded-xl bg-[#f8f9fa] dark:bg-zinc-900 items-center justify-center border border-[#e2dfe1] dark:border-zinc-800 ml-1"
          >
            {isTimerPaused ? (
              <Play size={18} color="#59C83A" weight="bold" />
            ) : (
              <Pause size={18} color="#EAB308" weight="bold" />
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={handleFinishWorkout}
          disabled={saving}
          className="bg-[#59C83A] px-3.5 py-2 rounded-xl flex-row items-center shadow-sm"
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <CheckCircle size={18} color="#FFFFFF" weight="bold" />
              <Text className="text-white font-extrabold ml-1 text-xs">
                Finalizar
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <Text
        className="text-xl font-extrabold text-[#1b1b1d] dark:text-white mb-4"
        numberOfLines={1}
      >
        {workoutName}
      </Text>

      {/* LISTA DE EXERCÍCIOS */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {exercises.map((exercise, exIndex) => {
          const totalSetsCount = parseInt(exercise.sets) || 3;
          const setsArray = Array.from({ length: totalSetsCount });

          return (
            <View
              key={exercise.id || exIndex}
              className="bg-[#f8f9fa] dark:bg-zinc-900 p-4 rounded-2xl mb-4 border border-[#e2dfe1] dark:border-zinc-800"
            >
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-base font-extrabold text-[#1b1b1d] dark:text-white flex-1 mr-2">
                  {exIndex + 1}. {exercise.name}
                </Text>

                <TouchableOpacity
                  onPress={() =>
                    handleOpenExerciseDemo(exercise.exercise_id, exercise.name)
                  }
                  className="bg-[#59C83A]/10 px-2.5 py-1 rounded-lg flex-row items-center border border-[#59C83A]/30"
                >
                  <PlayCircle size={14} color="#59C83A" weight="bold" />
                  <Text className="text-[11px] font-bold text-[#59C83A] ml-1">
                    Ver GIF
                  </Text>
                </TouchableOpacity>
              </View>

              {exercise.notes ? (
                <Text className="text-xs text-[#71717a] dark:text-zinc-400 mb-3 font-medium">
                  💬 {exercise.notes}
                </Text>
              ) : null}

              {/* CHECKLIST DE SÉRIES */}
              <View className="gap-2 mt-1">
                {setsArray.map((_, setIndex) => {
                  const setKey = `${exIndex}-${setIndex}`;
                  const isDone = completedSets.has(setKey);

                  return (
                    <TouchableOpacity
                      key={setIndex}
                      activeOpacity={0.8}
                      onPress={() => toggleSetCompletion(exIndex, setIndex)}
                      className={`p-3 rounded-xl border flex-row items-center justify-between ${
                        isDone
                          ? "bg-[#59C83A]/10 border-[#59C83A]"
                          : "bg-white dark:bg-zinc-950 border-[#e2dfe1] dark:border-zinc-800"
                      }`}
                    >
                      <View className="flex-row items-center">
                        <View
                          className={`w-6 h-6 rounded-lg items-center justify-center mr-3 ${
                            isDone
                              ? "bg-[#59C83A]"
                              : "bg-zinc-200 dark:bg-zinc-800"
                          }`}
                        >
                          {isDone ? (
                            <Check size={14} color="#FFFFFF" weight="bold" />
                          ) : (
                            <Text className="text-xs font-bold text-[#71717a] dark:text-zinc-400">
                              {setIndex + 1}
                            </Text>
                          )}
                        </View>
                        <Text
                          className={`text-xs font-bold ${
                            isDone
                              ? "text-[#59C83A] line-through"
                              : "text-[#1b1b1d] dark:text-white"
                          }`}
                        >
                          Série {setIndex + 1}
                        </Text>
                      </View>

                      <Text
                        className={`text-xs font-bold ${
                          isDone
                            ? "text-[#59C83A]"
                            : "text-[#71717a] dark:text-zinc-400"
                        }`}
                      >
                        {exercise.reps} reps
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* MODAL DE DEMONSTRAÇÃO DO EXERCÍCIO (GIF) */}
      <Modal visible={demoModalVisible} transparent animationType="slide">
        <View className="flex-1 bg-black/70 justify-end">
          <View className="bg-white dark:bg-zinc-900 rounded-t-3xl p-5 h-[75%] border-t border-[#e2dfe1] dark:border-zinc-800">
            <View className="flex-row items-center justify-between mb-3 border-b border-[#e2dfe1] dark:border-zinc-800 pb-3">
              <Text
                className="text-base font-extrabold text-[#1b1b1d] dark:text-white flex-1 mr-2"
                numberOfLines={1}
              >
                {demoExercise?.name}
              </Text>
              <TouchableOpacity
                onPress={() => setDemoModalVisible(false)}
                className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 items-center justify-center"
              >
                <X size={18} color={isDark ? "#ffffff" : "#1b1b1d"} />
              </TouchableOpacity>
            </View>

            {loadingDemo ? (
              <View className="flex-1 justify-center items-center">
                <ActivityIndicator size="large" color="#59C83A" />
                <Text className="text-xs text-[#71717a] dark:text-zinc-400 mt-2 font-medium">
                  Buscando exercício...
                </Text>
              </View>
            ) : (
              <ScrollView
                showsVerticalScrollIndicator={false}
                className="flex-1"
              >
                {demoExercise?.gif_url ? (
                  <View className="w-full h-64 rounded-2xl bg-zinc-100 dark:bg-zinc-950 overflow-hidden mb-4 border border-[#e2dfe1] dark:border-zinc-800 items-center justify-center">
                    <Image
                      source={{ uri: demoExercise.gif_url }}
                      style={{ width: "100%", height: "100%" }}
                      contentFit="contain"
                      autoplay={true}
                      transition={200}
                    />
                  </View>
                ) : (
                  <View className="w-full h-44 rounded-2xl bg-white dark:bg-white items-center justify-center mb-4 border border-dashed border-zinc-300 dark:border-zinc-700">
                    <Barbell size={36} color={isDark ? "#71717a" : "#a1a1aa"} />
                    <Text className="text-xs font-bold text-[#71717a] dark:text-zinc-400 mt-2">
                      GIF demonstrativo não cadastrado no banco
                    </Text>
                  </View>
                )}

                <Text className="text-xs font-bold text-[#1b1b1d] dark:text-white mb-1">
                  Postura e Execução:
                </Text>
                <Text className="text-xs text-[#71717a] dark:text-zinc-400 font-medium leading-5 mb-4">
                  {demoExercise?.description ||
                    "Execute o movimento de forma controlada, mantendo a postura firme e respeitando a cadência recomendada pelo seu personal trainer."}
                </Text>
              </ScrollView>
            )}

            <TouchableOpacity
              onPress={() => setDemoModalVisible(false)}
              className="bg-[#59C83A] py-3 rounded-xl items-center mt-2"
            >
              <Text className="text-xs font-bold text-white">
                Voltar para o Treino
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL DE DESCANSO AUTOMÁTICO */}
      <Modal visible={isResting} transparent animationType="slide">
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-white dark:bg-zinc-900 rounded-t-3xl p-6 border-t border-[#e2dfe1] dark:border-zinc-800 items-center">
            <View className="w-12 h-12 rounded-full bg-[#59C83A]/10 items-center justify-center border border-[#59C83A]/30 mb-3">
              <Timer size={28} color="#59C83A" weight="bold" />
            </View>

            <Text className="text-sm font-bold text-[#71717a] dark:text-zinc-400">
              Tempo de Descanso
            </Text>
            <Text className="text-5xl font-black text-[#1b1b1d] dark:text-white my-2">
              {formatTime(restSecondsLeft)}
            </Text>

            <View className="flex-row items-center gap-3 mt-4 w-full">
              <TouchableOpacity
                onPress={() => addRestTime(30)}
                className="flex-1 bg-zinc-100 dark:bg-zinc-800 py-3 rounded-xl items-center border border-zinc-200 dark:border-zinc-700"
              >
                <Text className="text-xs font-bold text-[#1b1b1d] dark:text-white">
                  +30 Segundos
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={skipRest}
                className="flex-1 bg-[#59C83A] py-3 rounded-xl items-center"
              >
                <Text className="text-xs font-bold text-white">
                  Pular Descanso
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}