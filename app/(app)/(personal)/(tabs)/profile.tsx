// ============================================================================
// DOCUMENTAÇÃO: TELA DE PERFIL PROFISSIONAL (PERSONAL TRAINER) - TEMA GLOBAL
// ============================================================================
// Exibe dados cadastrais, código de acesso exclusivo para alunos, estatísticas
// de trabalho, alternância de tema global (0ms delay), envio de comunicados e logout.
// ============================================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  User,
  Users,
  Moon,
  Sun,
  SignOut,
  CaretRight,
  Shield,
  Bell,
  Books,
  Key,
} from 'phosphor-react-native';
import { useQuery } from '@tanstack/react-query';
import { MotiView } from 'moti';
import { supabase } from '../../../../lib/supabase';
import { CustomModal } from '../../../../components/CustomModal';
import { SendNotificationModal } from '../../../../components/SendNotificationModal';

// 🟢 IMPORTAÇÃO DO CONTEXTO DE TEMA GLOBAL PERSISTENTE
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

/**
 * Busca os dados do perfil, código de acesso e métricas do Personal Trainer no Supabase
 */
async function fetchPersonalProfileData(): Promise<PersonalProfileData> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Usuário não autenticado');

  // Busca o perfil e o código exclusivo de acesso na tabela profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, invite_code')
    .eq('id', user.id)
    .single();

  const fullName =
    profile?.full_name ||
    `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim() ||
    'Personal Trainer';

  // 1. Contar Modelos na Biblioteca (Planos onde student_id é nulo)
  const { count: libraryCount } = await supabase
    .from('workout_plans')
    .select('*', { count: 'exact', head: true })
    .is('student_id', null)
    .eq('personal_id', user.id);

  // 2. Contar Alunos Vinculados (Usuários na tabela profiles vinculados ao personal_id)
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

  // 🟢 SUBSCRITO AO TEMA GLOBAL PERSISTENTE
  const { isDark, toggleTheme } = useTheme();

  // 🟢 ESTADO PARA EXIBIÇÃO DO MODAL DE ENVIAR COMUNICADOS
  const [modalVisible, setModalVisible] = useState(false);

  // --- ESTADO DO MODAL PERSONALIZADO REUTILIZÁVEL DE ALERTA ---
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

  // --- CONSULTA COM TANSTACK QUERY ---
  const { data: profile, isLoading } = useQuery({
    queryKey: ['personal-profile-data'],
    queryFn: fetchPersonalProfileData,
  });

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

  const fullName = profile?.fullName || 'Personal Trainer';
  const email = profile?.email || '';
  const inviteCode = profile?.inviteCode || 'PERS-XXXX';
  const libraryCount = profile?.libraryTemplatesCount || 0;
  const linkedStudentsCount = profile?.linkedStudentsCount || 0;

  const safeTopPadding = Math.max(insets?.top || 0, 16);

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

      {/* 2. SCROLLVIEW COM ESPAÇAMENTO PARA NAVBAR FLUTUANTE */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 24,
          paddingBottom: 140,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* 3. CARTÃO DO USUÁRIO ANIMADO */}
        <MotiView
          from={{ opacity: 0, scale: 0.95, translateY: 10 }}
          animate={{ opacity: 1, scale: 1, translateY: 0 }}
          transition={{
            type: 'spring',
            damping: 22,
            stiffness: 150,
            delay: 20,
          }}
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

        {/* 4. CARD DO CÓDIGO DE ACESSO ANIMADO */}
        <MotiView
          from={{ opacity: 0, translateY: 10, scale: 0.97 }}
          animate={{ opacity: 1, translateY: 0, scale: 1 }}
          transition={{
            type: 'spring',
            damping: 22,
            stiffness: 150,
            delay: 40,
          }}
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

              {isLoading ? (
                <ActivityIndicator size="small" color="#59C83A" className="self-start mt-1" />
              ) : (
                <Text
                  className={`text-xl font-outfit-extrabold mt-0.5 tracking-wider ${
                    isDark ? 'text-white' : 'text-[#1b1b1d]'
                  }`}
                >
                  {inviteCode}
                </Text>
              )}
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

        {/* 5. RESUMO DE ATIVIDADES ANIMADO */}
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{
            type: 'spring',
            damping: 22,
            stiffness: 150,
            delay: 60,
          }}
        >
          <Text
            className={`text-lg font-outfit mb-3 ${
              isDark ? 'text-white' : 'text-[#1b1b1d]'
            }`}
          >
            Visão Geral do Trabalho
          </Text>

          {isLoading ? (
            <View className="py-6 items-center">
              <ActivityIndicator size="small" color="#59C83A" />
            </View>
          ) : (
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
          )}
        </MotiView>

        {/* 6. SELETOR DE TEMA ANIMADO (0ms DELAY) */}
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{
            type: 'spring',
            damping: 22,
            stiffness: 150,
            delay: 80,
          }}
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

        {/* 7. OPÇÕES DA CONTA ANIMADAS */}
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{
            type: 'spring',
            damping: 22,
            stiffness: 150,
            delay: 100,
          }}
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

            {/* PRIVACIDADE */}
            <TouchableOpacity
              onPress={() =>
                showAlertModal({
                  title: 'Privacidade',
                  message: 'Seus dados estão protegidos via Supabase.',
                  type: 'info',
                })
              }
              className="flex-row items-center justify-between p-4"
              activeOpacity={0.7}
            >
              <View className="flex-row items-center gap-3">
                <Shield size={20} color={isDark ? '#ffffff' : '#1b1b1d'} />
                <Text
                  className={`font-outfit ${
                    isDark ? 'text-white' : 'text-[#1b1b1d]'
                  }`}
                >
                  Privacidade e Dados
                </Text>
              </View>
              <CaretRight size={18} color={isDark ? '#a1a1aa' : '#414755'} />
            </TouchableOpacity>
          </View>
        </MotiView>

        {/* 8. BOTÃO DE SAIR ANIMADO (COM CONFIRMAÇÃO) */}
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

      {/* 🟢 COMPONENTE DO MODAL DE ENVIAR NOTIFICAÇÕES */}
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