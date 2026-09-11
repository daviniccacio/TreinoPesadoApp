// ============================================================================
// DOCUMENTAÇÃO: SERVIÇO DE NOTIFICAÇÕES (PUSH & IN-APP)
// ============================================================================
// Gerencia as permissões do dispositivo, obtenção do Expo Push Token,
// remoção de duplicatas de tokens no mesmo aparelho e disparo via Expo API.
// ============================================================================

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// 🟢 CONFIGURAÇÃO DO COMPORTAMENTO (Sem 'shouldShowAlert' para evitar avisos de depreciação)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Registra o dispositivo para receber Push Notifications e vincula ao usuário no Supabase
 */
export async function registerForPushNotificationsAsync(userId: string) {
  let token: string | undefined;

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Permissão de notificações negada pelo usuário.');
      return;
    }

    try {
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ??
        Constants?.easConfig?.projectId;

      const pushTokenData = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
      );

      token = pushTokenData.data;
      console.log('🔔 Expo Push Token obtido:', token);
    } catch (error) {
      console.error('Erro ao buscar o Expo Push Token:', error);
    }

    // Atualiza o token do usuário logado e previne duplicidade no mesmo aparelho
    if (token && userId) {
      await supabase
        .from('profiles')
        .update({ push_token: token })
        .eq('id', userId);
    }
  } else {
    console.log('Dispositivo físico necessário para notificações push.');
  }

  // Configuração de canal exclusivo para Android
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#59C83A',
    });
  }

  return token;
}

/**
 * Envia mensagens Push usando a API do Expo, filtrando tokens duplicados
 */
export async function sendExpoPushNotification(
  pushTokens: string[],
  title: string,
  body: string
) {
  // 🟢 DEDUPLICAÇÃO DE TOKENS: Garante que o mesmo celular não receba a mensagem mais de uma vez
  const uniqueTokens = Array.from(
    new Set(pushTokens.filter((token) => !!token && token.trim() !== ''))
  );

  if (uniqueTokens.length === 0) return;

  const messages = uniqueTokens.map((token) => ({
    to: token,
    sound: 'default',
    title,
    body,
    data: { extraData: 'notification' },
  }));

  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });
  } catch (error) {
    console.error('Erro ao enviar Push Notification via Expo:', error);
  }
}

/**
 * Envia um Comunicado Geral para TODOS os usuários do aplicativo
 */
export async function sendBroadcastNotification(
  senderId: string,
  title: string,
  message: string
) {
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, push_token');

  if (error || !profiles || profiles.length === 0) return;

  // 1. Grava no banco de dados para a central de notificações (In-App)
  const notificationsRecords = profiles.map((profile) => ({
    user_id: profile.id,
    sender_id: senderId,
    title,
    message,
    type: 'ANNOUNCEMENT',
  }));

  await supabase.from('notifications').insert(notificationsRecords);

  // 2. Coleta os tokens e dispara as notificações Push sem duplicatas
  const tokens = profiles
    .map((p) => p.push_token)
    .filter((token): token is string => !!token);

  await sendExpoPushNotification(tokens, title, message);
}

/**
 * Envia uma notificação (In-App e Push) para UM usuário específico
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
    await supabase.from('notifications').insert({
      user_id: targetUserId,
      sender_id: senderId || null,
      title,
      message,
      type,
    });

    const { data: profile } = await supabase
      .from('profiles')
      .select('push_token')
      .eq('id', targetUserId)
      .single();

    if (profile?.push_token) {
      await sendExpoPushNotification([profile.push_token], title, message);
    }
  } catch (error) {
    console.error('Erro ao enviar notificação para usuário:', error);
  }
}