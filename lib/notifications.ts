// ============================================================================
// DOCUMENTAÇÃO: SERVIÇO DE NOTIFICAÇÕES (PUSH & IN-APP)
// ============================================================================
// Gerencia as permissões do dispositivo, obtenção do Expo Push Token correto,
// salvamento no perfil do usuário e envio de mensagens Push via Expo API.
// ============================================================================

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Configuração do comportamento da notificação quando o app estiver aberto
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Registra o dispositivo para receber Push Notifications e salva no Supabase
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
      // 🟢 OBTÉM O EXPO PUSH TOKEN (FORMATO COMPATÍVEL: ExponentPushToken[...])
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ??
        Constants?.easConfig?.projectId;

      const pushTokenData = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
      );

      token = pushTokenData.data;
      console.log('🔔 Expo Push Token válido obtido:', token);
    } catch (error) {
      console.error('Erro ao buscar o Expo Push Token:', error);
    }

    // Salva o token no perfil do usuário no Supabase
    if (token && userId) {
      await supabase
        .from('profiles')
        .update({ push_token: token })
        .eq('id', userId);
    }
  } else {
    console.log('Dispositivo físico necessário para notificações push.');
  }

  // Configuração de canal para Android
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
 * Envia uma mensagem de Push Notification usando a API oficial do Expo
 */
export async function sendExpoPushNotification(
  pushTokens: string[],
  title: string,
  body: string
) {
  const messages = pushTokens
    .filter((token) => !!token)
    .map((token) => ({
      to: token,
      sound: 'default',
      title,
      body,
      data: { extraData: 'notification' },
    }));

  if (messages.length === 0) return;

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

  const notificationsRecords = profiles.map((profile) => ({
    user_id: profile.id,
    sender_id: senderId,
    title,
    message,
    type: 'ANNOUNCEMENT',
  }));

  await supabase.from('notifications').insert(notificationsRecords);

  const tokens = profiles
    .map((p) => p.push_token)
    .filter((token): token is string => !!token);

  await sendExpoPushNotification(tokens, title, message);
}