import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  useColorScheme,
  Appearance,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  User,
  Moon,
  Sun,
  Desktop,
  SignOut,
  CaretRight,
  Shield,
  Bell,
  Books,
  ClipboardText,
} from 'phosphor-react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';

// --- TIPAGENS ---
interface PersonalProfileData {
  fullName: string;
  email: string;
  birthDate: string;
  libraryTemplatesCount: number;
  prescribedWorkoutsCount: number;
}

/**
 * Busca os dados do perfil e as métricas do Personal Trainer no Supabase
 */
async function fetchPersonalProfileData(): Promise<PersonalProfileData> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Usuário não autenticado');

  const metadata = user.user_metadata || {};
  const firstName = metadata.first_name || '';
  const lastName = metadata.last_name || '';
  const fullName = `${firstName} ${lastName}`.trim() || 'Personal Trainer';

  // 1. Contar Modelos na Biblioteca (Planos onde student_id é nulo)
  const { count: libraryCount } = await supabase
    .from('workout_plans')
    .select('*', { count: 'exact', head: true })
    .is('student_id', null)
    .eq('personal_id', user.id);

  // 2. Contar Treinos PrescritOS (Planos atribuídos a alunos)
  const { count: prescribedCount } = await supabase
    .from('workout_plans')
    .select('*', { count: 'exact', head: true })
    .not('student_id', 'is', null)
    .eq('personal_id', user.id);

  return {
    fullName,
    email: user.email || '',
    birthDate: metadata.birth_date || '',
    libraryTemplatesCount: libraryCount || 0,
    prescribedWorkoutsCount: prescribedCount || 0,
  };
}

export default function PersonalProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const systemColorScheme = useColorScheme();
  const isDark = systemColorScheme === 'dark';

  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'system'>('system');

  // --- REQUISITION COM TANSTACK QUERY ---
  const {
    data: profile,
    isLoading,
  } = useQuery({
    queryKey: ['personal-profile-data'],
    queryFn: fetchPersonalProfileData,
  });

  /**
   * Altera o tema visual do aplicativo dinamicamente
   */
  function handleThemeChange(mode: 'light' | 'dark' | 'system') {
    setThemeMode(mode);
    if (mode === 'system') {
      Appearance.setColorScheme(null);
    } else {
      Appearance.setColorScheme(mode);
    }
  }

  /**
   * Encerra a sessão do usuário
   */
  async function handleSignOut() {
    Alert.alert('Sair da Conta', 'Deseja realmente encerrar a sua sessão?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase.auth.signOut();
            if (error) {
              Alert.alert('Erro ao sair', error.message);
              return;
            }
            router.replace('/');
          } catch (err) {
            console.error('Erro ao processar logout:', err);
            Alert.alert('Erro', 'Não foi possível encerrar a sessão.');
          }
        },
      },
    ]);
  }

  const fullName = profile?.fullName || 'Personal Trainer';
  const email = profile?.email || '';
  const libraryCount = profile?.libraryTemplatesCount || 0;
  const prescribedCount = profile?.prescribedWorkoutsCount || 0;

  return (
    <View className="flex-1 bg-white dark:bg-zinc-950" style={{ paddingTop: insets.top }}>
      {/* CABEÇALHO */}
      <View className="px-5 py-4 border-b border-[#f0edef] dark:border-zinc-800 flex-row justify-between items-center">
        <Text className="text-xl font-extrabold text-[#1b1b1d] dark:text-white">
          Perfil Profissional
        </Text>
      </View>

      <ScrollView className="flex-1 px-5 pt-6" showsVerticalScrollIndicator={false}>
        {/* CARTÃO DO USUÁRIO */}
        <View className="items-center mb-6">
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
        </View>

        {/* RESUMO DE ATIVIDADES (MÉTRICAS DO PERSONAL) */}
        <Text className="text-lg font-bold text-[#1b1b1d] dark:text-white mb-3">
          Visão Geral do Trabalho
        </Text>

        {isLoading ? (
          <View className="py-6 items-center">
            <ActivityIndicator size="small" color="#59C83A" />
          </View>
        ) : (
          <View className="flex-row justify-between gap-3 mb-6">
            {/* Cartão 1: Treinos Prescritos */}
            <TouchableOpacity
              onPress={() => router.push('/(personal)')}
              className="flex-1 bg-[#f8f9fa] dark:bg-zinc-900 p-4 rounded-2xl items-center border border-[#e2dfe1] dark:border-zinc-800"
              activeOpacity={0.8}
            >
              <ClipboardText size={28} color="#59C83A" weight="bold" />
              <Text className="text-2xl font-extrabold text-[#1b1b1d] dark:text-white mt-1">
                {prescribedCount}
              </Text>
              <Text className="text-xs text-[#414755] dark:text-zinc-400 mt-1 text-center font-medium">
                Fichas Prescritas
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

        {/* SELETOR DE TEMA */}
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

        {/* OPÇÕES DA CONTA */}
        <Text className="text-lg font-bold text-[#1b1b1d] dark:text-white mb-3">
          Opções da Conta
        </Text>

        <View className="bg-[#f8f9fa] dark:bg-zinc-900 rounded-2xl overflow-hidden mb-6 border border-[#e2dfe1] dark:border-zinc-800">
          <TouchableOpacity
            onPress={() => Alert.alert('Notificações', 'Lembretes em desenvolvimento.')}
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
              Alert.alert('Privacidade', 'Seus dados estão protegidos via Supabase.')
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

        {/* BOTÃO DE SAIR */}
        <TouchableOpacity
          onPress={handleSignOut}
          className="bg-[#ffebe8] dark:bg-red-950/40 p-4 rounded-2xl items-center flex-row justify-center mb-10 border border-transparent dark:border-red-900/30"
          activeOpacity={0.8}
        >
          <SignOut size={20} color="#e11d48" />
          <Text className="text-[#e11d48] font-bold text-base ml-2">Sair da Conta</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}