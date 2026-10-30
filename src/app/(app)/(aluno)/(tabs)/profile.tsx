// ============================================================================
// DOCUMENTAÇÃO: TELA DE PERFIL DO ALUNO COM MODAL DE DADOS E SKELETON
// ============================================================================
// Inclui gerenciamento de perfil, estatísticas, vínculo com personal, notificações,
// modal de informações pessoais (visualização/edição), exclusão de conta,
// revalidação automática de dados, sanitização de entradas e proteção contra erros do TypeScript.
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
  Phone,
  CalendarBlank,
  EnvelopeSimple,
  Check,
} from 'phosphor-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MotiView } from 'moti';

import { supabase } from '@/lib/supabase';
import { sanitizeInput } from '@/lib/security'; // 🟢 Importação do módulo de segurança
import { CustomModal } from '@/components/CustomModal';
import { UserNotificationModal } from '@/components/UserNotificationModal';
import { useTheme } from '@/context/ThemeContext';
import { Skeleton } from '@/components/SkeletonLoading';

// --- INTERFACES E TIPAGENS ---
interface StudentProfileData {
  fullName: string;
  email: string;
  phone: string;
  birthDate: string;
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

// SUBCOMPONENTE DE SKELETON PARA O PERFIL DO ALUNO
function ProfileSkeleton() {
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 120 }}
      className="flex-1 pt-6"
    >
      <View className="items-center mb-6">
        <Skeleton width={96} height={96} borderRadius={48} className="mb-3" />
        <Skeleton width={180} height={24} borderRadius={6} className="mb-2" />
        <Skeleton width={140} height={16} borderRadius={4} className="mb-3" />
        <Skeleton width={160} height={26} borderRadius={14} />
      </View>

      <Skeleton width="100%" height={60} borderRadius={16} className="mb-5" />

      <Skeleton width={80} height={18} borderRadius={4} className="mb-3" />
      <Skeleton width="100%" height={68} borderRadius={16} className="mb-5" />

      <View className="flex-row justify-between mb-6">
        <View className="w-[48%]">
          <Skeleton width="100%" height={110} borderRadius={16} />
        </View>
        <View className="w-[48%]">
          <Skeleton width="100%" height={110} borderRadius={16} />
        </View>
      </View>

      <Skeleton width={90} height={18} borderRadius={4} className="mb-3" />
      <Skeleton width="100%" height={52} borderRadius={16} className="mb-6" />

      <Skeleton width={120} height={18} borderRadius={4} className="mb-3" />
      <Skeleton width="100%" height={150} borderRadius={16} className="mb-6" />
    </ScrollView>
  );
}

/** Busca os dados do perfil do aluno no Supabase */
async function fetchStudentProfileData(): Promise<StudentProfileData> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) throw new Error('Usuário não autenticado ou sessão expirada.');

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, personal_id, phone, birth_date')
    .eq('id', user.id)
    .maybeSingle();

  let fullName = profile?.full_name ? sanitizeInput(profile.full_name.trim()) : 'Atleta';
  if (fullName === 'Atleta' && user.email) {
    fullName = user.email.split('@')[0];
  }

  let personalName: string | null = null;

  if (profile?.personal_id) {
    const { data: personalProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', profile.personal_id)
      .maybeSingle();

    if (personalProfile?.full_name) {
      personalName = sanitizeInput(personalProfile.full_name.trim());
    }
  }

  let totalWorkoutsCompleted = 0;
  let totalWorkoutSeconds = 0;

  try {
    const { data: logsData, error: logsError } = await supabase
      .from('workout_logs')
      .select('duration_seconds')
      .or(`student_id.eq.${user.id},user_id.eq.${user.id}`);

    if (logsError) {
      console.log('Aviso ao consultar workout_logs:', logsError.message);
    }

    if (logsData && logsData.length > 0) {
      totalWorkoutsCompleted = logsData.length;
      totalWorkoutSeconds = logsData.reduce((acc, item) => {
        return acc + (item.duration_seconds || 0);
      }, 0);
    }
  } catch (err) {
    console.log('Erro ao calcular resumo dos treinos:', err);
  }

  return {
    fullName,
    email: user.email || '',
    phone: profile?.phone ? sanitizeInput(profile.phone) : '',
    birthDate: profile?.birth_date || '',
    personalName,
    totalWorkoutsCompleted,
    totalWorkoutMinutes: totalWorkoutSeconds,
  };
}

