// ============================================================================
// DOCUMENTAÇÃO: CARREGADOR DE GIFS COM SUPORTE À VPS E FALLBACK AUTOMÁTICO
// ============================================================================
// Converte a chave do exercício (ex: 'rosca_direta_na_corda') no endereço da
// mídia estática servida na VPS ('http://163.176.233.145:3000/gifs/...').
// ============================================================================

import { supabase } from '../lib/supabase';

const VPS_API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://163.176.233.145:3000';
const BUCKET_NAME = 'exercises';

// Imagem padrão caso o GIF não seja encontrado
const FALLBACK_GIF_URL =
  'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=500&auto=format&fit=crop';

/**
 * Converte a chave do exercício em um objeto { uri: string } para o componente de imagem
 * 
 * @param gifKey - Chave do exercício vinda do banco de dados (ex: 'rosca_direta_na_corda')
 * @param useVPS - Define se utiliza a VPS (true) ou o Supabase Storage (false)
 */
export function getExerciseGif(gifKey?: string, useVPS: boolean = true): { uri: string } {
  // 1. Se nenhuma chave for informada, retorna o fallback
  if (!gifKey) {
    return { uri: FALLBACK_GIF_URL };
  }

  // 2. Normaliza a chave: letras minúsculas, sem espaços e troca '_' por '-'
  let formattedKey = gifKey.toLowerCase().trim().replace(/_/g, '-');

  // 3. Garante a extensão .gif no nome do ficheiro
  if (!formattedKey.endsWith('.gif')) {
    formattedKey = `${formattedKey}.gif`;
  }

  // 🟢 ROTA PRINCIPAL: Carregamento rápido via VPS Oracle Cloud
  if (useVPS) {
    const vpsUrl = `${VPS_API_URL}/gifs/${formattedKey}`;
    return { uri: vpsUrl };
  }

  // 🟢 ROTA SECUNDÁRIA (BACKUP): Supabase Storage
  try {
    const { data } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(formattedKey);

    if (data?.publicUrl) {
      return { uri: data.publicUrl };
    }

    return { uri: FALLBACK_GIF_URL };
  } catch (error) {
    console.error('❌ Erro ao gerar URL do Supabase:', error);
    return { uri: FALLBACK_GIF_URL };
  }
}