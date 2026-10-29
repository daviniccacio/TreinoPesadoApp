// ============================================================================
// DOCUMENTAÇÃO: TELA DE PERFIL DO PERSONAL TRAINER COM TIPAGEM E MODAL
// ============================================================================
// Exibe resumo profissional, código de acesso para alunos, métricas de trabalho,
// alternância de tema global e modal interativo para exibição e edição de dados,
// completamente ajustado contra erros de compilação do TypeScript.
// ============================================================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
  Modal,
  TextInput,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  User,
  Users,
  Moon,
  Sun,
  SignOut,
  CaretRight,
  ShieldCheck,
  ArrowSquareOut,
  Bell,
  Books,
  Key,
  Trash,
  WarningCircle,
  Phone,
  CalendarBlank,
  X,
  Check,
  EnvelopeSimple,
} from 'phosphor-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MotiView } from 'moti';

import { supabase } from '../../../../lib/supabase';
import { CustomModal } from '../../../../components/CustomModal';
import { SendNotificationModal } from '../../../../components/SendNotificationModal';
import { Skeleton } from '../../../../components/SkeletonLoading';
import { useTheme } from '../../../../context/ThemeContext';

// --- TIPAGENS DE DADOS ---
interface PersonalProfileData {
  fullName: string;
  email: string;
  phone: string;
  birthDate: string;
  inviteCode: string;
  libraryTemplatesCount: number;
  linkedStudentsCount: number;
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

// ============================================================================
// FUNÇÕES AUXILIARES DE FORMATAÇÃO E MÁSCARA
// ============================================================================

/** Formata número de telefone em tempo real: (XX) XXXXX-XXXX */
function maskPhone(value: string): string {
  const cleanValue = value.replace(/\D/g, '');
  if (cleanValue.length <= 10) {
    return cleanValue
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');
  }
  return cleanValue
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{4})\d+?$/, '$1');
}

/** Converte datas no formato YYYY-MM-DD para DD/MM/AAAA */
function formatISOToDate(isoString?: string | null): string {
  if (!isoString) return 'Não informada';
  const parts = isoString.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  }
  return isoString;
}

// SUBCOMPONENTE DE SKELETON PARA O PERFIL DO PERSONAL
function PersonalProfileSkeleton({ isDark }: { isDark: boolean }) {
  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 140,
      }}
      showsVerticalScrollIndicator={false}
    >
      <Skeleton width={120} height={24} borderRadius={8} className="mb-6" />

      {/* Avatar + Nome + Email */}
      <View className="items-center mb-6">
        <Skeleton width={96} height={96} borderRadius={48} className="mb-3" />
        <Skeleton width="55%" height={24} borderRadius={8} className="mb-2" />
        <Skeleton width="40%" height={16} borderRadius={6} />
      </View>

      {/* Card Código de Acesso */}
      <Skeleton width="100%" height={70} borderRadius={16} className="mb-6" />

      {/* Card de Atalho das Informações Pessoais */}
      <Skeleton width="100%" height={60} borderRadius={16} className="mb-6" />

      {/* Estatísticas */}
      <Skeleton width={160} height={20} borderRadius={6} className="mb-3" />
      <View className="flex-row justify-between gap-3 mb-6">
        <Skeleton width="48%" height={100} borderRadius={16} />
        <Skeleton width="48%" height={100} borderRadius={16} />
      </View>
    </ScrollView>
  );
}

