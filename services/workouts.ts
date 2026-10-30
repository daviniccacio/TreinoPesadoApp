// ============================================================================
// DOCUMENTAÇÃO: SERVIÇO DE TREINOS COM LOGS EXPLICITOS DE DIAGNÓSTICO
// ============================================================================

import { supabase } from '../lib/supabase';
import { sanitizeInput } from '../lib/security';

export interface WorkoutLog {
  id: string;
  user_id: string;
  student_id: string;
  workout_title: string;
  duration_seconds: number;
  completed_at: string;
}

/**
 * Realiza a busca de treinos via RPC imprimindo diagnósticos no console do terminal.
 */
export async function fetchWorkoutHistorySafe(
  studentId: string,
  rawSearchTerm: string = ''
): Promise<WorkoutLog[]> {
  const cleanTerm = sanitizeInput(rawSearchTerm);

  // 🟢 LOGS DE AUDITORIA DE ENTRADA NO TERMINAL
  console.log('--------------------------------------------------');
  console.log('📡 [RPC REQUISIÇÃO]: Executando buscar_historico_treinos');
  console.log('🔑 Parâmetro p_student_id:', studentId);
  console.log('🔍 Parâmetro p_filtro:', JSON.stringify(cleanTerm));
  console.log('🌐 Supabase URL:', process.env.EXPO_PUBLIC_SUPABASE_URL);
  console.log('--------------------------------------------------');

  const { data, error } = await supabase.rpc('buscar_historico_treinos', {
    p_student_id: studentId,
    p_filtro: cleanTerm,
  });

  if (error) {
    // 🔴 LOGS DE DIAGNÓSTICO DE ERRO NO TERMINAL
    console.error('--------------------------------------------------');
    console.error('❌ [ERRO DETALHADO DA RPC DO SUPABASE]');
    console.error('   Mensagem:', error.message);
    console.error('   Código:', error.code);
    console.error('   Detalhes:', error.details);
    console.error('   Dica:', error.hint);
    console.error('--------------------------------------------------');
    throw new Error(`[RPC Error]: ${error.message}`);
  }

  console.log('--------------------------------------------------');
  console.log('✅ [RESPOSTA RPC SUCESSO]:', data?.length ?? 0, 'registros retornados.');
  console.log('--------------------------------------------------');

  return (data as WorkoutLog[]) || [];
}