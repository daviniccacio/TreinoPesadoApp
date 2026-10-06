// ============================================================================
// DOCUMENTAÇÃO: CLIENTE DE API HTTP PARA A VPS ORACLE CLOUD
// ============================================================================
// Fornece uma instância configurada do Axios para realizar requisições para a
// API Express na VPS e métodos auxiliares para consultar os dados de treinos.
// ============================================================================

import axios from 'axios';

// Obtém a URL da VPS configurada no .env ou utiliza o IP fixo como fallback
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://163.176.233.145:3000';

// Instância do Axios pré-configurada
export const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 10000, // Tempo limite de resposta de 10 segundos
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Consulta a lista completa de exercícios na base de dados PostgreSQL da VPS
 */
export async function getExercisesFromVPS() {
  try {
    const response = await api.get('/exercises');
    return response.data;
  } catch (error) {
    console.error('❌ Erro ao buscar exercícios na VPS:', error);
    throw error;
  }
}