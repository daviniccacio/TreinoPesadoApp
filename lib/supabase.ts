// ============================================================================
// CONFIGURAÇÃO E ADAPTADOR DO SUPABASE COM SECURESTORE CHUNKING BLINDADO
// ============================================================================

import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import 'react-native-url-polyfill/auto';

const CHUNK_SIZE = 2000;

const LargeSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      // 1. Tenta buscar a chave diretamente
      const singleValue = await SecureStore.getItemAsync(key);
      if (singleValue) return singleValue;

      // 2. Se não encontrou valor único, verifica se existem blocos (chunks)
      const countStr = await SecureStore.getItemAsync(`${key}_chunk_count`);
      if (!countStr) return null;

      const chunkCount = parseInt(countStr, 10);
      let combinedValue = '';

      for (let i = 0; i < chunkCount; i++) {
        const chunk = await SecureStore.getItemAsync(`${key}_chunk_${i}`);
        if (chunk) {
          combinedValue += chunk;
        } else {
          return null;
        }
      }

      return combinedValue;
    } catch (error) {
      console.error('⚠️ Erro ao ler do SecureStore:', error);
      return null;
    }
  },

  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await LargeSecureStoreAdapter.removeItem(key);

      if (value.length <= CHUNK_SIZE) {
        await SecureStore.setItemAsync(key, value);
        return;
      }

      const chunkCount = Math.ceil(value.length / CHUNK_SIZE);
      await SecureStore.setItemAsync(`${key}_chunk_count`, chunkCount.toString());

      for (let i = 0; i < chunkCount; i++) {
        const chunk = value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        await SecureStore.setItemAsync(`${key}_chunk_${i}`, chunk);
      }
    } catch (error) {
      console.error('⚠️ Erro ao gravar no SecureStore:', error);
    }
  },

  removeItem: async (key: string): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(key);

      const countStr = await SecureStore.getItemAsync(`${key}_chunk_count`);
      if (countStr) {
        const chunkCount = parseInt(countStr, 10);
        await SecureStore.deleteItemAsync(`${key}_chunk_count`);

        for (let i = 0; i < chunkCount; i++) {
          await SecureStore.deleteItemAsync(`${key}_chunk_${i}`);
        }
      }
    } catch (error) {
      console.error('⚠️ Erro ao remover do SecureStore:', error);
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