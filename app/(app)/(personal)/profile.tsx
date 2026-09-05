import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  useColorScheme,
  Appearance,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  User,
  Users,
  Moon,
  Sun,
  Desktop,
  SignOut,
  CaretRight,
  Shield,
  Bell,
  Books,
  Key,
} from 'phosphor-react-native';
import { useQuery } from '@tanstack/react-query';
import { MotiView } from 'moti';
import { supabase } from '../../../lib/supabase';
import { CustomModal } from '../../../components/CustomModal';

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

  // 2. Contar Alunos Vinculados (Usuários na tabela profiles que possuem o personal_id igual ao do usuário)
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
  const systemColorScheme = useColorScheme();
  const isDark = systemColorScheme === 'dark';

  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'system'>('system');

  // --- ESTADO DO MODAL PERSONALIZADO REUTILIZÁVEL ---
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

  function handleThemeChange(mode: 'light' | 'dark' | 'system') {
    setThemeMode(mode);
    if (mode === 'system') {
      Appearance.setColorScheme(null);
    } else {
      Appearance.setColorScheme(mode);
    }
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
          router.replace('/');
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
    <View className="flex-1 bg-white pb-4 dark:bg-zinc-950" style={{ paddingTop: safeTopPadding }}>
      {/* 1. CABEÇALHO ANIMADO */}
      <MotiView
        from={{ opacity: 0, translateY: -12 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{
          type: 'spring',
          damping: 24,
          stiffness: 160,
        }}
        className="px-5 py-4 border-b border-[#f0edef] dark:border-zinc-800 flex-row justify-between items-center"
      >
        <Text className="text-xl font-extrabold text-[#1b1b1d] dark:text-white">
          Perfil Profissional
        </Text>
      </MotiView>

      {/* 🟢 SCROLLVIEW CORRIGIDO COM contentContainerStyle */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 24,
          paddingBottom: 120, // Garante espaço suficiente para rolar acima da navbar flutuante
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. CARTÃO DO USUÁRIO ANIMADO */}
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
          <Text className="text-2xl font-extrabold text-[#1b1b1d] dark:text-white">
            {fullName}
          </Text>
          <Text className="text-sm text-[#414755] dark:text-zinc-400 mt-1 font-medium">
            {email}
          </Text>
        </MotiView>

        {/* 3. CARD DO CÓDIGO DE ACESSO ANIMADO */}
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
              <Text className="text-xs font-bold text-[#59C83A]">
                Seu Código de Acesso para Alunos
              </Text>

              {isLoading ? (
                <ActivityIndicator size="small" color="#59C83A" className="self-start mt-1" />
              ) : (
                <Text className="text-xl font-black text-[#1b1b1d] dark:text-white mt-0.5 tracking-wider">
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
            <Text className="text-xs font-extrabold text-white">Copiar</Text>
          </TouchableOpacity>
        </MotiView>

        {/* 4. RESUMO DE ATIVIDADES ANIMADO */}
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
          <Text className="text-lg font-bold text-[#1b1b1d] dark:text-white mb-3">
            Visão Geral do Trabalho
          </Text>

          {isLoading ? (
            <View className="py-6 items-center">
              <ActivityIndicator size="small" color="#59C83A" />
            </View>
          ) : (
            <View className="flex-row justify-between gap-3 mb-6">
              {/* Cartão 1: Alunos Vinculados */}
              <TouchableOpacity
                onPress={() => router.push('/(personal)')}
                className="flex-1 bg-[#f8f9fa] dark:bg-zinc-900 p-4 rounded-2xl items-center border border-[#e2dfe1] dark:border-zinc-800"
                activeOpacity={0.8}
              >
                <Users size={28} color="#59C83A" weight="bold" />
                <Text className="text-2xl font-extrabold text-[#1b1b1d] dark:text-white mt-1">
                  {linkedStudentsCount}
                </Text>
                <Text className="text-xs text-[#414755] dark:text-zinc-400 mt-1 text-center font-medium">
                  Alunos Vinculados
                </Text>
              </TouchableOpacity>

              {/* Cartão 2: Modelos na Biblioteca */}
              <TouchableOpacity
                onPress={() => router.push('/(personal)/routines')}
                className="flex-1 bg-[#f8f9fa] dark:bg-zinc-900 p-4 rounded-2xl items-center border border-[#e2dfe1] dark:border-zinc-800"
                activeOpacity={0.8}
              >
                <Books size={28} color="#59C83A" weight="bold" />
                <Text className="text-2xl font-extrabold text-[#1b1b1d] dark:text-white mt-1">
                  {libraryCount}
                </Text>
                <Text className="text-xs text-[#414755] dark:text-zinc-400 mt-1 text-center font-medium">
                  Modelos Salvos
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </MotiView>

        {/* 5. SELETOR DE TEMA ANIMADO */}
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
          <Text className="text-lg font-bold text-[#1b1b1d] dark:text-white mb-3">
            Aparência do Aplicativo
          </Text>

          <View className="bg-[#f8f9fa] dark:bg-zinc-900 rounded-2xl p-2 mb-6 border border-[#e2dfe1] dark:border-zinc-800 flex-row">
            <TouchableOpacity
              onPress={() => handleThemeChange('light')}
              className={`flex-1 py-3 rounded-xl flex-row items-center justify-center gap-1.5 ${
                themeMode === 'light'
                  ? 'bg-white dark:bg-zinc-800 border border-[#e2dfe1] dark:border-zinc-700'
                  : 'bg-transparent'
              }`}
            >
              <Sun size={16} color={themeMode === 'light' ? '#59C83A' : '#9ca3af'} />
              <Text
                style={themeMode === 'light' ? { color: '#59C83A' } : undefined}
                className={`font-bold text-xs ${
                  themeMode !== 'light' ? 'text-[#414755] dark:text-zinc-300' : ''
                }`}
              >
                Claro
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleThemeChange('dark')}
              className={`flex-1 py-3 rounded-xl flex-row items-center justify-center gap-1.5 ${
                themeMode === 'dark'
                  ? 'bg-white dark:bg-zinc-800 border border-[#e2dfe1] dark:border-zinc-700'
                  : 'bg-transparent'
              }`}
            >
              <Moon size={16} color={themeMode === 'dark' ? '#59C83A' : '#9ca3af'} />
              <Text
                style={themeMode === 'dark' ? { color: '#59C83A' } : undefined}
                className={`font-bold text-xs ${
                  themeMode !== 'dark' ? 'text-[#414755] dark:text-zinc-300' : ''
                }`}
              >
                Escuro
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleThemeChange('system')}
              className={`flex-1 py-3 rounded-xl flex-row items-center justify-center gap-1.5 ${
                themeMode === 'system'
                  ? 'bg-white dark:bg-zinc-800 border border-[#e2dfe1] dark:border-zinc-700'
                  : 'bg-transparent'
              }`}
            >
              <Desktop size={16} color={themeMode === 'system' ? '#59C83A' : '#9ca3af'} />
              <Text
                style={themeMode === 'system' ? { color: '#59C83A' } : undefined}
                className={`font-bold text-xs ${
                  themeMode !== 'system' ? 'text-[#414755] dark:text-zinc-300' : ''
                }`}
              >
                Sistema
              </Text>
            </TouchableOpacity>
          </View>
        </MotiView>

        {/* 6. OPÇÕES DA CONTA ANIMADAS */}
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
          <Text className="text-lg font-bold text-[#1b1b1d] dark:text-white mb-3">
            Opções da Conta
          </Text>

          <View className="bg-[#f8f9fa] dark:bg-zinc-900 rounded-2xl overflow-hidden mb-6 border border-[#e2dfe1] dark:border-zinc-800">
            <TouchableOpacity
              onPress={() =>
                showAlertModal({
                  title: 'Notificações',
                  message: 'Lembretes em desenvolvimento.',
                  type: 'info',
                })
              }
              className="flex-row items-center justify-between p-4 border-b border-[#e2dfe1] dark:border-zinc-800"
              activeOpacity={0.7}
            >
              <View className="flex-row items-center gap-3">
                <Bell size={20} color={isDark ? '#ffffff' : '#1b1b1d'} />
                <Text className="font-semibold text-[#1b1b1d] dark:text-white">
                  Notificações e Lembretes
                </Text>
              </View>
              <CaretRight size={18} color={isDark ? '#a1a1aa' : '#414755'} />
            </TouchableOpacity>

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
                <Text className="font-semibold text-[#1b1b1d] dark:text-white">
                  Privacidade e Dados
                </Text>
              </View>
              <CaretRight size={18} color={isDark ? '#a1a1aa' : '#414755'} />
            </TouchableOpacity>
          </View>
        </MotiView>

        {/* 7. BOTÃO DE SAIR ANIMADO */}
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{
            type: 'spring',
            damping: 22,
            stiffness: 150,
            delay: 120,
          }}
        >
          <TouchableOpacity
            onPress={handleSignOut}
            className="bg-[#ffebe8] dark:bg-red-950/40 p-4 rounded-2xl items-center flex-row justify-center border border-transparent dark:border-red-900/30"
            activeOpacity={0.8}
          >
            <SignOut size={20} color="#e11d48" />
            <Text className="text-[#e11d48] font-bold text-base ml-2">Sair da Conta</Text>
          </TouchableOpacity>
        </MotiView>
      </ScrollView>

      {/* COMPONENTE DO MODAL PERSONALIZADO REUTILIZÁVEL */}
      <CustomModal
        visible={modalConfig.visible}
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