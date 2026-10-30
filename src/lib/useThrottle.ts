import { useRef, useCallback } from 'react';

/**
 * Hook para limitar a taxa de execução de uma função no React Native
 * @param callback Função que será executada
 * @param delay Tempo de bloqueio entre cliques em milissegundos (padrão: 2000ms)
 */
export function useThrottledCallback<T extends (...args: any[]) => void>(
  callback: T,
  delay: number = 2000
) {
  const lastRan = useRef<number>(0);

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastRan.current >= delay) {
        callback(...args);
        lastRan.current = now;
      }
    },
    [callback, delay]
  );
}