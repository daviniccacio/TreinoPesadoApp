// ============================================================================
// DOCUMENTAÇÃO: TELA DE PERFIL PROFISSIONAL (PERSONAL TRAINER) - TIPAGEM CORRIGIDA
// ============================================================================
// Exibe dados cadastrais, código de acesso para alunos, estatísticas de trabalho,
// alternância de tema global, política de privacidade, exclusão definitiva de conta,
// logout e revalidação de dados no foco da aba para prevenir telas em branco.
// ============================================================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
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
} from 'phosphor-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MotiView } from 'moti';
import { supabase } from '../../../../lib/supabase';
import { CustomModal } from '../../../../components/CustomModal';
import { SendNotificationModal } from '../../../../components/SendNotificationModal';

// IMPORTAÇÃO DO CONTEXTO DE TEMA GLOBAL PERSISTENTE
import { useTheme } from '../../../../context/ThemeContext';

// --- TIPAGENS DE DADOS ---
interface PersonalProfileData {
  fullName: string;
  email: string;
  inviteCode: string;
  birthDate: string;
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

/**
 * Componente do botão da Política de Privacidade com abertura externa
 */
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

/**
 * Busca os dados do perfil, código de acesso e métricas do Personal Trainer no Supabase
 */
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
    .select('full_name, invite_code')
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
    inviteCode: profile?.invite_code || 'PERS-XXXX',
    birthDate: user.user_metadata?.birth_date || '',
    libraryTemplatesCount: libraryCount || 0,
    linkedStudentsCount: studentsCount || 0,
  };
}

export default function PersonalProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  // SUBSCRITO AO TEMA GLOBAL PERSISTENTE
  const { isDark, toggleTheme } = useTheme();

  // ESTADOS DOS MODAIS
  const [modalVisible, setModalVisible] = useState(false);

  // ESTADO DO MODAL PERSONALIZADO REUTILIZÁVEL DE ALERTA
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

  // CONSULTA DE PERFIL COM TANSTACK QUERY E TRATAMENTO DE REVALIDAÇÃO
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
    gcTime: 1000 * 60 * 10,
  });

  // Força o recarregamento dos dados assim que a aba recebe o foco na tela
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

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
        showCancelButton: false,
      });
    },
  });

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
        try {
          const { error } = await supabase.auth.signOut();
          if (error) {
            showAlertModal({
              title: 'Erro ao sair',
              message: error.message,
              type: 'danger',
            });
            return;
          }
          queryClient.clear();
          router.replace('/(auth)/login');
        } catch (err) {
          console.error('Erro ao processar logout:', err);
          showAlertModal({
            title: 'Erro',
            message: 'Não foi possível encerrar a sessão.',
            type: 'danger',
          });
        }
      },
    });
  }

  const safeTopPadding = Math.max(insets?.top || 0, 16);

  // ESTADO 1: CARREGANDO
  if (isLoading && !isRefetching && !profile) {
    return (
      <View
        className={`flex-1 justify-center items-center px-5 ${
          isDark ? 'bg-zinc-950' : 'bg-[#f8f9fa]'
        }`}
        style={{ paddingTop: safeTopPadding }}
      >
        <ActivityIndicator size="large" color="#59C83A" />
        <Text
          className={`text-xs font-sans-medium mt-3 ${
            isDark ? 'text-zinc-400' : 'text-[#71717a]'
          }`}
        >
          Carregando informações do perfil...
        </Text>
      </View>
    );
  }

  // ESTADO 2: ERRO NA CONEXÃO / SESSÃO
  if ((isError || !profile) && !isLoading) {
    return (
      <View
        className={`flex-1 justify-center items-center px-6 ${
          isDark ? 'bg-zinc-950' : 'bg-[#f8f9fa]'
        }`}
        style={{ paddingTop: safeTopPadding }}
      >
        <MotiView
          from={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'timing', duration: 250 }}
          className="items-center"
        >
          <WarningCircle size={48} color="#ef4444" />
          <Text
            className={`text-base font-outfit-bold mt-3 text-center ${
              isDark ? 'text-white' : 'text-[#1b1b1d]'
            }`}
          >
            Não foi possível carregar o perfil
          </Text>
          <Text
            className={`text-xs font-sans-medium text-center mt-1 mb-5 ${
              isDark ? 'text-zinc-400' : 'text-[#71717a]'
            }`}
          >
            {(error as Error)?.message || 'Ocorreu um problema de conexão com o banco de dados.'}
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

  // 🟢 CORREÇÃO DOS ERROS TS18048 (Linhas 369-373):
  // Uso de Optional Chaining (`?.`) e Coalescência Nula (`??`) para garantia do TypeScript.
  const fullName = profile?.fullName ?? 'Personal Trainer';
  const email = profile?.email ?? '';
  const inviteCode = profile?.inviteCode ?? 'PERS-XXXX';
  const libraryCount = profile?.libraryTemplatesCount ?? 0;
  const linkedStudentsCount = profile?.linkedStudentsCount ?? 0;

  // ESTADO 3: EXIBIÇÃO NORMAL
  return (
    <View
      className={`flex-1 pb-4 ${isDark ? 'bg-zinc-950' : 'bg-[#f8f9fa]'}`}
      style={{ paddingTop: safeTopPadding }}
    >
      {/* 1. CABEÇALHO ANIMADO */}
      <MotiView
        from={{ opacity: 0, translateY: -12 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{
          type: 'spring',
          damping: 24,
          stiffness: 160,
        }}
        className={`px-5 py-4 border-b flex-row justify-between items-center ${
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
      </MotiView>

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
        {/* 3. CARTÃO DO USUÁRIO */}
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

        {/* 4. CARD DO CÓDIGO DE ACESSO */}
        <MotiView
          from={{ opacity: 0, translateY: 10, scale: 0.97 }}
          animate={{ opacity: 1, translateY: 0, scale: 1 }}
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

        {/* 5. RESUMO DE ATIVIDADES */}
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

        {/* 6. SELETOR DE TEMA */}
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

        {/* 7. OPÇÕES DA CONTA */}
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
            {/* ENVIAR COMUNICADOS / NOTIFICAÇÕES */}
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

            {/* PRIVACIDADE COM LINK EXTERNO */}
            <View className={`border-b ${isDark ? 'border-zinc-800' : 'border-[#e2dfe1]'}`}>
              <PrivacyPolicyButton />
            </View>

            {/* EXCLUIR MINHA CONTA */}
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

        {/* 8. BOTÃO DE SAIR */}
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 250 }}
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

      {/* COMPONENTE DO MODAL DE ENVIAR NOTIFICAÇÕES */}
      <SendNotificationModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />

      {/* COMPONENTE DO MODAL PERSONALIZADO REUTILIZÁVEL DE ALERTA */}
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