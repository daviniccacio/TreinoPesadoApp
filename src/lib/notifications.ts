// ============================================================================
// DOCUMENTAÇÃO: SERVIÇO DE NOTIFICAÇÕES (SUPORTE COMPATÍVEL COM EXPO GO + RETRY)
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
 * 🟢 FUNÇÃO AUXILIAR: Tenta salvar o token no Supabase com retentativas automáticas.
 */
async function savePushTokenWithRetry(
  userId: string,
  token: string,
  retries: number = 3,
  delayMs: number = 1500
): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ push_token: token })
        .eq('id', userId);

      if (!error) {
        console.log('[Push Notifications] Token salvo com sucesso:', token);
        return;
      }

      console.warn(
        `[Push Notifications] Tentativa ${attempt}/${retries} falhou (${error.message}). A tentar novamente em ${delayMs / 1000}s...`
      );
    } catch (err: any) {
      console.warn(
        `[Push Notifications] Falha de conexão na tentativa ${attempt}/${retries}:`,
        err?.message || err
      );
    }

    if (attempt < retries) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  console.error(
    '[Push Notifications] Não foi possível salvar o token após múltiplas tentativas de rede.'
  );
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
 * Removes o token push ao realizar Logout para evitar notificações cruzadas em dev.
 */
export async function clearPushTokenOnSignOut(userId: string): Promise<void> {
  try {
    await supabase
      .from('profiles')
      .update({ push_token: null })
      .eq('id', userId);
    console.log('[Push Notifications] Token removido do perfil no logout.');
  } catch (error) {
    console.error('Erro ao limpar push_token no logout:', error);
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

// ============================================================================
// 🎯 NOVA FUNÇÃO DEDICADA: NOTIFICAR APENAS O PERSONAL DO ALUNO
// ============================================================================
/**
 * Notifica EXCLUSIVAMENTE o Personal Trainer vinculado ao aluno que concluiu o treino.
 */
export async function notifyPersonalOnWorkoutCompletion({
  studentId,
  workoutTitle,
}: {
  studentId: string;
  workoutTitle: string;
}) {
  try {
    // 1. Busca os dados do aluno para obter o nome e o personal_id
    const { data: studentProfile, error: studentError } = await supabase
      .from('profiles')
      .select('full_name, personal_id')
      .eq('id', studentId)
      .single();

    if (studentError || !studentProfile) {
      console.warn('[Push Personal] Não foi possível encontrar o perfil do aluno:', studentId);
      return;
    }

    // Se o aluno não tiver personal vinculado, encerra
    if (!studentProfile.personal_id) {
      console.log('[Push Personal] O aluno não possui Personal Trainer vinculado.');
      return;
    }

    const personalId = studentProfile.personal_id;
    const studentName = studentProfile.full_name || 'Seu aluno';
    const title = 'Treino Finalizado! 🏋️';
    const message = `${studentName} acabou de concluir o treino "${workoutTitle}".`;

    // 2. Insere a notificação na tabela 'notifications' do banco apenas para o Personal
    const { error: insertError } = await supabase.from('notifications').insert({
      user_id: personalId,
      sender_id: studentId,
      title,
      message,
      type: 'WORKOUT_COMPLETED',
    });

    if (insertError) {
      console.error('[Push Personal] Erro ao salvar notificação no banco:', insertError.message);
    }

    // 3. Busca o push_token do Personal Trainer
    const { data: personalProfile, error: personalError } = await supabase
      .from('profiles')
      .select('push_token')
      .eq('id', personalId)
      .single();

    if (personalError || !personalProfile?.push_token) {
      console.warn(
        `[Push Personal] O Personal (${personalId}) não tem um 'push_token' ativo registrado.`
      );
      return;
    }

    // 4. Dispara a notificação Push exclusivamente para o token do Personal
    console.log(`[Push Personal] Enviando notificação para o Personal (${personalId})...`);
    await sendExpoPushNotification([personalProfile.push_token], title, message);
  } catch (error) {
    console.error('Erro em notifyPersonalOnWorkoutCompletion:', error);
  }
}