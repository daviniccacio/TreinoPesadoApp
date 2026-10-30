// ============================================================================
// DOCUMENTAÇÃO: MÓDULO DE SANITIZAÇÃO E VALIDAÇÃO DE ENTRADAS (SECURITY)
// ============================================================================
// Remove caracteres especiais perigosos comumente usados em ataques SQL
// e valida os limites de tamanho das strings com a biblioteca Zod.
// ============================================================================

import { z } from 'zod';

/**
 * Remove caracteres de controle SQL perigosos de textos puros
 * @param input Texto digitado pelo usuário na busca ou formulários
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';
  
  // 🟢 CORRIGIDO: Adicionada a barra de escape (\-) no hífen para evitar erro de intervalo
  return input
    .replace(/['";\-]/g, '')           // Remove aspas simples, aspas duplas, ponto e vírgula e hífen
    .replace(/\/\*[\s\S]*?\*\//g, '')  // Remove comentários de bloco no formato /* */
    .trim();
}

/** Schema de Validação para Campos de Busca usando Zod */
export const searchFilterSchema = z.object({
  searchTerm: z
    .string()
    .max(50, 'A busca deve ter no máximo 50 caracteres')
    .transform((val) => sanitizeInput(val)),
});