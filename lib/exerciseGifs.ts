// ============================================================================
// DOCUMENTAÇÃO: GERENCIADOR DE GIFS REDIRECIONADO PARA A VPS ORACLE CLOUD
// ============================================================================
// Este ficheiro converte a chave do exercício (ex: 'flexao_abdominal') no
// endereço público da VPS ('http://163.176.233.145:3000/gifs/flexao-abdominal.gif').
// ============================================================================

import { supabase } from './supabase';

// Endereço público da VPS na Oracle Cloud
const VPS_API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://163.176.233.145:3000';
const BUCKET_NAME = 'exercises';

// Imagem de fallback caso o exercício não tenha chave
const FALLBACK_GIF_URL =
  'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=500&auto=format&fit=crop';

/**
 * Converte a chave do exercício em um objeto { uri: string } compatível com o expo-image
 * 
 * @param gifKey - Chave do exercício vinda do banco de dados (ex: 'flexao_abdominal')
 * @param useVPS - Define se busca na VPS (true) ou no Supabase (false). Padrão: true.
 */
export function getExerciseGif(gifKey?: string, useVPS: boolean = true): { uri: string } {
  // 1. Se nenhuma chave for fornecida, retorna a imagem padrão
  if (!gifKey) {
    console.log('⚠️ [GIF Loader] Nenhuma gifKey informada. Usando imagem de fallback.');
    return { uri: FALLBACK_GIF_URL };
  }

  // 2. Formata a chave: minúsculas, sem espaços e substitui underline (_) por hífen (-)
  let formattedKey = gifKey.toLowerCase().trim().replace(/_/g, '-');

  // 3. Garante que o nome do arquivo termina em .gif
  if (!formattedKey.endsWith('.gif')) {
    formattedKey = `${formattedKey}.gif`;
  }

  // 🟢 ROTA PRINCIPAL: Carregamento direto da VPS Oracle Cloud
  if (useVPS) {
    const vpsUrl = `${VPS_API_URL}/gifs/${formattedKey}`;
    console.log(`🚀 [GIF Loader VPS] URL gerada via VPS: ${vpsUrl}`);
    return { uri: vpsUrl };
  }

  // 🟢 ROTA DE BACKUP: Supabase Storage
  try {
    const { data } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(formattedKey);

    if (data?.publicUrl) {
      console.log(`✅ [GIF Loader Supabase] URL gerada: ${data.publicUrl}`);
      return { uri: data.publicUrl };
    }

    return { uri: FALLBACK_GIF_URL };
  } catch (error) {
    console.log('❌ [GIF Loader] Erro ao construir URL:', error);
    return { uri: FALLBACK_GIF_URL };
  }
}