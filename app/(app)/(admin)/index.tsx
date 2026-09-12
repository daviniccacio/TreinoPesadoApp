// ============================================================================
// DOCUMENTAÇÃO: PAINEL DE GESTÃO ADMINISTRATIVA COM NOTIFICAÇÕES (SDK 56+)
// ============================================================================
// Gerencia usuários (A-Z), bloqueio/desbloqueio de contas, alternância de tema
// (Light/Dark) e central de disparo de Notificações (Broadcast e Individual).
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  useColorScheme,
  Modal,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  MagnifyingGlass,
  Users,
  ShieldCheck,
  UserMinus,
  UserCheck,
  SignOut,
  X,
  LockLaminated,
  Sun,
  Moon,
  Bell,
  PaperPlaneRight,
} from 'phosphor-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MotiView } from 'moti';
import { supabase } from '../../../lib/supabase';
import { CustomModal } from '../../../components/CustomModal';
import {
  sendBroadcastNotification,
  sendNotificationToUser,
} from '../../../lib/notifications';
import { useRouter } from 'expo-router';

interface UserProfile {
  id: string;
  full_name: string;
  email?: string;
  role: string;
  is_blocked: boolean;
  created_at: string;
}

/**
 * Busca todos os perfis cadastrados no sistema em ordem alfabética
 */
async function fetchAllUsers(): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, is_blocked, created_at')
    .order('full_name', { ascending: true });

  if (error) throw new Error(error.message);

  return (data || []).map((user: any) => ({
    id: user.id,
    full_name: user.full_name || 'Usuário Sem Nome',
    role: user.role || 'aluno',
    is_blocked: !!user.is_blocked,
    created_at: user.created_at,
  }));
}

