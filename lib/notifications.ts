// ============================================================================
// DOCUMENTAÇÃO: SERVIÇO DE NOTIFICAÇÕES (SUPORTE COMPATÍVEL COM EXPO GO)
// ============================================================================

import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { supabase } from './supabase';

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
      const { error } = await supabase
        .from('profiles')
        .update({ push_token: token })
        .eq('id', userId);

      if (error) {
        console.error('[Push Notifications] Erro ao salvar token no Supabase:', error.message);
      } else {
        console.log('[Push Notifications] Token salvo com sucesso:', token);
      }
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
 * Envia notificações Push via API do Expo (Funciona em Expo Go e Build nativa)
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
 * Envia um Comunicado Geral (In-App + Push) apenas para Alunos e Personais Ativos
 */
export async function sendBroadcastNotification(
  senderId: string,
  title: string,
  message: string
) {
  try {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, push_token')
      .eq('is_blocked', false)
      .neq('role', 'admin');

    if (error) {
      console.error('Erro ao buscar perfis para broadcast:', error.message);
      return;
    }

    if (!profiles || profiles.length === 0) {
      console.warn('Nenhum perfil encontrado para broadcast.');
      return;
    }

    const notificationsRecords = profiles.map((profile) => ({
      user_id: profile.id,
      sender_id: senderId,
      title,
      message,
      type: 'ANNOUNCEMENT',
    }));

    const { error: insertError } = await supabase.from('notifications').insert(notificationsRecords);
    if (insertError) {
      console.error('Erro ao inserir registros de notificação no banco:', insertError.message);
      return;
    }

    const tokens = profiles
      .map((p) => p.push_token)
      .filter((token): token is string => !!token);

    console.log(`Disparando broadcast push para ${tokens.length} dispositivos.`);
    await sendExpoPushNotification(tokens, title, message);
  } catch (err) {
    console.error('Erro em sendBroadcastNotification:', err);
  }
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
    const { error: insertError } = await supabase.from('notifications').insert({
      user_id: targetUserId,
      sender_id: senderId || null,
      title,
      message,
      type,
    });

    if (insertError) {
      console.error('Erro ao inserir notificação individual no banco:', insertError.message);
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('push_token')
      .eq('id', targetUserId)
      .single();

    if (profile?.push_token) {
      console.log(`Disparando push direto para o token: ${profile.push_token}`);
      await sendExpoPushNotification([profile.push_token], title, message);
    } else {
      console.warn(`O usuário ${targetUserId} não possui 'push_token' cadastrado no perfil.`);
    }
  } catch (error) {
    console.error('Erro ao enviar notificação para usuário:', error);
  }
}