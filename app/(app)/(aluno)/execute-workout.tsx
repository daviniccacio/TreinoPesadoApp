import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
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
  ArrowCounterClockwise,
} from "phosphor-react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MotiView } from "moti";
import { supabase } from "../../../lib/supabase";
import { useThrottledCallback } from "../../../lib/useThrottle";
import { CustomModal } from "../../../components/CustomModal";

// --- TIPAGENS DE DADOS ---
interface ExerciseItem {
  id: string;
  exercise_id: string;
  name: string;
  sets: string;
  reps: string;
  notes?: string | null;
}

interface WorkoutExecutionData {
  workoutName: string;
  exercises: ExerciseItem[];
}

interface DemoExerciseData {
  name: string;
  gif_url?: string | null;
  description?: string | null;
}

interface ShowAlertModalOptions {
  title: string;
  message: string;
  type?: "success" | "danger" | "info";
  confirmText?: string;
  cancelText?: string;
  showCancelButton?: boolean;
  onConfirm?: () => void;
}

/**
 * Busca os dados da ficha de treino no Supabase (Customizada ou Prescrita)
 */
async function fetchWorkoutExecutionData(
  id?: string,
  type?: string
): Promise<WorkoutExecutionData> {
  if (!id) throw new Error("ID do treino não fornecido");

  if (type === "custom") {
    const { data, error } = await supabase
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
      `
      )
      .eq("id", id)
      .single();

    if (error) throw new Error(error.message);

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

    return {
      workoutName: data.title || "Treino Customizado",
      exercises: formatted,
    };
  } else {
    const { data, error } = await supabase
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
      `
      )
      .eq("id", id)
      .single();

    if (error) throw new Error(error.message);

    const sorted = (data.plan_exercises || []).sort(
      (a: any, b: any) => a.order_index - b.order_index
    );

    return {
      workoutName: data.name || "Ficha Prescrita",
      exercises: sorted,
    };
  }
}

