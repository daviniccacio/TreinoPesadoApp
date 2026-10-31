// ============================================================================
// DOCUMENTAÇÃO: CONTEXTO GLOBAL DO TEMPORIZADOR (VERSÃO CORRIGIDA TS2304)
// ============================================================================
// Gerencia o temporizador global utilizando amostragem de 200ms e timestamps
// precisos para evitar travamentos visuais e persistir em background.
// ============================================================================

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';

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
  const [targetTime, setTargetTime] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [exerciseName, setExerciseName] = useState<string | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);

  const appState = useRef<AppStateStatus>((AppState.currentState as AppStateStatus) || 'active');

  // 🟢 RECALCULA O TEMPO RESTANTE COM BASE NO RELÓGIO DO SISTEMA
  const updateTimerFromTimestamp = useCallback(() => {
    if (isRunning && endTime) {
      const now = Date.now();
      const differenceInSeconds = Math.max(0, Math.ceil((endTime - now) / 1000));

      setTimeLeft((prevTime) => {
        if (prevTime !== differenceInSeconds) {
          return differenceInSeconds;
        }
        return prevTime;
      });

      if (differenceInSeconds <= 0) {
        setIsRunning(false);
        setEndTime(null);
      }
    }
  }, [isRunning, endTime]);

  // 🟢 MONITOR DE BACKGROUND / FOREGROUND DO APLICATIVO
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        updateTimerFromTimestamp();
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [updateTimerFromTimestamp]);

  // 🟢 LOOP DE CHECAGEM DE ALTA FREQUÊNCIA (200ms)
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    if (isRunning && endTime) {
      updateTimerFromTimestamp();
      interval = setInterval(() => {
        updateTimerFromTimestamp();
      }, 200);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, endTime, updateTimerFromTimestamp]);

  function startTimer(seconds: number, name?: string) {
    const validSeconds = Math.min(MAX_TIMER_SECONDS, seconds);
    const calculatedEndTime = Date.now() + validSeconds * 1000;

    setTargetTime(validSeconds);
    setTimeLeft(validSeconds);
    setEndTime(calculatedEndTime);
    setIsRunning(true);
    if (name) setExerciseName(name);
  }

  function pauseTimer() {
    setIsRunning(false);
    setEndTime(null);
  }

  function resumeTimer() {
    if (timeLeft > 0) {
      const calculatedEndTime = Date.now() + timeLeft * 1000;
      setEndTime(calculatedEndTime);
      setIsRunning(true);
    }
  }

  function resetTimer() {
    setIsRunning(false);
    setEndTime(null);
    setTimeLeft(0);
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
    setTargetTime(newTime); // 🟢 CORRIGIDO: Passando newTime em vez do antigo newTarget

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