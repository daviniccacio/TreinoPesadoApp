// ============================================================================
// DOCUMENTAÇÃO: MÓDULO DE PUSH NOTIFICATIONS E COMUNICADOS (VPS)
// ============================================================================
// Gerencia a obtenção do token Expo, sincronização com a VPS e o envio
// de notificações individuais ou comunicados gerais (broadcast).
// ============================================================================

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { api } from '../services/api';

export interface SendUserNotificationParams {
  targetUserId: string;
  senderId?: string;
  title: string;
  message: string;
  type?: string;
}

/**
 * Registra o token de notificação push no servidor VPS para o usuário informado.
 * @param userId ID único do usuário autenticado no sistema.
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

/**
 * 🟢 ENVIAR NOTIFICAÇÃO DIRETA PARA UM USUÁRIO ESPECÍFICO
 * Dispara uma requisição HTTP para a rota na VPS para notificar um único usuário.
 */
export async function sendNotificationToUser(params: SendUserNotificationParams): Promise<void> {
  const { targetUserId, senderId, title, message, type = 'ANNOUNCEMENT' } = params;

  try {
    await api.post('/api/notifications/send-to-user', {
      targetUserId,
      senderId,
      title,
      message,
      type,
    });
    console.log(`✅ [Push Notifications] Notificação enviada para o usuário: ${targetUserId}`);
  } catch (error: any) {
    console.error('❌ [Push Notifications] Erro ao enviar notificação individual:', error.message);
    throw new Error(error?.response?.data?.error || 'Falha ao enviar notificação ao usuário.');
  }
}

/**
 * 🟢 ENVIAR COMUNICADO GERAL (BROADCAST) PARA TODOS OS USUÁRIOS
 * Dispara uma requisição HTTP para a rota na VPS transmitindo a mensagem a todos.
 */
export async function sendBroadcastNotification(
  senderId: string,
  title: string,
  message: string
): Promise<void> {
  try {
    await api.post('/api/notifications/broadcast', {
      senderId,
      title,
      message,
    });
    console.log('🚀 [Push Notifications] Comunicado geral transmitido com sucesso!');
  } catch (error: any) {
    console.error('❌ [Push Notifications] Erro ao enviar comunicado geral:', error.message);
    throw new Error(error?.response?.data?.error || 'Falha ao disparar comunicado geral.');
  }
}