export default function ExecuteWorkoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const queryClient = useQueryClient();

  const { id, type } = useLocalSearchParams<{ id?: string; type?: string }>();

  // --- CRONÔMETRO PRINCIPAL DO TREINO ---
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isTimerPaused, setIsTimerPaused] = useState<boolean>(true);

  // --- CONTROLE DE SÉRIES CONCLUÍDAS ---
  const [completedSets, setCompletedSets] = useState<Set<string>>(new Set());

  // --- CRONÔMETRO DE DESCANSO ---
  const [isResting, setIsResting] = useState<boolean>(false);
  const [restSecondsLeft, setRestSecondsLeft] = useState<number>(60);
  const DEFAULT_REST_TIME = 60;

  // --- MODAL DE DEMONSTRAÇÃO DO GIF ---
  const [demoModalVisible, setDemoModalVisible] = useState<boolean>(false);
  const [loadingDemo, setLoadingDemo] = useState<boolean>(false);
  const [demoExercise, setDemoExercise] = useState<DemoExerciseData | null>(null);

  // --- ESTADO DO MODAL PERSONALIZADO DE ALERTA ---
  const [modalConfig, setModalConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: "success" | "danger" | "info";
    confirmText: string;
    cancelText: string;
    showCancelButton: boolean;
    onConfirm: () => void;
  }>({
    visible: false,
    title: "",
    message: "",
    type: "info",
    confirmText: "Entendi",
    cancelText: "Cancelar",
    showCancelButton: false,
    onConfirm: () => { },
  });

  // Referências dos intervalos
  const workoutTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const restTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function showAlertModal({
    title,
    message,
    type = "info",
    confirmText = "Entendi",
    cancelText = "Cancelar",
    showCancelButton = false,
    onConfirm,
  }: ShowAlertModalOptions) {
    setModalConfig({
      visible: true,
      title,
      message,
      type,
      confirmText,
      cancelText,
      showCancelButton,
      onConfirm: () => {
        setModalConfig((prev) => ({ ...prev, visible: false }));
        if (onConfirm) onConfirm();
      },
    });
  }

  const handleFinishThrottled = useThrottledCallback(handleFinishWorkout, 2000);

  // --- BUSCA COM TANSTACK QUERY ---
  const { data: workoutData, isLoading } = useQuery({
    queryKey: ["workout-execution", type, id],
    queryFn: () => fetchWorkoutExecutionData(id, type),
    enabled: !!id,
  });

  const workoutName = workoutData?.workoutName || "Treino";
  const exercises = workoutData?.exercises || [];

  // --- MUTAÇÃO PARA REGISTRAR TREINO CONCLUÍDO ---
  const finishWorkoutMutation = useMutation({
    mutationFn: async (duration: number) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Usuário não autenticado.");

      const { error } = await supabase.from("workout_logs").insert({
        student_id: user.id,
        workout_title: workoutName,
        duration_seconds: duration,
      });

      if (error) throw new Error(error.message);
      return duration;
    },
    onSuccess: (finalTime) => {
      queryClient.invalidateQueries({ queryKey: ["workout-history"] });
      queryClient.invalidateQueries({ queryKey: ["student-profile-stats"] });
      queryClient.invalidateQueries({ queryKey: ["student-home-data"] });

      resetWorkoutState();

      showAlertModal({
        title: "Treino Concluído! 🎉",
        message: `Parabéns! Você completou o "${workoutName}" em ${formatTime(finalTime)}.`,
        type: "success",
        confirmText: "Voltar",
        showCancelButton: false,
        onConfirm: () => handleNavigateBack(),
      });
    },
    onError: (error: any) => {
      showAlertModal({
        title: "Erro ao Salvar",
        message: error.message || "Não foi possível registrar o treino.",
        type: "danger",
        showCancelButton: false,
      });
    },
  });

  const handleNavigateBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(app)/(aluno)");
    }
  }, [router]);

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
    setIsTimerPaused(true);
    setCompletedSets(new Set());
    setIsResting(false);
    setRestSecondsLeft(DEFAULT_REST_TIME);
  }, []);

  useFocusEffect(
    useCallback(() => {
      resetWorkoutState();
      return () => {
        resetWorkoutState();
      };
    }, [id, type, resetWorkoutState])
  );

  // Cronômetro Geral do Treino
  useEffect(() => {
    if (!isLoading && !isTimerPaused) {
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
      if (workoutTimerRef.current) clearInterval(workoutTimerRef.current);
    };
  }, [isLoading, isTimerPaused]);

  // Timer de Descanso
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
      return null;
    }
  }

  function handleExitWorkout() {
    // Verifica se o usuário realmente começou o treino (tempo rodando ou alguma série marcada)
    const hasStarted = elapsedSeconds > 0 || completedSets.size > 0;

    // Se NÃO iniciou nada, sai direto sem abrir o modal
    if (!hasStarted) {
      resetWorkoutState();
      handleNavigateBack();
      return;
    }

    // Se já começou o tempo ou concluiu séries, confirma a saída para não perder progresso
    showAlertModal({
      title: "Sair do Treino",
      message: "Deseja cancelar o treino em andamento? O tempo e progresso atual não serão salvos.",
      type: "danger",
      confirmText: "Sair sem Salvar",
      cancelText: "Continuar Treinando",
      showCancelButton: true,
      onConfirm: () => {
        resetWorkoutState();
        handleNavigateBack();
      },
    });
  }

  async function handleOpenExerciseDemo(exerciseId: string, fallbackName: string) {
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

      if (!error && data) {
        setDemoExercise({
          name: data.name || fallbackName,
          gif_url: formatGifUrl(data.gif_url),
          description: null,
        });
      }
    } catch (err) {
      console.error("Erro ao buscar GIF:", err);
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

  function handleFinishWorkout() {
    finishWorkoutMutation.mutate(elapsedSeconds);
  }

  const safeTopPadding = Math.max(insets?.top || 0, 16);

  if (isLoading) {
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
      style={{ paddingTop: safeTopPadding + 10 }}
    >
      {/* 1. CABEÇALHO ANIMADO */}
      <MotiView
        from={{ opacity: 0, translateY: -8 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{
          type: "spring",
          damping: 24,
          stiffness: 160,
        }}
        className="flex-row items-center justify-between mb-4 border-b border-[#e2dfe1] dark:border-zinc-800 pb-3"
      >
        <TouchableOpacity
          onPress={handleExitWorkout}
          className="w-10 h-10 rounded-xl bg-[#f8f9fa] dark:bg-zinc-900 justify-center items-center border border-[#e2dfe1] dark:border-zinc-800"
        >
          <X size={20} color={isDark ? "#ffffff" : "#1b1b1d"} />
        </TouchableOpacity>

        <Text
          className="text-base font-black text-[#1b1b1d] dark:text-white flex-1 mx-3 text-center"
          numberOfLines={1}
        >
          {workoutName}
        </Text>

        <TouchableOpacity
          onPress={handleFinishThrottled}
          disabled={finishWorkoutMutation.isPending}
          className="bg-[#59C83A] px-3.5 py-2 rounded-xl flex-row items-center shadow-sm"
        >
          {finishWorkoutMutation.isPending ? (
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
      </MotiView>

      {/* 2. CARD DO CRONÔMETRO PRINCIPAL ANIMADO */}
      <MotiView
        from={{ opacity: 0, scale: 0.96, translateY: 10 }}
        animate={{ opacity: 1, scale: 1, translateY: 0 }}
        transition={{
          type: "spring",
          damping: 22,
          stiffness: 150,
          delay: 30,
        }}
        className="bg-[#f8f9fa] dark:bg-zinc-900 p-4 rounded-2xl mb-4 border border-[#e2dfe1] dark:border-zinc-800 items-center justify-center"
      >
        <Text className="text-[10px] font-bold text-[#59C83A] uppercase tracking-wider mb-1">
          {elapsedSeconds === 0 && isTimerPaused
            ? "Pronto para Iniciar"
            : isTimerPaused
              ? "Treino Pausado"
              : "Treino em Andamento"}
        </Text>

        <View className="flex-row items-center justify-center my-1">
          <Clock
            size={22}
            color={isTimerPaused ? "#EAB308" : "#59C83A"}
            weight="bold"
          />
          <Text className="text-3xl font-black text-[#1b1b1d] dark:text-white ml-2">
            {formatTime(elapsedSeconds)}
          </Text>
        </View>

        {/* CONTROLES DO CRONÔMETRO */}
        <View className="flex-row items-center gap-3 mt-3">
          <TouchableOpacity
            onPress={() => setIsTimerPaused((prev) => !prev)}
            className="flex-row items-center bg-[#59C83A] px-4 py-2 rounded-xl"
          >
            {isTimerPaused ? (
              <>
                <Play size={16} color="#FFFFFF" weight="bold" />
                <Text className="text-white font-bold text-xs ml-1.5">
                  {elapsedSeconds === 0 ? "Iniciar" : "Continuar"}
                </Text>
              </>
            ) : (
              <>
                <Pause size={16} color="#FFFFFF" weight="bold" />
                <Text className="text-white font-bold text-xs ml-1.5">
                  Pausar
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setElapsedSeconds(0);
              setIsTimerPaused(true);
            }}
            className="flex-row items-center bg-zinc-200 dark:bg-zinc-800 px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700"
          >
            <ArrowCounterClockwise
              size={16}
              color={isDark ? "#ffffff" : "#1b1b1d"}
              weight="bold"
            />
            <Text className="text-[#1b1b1d] dark:text-white font-bold text-xs ml-1.5">
              Zerar
            </Text>
          </TouchableOpacity>
        </View>
      </MotiView>

      {/* 3. LISTA DE EXERCÍCIOS ANIMADA */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {exercises.map((exercise, exIndex) => {
          const totalSetsCount = parseInt(exercise.sets) || 3;
          const setsArray = Array.from({ length: totalSetsCount });

          return (
            <MotiView
              key={exercise.id || exIndex}
              from={{ opacity: 0, translateY: 14, scale: 0.97 }}
              animate={{ opacity: 1, translateY: 0, scale: 1 }}
              transition={{
                type: "spring",
                damping: 22,
                stiffness: 150,
                delay: exIndex * 40,
              }}
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
                      className={`p-3 rounded-xl border flex-row items-center justify-between ${isDone
                          ? "bg-[#59C83A]/10 border-[#59C83A]"
                          : "bg-white dark:bg-zinc-950 border-[#e2dfe1] dark:border-zinc-800"
                        }`}
                    >
                      <View className="flex-row items-center">
                        <View
                          className={`w-6 h-6 rounded-lg items-center justify-center mr-3 ${isDone
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
                          className={`text-xs font-bold ${isDone
                              ? "text-[#59C83A] line-through"
                              : "text-[#1b1b1d] dark:text-white"
                            }`}
                        >
                          Série {setIndex + 1}
                        </Text>
                      </View>

                      <Text
                        className={`text-xs font-bold ${isDone
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
            </MotiView>
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
                  <View className="w-full h-64 rounded-2xl bg-white dark:bg-white overflow-hidden mb-4 border border-[#e2dfe1] dark:border-zinc-800 items-center justify-center">
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

      {/* COMPONENTE DO MODAL PERSONALIZADO REUTILIZÁVEL */}
      <CustomModal
        visible={modalConfig.visible}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        confirmText={modalConfig.confirmText}
        cancelText={modalConfig.cancelText}
        showCancelButton={modalConfig.showCancelButton}
        onConfirm={modalConfig.onConfirm}
        onClose={() => setModalConfig((prev) => ({ ...prev, visible: false }))}
      />
    </View>
  );
}