/** Realiza o vínculo do aluno com o Personal Trainer pelo código */
async function linkStudentToPersonalByCode(inviteCode: string) {
  const cleanCode = sanitizeInput(inviteCode).trim().toUpperCase();

  if (!cleanCode) {
    throw new Error('Por favor, digite o código de acesso do seu Personal.');
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Sessão expirada. Faça login novamente.');

  const { data: personalProfile, error: searchError } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('invite_code', cleanCode)
    .single();

  if (searchError || !personalProfile) {
    throw new Error('Código inválido. Nenhum Personal Trainer foi encontrado.');
  }

  const foundPersonalName = personalProfile.full_name
    ? sanitizeInput(personalProfile.full_name.trim())
    : 'Personal Trainer';

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ personal_id: personalProfile.id })
    .eq('id', user.id);

  if (updateError) throw new Error(updateError.message);

  return foundPersonalName;
}

/** Botão da Política de Privacidade */
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

export default function StudentProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { isDark, toggleTheme } = useTheme();

  // --- ESTADOS DOS MODAIS ---
  const [isLinkModalOpen, setIsLinkModalOpen] = useState<boolean>(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState<boolean>(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState<boolean>(false);

  const [editName, setEditName] = useState<string>('');
  const [editPhone, setEditPhone] = useState<string>('');
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

  // --- QUERIES E MUTAÇÕES ---
  const {
    data: profile,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['student-profile-data'],
    queryFn: fetchStudentProfileData,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const { data: hasUnreadNotifications = false } = useQuery({
    queryKey: ['user-unread-notifications-status'],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return false;

      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) return false;

      return (count || 0) > 0;
    },
    staleTime: 1000 * 10,
  });

  // MUTAÇÃO PARA ATUALIZAR NOME E TELEFONE DO ALUNO COM SANITIZAÇÃO
  const updateProfileMutation = useMutation({
    mutationFn: async ({ name, phone }: { name: string; phone: string }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('Usuário não autenticado.');

      const cleanName = sanitizeInput(name).trim();
      const cleanPhone = phone ? sanitizeInput(phone).trim() : null;

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: cleanName,
          phone: cleanPhone,
        })
        .eq('id', user.id);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-profile-data'] });
      setIsInfoModalOpen(false);
      showAlertModal({
        title: 'Perfil Atualizado! 🎉',
        message: 'Seus dados foram salvos com sucesso.',
        type: 'success',
        showCancelButton: false,
      });
    },
    onError: (err: any) => {
      showAlertModal({
        title: 'Erro ao Salvar',
        message: err.message || 'Não foi possível atualizar as informações.',
        type: 'danger',
        showCancelButton: false,
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
        showCancelButton: false,
      });
      return;
    }

    updateProfileMutation.mutate({
      name: editName,
      phone: editPhone,
    });
  }

  function handleOpenNotifications() {
    setIsNotificationModalOpen(true);
    queryClient.setQueryData(['user-unread-notifications-status'], false);
  }

  const linkMutation = useMutation({
    mutationFn: linkStudentToPersonalByCode,
    onSuccess: (personalName) => {
      setIsLinkModalOpen(false);
      setInviteCodeInput('');
      queryClient.invalidateQueries({ queryKey: ['student-profile-data'] });
      queryClient.invalidateQueries({ queryKey: ['student-home-data'] });

      showAlertModal({
        title: 'Sucesso! 🎉',
        message: `Você foi vinculado com sucesso ao Personal Trainer ${personalName}!`,
        type: 'success',
        showCancelButton: false,
      });
    },
    onError: (err: any) => {
      showAlertModal({
        title: 'Erro ao Vincular',
        message: err.message || 'Não foi possível realizar o vínculo.',
        type: 'danger',
        showCancelButton: false,
      });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('Sessão expirada.');

      const { error: rpcError } = await supabase.rpc('delete_own_account');

      if (rpcError) {
        await supabase
          .from('workout_logs')
          .delete()
          .or(`student_id.eq.${user.id},user_id.eq.${user.id}`);
        await supabase.from('custom_workouts').delete().eq('user_id', user.id);
        await supabase.from('workout_plans').delete().eq('student_id', user.id);
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
        'Esta ação apagará permanentemente seu histórico de treinos, fichas e dados cadastrais. Deseja continuar?',
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
        await supabase.auth.signOut();
        router.replace('/(auth)/login');
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

  // EXTRAÇÃO SEGURA DOS DADOS DO PERFIL
  const fullName = profile?.fullName ?? 'Atleta';
  const email = profile?.email ?? '';
  const personalName = profile?.personalName ?? null;
  const totalWorkoutsCompleted = profile?.totalWorkoutsCompleted ?? 0;
  const totalWorkoutMinutes = profile?.totalWorkoutMinutes ?? 0;

  return (
    <View
      className={`flex-1 px-5 pb-4 ${isDark ? 'bg-zinc-950' : 'bg-[#f8f9fa]'}`}
      style={{ paddingTop: safeTopPadding }}
    >
      {/* 1. CABEÇALHO */}
      <MotiView
        from={{ opacity: 0, translateY: -8 }}
        animate={{ opacity: 1, translateY: 0 }}
        className={`py-4 flex-row justify-between items-center border-b ${
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

      {/* ESTADO 1: CARREGAMENTO COM SKELETON */}
      {isLoading && !isRefetching && !profile ? (
        <ProfileSkeleton />
      ) : (isError || !profile) && !isLoading ? (
        /* ESTADO 2: TELA DE ERRO */
        <View className="flex-1 justify-center items-center px-6">
          <MotiView
            from={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'timing', duration: 250 } as any}
            className="items-center"
          >
            <WarningCircle size={48} color="#ef4444" />
            <Text
              className={`text-base font-outfit-bold mt-3 text-center ${
                isDark ? 'text-white' : 'text-[#1b1b1d]'
              }`}
            >
              Não foi possível carregar seu perfil
            </Text>
            <Text
              className={`text-xs font-sans-medium text-center mt-1 mb-5 ${
                isDark ? 'text-zinc-400' : 'text-[#71717a]'
              }`}
            >
              {(error as Error)?.message || 'Ocorreu um problema ao conectar com os serviços.'}
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
      ) : (
        /* ESTADO 3: RENDERIZAÇÃO NORMAL DO PERFIL */
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

            <Text
              className={`text-2xl font-outfit-extrabold text-center ${
                isDark ? 'text-white' : 'text-[#1b1b1d]'
              }`}
            >
              {fullName}
            </Text>
            <Text
              className={`text-sm font-sans-medium mt-0.5 ${
                isDark ? 'text-zinc-400' : 'text-[#414755]'
              }`}
            >
              {email}
            </Text>

            <View className="mt-2 bg-[#59C83A]/10 border border-[#59C83A]/30 px-3 py-1 rounded-full flex-row items-center">
              <Text className="text-xs font-sans-bold text-[#59C83A]">
                {personalName ? `Personal: ${personalName}` : 'Sem Personal Vinculado'}
              </Text>
            </View>
          </MotiView>

          {/* 🟢 CARD CLICÁVEL: INFORMAÇÕES PESSOAIS */}
          <TouchableOpacity
            onPress={handleOpenInfoModal}
            activeOpacity={0.7}
            className={`p-4 rounded-2xl mb-5 border flex-row items-center justify-between ${
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

          {/* INSTRUTOR */}
          <MotiView
            from={{ opacity: 0, translateY: 12 }}
            animate={{ opacity: 1, translateY: 0 }}
          >
            <Text
              className={`text-lg font-outfit mb-3 ${
                isDark ? 'text-white' : 'text-[#1b1b1d]'
              }`}
            >
              Instrutor
            </Text>

            <View
              className={`rounded-2xl overflow-hidden mb-5 border ${
                isDark
                  ? 'bg-zinc-900 border-zinc-800'
                  : 'bg-white border-[#e2dfe1]'
              }`}
            >
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
                    <Text
                      className={`font-outfit text-sm ${
                        isDark ? 'text-white' : 'text-[#1b1b1d]'
                      }`}
                    >
                      Conectar com meu Personal
                    </Text>
                    <Text
                      className={`text-xs font-sans-medium ${
                        isDark ? 'text-zinc-400' : 'text-[#71717a]'
                      }`}
                    >
                      {personalName
                        ? 'Trocar ou redefinir seu instrutor'
                        : 'Inserir código de acesso do personal'}
                    </Text>
                  </View>
                </View>
                <CaretRight size={18} color={isDark ? '#a1a1aa' : '#414755'} />
              </TouchableOpacity>
            </View>
          </MotiView>

          {/* CARDS ESTATÍSTICOS */}
          <MotiView
            from={{ opacity: 0, translateY: 12 }}
            animate={{ opacity: 1, translateY: 0 }}
            className="flex-row justify-between mb-6"
          >
            <View
              className={`w-[48%] p-4 rounded-2xl border items-center ${
                isDark
                  ? 'bg-zinc-900 border-zinc-800'
                  : 'bg-white border-[#e2dfe1]'
              }`}
            >
              <View className="w-10 h-10 rounded-xl bg-[#59C83A]/10 items-center justify-center mb-2 border border-[#59C83A]/30">
                <Barbell size={22} color="#59C83A" weight="bold" />
              </View>
              <Text
                className={`text-xs font-sans-bold ${
                  isDark ? 'text-zinc-400' : 'text-[#71717a]'
                }`}
              >
                Treinos Realizados
              </Text>
              <Text
                className={`text-xl font-outfit-extrabold mt-0.5 ${
                  isDark ? 'text-white' : 'text-[#1b1b1d]'
                }`}
              >
                {totalWorkoutsCompleted}
              </Text>
            </View>

            <View
              className={`w-[48%] p-4 rounded-2xl border items-center ${
                isDark
                  ? 'bg-zinc-900 border-zinc-800'
                  : 'bg-white border-[#e2dfe1]'
              }`}
            >
              <View className="w-10 h-10 rounded-xl bg-[#59C83A]/10 items-center justify-center mb-2 border border-[#59C83A]/30">
                <Timer size={22} color="#59C83A" weight="bold" />
              </View>
              <Text
                className={`text-xs font-sans-bold ${
                  isDark ? 'text-zinc-400' : 'text-[#71717a]'
                }`}
              >
                Tempo de Treino
              </Text>
              <Text
                className={`text-xl font-outfit-extrabold mt-0.5 ${
                  isDark ? 'text-white' : 'text-[#1b1b1d]'
                }`}
              >
                {formatWorkoutTime(totalWorkoutMinutes)}
              </Text>
            </View>
          </MotiView>

          {/* SEÇÃO APARÊNCIA */}
          <MotiView
            from={{ opacity: 0, translateY: 12 }}
            animate={{ opacity: 1, translateY: 0 }}
          >
            <Text
              className={`text-lg font-outfit mb-3 ${
                isDark ? 'text-white' : 'text-[#1b1b1d]'
              }`}
            >
              Aparência
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

          {/* CONFIGURAÇÕES */}
          <MotiView
            from={{ opacity: 0, translateY: 12 }}
            animate={{ opacity: 1, translateY: 0 }}
          >
            <Text
              className={`text-lg font-outfit mb-3 ${
                isDark ? 'text-white' : 'text-[#1b1b1d]'
              }`}
            >
              Configurações
            </Text>

            <View
              className={`rounded-2xl overflow-hidden mb-6 border ${
                isDark
                  ? 'bg-zinc-900 border-zinc-800'
                  : 'bg-white border-[#e2dfe1]'
              }`}
            >
              {/* NOTIFICAÇÕES */}
              <TouchableOpacity
                onPress={handleOpenNotifications}
                className={`flex-row items-center justify-between p-4 border-b ${
                  isDark ? 'border-zinc-800' : 'border-[#e2dfe1]'
                }`}
                activeOpacity={0.7}
              >
                <View className="flex-row items-center gap-3">
                  <Bell
                    size={20}
                    color={
                      hasUnreadNotifications
                        ? '#59C83A'
                        : isDark
                        ? '#ffffff'
                        : '#1b1b1d'
                    }
                    weight={hasUnreadNotifications ? 'bold' : 'regular'}
                  />

                  <View className="flex-row items-center">
                    <Text
                      className={`font-outfit ${
                        hasUnreadNotifications
                          ? 'text-[#59C83A] font-bold'
                          : isDark
                          ? 'text-white'
                          : 'text-[#1b1b1d]'
                      }`}
                    >
                      Notificações
                    </Text>

                    {hasUnreadNotifications && (
                      <View className="w-2.5 h-2.5 rounded-full bg-[#59C83A] ml-2" />
                    )}
                  </View>
                </View>

                <CaretRight
                  size={18}
                  color={
                    hasUnreadNotifications
                      ? '#59C83A'
                      : isDark
                      ? '#a1a1aa'
                      : '#414755'
                  }
                />
              </TouchableOpacity>

              {/* PRIVACIDADE */}
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

          {/* BOTÃO SAIR */}
          <MotiView
            from={{ opacity: 0, translateY: 12 }}
            animate={{ opacity: 1, translateY: 0 }}
          >
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
      )}

      {/* 🟢 MODAL DE INFORMAÇÕES PESSOAIS E EDIÇÃO */}
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
                  style={{ paddingBottom: safeModalBottomPadding }}
                >
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

                  {/* NOME COMPLETO */}
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

                  {/* E-MAIL (SOMENTE LEITURA) */}
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

                  {/* TELEFONE (EDITÁVEL) */}
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

                  {/* DATA DE NASCIMENTO (SOMENTE LEITURA) */}
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

      {/* MODAL CÓDIGO PERSONAL */}
      <Modal visible={isLinkModalOpen} animationType="slide" transparent>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View className="flex-1 bg-black/60 justify-end">
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              className="w-full"
            >
              <View
                style={{ paddingBottom: safeModalBottomPadding }}
                className={`rounded-t-3xl p-6 border-t ${
                  isDark
                    ? 'bg-zinc-900 border-zinc-800'
                    : 'bg-white border-[#e2dfe1]'
                }`}
              >
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  <View
                    className={`flex-row items-center justify-between mb-4 pb-3 border-b ${
                      isDark ? 'border-zinc-800' : 'border-[#e2dfe1]'
                    }`}
                  >
                    <View className="flex-row items-center gap-2">
                      <View className="w-9 h-9 rounded-xl bg-[#59C83A]/10 items-center justify-center border border-[#59C83A]/30">
                        <Key size={20} color="#59C83A" weight="bold" />
                      </View>
                      <Text
                        className={`text-lg font-outfit-extrabold ${
                          isDark ? 'text-white' : 'text-[#1b1b1d]'
                        }`}
                      >
                        Código do Personal
                      </Text>
                    </View>

                    <TouchableOpacity
                      onPress={() => setIsLinkModalOpen(false)}
                      className={`w-8 h-8 rounded-full items-center justify-center ${
                        isDark ? 'bg-zinc-800' : 'bg-zinc-100'
                      }`}
                    >
                      <X size={18} color={isDark ? '#ffffff' : '#1b1b1d'} />
                    </TouchableOpacity>
                  </View>

                  <Text
                    className={`text-xs font-sans-medium mb-4 leading-5 ${
                      isDark ? 'text-zinc-400' : 'text-[#71717a]'
                    }`}
                  >
                    Peça o código exclusivo de convite ao seu Personal Trainer para permitir a prescrição de suas fichas.
                  </Text>

                  <TextInput
                    className={`border rounded-2xl px-4 py-3.5 text-lg font-outfit-extrabold tracking-widest uppercase mb-5 text-center ${
                      isDark
                        ? 'bg-zinc-950 border-zinc-800 text-white'
                        : 'bg-[#f8f9fa] border-[#e2dfe1] text-[#1b1b1d]'
                    }`}
                    placeholder="PERS-XXXX"
                    placeholderTextColor={isDark ? '#71717a' : '#a09da1'}
                    value={inviteCodeInput}
                    onChangeText={setInviteCodeInput}
                    autoCapitalize="characters"
                    autoCorrect={false}
                  />

                  <TouchableOpacity
                    onPress={() => linkMutation.mutate(inviteCodeInput)}
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

      {/* MODAL DE NOTIFICAÇÕES */}
      <UserNotificationModal
        visible={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
      />

      {/* MODAL DE ALERTA PERSONALIZADO */}
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