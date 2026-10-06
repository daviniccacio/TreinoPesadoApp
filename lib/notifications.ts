// ============================================================================
// DOCUMENTAÇÃO: SERVIÇO DE NOTIFICAÇÕES VIA API EXPRESS (VPS ORACLE CLOUD)
// ============================================================================

import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { api } from '../services/api';

// Configuração do handler em primeiro plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * 🟢 FUNÇÃO AUXILIAR: Tenta salvar o token no banco PostgreSQL via VPS
 */
// ============================================================================
// DOCUMENTAÇÃO: FUNÇÃO DE SALVAMENTO DE TOKEN COM DIAGNÓSTICO DE REDE
// ============================================================================

async function savePushTokenWithRetry(
  userId: string,
  token: string,
  retries: number = 3,
  delayMs: number = 1500
): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await api.put('/profiles/push-token', { userId, pushToken: token });
      console.log('✅ [Push Notifications] Token salvo na VPS com sucesso:', response.data);
      return; // Sucesso: encerra a função
    } catch (err: any) {
      // Captura a mensagem detalhada de erro retornado pela API ou rede
      const status = err?.response?.status ? `HTTP ${err.response.status}` : 'Sem resposta da rede';
      const detalhe = err?.response?.data?.erro || err?.message || err;

      console.warn(
        `⚠️ [Push Notifications] Tentativa ${attempt}/${retries} falhou na VPS (${status}: ${detalhe}). Tentando em ${delayMs / 1000}s...`
      );
    }

    if (attempt < retries) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  console.error('❌ [Push Notifications] Não foi possível salvar o token após múltiplas tentativas.');
}

/**
 * Registra o dispositivo para receber Push Notifications
 */
export async function registerForPushNotificationsAsync(userId: string) {
  if (!Device.isDevice) {
    console.warn('[Push Notifications] Deve ser executado em um dispositivo físico.');
    return undefined;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('[Push Notifications] Permissão negada pelo usuário.');
      return undefined;
    }

    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId;

    const pushTokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );

    const token = pushTokenData?.data;

    if (token && userId) {
      await savePushTokenWithRetry(userId, token);
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#59C83A',
      });
    }

    return token;
  } catch (error) {
    console.warn('[Push Notifications] Erro ao registrar token:', error);
    return undefined;
  }
}

/**
 * Envia notificações Push via API do Expo
 */
export async function sendExpoPushNotification(
  pushTokens: string[],
  title: string,
  body: string
) {
  const uniqueTokens = Array.from(
    new Set(pushTokens.filter((t) => !!t && t.trim() !== ''))
  );

  if (uniqueTokens.length === 0) {
    console.warn('[Expo Push] Nenhum token válido fornecido para envio.');
    return;
  }

  const messages = uniqueTokens.map((token) => ({
    to: token,
    sound: 'default',
    title,
    body,
    data: { extraData: 'notification' },
  }));

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const result = await response.json();
    console.log('📬 [Expo Push API Resposta]:', result);
  } catch (error) {
    console.error('Erro ao enviar Push via fetch:', error);
  }
}

/**
 * Envia um Comunicado Geral (In-App + Push) chamando o backend na VPS
 */
export async function sendBroadcastNotification(
  senderId: string,
  title: string,
  message: string
) {
  try {
    const response = await api.post('/notifications/broadcast', {
      senderId,
      title,
      message,
    });

    const tokens: string[] = response.data?.tokens || [];
    if (tokens.length > 0) {
      console.log(`Disparando broadcast push para ${tokens.length} dispositivos.`);
      await sendExpoPushNotification(tokens, title, message);
    }
  } catch (err: any) {
    console.error('Erro em sendBroadcastNotification:', err?.response?.data || err.message);
  }
}

/**
 * Envia uma notificação para um usuário específico chamando a VPS
 */
export async function sendNotificationToUser({
  targetUserId,
  senderId,
  title,
  message,
  type = 'SYSTEM',
}: {
  targetUserId: string;
  senderId?: string;
  title: string;
  message: string;
  type?: string;
}) {
  try {
    const response = await api.post('/notifications/send-user', {
      targetUserId,
      senderId: senderId || null,
      title,
      message,
      type,
    });

    const pushToken = response.data?.pushToken;
    if (pushToken) {
      console.log(`Disparando push direto para o token: ${pushToken}`);
      await sendExpoPushNotification([pushToken], title, message);
    } else {
      console.warn(`O usuário ${targetUserId} não possui 'push_token' cadastrado.`);
    }
  } catch (error: any) {
    console.error('Erro ao enviar notificação para usuário:', error?.response?.data || error.message);
  }
}