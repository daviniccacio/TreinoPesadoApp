// ============================================================================
// DOCUMENTAÇÃO: GERENCIADOR DE URLS DE GIFS NO SUPABASE STORAGE
// ============================================================================
// Converte as chaves do banco de dados (ex: 'rosca_direta_na_corda') no formato
// de nome de arquivo utilizado no bucket do Supabase ('rosca-direta-na-corda.gif').
// ============================================================================

import { supabase } from './supabase';

// Nome do Bucket público configurado no Supabase Storage
const BUCKET_NAME = 'exercises';

// Imagem padrão (fallback) caso o GIF não seja localizado no servidor
const FALLBACK_GIF_URL =
  'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=500&auto=format&fit=crop';

/**
 * Converte a chave do exercício em um objeto { uri: string } compatível com o expo-image
 * 
 * @param gifKey - Chave do exercício vinda do banco de dados (ex: 'rosca_direta_na_corda')
 */
export function getExerciseGif(gifKey?: string): { uri: string } {
  // 1. Se a chave for nula ou vazia, retorna o fallback
  if (!gifKey) {
    console.log('⚠️ [GIF Loader] Nenhuma gifKey informada. Usando imagem de fallback.');
    return { uri: FALLBACK_GIF_URL };
  }

  // 2. Limpa a string e converte underlines (_) em hífens (-) para bater com os arquivos do Supabase
  let formattedKey = gifKey.toLowerCase().trim().replace(/_/g, '-');

  // 3. Adiciona a extensão .gif caso ela não exista
  if (!formattedKey.endsWith('.gif')) {
    formattedKey = `${formattedKey}.gif`;
  }

  try {
    // 4. Gera a URL pública do bucket 'exercises'
    const { data } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(formattedKey);

    if (data?.publicUrl) {
      console.log(`✅ [GIF Loader] URL gerada para: ${formattedKey}`);
      return { uri: data.publicUrl };
    }

    return { uri: FALLBACK_GIF_URL };
  } catch (error) {
    console.log('❌ [GIF Loader] Erro ao construir URL:', error);
    return { uri: FALLBACK_GIF_URL };
  }
}