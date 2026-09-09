// ============================================================================
// CONFIGURAÇÃO E ADAPTADOR DO SUPABASE COM SECURESTORE CHUNKING
// ============================================================================

import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import 'react-native-url-polyfill/auto';

// Tamanho máximo seguro para cada bloco no SecureStore (abaixo do limite de 2048 bytes)
const CHUNK_SIZE = 2000;

/**
 * Adaptador personalizado para o SecureStore que divide valores grandes
 * em blocos menores para evitar o aviso de limite de 2048 bytes.
 */
const LargeSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    // 1. Tenta buscar a chave diretamente
    const singleValue = await SecureStore.getItemAsync(key);
    if (singleValue) return singleValue;

    // 2. Se não encontrou valor único, verifica se existem blocos (chunks)
    const countStr = await SecureStore.getItemAsync(`${key}_chunk_count`);
    if (!countStr) return null;

    const chunkCount = parseInt(countStr, 10);
    let combinedValue = '';

    // Recompõe o texto juntando todos os blocos na ordem correta
    for (let i = 0; i < chunkCount; i++) {
      const chunk = await SecureStore.getItemAsync(`${key}_chunk_${i}`);
      if (chunk) {
        combinedValue += chunk;
      } else {
        return null; // Caso algum bloco tenha sido corrompido ou removido
      }
    }

    return combinedValue;
  },

  setItem: async (key: string, value: string): Promise<void> => {
    // Limpa registros anteriores dessa chave antes de gravar os novos
    await LargeSecureStoreAdapter.removeItem(key);

    // Se o valor for pequeno, grava diretamente em uma chave simples
    if (value.length <= CHUNK_SIZE) {
      await SecureStore.setItemAsync(key, value);
      return;
    }

    // Se o valor ultrapassar o limite, divide em blocos menores
    const chunkCount = Math.ceil(value.length / CHUNK_SIZE);
    await SecureStore.setItemAsync(`${key}_chunk_count`, chunkCount.toString());

    for (let i = 0; i < chunkCount; i++) {
      const chunk = value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      await SecureStore.setItemAsync(`${key}_chunk_${i}`, chunk);
    }
  },

  removeItem: async (key: string): Promise<void> => {
    // 1. Remove a chave simples caso exista
    await SecureStore.deleteItemAsync(key);

    // 2. Remove o contador e todos os blocos secundários caso existam
    const countStr = await SecureStore.getItemAsync(`${key}_chunk_count`);
    if (countStr) {
      const chunkCount = parseInt(countStr, 10);
      await SecureStore.deleteItemAsync(`${key}_chunk_count`);

      for (let i = 0; i < chunkCount; i++) {
        await SecureStore.deleteItemAsync(`${key}_chunk_${i}`);
      }
    }
  },
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: LargeSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});