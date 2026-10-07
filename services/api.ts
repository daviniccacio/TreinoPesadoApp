// ============================================================================
// DOCUMENTAÇÃO: CLIENTE DE API HTTP (SERVICES/API.TS)
// ============================================================================
// Configura a instância do Axios apontando para a porta raiz da VPS na
// Oracle Cloud, evitando duplicação do prefixo /api nas requisições.
// ============================================================================

import axios from 'axios';

// URL raiz da VPS na Oracle Cloud (porta 3000)
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://163.176.233.145:3000';

// Remove a barra ou sufixo /api caso tenha sido inserido por engano no .env
const cleanBaseURL = API_URL.replace(/\/api\/?$/, '').replace(/\/$/, '');

export const api = axios.create({
  baseURL: cleanBaseURL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});