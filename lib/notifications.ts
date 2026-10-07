// ============================================================================
// DOCUMENTAÇÃO: MÓDULO DE REGISTO DE PUSH NOTIFICATIONS (COM VALIDAÇÃO DE USER)
// ============================================================================
// Gerencia a obtenção do token de notificação Expo e a sincronização segura
// com a API na VPS, prevenindo requisições inválidas sem sessão ativa.
// ============================================================================

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { api } from '../services/api';

/**
 * Registra o token de notificação push no servidor VPS para o usuário informado.
 * @param userId - ID único do usuário autenticado no sistema.
 */
export async function registerForPushNotificationsAsync(userId?: string): Promise<string | null> {
  // 🟢 1. GUARDA DE SEGURANÇA: Se não houver userId válido, aborta sem tentar requisição HTTP
  if (!userId || userId.trim() === '' || userId === 'undefined') {
    console.log('ℹ️ [Push Notifications] Nenhum usuário logado. Registro ignorado.');
    return null;
  }

  try {
    // 2. Solicita permissões de notificação no dispositivo
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('⚠️ [Push Notifications] Permissão de notificação negada pelo usuário.');
      return null;
    }

    // 3. Obtém o Push Token único do Expo
    const tokenData = await Notifications.getExpoPushTokenAsync();
    const pushToken = tokenData.data;

    console.log('📱 [Push Notifications] Expo Push Token gerado:', pushToken);

    // Configuração específica para Android (Canais de notificação)
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#59C83A',
      });
    }

    // 4. Salva o token na API da VPS utilizando mecanismo de tentativa segura
    await savePushTokenWithRetry(userId, pushToken);

    return pushToken;
  } catch (error: any) {
    console.error('❌ [Push Notifications] Erro ao obter token:', error.message);
    return null;
  }
}

/**
 * Função interna para envio do token para a VPS com tentativas limitadas
 */
async function savePushTokenWithRetry(userId: string, pushToken: string, retries = 3): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await api.put('/api/profiles/push-token', {
        userId,
        pushToken,
      });

      console.log('✅ [Push Notifications] Push Token salvo com sucesso na VPS!');
      return;
    } catch (error: any) {
      console.warn(
        `⚠️ [Push Notifications] Tentativa ${attempt}/${retries} falhou na VPS (${error.message}).`
      );

      // Se for a última tentativa, exibe erro no console sem quebrar a execução
      if (attempt === retries) {
        console.error('❌ [Push Notifications] Não foi possível salvar o token na VPS após ' + retries + ' tentativas.');
      } else {
        // Aguarda 2 segundos antes da próxima tentativa
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  }
}