/** Componente do botão da Política de Privacidade com abertura externa */
export function PrivacyPolicyButton({
  policyUrl = 'https://treinopesadoacademia.com.br/politica-de-privacidade/app',
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

/** Busca dados do perfil do Personal Trainer no Supabase */
async function fetchPersonalProfileData(): Promise<PersonalProfileData> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Sessão expirada ou usuário não autenticado.');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, invite_code, phone, birth_date')
    .eq('id', user.id)
    .single();

  const fullName =
    profile?.full_name ||
    `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim() ||
    'Personal Trainer';

  const { count: libraryCount } = await supabase
    .from('workout_plans')
    .select('*', { count: 'exact', head: true })
    .is('student_id', null)
    .eq('personal_id', user.id);

  const { count: studentsCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('personal_id', user.id);

  return {
    fullName,
    email: user.email || '',
    phone: profile?.phone || '',
    birthDate: profile?.birth_date || '',
    inviteCode: profile?.invite_code || 'PERS-XXXX',
    libraryTemplatesCount: libraryCount || 0,
    linkedStudentsCount: studentsCount || 0,
  };
}

export default function PersonalProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { isDark, toggleTheme } = useTheme();

  // ESTADOS DOS MODAIS
  const [modalVisible, setModalVisible] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');

  // ESTADO DO MODAL DE ALERTA
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
    showCancelButton: false,
    onConfirm: () => {},
  });

  function showAlertModal({
    title,
    message,
    type = 'info',
    confirmText = 'Entendi',
    cancelText = 'Cancelar',
    showCancelButton = false,
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

  // CONSULTA DE PERFIL COM TANSTACK QUERY
  const {
    data: profile,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['personal-profile-data'],
    queryFn: fetchPersonalProfileData,
    staleTime: 1000 * 60 * 5,
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  // MUTAÇÃO DE ATUALIZAÇÃO DE PERFIL DO PERSONAL
  const updateProfileMutation = useMutation({
    mutationFn: async ({ name, phone }: { name: string; phone: string }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('Usuário não autenticado.');

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: name.trim(),
          phone: phone.trim() || null,
        })
        .eq('id', user.id);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal-profile-data'] });
      setIsInfoModalOpen(false);
      showAlertModal({
        title: 'Perfil Atualizado! 🎉',
        message: 'Seus dados foram salvos com sucesso.',
        type: 'success',
      });
    },
    onError: (err: any) => {
      showAlertModal({
        title: 'Erro ao Salvar',
        message: err.message || 'Não foi possível atualizar as informações.',
        type: 'danger',
      });
    },
  });

  // MUTAÇÃO DE EXCLUSÃO DEFINITIVA DE CONTA
  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('Sessão expirada.');

      const { error: rpcError } = await supabase.rpc('delete_own_account');

      if (rpcError) {
        await supabase.from('workout_plans').delete().eq('personal_id', user.id);
        await supabase.from('custom_workouts').delete().eq('user_id', user.id);
        await supabase.from('profiles').delete().eq('id', user.id);
      }

      await supabase.auth.signOut();
    },
    onSuccess: () => {
      queryClient.clear();
      router.replace('/(auth)/login');
    },
    onError: (err: any) => {
      showAlertModal({
        title: 'Erro ao Excluir',
        message: err.message || 'Não foi possível excluir sua conta no momento.',
        type: 'danger',
      });
    },
  });

  function handleOpenInfoModal() {
    if (profile) {
      setEditName(profile.fullName || '');
      setEditPhone(profile.phone || '');
    }
    setIsInfoModalOpen(true);
  }

  function handleSaveInfo() {
    if (!editName.trim() || editName.trim().length < 3) {
      showAlertModal({
        title: 'Nome Inválido',
        message: 'Por favor, informe seu nome completo com pelo menos 3 caracteres.',
        type: 'info',
      });
      return;
    }

    updateProfileMutation.mutate({
      name: editName,
      phone: editPhone,
    });
  }

  function handleDeleteAccount() {
    showAlertModal({
      title: 'Excluir Minha Conta ⚠️',
      message:
        'Esta ação apagará permanentemente seus modelos de treinos, vínculos com alunos e dados cadastrais. Deseja continuar?',
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
      message: 'Deseja realmente encerrar a sua sessão?',
      type: 'danger',
      confirmText: 'Sair',
      cancelText: 'Cancelar',
      showCancelButton: true,
      onConfirm: async () => {
        await supabase.auth.signOut();
        queryClient.clear();
        router.replace('/(auth)/login');
      },
    });
  }

  const safeTopPadding = Math.max(insets?.top || 0, 16);
  const safeBottomPadding = Math.max(insets?.bottom || 0, 16);

  // EXTRAÇÃO SEGURA DOS DADOS DO PERFIL (EVITA ERROS DE 'UNDEFINED')
  const fullName = profile?.fullName ?? 'Personal Trainer';
  const email = profile?.email ?? '';
  const inviteCode = profile?.inviteCode ?? 'PERS-XXXX';
  const libraryCount = profile?.libraryTemplatesCount ?? 0;
  const linkedStudentsCount = profile?.linkedStudentsCount ?? 0;

  if (isLoading && !isRefetching && !profile) {
    return (
      <View
        className={`flex-1 ${isDark ? 'bg-zinc-950' : 'bg-[#f8f9fa]'}`}
        style={{ paddingTop: safeTopPadding }}
      >
        <PersonalProfileSkeleton isDark={isDark} />
      </View>
    );
  }

  if ((isError || !profile) && !isLoading) {
    return (
      <View
        className={`flex-1 justify-center items-center px-6 ${
          isDark ? 'bg-zinc-950' : 'bg-[#f8f9fa]'
        }`}
        style={{ paddingTop: safeTopPadding }}
      >
        <WarningCircle size={48} color="#ef4444" />
        <Text
          className={`text-base font-outfit-bold mt-3 text-center ${
            isDark ? 'text-white' : 'text-[#1b1b1d]'
          }`}
        >
          Não foi possível carregar o perfil
        </Text>
        <TouchableOpacity
          onPress={() => refetch()}
          style={{ backgroundColor: '#59C83A' }}
          className="px-6 py-3 rounded-2xl active:opacity-90 mt-4"
        >
          <Text className="text-xs font-sans-bold text-white">Tentar Novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View
      className={`flex-1 pb-4 ${isDark ? 'bg-zinc-950' : 'bg-[#f8f9fa]'}`}
      style={{ paddingTop: safeTopPadding }}
    >
      {/* 1. CABEÇALHO */}
      <View
        className={`px-5 py-4 border-b ${
          isDark ? 'border-zinc-800' : 'border-[#e2dfe1]'
        }`}
      >
        <Text
          className={`text-xl font-outfit-extrabold ${
            isDark ? 'text-white' : 'text-[#1b1b1d]'
          }`}
        >
          Meu Perfil
        </Text>
      </View>

      {/* 2. SCROLLVIEW */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 24,
          paddingBottom: 140,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* CARTÃO DO USUÁRIO */}
        <MotiView
          from={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="items-center mb-6"
        >
          <View
            style={{ backgroundColor: '#59C83A' }}
            className="w-24 h-24 rounded-full items-center justify-center mb-3 shadow-sm border border-[#46ab2b]"
          >
            <User size={48} color="#ffffff" weight="bold" />
          </View>
          <Text
            className={`text-2xl font-outfit-extrabold text-center ${
              isDark ? 'text-white' : 'text-[#1b1b1d]'
            }`}
          >
            {fullName}
          </Text>
          <Text
            className={`text-sm font-sans-medium mt-1 ${
              isDark ? 'text-zinc-400' : 'text-[#414755]'
            }`}
          >
            {email}
          </Text>
        </MotiView>

        {/* CÓDIGO DE ACESSO */}
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          className="bg-[#59C83A]/10 border border-[#59C83A]/30 p-4 rounded-2xl mb-6 flex-row items-center justify-between"
        >
          <View className="flex-row items-center flex-1 mr-2">
            <View className="w-10 h-10 rounded-xl bg-[#59C83A]/20 justify-center items-center mr-3 border border-[#59C83A]/40">
              <Key size={22} color="#59C83A" weight="bold" />
            </View>
            <View className="flex-1">
              <Text className="text-xs font-sans-bold text-[#59C83A]">
                Seu Código de Acesso para Alunos
              </Text>
              <Text
                className={`text-xl font-outfit-extrabold mt-0.5 tracking-wider ${
                  isDark ? 'text-white' : 'text-[#1b1b1d]'
                }`}
              >
                {inviteCode}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => {
              showAlertModal({
                title: 'Código de Acesso',
                message: `Compartilhe este código com seus alunos:\n\n${inviteCode}`,
                type: 'info',
              });
            }}
            className="bg-[#59C83A] px-3.5 py-2 rounded-xl"
            activeOpacity={0.8}
          >
            <Text className="text-xs font-sans-bold text-white">Copiar</Text>
          </TouchableOpacity>
        </MotiView>

        {/* CARD CLICÁVEL: INFORMAÇÕES PESSOAIS */}
        <TouchableOpacity
          onPress={handleOpenInfoModal}
          activeOpacity={0.7}
          className={`p-4 rounded-2xl mb-6 border flex-row items-center justify-between ${
            isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-[#e2dfe1]'
          }`}
        >
          <View className="flex-row items-center gap-3">
            <View className="w-10 h-10 rounded-xl bg-[#59C83A]/10 items-center justify-center border border-[#59C83A]/30">
              <User size={20} color="#59C83A" weight="bold" />
            </View>
            <View>
              <Text
                className={`font-outfit text-base ${
                  isDark ? 'text-white' : 'text-[#1b1b1d]'
                }`}
              >
                Informações Pessoais
              </Text>
              <Text
                className={`text-xs font-sans-medium ${
                  isDark ? 'text-zinc-400' : 'text-[#71717a]'
                }`}
              >
                Toque para ver ou editar seus dados
              </Text>
            </View>
          </View>
          <CaretRight size={18} color={isDark ? '#a1a1aa' : '#71717a'} />
        </TouchableOpacity>

        {/* VISÃO GERAL DO TRABALHO */}
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
        >
          <Text
            className={`text-lg font-outfit mb-3 ${
              isDark ? 'text-white' : 'text-[#1b1b1d]'
            }`}
          >
            Visão Geral do Trabalho
          </Text>

          <View className="flex-row justify-between gap-3 mb-6">
            <TouchableOpacity
              onPress={() => router.push('/(personal)')}
              className={`flex-1 p-4 rounded-2xl items-center border ${
                isDark
                  ? 'bg-zinc-900 border-zinc-800'
                  : 'bg-white border-[#e2dfe1]'
              }`}
              activeOpacity={0.8}
            >
              <Users size={28} color="#59C83A" weight="bold" />
              <Text
                className={`text-2xl font-outfit-extrabold mt-1 ${
                  isDark ? 'text-white' : 'text-[#1b1b1d]'
                }`}
              >
                {linkedStudentsCount}
              </Text>
              <Text
                className={`text-xs font-sans-medium mt-1 text-center ${
                  isDark ? 'text-zinc-400' : 'text-[#414755]'
                }`}
              >
                Alunos Vinculados
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/(personal)/routines')}
              className={`flex-1 p-4 rounded-2xl items-center border ${
                isDark
                  ? 'bg-zinc-900 border-zinc-800'
                  : 'bg-white border-[#e2dfe1]'
              }`}
              activeOpacity={0.8}
            >
              <Books size={28} color="#59C83A" weight="bold" />
              <Text
                className={`text-2xl font-outfit-extrabold mt-1 ${
                  isDark ? 'text-white' : 'text-[#1b1b1d]'
                }`}
              >
                {libraryCount}
              </Text>
              <Text
                className={`text-xs font-sans-medium mt-1 text-center ${
                  isDark ? 'text-zinc-400' : 'text-[#414755]'
                }`}
              >
                Modelos Salvos
              </Text>
            </TouchableOpacity>
          </View>
        </MotiView>

        {/* SELETOR DE TEMA */}
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
        >
          <Text
            className={`text-lg font-outfit mb-3 ${
              isDark ? 'text-white' : 'text-[#1b1b1d]'
            }`}
          >
            Aparência do Aplicativo
          </Text>

          <View
            className={`rounded-2xl p-2 mb-6 border flex-row ${
              isDark
                ? 'bg-zinc-900 border-zinc-800'
                : 'bg-white border-[#e2dfe1]'
            }`}
          >
            <TouchableOpacity
              onPress={() => {
                if (isDark) toggleTheme();
              }}
              className={`flex-1 py-3 rounded-xl flex-row items-center justify-center gap-1.5 ${
                !isDark
                  ? 'bg-[#f8f9fa] border border-[#e2dfe1]'
                  : 'bg-transparent'
              }`}
            >
              <Sun size={16} color={!isDark ? '#59C83A' : '#9ca3af'} weight="bold" />
              <Text
                className={`font-sans-bold text-xs ${
                  !isDark ? 'text-[#59C83A]' : 'text-zinc-400'
                }`}
              >
                Claro
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                if (!isDark) toggleTheme();
              }}
              className={`flex-1 py-3 rounded-xl flex-row items-center justify-center gap-1.5 ${
                isDark
                  ? 'bg-zinc-800 border border-zinc-700'
                  : 'bg-transparent'
              }`}
            >
              <Moon size={16} color={isDark ? '#59C83A' : '#9ca3af'} weight="bold" />
              <Text
                className={`font-sans-bold text-xs ${
                  isDark ? 'text-[#59C83A]' : 'text-[#71717a]'
                }`}
              >
                Escuro
              </Text>
            </TouchableOpacity>
          </View>
        </MotiView>

        {/* OPÇÕES DA CONTA */}
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
        >
          <Text
            className={`text-lg font-outfit mb-3 ${
              isDark ? 'text-white' : 'text-[#1b1b1d]'
            }`}
          >
            Opções da Conta
          </Text>

          <View
            className={`rounded-2xl overflow-hidden mb-6 border ${
              isDark
                ? 'bg-zinc-900 border-zinc-800'
                : 'bg-white border-[#e2dfe1]'
            }`}
          >
            <TouchableOpacity
              onPress={() => setModalVisible(true)}
              className={`flex-row items-center justify-between p-4 border-b ${
                isDark ? 'border-zinc-800' : 'border-[#e2dfe1]'
              }`}
              activeOpacity={0.7}
            >
              <View className="flex-row items-center gap-3">
                <Bell size={20} color={isDark ? '#ffffff' : '#1b1b1d'} />
                <Text
                  className={`font-outfit ${
                    isDark ? 'text-white' : 'text-[#1b1b1d]'
                  }`}
                >
                  Notificações e Lembretes
                </Text>
              </View>
              <CaretRight size={18} color={isDark ? '#a1a1aa' : '#414755'} />
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
                <Text className="font-outfit text-sm text-red-500">
                  Excluir Minha Conta
                </Text>
              </View>
              {deleteAccountMutation.isPending ? (
                <ActivityIndicator size="small" color="#ef4444" />
              ) : (
                <CaretRight size={18} color="#ef4444" />
              )}
            </TouchableOpacity>
          </View>
        </MotiView>

        {/* BOTÃO DE SAIR */}
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
        >
          <TouchableOpacity
            onPress={handleSignOut}
            style={{
              backgroundColor: isDark ? 'rgba(127, 29, 29, 0.2)' : '#ffebe8',
              borderColor: isDark ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
            }}
            className="p-4 rounded-2xl items-center flex-row justify-center border"
            activeOpacity={0.8}
          >
            <SignOut size={20} color="#e11d48" />
            <Text className="text-[#e11d48] font-sans-bold text-base ml-2">
              Sair da Conta
            </Text>
          </TouchableOpacity>
        </MotiView>
      </ScrollView>

      {/* MODAL DE INFORMAÇÕES PESSOAIS E EDIÇÃO */}
      <Modal
        visible={isInfoModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsInfoModalOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsInfoModalOpen(false)}>
          <View className="flex-1 bg-black/60 justify-end">
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              >
                <View
                  className={`rounded-t-3xl p-6 border-t ${
                    isDark
                      ? 'bg-zinc-900 border-zinc-800'
                      : 'bg-white border-[#e2dfe1]'
                  }`}
                  style={{ paddingBottom: safeBottomPadding + 10 }}
                >
                  {/* CABEÇALHO DO MODAL */}
                  <View className="flex-row items-center justify-between mb-5 pb-3 border-b border-[#e2dfe1] dark:border-zinc-800">
                    <View className="flex-row items-center gap-2">
                      <ShieldCheck size={22} color="#59C83A" weight="bold" />
                      <Text
                        className={`text-lg font-outfit-extrabold ${
                          isDark ? 'text-white' : 'text-[#1b1b1d]'
                        }`}
                      >
                        Informações Pessoais
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setIsInfoModalOpen(false)}
                      className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 items-center justify-center"
                    >
                      <X size={18} color={isDark ? '#ffffff' : '#1b1b1d'} />
                    </TouchableOpacity>
                  </View>

                  {/* CAMPO NOME (EDITÁVEL) */}
                  <View className="mb-4">
                    <Text className="text-xs font-sans-bold uppercase tracking-wider text-[#71717a] dark:text-zinc-400 mb-1.5 ml-1">
                      Nome Completo
                    </Text>
                    <View className="flex-row items-center bg-[#f8f9fa] dark:bg-zinc-950 border border-[#e2dfe1] dark:border-zinc-800 rounded-2xl px-3 py-2.5">
                      <View className="mr-2">
                        <User size={18} color="#59C83A" weight="bold" />
                      </View>
                      <TextInput
                        className={`flex-1 text-sm font-sans-medium ${
                          isDark ? 'text-white' : 'text-[#1b1b1d]'
                        }`}
                        value={editName}
                        onChangeText={setEditName}
                        placeholder="Seu nome"
                        placeholderTextColor={isDark ? '#71717a' : '#a09da1'}
                      />
                    </View>
                  </View>

                  {/* CAMPO E-MAIL (LEITURA APENAS) */}
                  <View className="mb-4">
                    <Text className="text-xs font-sans-bold uppercase tracking-wider text-[#71717a] dark:text-zinc-400 mb-1.5 ml-1">
                      E-mail Cadastrado (Apenas Leitura)
                    </Text>
                    <View className="flex-row items-center bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-3 py-3 opacity-80">
                      <View className="mr-2">
                        <EnvelopeSimple
                          size={18}
                          color={isDark ? '#a1a1aa' : '#71717a'}
                          weight="bold"
                        />
                      </View>
                      <Text
                        className={`flex-1 text-sm font-sans-medium ${
                          isDark ? 'text-zinc-300' : 'text-zinc-700'
                        }`}
                      >
                        {profile?.email || ''}
                      </Text>
                    </View>
                  </View>

                  {/* CAMPO TELEFONE (EDITÁVEL COM MÁSCARA) */}
                  <View className="mb-4">
                    <Text className="text-xs font-sans-bold uppercase tracking-wider text-[#71717a] dark:text-zinc-400 mb-1.5 ml-1">
                      Telefone / WhatsApp
                    </Text>
                    <View className="flex-row items-center bg-[#f8f9fa] dark:bg-zinc-950 border border-[#e2dfe1] dark:border-zinc-800 rounded-2xl px-3 py-2.5">
                      <View className="mr-2">
                        <Phone size={18} color="#59C83A" weight="bold" />
                      </View>
                      <TextInput
                        className={`flex-1 text-sm font-sans-medium ${
                          isDark ? 'text-white' : 'text-[#1b1b1d]'
                        }`}
                        value={editPhone}
                        onChangeText={(val) => setEditPhone(maskPhone(val))}
                        placeholder="(99) 99999-9999"
                        placeholderTextColor={isDark ? '#71717a' : '#a09da1'}
                        keyboardType="numeric"
                        maxLength={15}
                      />
                    </View>
                  </View>

                  {/* CAMPO DATA DE NASCIMENTO (LEITURA APENAS) */}
                  <View className="mb-6">
                    <Text className="text-xs font-sans-bold uppercase tracking-wider text-[#71717a] dark:text-zinc-400 mb-1.5 ml-1">
                      Data de Nascimento (Apenas Leitura)
                    </Text>
                    <View className="flex-row items-center bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-3 py-3 opacity-80">
                      <View className="mr-2">
                        <CalendarBlank
                          size={18}
                          color={isDark ? '#a1a1aa' : '#71717a'}
                          weight="bold"
                        />
                      </View>
                      <Text
                        className={`flex-1 text-sm font-sans-medium ${
                          isDark ? 'text-zinc-300' : 'text-zinc-700'
                        }`}
                      >
                        {formatISOToDate(profile?.birthDate)}
                      </Text>
                    </View>
                  </View>

                  {/* BOTÃO SALVAR */}
                  <TouchableOpacity
                    onPress={handleSaveInfo}
                    disabled={updateProfileMutation.isPending}
                    className="bg-[#59C83A] p-4 rounded-2xl flex-row items-center justify-center shadow-sm active:opacity-90"
                  >
                    {updateProfileMutation.isPending ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <>
                        <Check size={20} color="#FFFFFF" weight="bold" />
                        <Text className="text-white font-sans-bold text-base ml-2">
                          Salvar Alterações
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* COMPONENTE DO MODAL DE ENVIAR NOTIFICAÇÕES */}
      <SendNotificationModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />

      {/* COMPONENTE DO MODAL DE ALERTA */}
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