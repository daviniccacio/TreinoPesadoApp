// ============================================================================
// DOCUMENTAÇÃO: TELA DE PERFIL DO ALUNO (INTEGRADA À VPS ORACLE CLOUD)
// ============================================================================
// Gerencia perfil, estatísticas, vínculo com personal, notificações, tema,
// exclusão de conta e logout seguro utilizando o AuthContext e a API Express.
// ============================================================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Linking,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  User,
  UserPlus,
  Moon,
  Sun,
  SignOut,
  CaretRight,
  Bell,
  X,
  CheckCircle,
  Key,
  Barbell,
  Timer,
  ShieldCheck,
  ArrowSquareOut,
  Trash,
  WarningCircle,
} from 'phosphor-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MotiView } from 'moti';

// IMPORTAÇÃO DA API DA VPS E DO CONTEXTO DE AUTENTICAÇÃO
import { api } from '../../../../services/api';
import { useAuth } from '../../../../context/AuthContext';
import { useTheme } from '../../../../context/ThemeContext';
import { CustomModal } from '../../../../components/CustomModal';
import { UserNotificationModal } from '../../../../components/UserNotificationModal';

interface StudentProfileData {
  fullName: string;
  email: string;
  personalName: string | null;
  totalWorkoutsCompleted: number;
  totalWorkoutMinutes: number;
}

interface ShowAlertModalOptions {
  title: string;
  message: string;
  type?: 'success' | 'danger' | 'info';
  confirmText?: string;
  cancelText?: string;
  showCancelButton?: boolean;
  onConfirm?: () => void;
}

interface PrivacyButtonProps {
  policyUrl?: string;
}

/**
 * Busca os dados do perfil do aluno e estatísticas diretamente na API da VPS.
 */
async function fetchStudentProfileData(userId?: string): Promise<StudentProfileData> {
  if (!userId) throw new Error('Usuário não autenticado.');

  // 1. Busca os dados do perfil na VPS
  const profileRes = await api.get(`/api/profiles/me?userId=${userId}`);
  const profile = profileRes.data;

  let fullName = profile?.name || profile?.full_name ? (profile.name || profile.full_name).trim() : 'Atleta';
  if (fullName === 'Atleta' && profile?.email) {
    fullName = profile.email.split('@')[0];
  }

  let personalName: string | null = null;

  // Se houver um personal_id vinculado, busca o nome do personal
  if (profile?.personal_id) {
    try {
      const personalRes = await api.get(`/api/profiles/me?userId=${profile.personal_id}`);
      if (personalRes.data?.name || personalRes.data?.full_name) {
        personalName = (personalRes.data.name || personalRes.data.full_name).trim();
      }
    } catch (e) {
      console.log('Aviso: Não foi possível carregar o nome do personal.');
    }
  }

  // 2. Busca histórico de treinos para estatísticas
  let totalWorkoutsCompleted = 0;
  let totalWorkoutSeconds = 0;

  try {
    const workoutsRes = await api.get(`/api/student-workouts/${userId}`);
    totalWorkoutsCompleted = Array.isArray(workoutsRes.data) ? workoutsRes.data.length : 0;
  } catch (err) {
    console.log('Aviso ao consultar estatísticas de treinos:', err);
  }

  return {
    fullName,
    email: profile?.email || '',
    personalName,
    totalWorkoutsCompleted,
    totalWorkoutMinutes: totalWorkoutSeconds,
  };
}

/**
 * Realiza o vínculo do aluno com o Personal Trainer utilizando o código de convite na VPS.
 */