export default function AdminDashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const systemColorScheme = useColorScheme();
  
  // ESTADO DE TEMA CLARO / ESCURO
  const [isDark, setIsDark] = useState<boolean>(systemColorScheme === 'dark');
  const queryClient = useQueryClient();

  // ESTADO DO USUÁRIO LOGADO (ADMIN)
  const [currentAdminId, setCurrentAdminId] = useState<string>('');

  // ESTADOS DE BUSCA E MODAL DE BLOQUEIO
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  // ESTADOS DO MODAL DE NOTIFICAÇÕES
  const [notifModalVisible, setNotifModalVisible] = useState(false);
  const [notifTarget, setNotifTarget] = useState<UserProfile | 'ALL'>('ALL');
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [sendingNotif, setSendingNotif] = useState(false);

  // ESTADO DO MODAL DE ALERTA PERSONALIZADO
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'danger' | 'info';
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
  });

  // Obter o ID do Administrador logado para o histórico de notificações
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setCurrentAdminId(data.user.id);
      }
    });
  }, []);

  // --- CONSULTA TANSTACK QUERY ---
  const {
    data: users = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['admin-users-list'],
    queryFn: fetchAllUsers,
  });

  // --- MUTAÇÃO PARA BLOQUEAR / DESBLOQUEAR USUÁRIO ---
  const toggleBlockMutation = useMutation({
    mutationFn: async ({
      userId,
      shouldBlock,
    }: {
      userId: string;
      shouldBlock: boolean;
    }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_blocked: shouldBlock })
        .eq('id', userId);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users-list'] });
      setSelectedUser(null);
    },
  });

  // FUNÇÃO PARA ENVIAR NOTIFICAÇÕES (BROADCAST OU INDIVIDUAL)
  async function handleSendNotification() {
    if (!notifTitle.trim() || !notifMessage.trim()) {
      setAlertConfig({
        visible: true,
        title: 'Campos Obrigatórios',
        message: 'Por favor, preencha o título e a mensagem da notificação.',
        type: 'info',
      });
      return;
    }

    setSendingNotif(true);

    try {
      if (notifTarget === 'ALL') {
        await sendBroadcastNotification(
          currentAdminId,
          notifTitle.trim(),
          notifMessage.trim()
        );
      } else {
        await sendNotificationToUser({
          targetUserId: notifTarget.id,
          senderId: currentAdminId,
          title: notifTitle.trim(),
          message: notifMessage.trim(),
          type: 'ANNOUNCEMENT',
        });
      }

      setNotifModalVisible(false);
      setNotifTitle('');
      setNotifMessage('');

      setAlertConfig({
        visible: true,
        title: 'Notificação Enviada! 🚀',
        message:
          notifTarget === 'ALL'
            ? 'Sua mensagem foi transmitida para todos os usuários do aplicativo.'
            : `Notificação enviada com sucesso para ${notifTarget.full_name}.`,
        type: 'success',
      });
    } catch (error) {
      console.error('Erro ao disparar notificação:', error);
      setAlertConfig({
        visible: true,
        title: 'Falha no Envio',
        message: 'Ocorreu um erro ao disparar a notificação. Tente novamente.',
        type: 'danger',
      });
    } finally {
      setSendingNotif(false);
    }
  }

  // FILTRO DE BUSCA + ORDENAÇÃO ALFABÉTICA (A-Z)
  const filteredUsers = users
    .filter((u) =>
      u.full_name.toLowerCase().includes(searchQuery.toLowerCase().trim())
    )
    .sort((a, b) =>
      a.full_name.localeCompare(b.full_name, 'pt-BR', { sensitivity: 'base' })
    );

  const totalUsers = users.length;
  const activeUsers = users.filter((u) => !u.is_blocked).length;
  const blockedUsers = users.filter((u) => u.is_blocked).length;

  const safeTopPadding = Math.max(insets?.top || 0, 16);
  const safeBottomPadding = Math.max(insets?.bottom || 0, 16);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace('/');
  }

  return (
    <View
      className={`flex-1 px-5 ${isDark ? 'bg-zinc-950' : 'bg-white'}`}
      style={{ paddingTop: safeTopPadding + 10 }}
    >
      {/* 1. CABEÇALHO ADMIN */}
      <MotiView
        from={{ opacity: 0, translateY: -10 }}
        animate={{ opacity: 1, translateY: 0 }}
        className={`flex-row items-center justify-between mb-5 pb-3 border-b ${
          isDark ? 'border-zinc-800' : 'border-[#e2dfe1]'
        }`}
      >
        <View className="flex-row items-center gap-2.5">
          <View className="w-10 h-10 rounded-2xl bg-[#59C83A]/10 items-center justify-center border border-[#59C83A]/30">
            <ShieldCheck size={22} color="#59C83A" weight="bold" />
          </View>
          <View>
            <Text
              className={`text-xl font-outfit-extrabold ${
                isDark ? 'text-white' : 'text-[#1b1b1d]'
              }`}
            >
              Painel Admin
            </Text>
            <Text
              className={`text-xs font-sans-medium ${
                isDark ? 'text-zinc-400' : 'text-[#71717a]'
              }`}
            >
              Gestão de Contas do Aplicativo
            </Text>
          </View>
        </View>

        {/* GRUPO DE AÇÕES DO CABEÇALHO */}
        <View className="flex-row items-center gap-2">
          {/* BOTÃO TOGGLE TEMA */}
          <TouchableOpacity
            onPress={() => setIsDark((prev) => !prev)}
            activeOpacity={0.7}
            className={`w-9 h-9 rounded-xl items-center justify-center border ${
              isDark
                ? 'bg-zinc-900 border-zinc-800'
                : 'bg-[#f8f9fa] border-[#e2dfe1]'
            }`}
          >
            {isDark ? (
              <Sun size={18} color="#eab308" weight="bold" />
            ) : (
              <Moon size={18} color="#6366f1" weight="bold" />
            )}
          </TouchableOpacity>

          {/* BOTÃO DISPARAR NOTIFICAÇÃO BROADCAST */}
          <TouchableOpacity
            onPress={() => {
              setNotifTarget('ALL');
              setNotifModalVisible(true);
            }}
            activeOpacity={0.7}
            className="w-9 h-9 rounded-xl bg-[#59C83A]/10 items-center justify-center border border-[#59C83A]/30"
          >
            <Bell size={18} color="#59C83A" weight="bold" />
          </TouchableOpacity>

          {/* BOTÃO LOGOUT */}
          <TouchableOpacity
            onPress={handleSignOut}
            className="w-9 h-9 rounded-xl bg-red-500/10 items-center justify-center border border-red-500/20"
          >
            <SignOut size={18} color="#e11d48" />
          </TouchableOpacity>
        </View>
      </MotiView>

      {/* 2. CARDS DE RESUMO ESTATÍSTICO */}
      <MotiView
        from={{ opacity: 0, translateY: 10 }}
        animate={{ opacity: 1, translateY: 0 }}
        className="flex-row gap-3 mb-5"
      >
        <View
          className={`flex-1 p-3.5 rounded-2xl border items-center ${
            isDark
              ? 'bg-zinc-900 border-zinc-800'
              : 'bg-[#f8f9fa] border-[#e2dfe1]'
          }`}
        >
          <Users size={20} color="#59C83A" />
          <Text
            className={`text-lg font-outfit-extrabold mt-1 ${
              isDark ? 'text-white' : 'text-[#1b1b1d]'
            }`}
          >
            {totalUsers}
          </Text>
          <Text
            className={`text-[10px] font-sans-bold ${
              isDark ? 'text-zinc-400' : 'text-[#71717a]'
            }`}
          >
            Total
          </Text>
        </View>

        <View
          className={`flex-1 p-3.5 rounded-2xl border items-center ${
            isDark
              ? 'bg-zinc-900 border-zinc-800'
              : 'bg-[#f8f9fa] border-[#e2dfe1]'
          }`}
        >
          <UserCheck size={20} color="#10b981" />
          <Text
            className={`text-lg font-outfit-extrabold mt-1 ${
              isDark ? 'text-white' : 'text-[#1b1b1d]'
            }`}
          >
            {activeUsers}
          </Text>
          <Text
            className={`text-[10px] font-sans-bold ${
              isDark ? 'text-emerald-400' : 'text-emerald-600'
            }`}
          >
            Ativos
          </Text>
        </View>

        <View
          className={`flex-1 p-3.5 rounded-2xl border items-center ${
            isDark
              ? 'bg-zinc-900 border-zinc-800'
              : 'bg-[#f8f9fa] border-[#e2dfe1]'
          }`}
        >
          <UserMinus size={20} color="#ef4444" />
          <Text
            className={`text-lg font-outfit-extrabold mt-1 ${
              isDark ? 'text-white' : 'text-[#1b1b1d]'
            }`}
          >
            {blockedUsers}
          </Text>
          <Text className="text-[10px] font-sans-bold text-red-500">
            Bloqueados
          </Text>
        </View>
      </MotiView>

      {/* 3. BARRA DE BUSCA */}
      <View
        className={`flex-row items-center border rounded-2xl px-4 py-3 mb-4 ${
          isDark
            ? 'bg-zinc-900 border-zinc-800'
            : 'bg-[#f8f9fa] border-[#e2dfe1]'
        }`}
      >
        <MagnifyingGlass size={18} color={isDark ? '#59C83A' : '#71717a'} />
        <TextInput
          className={`flex-1 ml-3 text-xs font-sans-medium ${
            isDark ? 'text-white' : 'text-[#1b1b1d]'
          }`}
          placeholder="Buscar usuário por nome..."
          placeholderTextColor={isDark ? '#71717a' : '#a09da1'}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <X size={16} color={isDark ? '#a1a1aa' : '#71717a'} />
          </TouchableOpacity>
        )}
      </View>

      {/* 4. LISTA DE USUÁRIOS */}
      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#59C83A" />
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#59C83A"
            />
          }
          renderItem={({ item }) => (
            <View
              className={`p-4 rounded-2xl mb-3 border flex-row items-center justify-between gap-3 ${
                item.is_blocked
                  ? 'bg-red-500/10 border-red-500/30'
                  : isDark
                  ? 'bg-zinc-900 border-zinc-800'
                  : 'bg-[#f8f9fa] border-[#e2dfe1]'
              }`}
            >
              <View className="flex-1 min-w-0 mr-1">
                <View className="flex-row flex-wrap items-center gap-1.5 mb-1">
                  <Text
                    className={`text-sm font-outfit-bold shrink ${
                      isDark ? 'text-white' : 'text-[#1b1b1d]'
                    }`}
                    numberOfLines={1}
                  >
                    {item.full_name}
                  </Text>
                  
                  <View
                    className={`px-2 py-0.5 rounded-full ${
                      item.role === 'admin'
                        ? 'bg-purple-500/20 border border-purple-500/40'
                        : item.role === 'personal'
                        ? 'bg-blue-500/20 border border-blue-500/40'
                        : isDark
                        ? 'bg-zinc-800'
                        : 'bg-zinc-200'
                    }`}
                  >
                    <Text
                      className={`text-[9px] font-sans-bold uppercase ${
                        isDark ? 'text-zinc-300' : 'text-zinc-700'
                      }`}
                    >
                      {item.role}
                    </Text>
                  </View>
                </View>

                <Text
                  className={`text-[11px] font-sans-medium ${
                    isDark ? 'text-zinc-400' : 'text-[#71717a]'
                  }`}
                >
                  Status:{' '}
                  <Text
                    className={`font-sans-bold ${
                      item.is_blocked ? 'text-red-500' : 'text-emerald-500'
                    }`}
                  >
                    {item.is_blocked ? 'Bloqueado' : 'Ativo'}
                  </Text>
                </Text>
              </View>

              {/* BOTOES DE AÇÃO DO CARTÃO */}
              <View className="flex-row items-center gap-2">
                {/* BOTÃO ENVIAR NOTIFICAÇÃO INDIVIDUAL */}
                <TouchableOpacity
                  onPress={() => {
                    setNotifTarget(item);
                    setNotifModalVisible(true);
                  }}
                  className="w-9 h-9 rounded-xl bg-[#59C83A]/10 items-center justify-center border border-[#59C83A]/30"
                >
                  <Bell size={16} color="#59C83A" weight="bold" />
                </TouchableOpacity>

                {/* BOTÃO BLOQUEAR/LIBERAR */}
                {item.role !== 'admin' && (
                  <TouchableOpacity
                    onPress={() => setSelectedUser(item)}
                    className={`px-3 py-2 rounded-xl flex-row items-center gap-1.5 shrink-0 ${
                      item.is_blocked ? 'bg-emerald-600' : 'bg-red-500'
                    }`}
                  >
                    <LockLaminated size={14} color="#ffffff" weight="bold" />
                    <Text className="text-xs font-sans-bold text-white">
                      {item.is_blocked ? 'Liberar' : 'Bloquear'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        />
      )}

      {/* MODAL DE ENVIAR NOTIFICAÇÃO */}
      <Modal
        visible={notifModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setNotifModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View className="flex-1 bg-black/60 justify-end">
              <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                <View
                  className={`rounded-t-3xl p-6 border-t ${
                    isDark
                      ? 'bg-zinc-900 border-zinc-800'
                      : 'bg-white border-[#e2dfe1]'
                  }`}
                  style={{ paddingBottom: Math.max(safeBottomPadding + 10, 24) }}
                >
                  <View className="flex-row items-center justify-between mb-4">
                    <View className="flex-row items-center gap-2">
                      <Bell size={20} color="#59C83A" weight="bold" />
                      <Text
                        className={`font-outfit text-lg ${
                          isDark ? 'text-white' : 'text-[#1b1b1d]'
                        }`}
                      >
                        {notifTarget === 'ALL'
                          ? 'Comunicado Geral'
                          : 'Notificar Usuário'}
                      </Text>
                    </View>

                    <TouchableOpacity
                      onPress={() => setNotifModalVisible(false)}
                      className={`w-8 h-8 rounded-full items-center justify-center ${
                        isDark ? 'bg-zinc-800' : 'bg-zinc-100'
                      }`}
                    >
                      <X size={18} color={isDark ? '#ffffff' : '#1b1b1d'} />
                    </TouchableOpacity>
                  </View>

                  <Text
                    className={`font-sans-medium text-xs mb-4 leading-5 ${
                      isDark ? 'text-zinc-400' : 'text-[#71717a]'
                    }`}
                  >
                    {notifTarget === 'ALL'
                      ? 'Esta mensagem será disparada para TODOS os usuários ativos da plataforma.'
                      : `Enviando notificação direta para: ${notifTarget.full_name}`}
                  </Text>

                  {/* Campo Título */}
                  <View className="mb-3">
                    <Text
                      className={`font-sans-bold text-[10px] uppercase mb-1 ${
                        isDark ? 'text-zinc-400' : 'text-[#71717a]'
                      }`}
                    >
                      Título da Notificação
                    </Text>
                    <TextInput
                      className={`font-sans-medium rounded-2xl px-4 py-3 border text-sm ${
                        isDark
                          ? 'bg-zinc-950 border-zinc-800 text-white'
                          : 'bg-[#f8f9fa] border-[#e2dfe1] text-[#1b1b1d]'
                      }`}
                      placeholder="Ex: Novo Treino Disponível! 🏋️‍♂️"
                      placeholderTextColor={isDark ? '#71717a' : '#a09da1'}
                      value={notifTitle}
                      onChangeText={setNotifTitle}
                    />
                  </View>

                  {/* Campo Mensagem */}
                  <View className="mb-5">
                    <Text
                      className={`font-sans-bold text-[10px] uppercase mb-1 ${
                        isDark ? 'text-zinc-400' : 'text-[#71717a]'
                      }`}
                    >
                      Conteúdo da Mensagem
                    </Text>
                    <TextInput
                      className={`font-sans-medium rounded-2xl px-4 py-3 border text-sm ${
                        isDark
                          ? 'bg-zinc-950 border-zinc-800 text-white'
                          : 'bg-[#f8f9fa] border-[#e2dfe1] text-[#1b1b1d]'
                      }`}
                      placeholder="Escreva a mensagem..."
                      placeholderTextColor={isDark ? '#71717a' : '#a09da1'}
                      value={notifMessage}
                      onChangeText={setNotifMessage}
                      multiline
                      numberOfLines={3}
                      style={{ textAlignVertical: 'top' }}
                    />
                  </View>

                  {/* Botão Enviar */}
                  <TouchableOpacity
                    onPress={handleSendNotification}
                    disabled={sendingNotif}
                    className="bg-[#59C83A] py-3.5 rounded-2xl flex-row items-center justify-center gap-2 shadow-md"
                  >
                    {sendingNotif ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <>
                        <Text className="font-outfit text-white text-base">
                          Disparar Notificação
                        </Text>
                        <PaperPlaneRight size={18} color="#ffffff" weight="bold" />
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL DE CONFIRMAÇÃO DE ALTERAÇÃO DE STATUS */}
      {selectedUser && (
        <CustomModal
          visible={!!selectedUser}
          title={
            selectedUser.is_blocked
              ? 'Desbloquear Usuário'
              : 'Bloquear Acesso'
          }
          message={
            selectedUser.is_blocked
              ? `Deseja reativar o acesso de ${selectedUser.full_name} ao aplicativo?`
              : `Tem certeza que deseja proibir o acesso de ${selectedUser.full_name}?`
          }
          type={selectedUser.is_blocked ? 'success' : 'danger'}
          confirmText={selectedUser.is_blocked ? 'Desbloquear' : 'Bloquear'}
          cancelText="Cancelar"
          showCancelButton
          onConfirm={() =>
            toggleBlockMutation.mutate({
              userId: selectedUser.id,
              shouldBlock: !selectedUser.is_blocked,
            })
          }
          onClose={() => setSelectedUser(null)}
        />
      )}

      {/* 🟢 MODAL DE ALERTA DE SUCESSO / ERRO (COM onConfirm ADICIONADO) */}
      <CustomModal
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        confirmText="Entendi"
        onConfirm={() => setAlertConfig((prev) => ({ ...prev, visible: false }))}
        onClose={() => setAlertConfig((prev) => ({ ...prev, visible: false }))}
      />
    </View>
  );
}