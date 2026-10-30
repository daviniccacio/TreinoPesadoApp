// ============================================================================
// DOCUMENTAÇÃO: CONTEXTO GLOBAL DO TEMPORIZADOR
// ============================================================================
// Gerencia o estado do timer globalmente. Inicializa em 0s para não exibir
// a bolinha flutuante sem que um tempo tenha sido configurado.
// ============================================================================

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface TimerContextData {
  timeLeft: number;
  targetTime: number;
  isRunning: boolean;
  exerciseName: string | null;
  startTimer: (seconds: number, name?: string) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  resetTimer: () => void;
  addSeconds: (seconds: number) => void;
  adjustMinutes: (minutes: number) => void;
}

const TimerContext = createContext<TimerContextData>({} as TimerContextData);

const MAX_TIMER_SECONDS = 3600; // 60 minutos

export function TimerProvider({ children }: { children: ReactNode }) {
  // 🟢 Inicialização em 0 para não exibir o timer ao abrir o app sem tempo configurado
  const [targetTime, setTargetTime] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [exerciseName, setExerciseName] = useState<string | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    if (isRunning && endTime) {
      interval = setInterval(() => {
        const now = Date.now();
        const differenceInSeconds = Math.max(0, Math.ceil((endTime - now) / 1000));

        setTimeLeft(differenceInSeconds);

        if (differenceInSeconds <= 0) {
          setIsRunning(false);
          setEndTime(null);
        }
      }, 500);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, endTime]);

  function startTimer(seconds: number, name?: string) {
    const validSeconds = Math.min(MAX_TIMER_SECONDS, seconds);
    setTargetTime(validSeconds);
    setTimeLeft(validSeconds);
    setEndTime(Date.now() + validSeconds * 1000);
    setIsRunning(true);
    if (name) setExerciseName(name);
  }

  function pauseTimer() {
    setIsRunning(false);
    setEndTime(null);
  }

  function resumeTimer() {
    if (timeLeft > 0) {
      setEndTime(Date.now() + timeLeft * 1000);
      setIsRunning(true);
    }
  }

  function resetTimer() {
    setIsRunning(false);
    setEndTime(null);
    setTimeLeft(0); // 🟢 Zerar faz o widget ocultar
    setTargetTime(0);
  }

  function addSeconds(secondsToAdd: number) {
    const newTime = Math.min(MAX_TIMER_SECONDS, timeLeft + secondsToAdd);
    const newTarget = Math.min(MAX_TIMER_SECONDS, targetTime + secondsToAdd);

    setTimeLeft(newTime);
    setTargetTime(newTarget);

    if (isRunning) {
      setEndTime(Date.now() + newTime * 1000);
    }
  }

  function adjustMinutes(amountInMinutes: number) {
    const amountInSeconds = amountInMinutes * 60;
    const newTime = Math.min(
      MAX_TIMER_SECONDS,
      Math.max(0, timeLeft + amountInSeconds)
    );

    setTimeLeft(newTime);
    setTargetTime(newTime);

    if (isRunning) {
      setEndTime(Date.now() + newTime * 1000);
    }
  }

  return (
    <TimerContext.Provider
      value={{
        timeLeft,
        targetTime,
        isRunning,
        exerciseName,
        startTimer,
        pauseTimer,
        resumeTimer,
        resetTimer,
        addSeconds,
        adjustMinutes,
      }}
    >
      {children}
    </TimerContext.Provider>
  );
}

export function useTimer() {
  return useContext(TimerContext);
}