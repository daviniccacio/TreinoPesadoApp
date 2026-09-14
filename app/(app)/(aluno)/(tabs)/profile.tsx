// ============================================================================
// DOCUMENTAÇÃO: TELA DE PERFIL DO ALUNO (COMPLETA + 0ms DELAY DE TEMA)
// ============================================================================
// Preserva 100% das funcionalidades: cálculo de estatísticas, vínculo com personal,
// modal de notificações instantâneo, modal de confirmação de logout, troca
// de tema global sem lag e link direto para a Política de Privacidade.
// ============================================================================

import React, { useState } from 'react';
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
  Linking
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  User,
  UserPlus,
  Moon,
  Sun,
  SignOut,
  CaretRight,
  Shield,
  Bell,
  X,
  CheckCircle,
  Key,
  Barbell,
  Timer,
  ShieldCheck,
  ArrowSquareOut,
} from 'phosphor-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MotiView } from 'moti';
import { supabase } from '../../../../lib/supabase';
import { CustomModal } from '../../../../components/CustomModal';
import { UserNotificationModal } from '../../../../components/UserNotificationModal';
import { useTheme } from '../../../../context/ThemeContext';

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

// 🟢 1. DECLARAÇÃO DA INTERFACE QUE FALTAVA
interface PrivacyButtonProps {
  policyUrl?: string;
}

async function fetchStudentProfileData(): Promise<StudentProfileData> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Usuário não autenticado');

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, personal_id')
    .eq('id', user.id)
    .maybeSingle();

  let fullName = profile?.full_name ? profile.full_name.trim() : 'Atleta';
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
      personalName = personalProfile.full_name.trim();
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
    personalName,
    totalWorkoutsCompleted,
    totalWorkoutMinutes: totalWorkoutSeconds,
  };
}

async function linkStudentToPersonalByCode(inviteCode: string) {
  const cleanCode = inviteCode.trim().toUpperCase();

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
    ? personalProfile.full_name.trim()
    : 'Personal Trainer';

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ personal_id: personalProfile.id })
    .eq('id', user.id);

  if (updateError) throw new Error(updateError.message);

  return foundPersonalName;
}

