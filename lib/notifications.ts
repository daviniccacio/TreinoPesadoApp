// ============================================================================
// DOCUMENTAÇÃO: SERVIÇO DE NOTIFICAÇÕES (COM FILTRO PARA ADMIN)
// ============================================================================

import * as Device from 'expo-device';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

let Notifications: any = null;
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

try {
  if (!isExpoGo) {
    Notifications = require('expo-notifications');
    
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  }
} catch (error) {
  console.warn('[Notifications] Módulo não carregado em ambiente simulado.');
}

/**
 * Registra o dispositivo para receber Push Notifications
 */
export async function registerForPushNotificationsAsync(userId: string) {
  if (isExpoGo || !Notifications) return undefined;
  if (!Device.isDevice) return undefined;

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return undefined;

    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId;

    const pushTokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );

    const token = pushTokenData?.data;

    if (token && userId) {
      await supabase
        .from('profiles')
        .update({ push_token: token })
        .eq('id', userId);
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
  if (isExpoGo || !Notifications) return;

  const uniqueTokens = Array.from(
    new Set(pushTokens.filter((t) => !!t && t.trim() !== ''))
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
    console.error('Erro ao enviar Push:', error);
  }
}

/**
 * Envia um Comunicado Geral (In-App + Push) apenas para Alunos e Personais Ativos
 */
export async function sendBroadcastNotification(
  senderId: string,
  title: string,
  message: string
) {
  // 🟢 FILTRO: Seleciona apenas usuários ativos e NÃO administradores
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, push_token')
    .eq('is_blocked', false)
    .neq('role', 'admin');

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

/**
 * Envia uma notificação (In-App + Push) para um usuário específico
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
    console.error('Erro ao enviar notificação:', error);
  }
}