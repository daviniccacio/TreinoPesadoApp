// ============================================================================
// DOCUMENTAÇÃO: PAINEL DE GESTÃO ADMINISTRATIVA (LOGOUT SEGURO & VPS)
// ============================================================================
// Gerencia a listagem de usuários, bloqueio de contas e disparos de notificações,
// contando com fluxo de encerramento de sessão protegido contra travamentos.
// ============================================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
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
import { useRouter } from 'expo-router';

// IMPORTAÇÃO DA API VPS, CONTEXTOS E COMPONENTES LOCAIS
import { api } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { CustomModal } from '../../../components/CustomModal';
import {
  sendBroadcastNotification,
  sendNotificationToUser,
} from '../../../lib/notifications';

interface UserProfile {
  id: string;
  full_name: string;
  email?: string;
  role: string;
  is_blocked: boolean;
  created_at: string;
}

/**
 * Busca a lista de todos os usuários cadastrados na VPS
 */
async function fetchAllUsers(): Promise<UserProfile[]> {
  const response = await api.get('/api/admin/users');
  const data = response.data || [];

  return data.map((user: any) => ({
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
  const queryClient = useQueryClient();

  // CONTEXTOS GLOBAIS DE TEMA E AUTENTICAÇÃO
  const { isDark, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();

  const currentAdminId = user?.id || '';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  // ESTADOS DOS MODAIS
  const [notifModalVisible, setNotifModalVisible] = useState(false);
  const [notifTarget, setNotifTarget] = useState<UserProfile | 'ALL'>('ALL');
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [sendingNotif, setSendingNotif] = useState(false);

  // ESTADO DO MODAL DE ALERTAS
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

  // CONSULTA TANSTACK QUERY CONECTADA À VPS
  const {
    data: users = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['admin-users-list'],
    queryFn: fetchAllUsers,
  });

  // MUTATION PARA BLOQUEAR / LIBERAR USUÁRIO
  const toggleBlockMutation = useMutation({
    mutationFn: async ({
      userId,
      shouldBlock,
    }: {
      userId: string;
      shouldBlock: boolean;
    }) => {
      await api.put('/api/admin/users/block', {
        userId,
        shouldBlock,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users-list'] });
      setSelectedUser(null);
    },
    onError: (err: any) => {
      console.error('❌ Erro ao alterar bloqueio:', err.message);
      setAlertConfig({
        visible: true,
        title: 'Erro na Operação',
        message: err?.response?.data?.error || 'Não foi possível alterar o status do usuário.',
        type: 'danger',
      });
    },
  });

  // DISPARO DE NOTIFICAÇÃO
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
            ? 'Sua mensagem foi transmitida para todos os alunos e personais.'
            : `Notificação enviada com sucesso para ${notifTarget.full_name}.`,
        type: 'success',
      });
    } catch (error: any) {
      console.error('Erro ao disparar notificação:', error);
      setAlertConfig({
        visible: true,
        title: 'Falha no Envio',
        message: error?.message || 'Ocorreu um erro ao disparar a notificação. Tente novamente.',
        type: 'danger',
      });
    } finally {
      setSendingNotif(false);
    }
  }

  // 🟢 FUNÇÃO DE ENCERRAMENTO DE SESSÃO SEGURA (SEM CONGELAMENTO)
  async function handleSignOut() {
    try {
      // 1. Limpa todos os modais abertos antes de desconectar
      setNotifModalVisible(false);
      setSelectedUser(null);
      setAlertConfig((prev) => ({ ...prev, visible: false }));

      // 2. Cancela consultas ativas do TanStack Query para evitar re-renders na transição
      queryClient.cancelQueries({ queryKey: ['admin-users-list'] });

      // 3. Executa a desautenticação
      if (signOut) {
        await signOut();
      }
    } catch (err) {
      console.error('❌ Erro ao realizar logout:', err);
    } finally {
      // 4. Redireciona com segurança usando replace para a tela inicial/login
      router.replace('/');
    }
  }

  // FILTRAGEM E ORDENAÇÃO DE USUÁRIOS
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

        <View className="flex-row items-center gap-2">
          <TouchableOpacity
            onPress={toggleTheme}
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

          <TouchableOpacity
            onPress={handleSignOut}
            className="w-9 h-9 rounded-xl bg-red-500/10 items-center justify-center border border-red-500/20"
          >
            <SignOut size={18} color="#e11d48" />
          </TouchableOpacity>
        </View>
      </MotiView>

      {/* 2. CARDS ESTATÍSTICOS */}
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
                    className={`text-sm font-outfit shrink ${
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

              <View className="flex-row items-center gap-2">
                {item.role !== 'admin' && (
                  <TouchableOpacity
                    onPress={() => {
                      setNotifTarget(item);
                      setNotifModalVisible(true);
                    }}
                    className="w-9 h-9 rounded-xl bg-[#59C83A]/10 items-center justify-center border border-[#59C83A]/30"
                  >
                    <Bell size={16} color="#59C83A" weight="bold" />
                  </TouchableOpacity>
                )}

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

      {/* MODAL DE DISPARO DE NOTIFICAÇÃO */}
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
                      ? 'Esta mensagem será disparada para todos os alunos e personais ativos.'
                      : `Enviando notificação direta para: ${notifTarget.full_name}`}
                  </Text>

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
                      placeholder="Ex: Feriado Amanhã!"
                      placeholderTextColor={isDark ? '#71717a' : '#a09da1'}
                      value={notifTitle}
                      onChangeText={setNotifTitle}
                    />
                  </View>

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
                          Enviar Notificação
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

      {/* MODAL DE CONFIRMAÇÃO DE BLOQUEIO */}
      {selectedUser && (
        <CustomModal
          visible={!!selectedUser}
          isDark={isDark}
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

      {/* MODAL DE ALERTA DE SUCESSO / ERRO */}
      <CustomModal
        visible={alertConfig.visible}
        isDark={isDark}
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