// 🟢 2. COMPONENTE DE BOTÃO DA POLÍTICA DE PRIVACIDADE CORRIGIDO
export function PrivacyPolicyButton({
  policyUrl = 'https://github.com/davinicacio/treino-pesado/blob/develop/PRIVACY_POLICY.md',
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
    onConfirm: () => { },
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

  const { data: profile, isLoading } = useQuery({
    queryKey: ['student-profile-data'],
    queryFn: fetchStudentProfileData,
    refetchOnMount: 'always',
  });

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

  return (
    <View
      className={`flex-1 px-5 pb-4 ${isDark ? 'bg-zinc-950' : 'bg-[#f8f9fa]'}`}
      style={{ paddingTop: safeTopPadding }}
    >
      {/* 1. CABEÇALHO */}
      <MotiView
        from={{ opacity: 0, translateY: -8 }}
        animate={{ opacity: 1, translateY: 0 }}
        className={`py-4 flex-row justify-between items-center border-b ${isDark ? 'border-zinc-800' : 'border-[#e2dfe1]'
          }`}
      >
        <Text
          className={`text-xl font-outfit-extrabold ${isDark ? 'text-white' : 'text-[#1b1b1d]'
            }`}
        >
          Meu Perfil
        </Text>
      </MotiView>

      <ScrollView
        className="flex-1 pt-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* 2. CARTÃO DO ALUNO */}
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

          {isLoading ? (
            <ActivityIndicator size="small" color="#59C83A" className="my-2" />
          ) : (
            <>
              <Text
                className={`text-2xl font-outfit-extrabold text-center ${isDark ? 'text-white' : 'text-[#1b1b1d]'
                  }`}
              >
                {profile?.fullName}
              </Text>
              <Text
                className={`text-sm font-sans-medium mt-0.5 ${isDark ? 'text-zinc-400' : 'text-[#414755]'
                  }`}
              >
                {profile?.email}
              </Text>

              <View className="mt-2 bg-[#59C83A]/10 border border-[#59C83A]/30 px-3 py-1 rounded-full flex-row items-center">
                <Text className="text-xs font-sans-bold text-[#59C83A]">
                  {profile?.personalName
                    ? `Personal: ${profile.personalName}`
                    : 'Sem Personal Vinculado'}
                </Text>
              </View>
            </>
          )}
        </MotiView>

        {/* 3. INSTRUTOR */}
        <MotiView
          from={{ opacity: 0, translateY: 12 }}
          animate={{ opacity: 1, translateY: 0 }}
        >
          <Text
            className={`text-lg font-outfit mb-3 ${isDark ? 'text-white' : 'text-[#1b1b1d]'
              }`}
          >
            Instrutor
          </Text>

          <View
            className={`rounded-2xl overflow-hidden mb-5 border ${isDark
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
                    className={`font-outfit text-sm ${isDark ? 'text-white' : 'text-[#1b1b1d]'
                      }`}
                  >
                    Conectar com meu Personal
                  </Text>
                  <Text
                    className={`text-xs font-sans-medium ${isDark ? 'text-zinc-400' : 'text-[#71717a]'
                      }`}
                  >
                    {profile?.personalName
                      ? 'Trocar ou redefinir seu instrutor'
                      : 'Inserir código de acesso do personal'}
                  </Text>
                </View>
              </View>
              <CaretRight size={18} color={isDark ? '#a1a1aa' : '#414755'} />
            </TouchableOpacity>
          </View>
        </MotiView>

        {/* 4. CARDS ESTATÍSTICOS */}
        <MotiView
          from={{ opacity: 0, translateY: 12 }}
          animate={{ opacity: 1, translateY: 0 }}
          className="flex-row justify-between mb-6"
        >
          <View
            className={`w-[48%] p-4 rounded-2xl border items-center ${isDark
                ? 'bg-zinc-900 border-zinc-800'
                : 'bg-white border-[#e2dfe1]'
              }`}
          >
            <View className="w-10 h-10 rounded-xl bg-[#59C83A]/10 items-center justify-center mb-2 border border-[#59C83A]/30">
              <Barbell size={22} color="#59C83A" weight="bold" />
            </View>
            <Text
              className={`text-xs font-sans-bold ${isDark ? 'text-zinc-400' : 'text-[#71717a]'
                }`}
            >
              Treinos Realizados
            </Text>
            <Text
              className={`text-xl font-outfit-extrabold mt-0.5 ${isDark ? 'text-white' : 'text-[#1b1b1d]'
                }`}
            >
              {profile?.totalWorkoutsCompleted || 0}
            </Text>
          </View>

          <View
            className={`w-[48%] p-4 rounded-2xl border items-center ${isDark
                ? 'bg-zinc-900 border-zinc-800'
                : 'bg-white border-[#e2dfe1]'
              }`}
          >
            <View className="w-10 h-10 rounded-xl bg-[#59C83A]/10 items-center justify-center mb-2 border border-[#59C83A]/30">
              <Timer size={22} color="#59C83A" weight="bold" />
            </View>
            <Text
              className={`text-xs font-sans-bold ${isDark ? 'text-zinc-400' : 'text-[#71717a]'
                }`}
            >
              Tempo de Treino
            </Text>
            <Text
              className={`text-xl font-outfit-extrabold mt-0.5 ${isDark ? 'text-white' : 'text-[#1b1b1d]'
                }`}
            >
              {formatWorkoutTime(profile?.totalWorkoutMinutes || 0)}
            </Text>
          </View>
        </MotiView>

        {/* 5. SEÇÃO APARÊNCIA */}
        <MotiView
          from={{ opacity: 0, translateY: 12 }}
          animate={{ opacity: 1, translateY: 0 }}
        >
          <Text
            className={`text-lg font-outfit mb-3 ${isDark ? 'text-white' : 'text-[#1b1b1d]'
              }`}
          >
            Aparência
          </Text>

          <View
            className={`rounded-2xl p-2 mb-6 border flex-row ${isDark
                ? 'bg-zinc-900 border-zinc-800'
                : 'bg-white border-[#e2dfe1]'
              }`}
          >
            <TouchableOpacity
              onPress={() => {
                if (isDark) toggleTheme();
              }}
              className={`flex-1 py-3 rounded-xl flex-row items-center justify-center gap-1.5 ${!isDark
                  ? 'bg-[#f8f9fa] border border-[#e2dfe1]'
                  : 'bg-transparent'
                }`}
            >
              <Sun size={16} color={!isDark ? '#59C83A' : '#9ca3af'} weight="bold" />
              <Text
                className={`font-sans-bold text-xs ${!isDark ? 'text-[#59C83A]' : 'text-zinc-400'
                  }`}
              >
                Claro
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                if (!isDark) toggleTheme();
              }}
              className={`flex-1 py-3 rounded-xl flex-row items-center justify-center gap-1.5 ${isDark
                  ? 'bg-zinc-800 border border-zinc-700'
                  : 'bg-transparent'
                }`}
            >
              <Moon size={16} color={isDark ? '#59C83A' : '#9ca3af'} weight="bold" />
              <Text
                className={`font-sans-bold text-xs ${isDark ? 'text-[#59C83A]' : 'text-[#71717a]'
                  }`}
              >
                Escuro
              </Text>
            </TouchableOpacity>
          </View>
        </MotiView>

        {/* 6. CONFIGURAÇÕES */}
        <MotiView
          from={{ opacity: 0, translateY: 12 }}
          animate={{ opacity: 1, translateY: 0 }}
        >
          <Text
            className={`text-lg font-outfit mb-3 ${isDark ? 'text-white' : 'text-[#1b1b1d]'
              }`}
          >
            Configurações
          </Text>

          <View
            className={`rounded-2xl overflow-hidden mb-6 border ${isDark
                ? 'bg-zinc-900 border-zinc-800'
                : 'bg-white border-[#e2dfe1]'
              }`}
          >
            {/* NOTIFICAÇÕES */}
            <TouchableOpacity
              onPress={handleOpenNotifications}
              className={`flex-row items-center justify-between p-4 border-b ${isDark ? 'border-zinc-800' : 'border-[#e2dfe1]'
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
                    className={`font-outfit ${hasUnreadNotifications
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

            {/* 🟢 PRIVACIDADE (INTEGRAÇÃO DIRETA DO COMPONENTE PRIVACYPOLICYBUTTON) */}
            <PrivacyPolicyButton />
          </View>
        </MotiView>

        {/* 7. BOTÃO SAIR */}
        <MotiView
          from={{ opacity: 0, translateY: 12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 250 }}
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

      {/* MODAL CÓDIGO PERSONAL */}
      <Modal visible={isLinkModalOpen} animationType="slide" transparent>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View className="flex-1 bg-black/60 justify-end">
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              className="w-full"
            >
              <View
                className={`rounded-t-3xl p-6 border-t ${isDark
                    ? 'bg-zinc-900 border-zinc-800'
                    : 'bg-white border-[#e2dfe1]'
                  }`}
              >
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  <View
                    className={`flex-row items-center justify-between mb-4 pb-3 border-b ${isDark ? 'border-zinc-800' : 'border-[#e2dfe1]'
                      }`}
                  >
                    <View className="flex-row items-center gap-2">
                      <View className="w-9 h-9 rounded-xl bg-[#59C83A]/10 items-center justify-center border border-[#59C83A]/30">
                        <Key size={20} color="#59C83A" weight="bold" />
                      </View>
                      <Text
                        className={`text-lg font-outfit-extrabold ${isDark ? 'text-white' : 'text-[#1b1b1d]'
                          }`}
                      >
                        Código do Personal
                      </Text>
                    </View>

                    <TouchableOpacity
                      onPress={() => setIsLinkModalOpen(false)}
                      className={`w-8 h-8 rounded-full items-center justify-center ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'
                        }`}
                    >
                      <X size={18} color={isDark ? '#ffffff' : '#1b1b1d'} />
                    </TouchableOpacity>
                  </View>

                  <Text
                    className={`text-xs font-sans-medium mb-4 leading-5 ${isDark ? 'text-zinc-400' : 'text-[#71717a]'
                      }`}
                  >
                    Peça o código exclusivo de convite ao seu Personal Trainer para permitir a prescrição de suas fichas.
                  </Text>

                  <TextInput
                    className={`border rounded-2xl px-4 py-3.5 text-lg font-outfit-extrabold tracking-widest uppercase mb-5 text-center ${isDark
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
                    className="bg-[#59C83A] py-4 rounded-2xl items-center flex-row justify-center mb-2"
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