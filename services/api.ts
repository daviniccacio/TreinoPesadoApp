import axios from 'axios';

// Substitua pelo IP ou domínio da sua VPS
const API_URL = 'http://163.176.233.145:3000'; 

export const api = axios.create({
  baseURL: API_URL,
  timeout: 8000, // Limite de 8 segundos para evitar requisições presas
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor de resposta blindado para repassar o erro com segurança
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Registra o erro no console de forma simples sem quebrar o app
    if (error.response) {
      console.warn(`⚠️ [API Error ${error.response.status}]:`, error.response.data);
    } else if (error.request) {
      console.warn('⚠️ [API Error]: Sem resposta do servidor da VPS.');
    } else {
      console.warn('⚠️ [API Error]:', error.message);
    }

    // OBRIGATÓRIO: Repassa o erro para ser capturado no try/catch da tela
    return Promise.reject(error);
  }
);