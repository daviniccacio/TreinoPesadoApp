// ============================================================================
// DOCUMENTAÇÃO: MODAL DE ENVIO DE COMUNICADOS E NOTIFICAÇÕES PERSONALIZADAS
// ============================================================================
// Permite ao Personal Trainer enviar avisos gerais (para todos os usuários)
// ou mensagens direcionadas para um aluno específico vinculado à sua conta.
// ============================================================================

import React, { useState, useEffect } from 'react';
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
import { X, Megaphone, PaperPlaneTilt, User, Check } from 'phosphor-react-native';
import { supabase } from '../lib/supabase';
import {
  sendBroadcastNotification,
  sendNotificationToUser,
} from '../lib/notifications';

// --- TIPAGEM DOS ALUNOS VINCULADOS ---
interface LinkedStudent {
  id: string;
  full_name: string;
  email: string;
}

interface SendNotificationModalProps {
  visible: boolean;
  onClose: () => void;
  /** Opcional: ID de um aluno pré-selecionado se aberto da tela de um aluno */
  initialStudentId?: string;
}

export function SendNotificationModal({
  visible,
  onClose,
  initialStudentId,
}: SendNotificationModalProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // --- ESTADOS DO FORMULÁRIO ---
  const [sendType, setSendType] = useState<'BROADCAST' | 'DIRECT'>(
    initialStudentId ? 'DIRECT' : 'BROADCAST'
  );
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    initialStudentId || null
  );
  const [students, setStudents] = useState<LinkedStudent[]>([]);
  const [loadingStudents, setLoadingStudents] = useState<boolean>(false);

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // --- BUSCA OS ALUNOS VINCULADOS AO PERSONAL NO SUPABASE ---
  useEffect(() => {
    if (visible) {
      fetchLinkedStudents();
    }
  }, [visible]);

  async function fetchLinkedStudents() {
    try {
      setLoadingStudents(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('personal_id', user.id);

      if (!error && data) {
        setStudents(data as LinkedStudent[]);
      }
    } catch (err) {
      console.error('Erro ao buscar alunos vinculados:', err);
    } finally {
      setLoadingStudents(false);
    }
  }

  // --- FUNÇÃO DE DISPARO DA NOTIFICAÇÃO ---
  async function handleSend() {
    if (!title.trim() || !message.trim()) {
      setFeedbackMessage('Preencha o título e a mensagem.');
      return;
    }

    if (sendType === 'DIRECT' && !selectedStudentId) {
      setFeedbackMessage('Selecione um aluno para receber a mensagem.');
      return;
    }

    try {
      setSending(true);
      setFeedbackMessage(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado.');

      if (sendType === 'BROADCAST') {
        // Envia para todos os usuários da plataforma
        await sendBroadcastNotification(user.id, title.trim(), message.trim());
      } else if (sendType === 'DIRECT' && selectedStudentId) {
        // Envia exclusivamente para o aluno selecionado
        await sendNotificationToUser({
          targetUserId: selectedStudentId,
          senderId: user.id,
          title: title.trim(),
          message: message.trim(),
          type: 'DIRECT_MESSAGE',
        });
      }

      // Limpa os campos e fecha o modal
      setTitle('');
      setMessage('');
      setSelectedStudentId(null);
      setSendType('BROADCAST');
      onClose();
    } catch (err: any) {
      setFeedbackMessage(err.message || 'Erro ao enviar notificação.');
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View className="flex-1 bg-black/60 justify-end">
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="w-full"
          >
            <View className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border-t border-[#e2dfe1] dark:border-zinc-800 max-h-[100%]">
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* 1. CABEÇALHO DO MODAL */}
                <View className="flex-row items-center justify-between pb-3 border-b border-[#e2dfe1] dark:border-zinc-800 mb-4">
                  <View className="flex-row items-center">
                    <View className="mr-2">
                      <Megaphone size={20} color="#59C83A" />
                    </View>
                    <Text className="text-base font-outfit-bold text-[#1b1b1d] dark:text-white">
                      Nova Notificação
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

                {/* 2. SELETOR DE DESTINATÁRIO (TODOS OU ALUNO ESPECÍFICO) */}
                <Text className="text-xs font-sans-bold text-[#71717a] dark:text-zinc-400 mb-2">
                  Destinatário
                </Text>

                <View className="flex-row gap-2 mb-4">
                  <TouchableOpacity
                    onPress={() => setSendType('BROADCAST')}
                    className={`flex-1 py-2.5 px-3 rounded-xl border flex-row items-center justify-center ${
                      sendType === 'BROADCAST'
                        ? 'bg-[#59C83A]/10 border-[#59C83A]'
                        : 'bg-[#f8f9fa] dark:bg-zinc-800/60 border-[#e2dfe1] dark:border-zinc-700'
                    }`}
                  >
                    <Text
                      className={`text-xs font-sans-bold ${
                        sendType === 'BROADCAST'
                          ? 'text-[#59C83A]'
                          : 'text-[#71717a] dark:text-zinc-400'
                      }`}
                    >
                      Todos os Usuários
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setSendType('DIRECT')}
                    className={`flex-1 py-2.5 px-3 rounded-xl border flex-row items-center justify-center ${
                      sendType === 'DIRECT'
                        ? 'bg-[#59C83A]/10 border-[#59C83A]'
                        : 'bg-[#f8f9fa] dark:bg-zinc-800/60 border-[#e2dfe1] dark:border-zinc-700'
                    }`}
                  >
                    <Text
                      className={`text-xs font-sans-bold ${
                        sendType === 'DIRECT'
                          ? 'text-[#59C83A]'
                          : 'text-[#71717a] dark:text-zinc-400'
                      }`}
                    >
                      Aluno Específico
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* 3. LISTA DE SELEÇÃO DE ALUNO (SE SELECIONADO 'DIRECT') */}
                {sendType === 'DIRECT' && (
                  <View className="mb-4">
                    <Text className="text-xs font-sans-bold text-[#71717a] dark:text-zinc-400 mb-2">
                      Selecione o Aluno:
                    </Text>

                    {loadingStudents ? (
                      <ActivityIndicator size="small" color="#59C83A" className="my-2" />
                    ) : students.length === 0 ? (
                      <Text className="text-xs font-sans-medium text-amber-500 my-1">
                        Você ainda não possui alunos vinculados à sua conta.
                      </Text>
                    ) : (
                      <View className="gap-2">
                        {students.map((student) => {
                          const isSelected = selectedStudentId === student.id;
                          return (
                            <TouchableOpacity
                              key={student.id}
                              onPress={() => setSelectedStudentId(student.id)}
                              className={`p-3 rounded-xl border flex-row items-center justify-between ${
                                isSelected
                                  ? 'bg-[#59C83A]/10 border-[#59C83A]'
                                  : 'bg-[#f8f9fa] dark:bg-zinc-800/40 border-[#e2dfe1] dark:border-zinc-700'
                              }`}
                            >
                              <View className="flex-row items-center">
                                <View className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 items-center justify-center mr-2.5">
                                  <User size={16} color={isDark ? '#ffffff' : '#1b1b1d'} />
                                </View>
                                <View>
                                  <Text className="text-xs font-sans-bold text-[#1b1b1d] dark:text-white">
                                    {student.full_name || 'Aluno Sem Nome'}
                                  </Text>
                                  <Text className="text-[10px] font-sans-medium text-[#71717a] dark:text-zinc-400">
                                    {student.email}
                                  </Text>
                                </View>
                              </View>

                              {isSelected && (
                                <View className="w-5 h-5 rounded-full bg-[#59C83A] items-center justify-center">
                                  <Check size={12} color="#ffffff" weight="bold" />
                                </View>
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </View>
                )}

                {/* 4. CAMPO: TÍTULO */}
                <Text className="text-xs font-sans-bold text-[#71717a] dark:text-zinc-400 mb-1">
                  Título do Aviso
                </Text>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder={
                    sendType === 'BROADCAST'
                      ? 'Ex: Feriado de Carnaval'
                      : 'Ex: Lembrete de Carga'
                  }
                  placeholderTextColor="#a1a1aa"
                  className="w-full bg-[#f8f9fa] dark:bg-zinc-800/60 text-[#1b1b1d] dark:text-white p-3 rounded-xl border border-[#e2dfe1] dark:border-zinc-700 font-sans-medium text-xs mb-3"
                />

                {/* 5. CAMPO: MENSAGEM */}
                <Text className="text-xs font-sans-bold text-[#71717a] dark:text-zinc-400 mb-1">
                  Mensagem
                </Text>
                <TextInput
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  numberOfLines={4}
                  placeholder="Ex: Não se esqueça de manter a cadência nos exercícios..."
                  placeholderTextColor="#a1a1aa"
                  textAlignVertical="top"
                  className="w-full bg-[#f8f9fa] dark:bg-zinc-800/60 text-[#1b1b1d] dark:text-white p-3 rounded-xl border border-[#e2dfe1] dark:border-zinc-700 font-sans-medium text-xs mb-4 h-24"
                />

                {/* 6. BOTÃO ENVIAR */}
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
                        {sendType === 'BROADCAST'
                          ? 'Disparar para Todos'
                          : 'Enviar para o Aluno'}
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