// ============================================================================
// DOCUMENTAÇÃO: MODAL DE ENVIO DE COMUNICADOS E NOTIFICAÇÕES (ÁREA DO PERSONAL)
// ============================================================================
// Permite ao Personal Trainer enviar comunicados gerais para todos os usuários
// do aplicativo, com suporte ao ajuste automático de teclado (KeyboardAvoidingView).
// ============================================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
} from 'react-native';
import { X, Megaphone, PaperPlaneTilt } from 'phosphor-react-native';
import { supabase } from '../lib/supabase';
import { sendBroadcastNotification } from '../lib/notifications';

interface SendNotificationModalProps {
  visible: boolean;
  onClose: () => void;
}

export function SendNotificationModal({
  visible,
  onClose,
}: SendNotificationModalProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  async function handleSend() {
    if (!title.trim() || !message.trim()) {
      setFeedbackMessage('Preencha o título e a mensagem.');
      return;
    }

    try {
      setSending(true);
      setFeedbackMessage(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado.');

      // Envia o comunicado geral para todos os usuários
      await sendBroadcastNotification(user.id, title.trim(), message.trim());

      setTitle('');
      setMessage('');
      onClose();
    } catch (err: any) {
      setFeedbackMessage(err.message || 'Erro ao enviar notificação.');
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      {/* 1. FECHA O TECLADO AO TOCAR FORA DOS INPUTS */}
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View className="flex-1 bg-black/60 justify-end">
          {/* 2. ELEVA O MODAL CONFORME O TECLADO SOBE */}
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="w-full"
          >
            <View className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-[#e2dfe1] dark:border-zinc-800">
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* CABEÇALHO */}
                <View className="flex-row items-center justify-between pb-3 border-b border-[#e2dfe1] dark:border-zinc-800 mb-4">
                  <View className="flex-row items-center">
                    <View className="mr-2">
                      <Megaphone size={20} color="#59C83A" />
                    </View>
                    <Text className="text-base font-outfit-bold text-[#1b1b1d] dark:text-white">
                      Enviar Comunicado Geral
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={onClose}
                    className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 items-center justify-center"
                  >
                    <X size={18} color={isDark ? '#ffffff' : '#1b1b1d'} />
                  </TouchableOpacity>
                </View>

                {/* MENSAGEM DE ERRO/ALERTA */}
                {feedbackMessage && (
                  <Text className="text-xs font-sans-bold text-red-500 mb-3">
                    {feedbackMessage}
                  </Text>
                )}

                {/* CAMPO: TÍTULO */}
                <Text className="text-xs font-sans-bold text-[#71717a] dark:text-zinc-400 mb-1">
                  Título do Aviso
                </Text>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Ex: Feriado de Carnaval"
                  placeholderTextColor="#a1a1aa"
                  className="w-full bg-[#f8f9fa] dark:bg-zinc-800/60 text-[#1b1b1d] dark:text-white p-3 rounded-xl border border-[#e2dfe1] dark:border-zinc-700 font-sans-medium text-xs mb-3"
                />

                {/* CAMPO: MENSAGEM */}
                <Text className="text-xs font-sans-bold text-[#71717a] dark:text-zinc-400 mb-1">
                  Mensagem
                </Text>
                <TextInput
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  numberOfLines={4}
                  placeholder="Ex: Informamos que amanhã não haverá expediente..."
                  placeholderTextColor="#a1a1aa"
                  textAlignVertical="top"
                  className="w-full bg-[#f8f9fa] dark:bg-zinc-800/60 text-[#1b1b1d] dark:text-white p-3 rounded-xl border border-[#e2dfe1] dark:border-zinc-700 font-sans-medium text-xs mb-4 h-24"
                />

                {/* BOTÃO ENVIAR */}
                <TouchableOpacity
                  onPress={handleSend}
                  disabled={sending}
                  className="bg-[#59C83A] py-3.5 rounded-xl flex-row items-center justify-center mb-2"
                >
                  {sending ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <View className="mr-2">
                        <PaperPlaneTilt size={18} color="#FFFFFF" weight="bold" />
                      </View>
                      <Text className="text-xs font-sans-bold text-white">
                        Enviar notificação para todos os usuários
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}