// ============================================================================
// DOCUMENTAÇÃO: FLOATING TIMER CIRCULAR (TIPAGEM UNIVERSAL CORRIGIDA)
// ============================================================================
// Componente flutuante fixado no canto inferior direito. Exibe tempo compacto,
// permite expansão com nome do exercício e executa animação de deslize
// para a direita ao finalizar o tempo.
// ============================================================================

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, useColorScheme } from 'react-native';
import { useSegments } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Timer as TimerIcon,
  Play,
  Pause,
  ArrowCounterClockwise,
  Plus,
  X,
  Check,
} from 'phosphor-react-native';
import { MotiView, AnimatePresence } from 'moti';
import { useTimer } from '../context/TimerContext';

/**
 * Converte os segundos em formato legível e compacto (ex: 30s, 1m, 1m30s)
 */
function formatShortTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) return `${seconds}s`;
  if (seconds === 0) return `${minutes}m`;
  return `${minutes}m${seconds}s`;
}

export function FloatingTimer() {
  const {
    timeLeft,
    targetTime,
    isRunning,
    exerciseName,
    pauseTimer,
    resumeTimer,
    resetTimer,
    addSeconds,
  } = useTimer();

  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const segments = useSegments();

  // Identifica se o usuário está na tela de detalhes ([id].tsx)
  const isExerciseDetailScreen = segments.includes('exercise');

  // 🟢 1. LIMPEZA DE ESTADO QUANDO UM NOVO TIMER FOR INICIADO
  useEffect(() => {
    if (timeLeft > 0) {
      setIsCompleted(false);
    }
  }, [timeLeft]);

  // 🟢 2. ETAPA A: DETECTA O FIM DO TEMPO (00:00) E ATIVA A CELEBRAÇÃO
  useEffect(() => {
    if (targetTime > 0 && timeLeft === 0 && !isRunning && !isCompleted) {
      setIsCompleted(true);
    }
  }, [timeLeft, targetTime, isRunning, isCompleted]);

  // 🟢 3. ETAPA B: TEMPORIZADOR ISOLADO (TIPAGEM CORRIGIDA COM ReturnType<typeof setTimeout>)
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | null = null;

    if (isCompleted) {
      timeout = setTimeout(() => {
        setIsCompleted(false);
        setIsExpanded(false);
        resetTimer(); // Zerar targetTime faz shouldShow virar false e dispara a animação de saída!
      }, 1500);
    }

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [isCompleted]);

  // Regra booleana que define se o componente deve estar visível no DOM
  const shouldShow = targetTime > 0 && !isExerciseDetailScreen;

  // Posição no canto inferior direito, respeitando a barra de navegação
  const bottomOffset = Math.max(insets.bottom, 12) + 76;

  return (
    <AnimatePresence>
      {shouldShow && (
        <MotiView
          key="floating-timer-container"
          from={{ translateX: 200, opacity: 0 }}
          animate={{ translateX: 0, opacity: 1 }}
          exit={{ translateX: 350, opacity: 0 }} // 🟢 DESLIZE SUAVE PARA A DIREITA AO SAIR
          transition={{ type: 'spring', damping: 22, stiffness: 160 }}
          style={{ bottom: bottomOffset }}
          className="absolute right-5 z-50 items-end justify-center"
        >
          <AnimatePresence exitBeforeEnter>
            {/* MODO 1: CELEBRAÇÃO DE CONCLUSÃO (VERDE COM CHECK MAIOR) */}
            {isCompleted ? (
              <MotiView
                key="completed-state"
                from={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.7, opacity: 0 }}
                transition={{ type: 'spring', damping: 16, stiffness: 200 }}
                className="w-20 h-20 rounded-full bg-[#59C83A] items-center justify-center shadow-2xl border-2 border-emerald-400"
              >
                <MotiView
                  from={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 12, stiffness: 200 }}
                >
                  <Check size={36} color="#FFFFFF" weight="bold" />
                </MotiView>
              </MotiView>
            ) : !isExpanded ? (
              /* MODO 2: BOLINHA FECHADA AUMENTADA (80x80px) */
              <MotiView
                key="collapsed-circle"
                from={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ type: 'spring', damping: 20, stiffness: 180 }}
              >
                <TouchableOpacity
                  onPress={() => setIsExpanded(true)}
                  activeOpacity={0.85}
                  className="w-20 h-20 rounded-full bg-white dark:bg-zinc-900 items-center justify-center border-2 border-[#e2dfe1] dark:border-zinc-800 shadow-2xl"
                >
                  <TimerIcon size={18} color="#59C83A" weight="bold" />
                  <Text className="text-[#1b1b1d] dark:text-white font-outfit-extrabold text-sm mt-0.5">
                    {formatShortTime(timeLeft)}
                  </Text>
                </TouchableOpacity>
              </MotiView>
            ) : (
              /* MODO 3: PAINEL EXPANDIDO AUMENTADO (340px DE LARGURA) */
              <MotiView
                key="expanded-controls"
                from={{ width: 80, opacity: 0 }}
                animate={{ width: 340, opacity: 1 }}
                exit={{ width: 80, opacity: 0 }}
                transition={{ type: 'spring', damping: 22, stiffness: 170 }}
                className="bg-white dark:bg-zinc-900 px-4 py-3.5 rounded-3xl flex-row items-center justify-between border-2 border-[#e2dfe1] dark:border-zinc-800 shadow-2xl"
              >
                {/* BOTÃO FECHAR, NOME DO EXERCÍCIO E TEMPO */}
                <TouchableOpacity
                  onPress={() => setIsExpanded(false)}
                  activeOpacity={0.7}
                  className="flex-row items-center flex-1 mr-3"
                >
                  <View className="w-8 h-8 rounded-full bg-[#f8f9fa] dark:bg-zinc-800 items-center justify-center mr-2.5 border border-[#e2dfe1] dark:border-zinc-700">
                    <X size={14} color={isDark ? '#a1a1aa' : '#71717a'} weight="bold" />
                  </View>

                  <View className="flex-1">
                    <Text className="text-[#1b1b1d] dark:text-white font-outfit-extrabold text-sm" numberOfLines={1}>
                      {exerciseName ? exerciseName : 'Descanso'}
                    </Text>
                    <Text className="text-[#59C83A] font-sans-bold text-sm">
                      {formatShortTime(timeLeft)}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* BOTÕES DE CONTROLE MAIORES: +30S, ZERAR E PAUSAR/PLAY */}
                <View className="flex-row items-center gap-2">
                  <TouchableOpacity
                    onPress={() => addSeconds(30)}
                    activeOpacity={0.7}
                    className="bg-[#59C83A]/15 border border-[#59C83A]/40 px-2.5 py-1.5 rounded-2xl flex-row items-center"
                  >
                    <Plus size={14} color="#59C83A" weight="bold" />
                    <Text className="text-xs font-sans-bold text-[#59C83A] ml-0.5">
                      30s
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={resetTimer}
                    activeOpacity={0.7}
                    className="w-9 h-9 rounded-2xl bg-[#f8f9fa] dark:bg-zinc-800 items-center justify-center border border-[#e2dfe1] dark:border-zinc-700"
                  >
                    <ArrowCounterClockwise size={16} color={isDark ? '#ffffff' : '#1b1b1d'} weight="bold" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={isRunning ? pauseTimer : resumeTimer}
                    activeOpacity={0.8}
                    className="bg-[#59C83A] w-10 h-10 rounded-2xl items-center justify-center shadow-md"
                  >
                    {isRunning ? (
                      <Pause size={18} color="#ffffff" weight="bold" />
                    ) : (
                      <Play size={18} color="#ffffff" weight="bold" />
                    )}
                  </TouchableOpacity>
                </View>
              </MotiView>
            )}
          </AnimatePresence>
        </MotiView>
      )}
    </AnimatePresence>
  );
}