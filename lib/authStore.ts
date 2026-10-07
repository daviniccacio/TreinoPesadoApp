// ============================================================================
// DOCUMENTAÇÃO: GERENCIADOR DE SESSÃO COM EXPO SECURE STORE
// ============================================================================
// Salva e recupera a sessão e o Token JWT com segurança no dispositivo.
// ============================================================================

import * as SecureStore from 'expo-secure-store';

export interface UserSession {
  id: string;
  email: string;
  name: string;
  role: string;
  token?: string;
}

const AUTH_KEY = 'treino_pesado_user_session';

/** Salva os dados do usuário e o token no celular */
export async function saveUserSession(session: UserSession): Promise<void> {
  try {
    await SecureStore.setItemAsync(AUTH_KEY, JSON.stringify(session));
  } catch (error) {
    console.error('❌ [SecureStore] Erro ao salvar sessão:', error);
  }
}

/** Recupera a sessão do celular */
export async function getUserSession(): Promise<UserSession | null> {
  try {
    const json = await SecureStore.getItemAsync(AUTH_KEY);
    return json ? JSON.parse(json) : null;
  } catch (error) {
    console.error('❌ [SecureStore] Erro ao ler sessão:', error);
    return null;
  }
}

/** Apaga a sessão no Logout */
export async function removeUserSession(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(AUTH_KEY);
  } catch (error) {
    console.error('❌ [SecureStore] Erro ao remover sessão:', error);
  }
}