async function linkStudentToPersonalByCode(inviteCode: string, userId?: string) {
  const cleanCode = inviteCode.trim().toUpperCase();

  if (!cleanCode) {
    throw new Error('Por favor, digite o código de acesso do seu Personal.');
  }
  if (!userId) {
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  const response = await api.post('/api/profiles/link-personal', {
    userId,
    inviteCode: cleanCode,
  });

  return response.data.personalName || 'Personal Trainer';
}

export function PrivacyPolicyButton({
  policyUrl = 'https://politicadeprivacidadetreinopesadoapp.netlify.app/',
}: PrivacyButtonProps) {
  const handleOpenLink = async () => {
    const supported = await Linking.canOpenURL(policyUrl);
    if (supported) {
      await Linking.openURL(policyUrl);
    }
  };

  return (
    <TouchableOpacity
      onPress={handleOpenLink}
      activeOpacity={0.7}
      className="flex-row items-center justify-between p-4"
    >
      <View className="flex-row items-center gap-3">
        <ShieldCheck size={20} color="#59C83A" weight="bold" />
        <Text className="font-outfit text-sm text-[#1b1b1d] dark:text-white">
          Política de Privacidade
        </Text>
      </View>
      <ArrowSquareOut size={16} color="#a1a1aa" />
    </TouchableOpacity>
  );
}

export default function StudentProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { user, signOut } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const [isLinkModalOpen, setIsLinkModalOpen] = useState<boolean>(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState<boolean>(false);
  const [inviteCodeInput, setInviteCodeInput] = useState<string>('');

  const [modalConfig, setModalConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'danger' | 'info';
    confirmText: string;
    cancelText: string;
    showCancelButton: boolean;
    onConfirm: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
    confirmText: 'Entendi',
    cancelText: 'Cancelar',
    showCancelButton: true,
    onConfirm: () => {},
  });

  function showAlertModal({
    title,
    message,
    type = 'info',
    confirmText = 'Entendi',
    cancelText = 'Cancelar',
    showCancelButton = true,
    onConfirm,
  }: ShowAlertModalOptions) {
    setModalConfig({
      visible: true,
      title,
      message,
      type,
      confirmText,
      cancelText,
      showCancelButton,
      onConfirm: () => {
        setModalConfig((prev) => ({ ...prev, visible: false }));
        if (onConfirm) onConfirm();
      },
    });
  }

  // --- QUERY DE PERFIL CONECTADA À VPS ---
  const {
    data: profile,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['student-profile-data', user?.id],
    queryFn: () => fetchStudentProfileData(user?.id),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  });

  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        refetch();
      }
    }, [user?.id, refetch])
  );

  const { data: hasUnreadNotifications = false } = useQuery({
    queryKey: ['user-unread-notifications-status', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      try {
        const res = await api.get(`/api/notifications/unread?userId=${user.id}`);
        return res.data?.hasUnread || false;
      } catch (e) {
        return false;
      }
    },
    enabled: !!user?.id,
    staleTime: 1000 * 10,
  });

  function handleOpenNotifications() {
    setIsNotificationModalOpen(true);
    queryClient.setQueryData(['user-unread-notifications-status', user?.id], false);
  }

  // 🟢 MUTAÇÃO DE VÍNCULO CORRIGIDA COM FORÇAMENTO DE REFETCH
  const linkMutation = useMutation({
    mutationFn: (code: string) => linkStudentToPersonalByCode(code, user?.id),
    onSuccess: async (personalName) => {
      Keyboard.dismiss();
      setIsLinkModalOpen(false);
      setInviteCodeInput('');

      // Invalida e força o refetch imediato ignorando o staleTime
      await queryClient.invalidateQueries({ queryKey: ['student-profile-data', user?.id] });
      await refetch();

      showAlertModal({
        title: 'Sucesso! 🎉',
        message: `Você foi vinculado com sucesso ao Personal ${personalName}!`,
        type: 'success',
        showCancelButton: false,
      });
    },
    onError: (err: any) => {
      Keyboard.dismiss();
      showAlertModal({
        title: 'Erro ao Vincular',
        message: err?.response?.data?.erro || err.message || 'Não foi possível realizar o vínculo.',
        type: 'danger',
        showCancelButton: false,
      });
    },
  });

  function handleConfirmLink() {
    if (!inviteCodeInput.trim()) {
      showAlertModal({
        title: 'Atenção',
        message: 'Por favor, digite o código de acesso do seu Personal.',
        type: 'info',
        showCancelButton: false,
      });
      return;
    }
    linkMutation.mutate(inviteCodeInput);
  }

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Sessão expirada.');
      await api.delete(`/api/profiles/${user.id}`);
    },
    onSuccess: async () => {
      await signOut();
      queryClient.clear();
      router.replace('/(auth)/login');
    },
    onError: (err: any) => {
      showAlertModal({
        title: 'Erro ao Excluir',
        message: err?.response?.data?.erro || err.message || 'Não foi possível excluir sua conta.',
        type: 'danger',
        showCancelButton: false,
      });
    },
  });

  function handleDeleteAccount() {
    showAlertModal({
      title: 'Excluir Minha Conta ⚠️',
      message: 'Esta ação apagará seus dados permanentemente. Deseja continuar?',
      type: 'danger',
      confirmText: 'Excluir Definitivamente',
      cancelText: 'Cancelar',
      showCancelButton: true,
      onConfirm: () => deleteAccountMutation.mutate(),
    });
  }

  function handleSignOut() {
    showAlertModal({
      title: 'Sair da Conta',
      message: 'Deseja realmente encerrar sua sessão no aplicativo?',
      type: 'danger',
      confirmText: 'Sair',
      cancelText: 'Cancelar',
      showCancelButton: true,
      onConfirm: async () => {
        try {
          await signOut();
          queryClient.clear();
          router.replace('/(auth)/login');
        } catch (err) {
          console.error('Erro ao sair:', err);
        }
      },
    });
  }

  function formatWorkoutTime(totalSeconds: number) {
    if (!totalSeconds || totalSeconds <= 0) return '0 min';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    if (hours === 0) return `${minutes} min`;
    return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  }

  const safeTopPadding = Math.max(insets?.top || 0, 16);
  const safeModalBottomPadding =
    Platform.OS === 'ios'
      ? Math.max(insets?.bottom || 0, 20) + 16
      : Math.max(insets?.bottom || 0, 16) + 20;

  if (isLoading && !isRefetching && !profile) {
    return (
      <View
        className={`flex-1 justify-center items-center px-5 ${isDark ? 'bg-zinc-950' : 'bg-[#f8f9fa]'}`}
        style={{ paddingTop: safeTopPadding }}
      >
        <ActivityIndicator size="large" color="#59C83A" />
        <Text className={`text-xs font-sans-medium mt-3 ${isDark ? 'text-zinc-400' : 'text-[#71717a]'}`}>
          Carregando informações do perfil...
        </Text>
      </View>
    );
  }

  if ((isError || !profile) && !isLoading) {
    return (
      <View
        className={`flex-1 justify-center items-center px-6 ${isDark ? 'bg-zinc-950' : 'bg-[#f8f9fa]'}`}
        style={{ paddingTop: safeTopPadding }}
      >
        <MotiView
          from={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="items-center"
        >
          <WarningCircle size={48} color="#ef4444" />
          <Text className={`text-base font-outfit-bold mt-3 text-center ${isDark ? 'text-white' : 'text-[#1b1b1d]'}`}>
            Não foi possível carregar seu perfil
          </Text>
          <Text className={`text-xs font-sans-medium text-center mt-1 mb-5 ${isDark ? 'text-zinc-400' : 'text-[#71717a]'}`}>
            {(error as Error)?.message || 'Ocorreu um problema ao conectar com a VPS.'}
          </Text>
          <TouchableOpacity
            onPress={() => refetch()}
            style={{ backgroundColor: '#59C83A' }}
            className="px-6 py-3 rounded-2xl active:opacity-90"
          >
            <Text className="text-xs font-sans-bold text-white">Tentar Novamente</Text>
          </TouchableOpacity>
        </MotiView>
      </View>
    );
  }

  return (
    <View
      className={`flex-1 px-5 pb-4 ${isDark ? 'bg-zinc-950' : 'bg-[#f8f9fa]'}`}
      style={{ paddingTop: safeTopPadding }}
    >
      <MotiView
        from={{ opacity: 0, translateY: -8 }}
        animate={{ opacity: 1, translateY: 0 }}
        className={`py-4 flex-row justify-between items-center border-b ${isDark ? 'border-zinc-800' : 'border-[#e2dfe1]'}`}
      >
        <Text className={`text-xl font-outfit-extrabold ${isDark ? 'text-white' : 'text-[#1b1b1d]'}`}>
          Meu Perfil
        </Text>
      </MotiView>

      <ScrollView
        className="flex-1 pt-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* CARTÃO DO ALUNO */}
        <MotiView
          from={{ opacity: 0, scale: 0.95, translateY: 10 }}
          animate={{ opacity: 1, scale: 1, translateY: 0 }}
          className="items-center mb-6"
        >
          <View
            style={{ backgroundColor: '#59C83A' }}
            className="w-24 h-24 rounded-full items-center justify-center mb-3 shadow-sm border border-[#46ab2b]"
          >
            <User size={48} color="#ffffff" weight="bold" />
          </View>

          <Text className={`text-2xl font-outfit-extrabold text-center ${isDark ? 'text-white' : 'text-[#1b1b1d]'}`}>
            {profile?.fullName}
          </Text>
          <Text className={`text-sm font-sans-medium mt-0.5 ${isDark ? 'text-zinc-400' : 'text-[#414755]'}`}>
            {profile?.email}
          </Text>

          <View className="mt-2 bg-[#59C83A]/10 border border-[#59C83A]/30 px-3 py-1 rounded-full flex-row items-center">
            <Text className="text-xs font-sans-bold text-[#59C83A]">
              {profile?.personalName ? `Personal: ${profile.personalName}` : 'Sem Personal Vinculado'}
            </Text>
          </View>
        </MotiView>

        {/* INSTRUTOR */}
        <MotiView from={{ opacity: 0, translateY: 12 }} animate={{ opacity: 1, translateY: 0 }}>
          <Text className={`text-lg font-outfit mb-3 ${isDark ? 'text-white' : 'text-[#1b1b1d]'}`}>
            Instrutor
          </Text>

          <View className={`rounded-2xl overflow-hidden mb-5 border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-[#e2dfe1]'}`}>
            <TouchableOpacity
              onPress={() => setIsLinkModalOpen(true)}
              className="flex-row items-center justify-between p-4"
              activeOpacity={0.7}
            >
              <View className="flex-row items-center gap-3">
                <View className="w-9 h-9 rounded-xl bg-[#59C83A]/10 items-center justify-center border border-[#59C83A]/30">
                  <UserPlus size={20} color="#59C83A" weight="bold" />
                </View>
                <View>
                  <Text className={`font-outfit text-sm ${isDark ? 'text-white' : 'text-[#1b1b1d]'}`}>
                    Conectar com meu Personal
                  </Text>
                  <Text className={`text-xs font-sans-medium ${isDark ? 'text-zinc-400' : 'text-[#71717a]'}`}>
                    {profile?.personalName ? 'Trocar ou redefinir seu instrutor' : 'Inserir código de acesso do personal'}
                  </Text>
                </View>
              </View>
              <CaretRight size={18} color={isDark ? '#a1a1aa' : '#414755'} />
            </TouchableOpacity>
          </View>
        </MotiView>

        {/* CARDS ESTATÍSTICOS */}
        <MotiView from={{ opacity: 0, translateY: 12 }} animate={{ opacity: 1, translateY: 0 }} className="flex-row justify-between mb-6">
          <View className={`w-[48%] p-4 rounded-2xl border items-center ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-[#e2dfe1]'}`}>
            <View className="w-10 h-10 rounded-xl bg-[#59C83A]/10 items-center justify-center mb-2 border border-[#59C83A]/30">
              <Barbell size={22} color="#59C83A" weight="bold" />
            </View>
            <Text className={`text-xs font-sans-bold ${isDark ? 'text-zinc-400' : 'text-[#71717a]'}`}>
              Treinos Realizados
            </Text>
            <Text className={`text-xl font-outfit-extrabold mt-0.5 ${isDark ? 'text-white' : 'text-[#1b1b1d]'}`}>
              {profile?.totalWorkoutsCompleted || 0}
            </Text>
          </View>

          <View className={`w-[48%] p-4 rounded-2xl border items-center ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-[#e2dfe1]'}`}>
            <View className="w-10 h-10 rounded-xl bg-[#59C83A]/10 items-center justify-center mb-2 border border-[#59C83A]/30">
              <Timer size={22} color="#59C83A" weight="bold" />
            </View>
            <Text className={`text-xs font-sans-bold ${isDark ? 'text-zinc-400' : 'text-[#71717a]'}`}>
              Tempo de Treino
            </Text>
            <Text className={`text-xl font-outfit-extrabold mt-0.5 ${isDark ? 'text-white' : 'text-[#1b1b1d]'}`}>
              {formatWorkoutTime(profile?.totalWorkoutMinutes || 0)}
            </Text>
          </View>
        </MotiView>

        {/* APARÊNCIA */}
        <MotiView from={{ opacity: 0, translateY: 12 }} animate={{ opacity: 1, translateY: 0 }}>
          <Text className={`text-lg font-outfit mb-3 ${isDark ? 'text-white' : 'text-[#1b1b1d]'}`}>
            Aparência
          </Text>
          <View className={`rounded-2xl p-2 mb-6 border flex-row ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-[#e2dfe1]'}`}>
            <TouchableOpacity
              onPress={() => { if (isDark) toggleTheme(); }}
              className={`flex-1 py-3 rounded-xl flex-row items-center justify-center gap-1.5 ${!isDark ? 'bg-[#f8f9fa] border border-[#e2dfe1]' : 'bg-transparent'}`}
            >
              <Sun size={16} color={!isDark ? '#59C83A' : '#9ca3af'} weight="bold" />
              <Text className={`font-sans-bold text-xs ${!isDark ? 'text-[#59C83A]' : 'text-zinc-400'}`}>Claro</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => { if (!isDark) toggleTheme(); }}
              className={`flex-1 py-3 rounded-xl flex-row items-center justify-center gap-1.5 ${isDark ? 'bg-zinc-800 border border-zinc-700' : 'bg-transparent'}`}
            >
              <Moon size={16} color={isDark ? '#59C83A' : '#9ca3af'} weight="bold" />
              <Text className={`font-sans-bold text-xs ${isDark ? 'text-[#59C83A]' : 'text-[#71717a]'}`}>Escuro</Text>
            </TouchableOpacity>
          </View>
        </MotiView>

        {/* CONFIGURAÇÕES */}
        <MotiView from={{ opacity: 0, translateY: 12 }} animate={{ opacity: 1, translateY: 0 }}>
          <Text className={`text-lg font-outfit mb-3 ${isDark ? 'text-white' : 'text-[#1b1b1d]'}`}>
            Configurações
          </Text>

          <View className={`rounded-2xl overflow-hidden mb-6 border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-[#e2dfe1]'}`}>
            <TouchableOpacity
              onPress={handleOpenNotifications}
              className={`flex-1 flex-row items-center justify-between p-4 border-b ${isDark ? 'border-zinc-800' : 'border-[#e2dfe1]'}`}
              activeOpacity={0.7}
            >
              <View className="flex-row items-center gap-3">
                <Bell size={20} color={hasUnreadNotifications ? '#59C83A' : isDark ? '#ffffff' : '#1b1b1d'} />
                <Text className={`font-outfit ${hasUnreadNotifications ? 'text-[#59C83A] font-bold' : isDark ? 'text-white' : 'text-[#1b1b1d]'}`}>
                  Notificações
                </Text>
                {hasUnreadNotifications && <View className="w-2.5 h-2.5 rounded-full bg-[#59C83A] ml-2" />}
              </View>
              <CaretRight size={18} color={hasUnreadNotifications ? '#59C83A' : isDark ? '#a1a1aa' : '#414755'} />
            </TouchableOpacity>

            <View className={`border-b ${isDark ? 'border-zinc-800' : 'border-[#e2dfe1]'}`}>
              <PrivacyPolicyButton />
            </View>

            <TouchableOpacity
              onPress={handleDeleteAccount}
              disabled={deleteAccountMutation.isPending}
              className="flex-row items-center justify-between p-4"
              activeOpacity={0.7}
            >
              <View className="flex-row items-center gap-3">
                <Trash size={20} color="#ef4444" weight="bold" />
                <Text className="font-outfit text-sm text-red-500">Excluir Minha Conta</Text>
              </View>
              {deleteAccountMutation.isPending ? <ActivityIndicator size="small" color="#ef4444" /> : <CaretRight size={18} color="#ef4444" />}
            </TouchableOpacity>
          </View>
        </MotiView>

        {/* BOTÃO SAIR DA CONTA */}
        <MotiView from={{ opacity: 0, translateY: 12 }} animate={{ opacity: 1, translateY: 0 }}>
          <TouchableOpacity
            onPress={handleSignOut}
            style={{
              backgroundColor: isDark ? 'rgba(127, 29, 29, 0.2)' : '#ffebe8',
              borderColor: isDark ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
            }}
            className="p-4 rounded-2xl items-center flex-row justify-center mb-6 border"
            activeOpacity={0.8}
          >
            <SignOut size={20} color="#e11d48" />
            <Text className="text-[#e11d48] font-sans-bold text-base ml-2">
              Sair da Conta
            </Text>
          </TouchableOpacity>
        </MotiView>
      </ScrollView>

      {/* MODAL CÓDIGO PERSONAL */}
      <Modal visible={isLinkModalOpen} animationType="slide" transparent>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View className="flex-1 bg-black/60 justify-end">
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="w-full">
              <View
                style={{ paddingBottom: safeModalBottomPadding }}
                className={`rounded-t-3xl p-6 border-t ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-[#e2dfe1]'}`}
              >
                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  <View className={`flex-row items-center justify-between mb-4 pb-3 border-b ${isDark ? 'border-zinc-800' : 'border-[#e2dfe1]'}`}>
                    <View className="flex-row items-center gap-2">
                      <View className="w-9 h-9 rounded-xl bg-[#59C83A]/10 items-center justify-center border border-[#59C83A]/30">
                        <Key size={20} color="#59C83A" weight="bold" />
                      </View>
                      <Text className={`text-lg font-outfit-extrabold ${isDark ? 'text-white' : 'text-[#1b1b1d]'}`}>
                        Código do Personal
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => setIsLinkModalOpen(false)} className={`w-8 h-8 rounded-full items-center justify-center ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
                      <X size={18} color={isDark ? '#ffffff' : '#1b1b1d'} />
                    </TouchableOpacity>
                  </View>

                  <Text className={`text-xs font-sans-medium mb-4 leading-5 ${isDark ? 'text-zinc-400' : 'text-[#71717a]'}`}>
                    Peça o código exclusivo de convite ao seu Personal Trainer para permitir a prescrição de suas fichas.
                  </Text>

                  <TextInput
                    className={`border rounded-2xl px-4 py-3.5 text-lg font-outfit-extrabold tracking-widest uppercase mb-5 text-center ${isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-[#f8f9fa] border-[#e2dfe1] text-[#1b1b1d]'}`}
                    placeholder="PERS-XXXX"
                    placeholderTextColor={isDark ? '#71717a' : '#a09da1'}
                    value={inviteCodeInput}
                    onChangeText={setInviteCodeInput}
                    autoCapitalize="characters"
                    autoCorrect={false}
                  />

                  <TouchableOpacity
                    onPress={handleConfirmLink}
                    disabled={linkMutation.isPending}
                    className="bg-[#59C83A] py-4 rounded-2xl items-center flex-row justify-center mt-1"
                    activeOpacity={0.8}
                  >
                    {linkMutation.isPending ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <>
                        <CheckCircle size={20} color="#FFFFFF" weight="bold" />
                        <Text className="text-white font-sans-bold text-base ml-2">
                          Confirmar Vínculo
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

      <UserNotificationModal visible={isNotificationModalOpen} onClose={() => setIsNotificationModalOpen(false)} />

      <CustomModal
        visible={modalConfig.visible}
        isDark={isDark}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        confirmText={modalConfig.confirmText}
        cancelText={modalConfig.cancelText}
        showCancelButton={modalConfig.showCancelButton}
        onConfirm={modalConfig.onConfirm}
        onClose={() => setModalConfig((prev) => ({ ...prev, visible: false }))}
      />
    </View>
  );
}