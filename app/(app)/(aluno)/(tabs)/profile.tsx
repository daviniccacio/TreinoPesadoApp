import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  useColorScheme,
  Appearance,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  User,
  UserPlus,
  Moon,
  Sun,
  Desktop,
  SignOut,
  CaretRight,
  Shield,
  Bell,
  X,
  CheckCircle,
  Key,
  Barbell,
  Timer,
} from 'phosphor-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../../lib/supabase';

// --- TIPAGENS DE DADOS ---
interface StudentProfileData {
  fullName: string;
  email: string;
  personalName: string | null;
  totalWorkoutsCompleted: number;
  totalWorkoutMinutes: number;
}

/**
 * Busca as informações de perfil do aluno, nome do personal e estatísticas de treino
 */
async function fetchStudentProfileData(): Promise<StudentProfileData> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Usuário não autenticado');

  // 1. Busca o perfil do aluno no Supabase lendo a coluna 'name'
  const { data: profile } = await supabase
    .from('profiles')
    .select('name, personal_id')
    .eq('id', user.id)
    .maybeSingle();

  let fullName = profile?.name ? profile.name.trim() : 'Atleta';
  if (fullName === 'Atleta' && user.email) {
    fullName = user.email.split('@')[0];
  }

  let personalName: string | null = null;

  // 2. Se o aluno possui um personal_id, busca o nome do Personal
  if (profile?.personal_id) {
    const { data: personalProfile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', profile.personal_id)
      .maybeSingle();

    if (personalProfile?.name) {
      personalName = personalProfile.name.trim();
    }
  }

  // 3. Busca estatísticas do histórico de treinos (se a tabela de histórico existir)
  let totalWorkoutsCompleted = 0;
  let totalWorkoutMinutes = 0;

  try {
    const { data: historyData } = await supabase
      .from('workout_history')
      .select('duration_minutes')
      .eq('user_id', user.id);

    if (historyData) {
      totalWorkoutsCompleted = historyData.length;
      totalWorkoutMinutes = historyData.reduce(
        (acc, item) => acc + (item.duration_minutes || 0),
        0
      );
    }
  } catch (err) {
    // Caso a tabela de histórico ainda não esteja criada no banco, assume 0
    totalWorkoutsCompleted = 0;
    totalWorkoutMinutes = 0;
  }

  return {
    fullName,
    email: user.email || '',
    personalName,
    totalWorkoutsCompleted,
    totalWorkoutMinutes,
  };
}

/**
 * Função que valida o código digitado e realiza o vínculo com o personal
 */
async function linkStudentToPersonalByCode(inviteCode: string) {
  const cleanCode = inviteCode.trim().toUpperCase();

  if (!cleanCode) {
    throw new Error('Por favor, digite o código de acesso do seu Personal.');
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Sessão expirada. Faça login novamente.');

  // 1. Localiza o Personal pelo código de convite na coluna 'name'
  const { data: personalProfile, error: searchError } = await supabase
    .from('profiles')
    .select('id, name')
    .eq('invite_code', cleanCode)
    .single();

  if (searchError || !personalProfile) {
    throw new Error('Código inválido. Nenhum Personal Trainer foi encontrado.');
  }

  const foundPersonalName = personalProfile.name ? personalProfile.name.trim() : 'Personal Trainer';

  // 2. Atualiza a coluna personal_id do perfil do Aluno
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ personal_id: personalProfile.id })
    .eq('id', user.id);

  if (updateError) throw new Error(updateError.message);

  return foundPersonalName;
}

export default function StudentProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const systemColorScheme = useColorScheme();
  const isDark = systemColorScheme === 'dark';
  const queryClient = useQueryClient();

  // --- ESTADOS LOCAIS ---
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'system'>('system');
  const [isLinkModalOpen, setIsLinkModalOpen] = useState<boolean>(false);
  const [inviteCodeInput, setInviteCodeInput] = useState<string>('');

  // --- CONSULTA DOS DADOS DO PERFIL ---
  const { data: profile, isLoading } = useQuery({
    queryKey: ['student-profile-data'],
    queryFn: fetchStudentProfileData,
  });

  // --- MUTAÇÃO PARA VINCULAR O PERSONAL ---
  const linkMutation = useMutation({
    mutationFn: linkStudentToPersonalByCode,
    onSuccess: (personalName) => {
      setIsLinkModalOpen(false);
      setInviteCodeInput('');

      // Invalida os caches para atualizar as telas instantaneamente
      queryClient.invalidateQueries({ queryKey: ['student-profile-data'] });
      queryClient.invalidateQueries({ queryKey: ['student-home-data'] });

      Alert.alert(
        'Sucesso! 🎉',
        `Você foi vinculado com sucesso ao Personal Trainer ${personalName}!`
      );
    },
    onError: (err: any) => {
      Alert.alert('Erro ao Vincular', err.message || 'Não foi possível realizar o vínculo.');
    },
  });

  function handleThemeChange(mode: 'light' | 'dark' | 'system') {
    setThemeMode(mode);
    if (mode === 'system') {
      Appearance.setColorScheme(null);
    } else {
      Appearance.setColorScheme(mode);
    }
  }

  async function handleSignOut() {
    Alert.alert('Sair da Conta', 'Deseja realmente encerrar sua sessão?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace('/');
        },
      },
    ]);
  }

  // Formata o tempo de treino em horas e minutos
  function formatWorkoutTime(totalMinutes: number) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours === 0) return `${minutes} min`;
    return `${hours}h ${minutes}m`;
  }

  return (
    <View className="flex-1 bg-white dark:bg-zinc-950" style={{ paddingTop: insets.top }}>
      {/* CABEÇALHO */}
      <View className="px-5 py-4 border-b border-[#f0edef] dark:border-zinc-800 flex-row justify-between items-center">
        <Text className="text-xl font-extrabold text-[#1b1b1d] dark:text-white">
          Meu Perfil
        </Text>
      </View>

      <ScrollView className="flex-1 px-5 pt-6" showsVerticalScrollIndicator={false}>
        {/* CARTÃO DO ALUNO */}
        <View className="items-center mb-6">
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
              <Text className="text-2xl font-extrabold text-[#1b1b1d] dark:text-white text-center">
                {profile?.fullName}
              </Text>
              <Text className="text-sm text-[#414755] dark:text-zinc-400 mt-0.5 font-medium">
                {profile?.email}
              </Text>

              {/* Status do Vínculo com Personal */}
              <View className="mt-2 bg-[#59C83A]/10 border border-[#59C83A]/30 px-3 py-1 rounded-full flex-row items-center">
                <Text className="text-xs font-bold text-[#59C83A]">
                  {profile?.personalName
                    ? `Personal: ${profile.personalName}`
                    : 'Sem Personal Vinculado'}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* OPÇÃO DE VÍNCULO DE PERSONAL */}
        <Text className="text-lg font-bold text-[#1b1b1d] dark:text-white mb-3">
          Instrutor
        </Text>

        <View className="bg-[#f8f9fa] dark:bg-zinc-900 rounded-2xl overflow-hidden mb-5 border border-[#e2dfe1] dark:border-zinc-800">
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
                <Text className="font-bold text-[#1b1b1d] dark:text-white text-sm">
                  Conectar com meu Personal
                </Text>
                <Text className="text-xs text-[#71717a] dark:text-zinc-400">
                  {profile?.personalName
                    ? 'Trocar ou redefinir seu instrutor'
                    : 'Inserir código de acesso do personal'}
                </Text>
              </View>
            </View>
            <CaretRight size={18} color={isDark ? '#a1a1aa' : '#414755'} />
          </TouchableOpacity>
        </View>

        {/* --- CARDS DE ESTATÍSTICAS (TREINOS REALIZADOS E TEMPO DE TREINO) --- */}
        <View className="flex-row justify-between mb-6">
          <View className="w-[48%] bg-[#f8f9fa] dark:bg-zinc-900 p-4 rounded-2xl border border-[#e2dfe1] dark:border-zinc-800 items-center">
            <View className="w-10 h-10 rounded-xl bg-[#59C83A]/10 items-center justify-center mb-2 border border-[#59C83A]/30">
              <Barbell size={22} color="#59C83A" weight="bold" />
            </View>
            <Text className="text-xs text-[#71717a] dark:text-zinc-400 font-medium">
              Treinos Realizados
            </Text>
            <Text className="text-xl font-black text-[#1b1b1d] dark:text-white mt-0.5">
              {profile?.totalWorkoutsCompleted || 0}
            </Text>
          </View>

          <View className="w-[48%] bg-[#f8f9fa] dark:bg-zinc-900 p-4 rounded-2xl border border-[#e2dfe1] dark:border-zinc-800 items-center">
            <View className="w-10 h-10 rounded-xl bg-[#59C83A]/10 items-center justify-center mb-2 border border-[#59C83A]/30">
              <Timer size={22} color="#59C83A" weight="bold" />
            </View>
            <Text className="text-xs text-[#71717a] dark:text-zinc-400 font-medium">
              Tempo de Treino
            </Text>
            <Text className="text-xl font-black text-[#1b1b1d] dark:text-white mt-0.5">
              {formatWorkoutTime(profile?.totalWorkoutMinutes || 0)}
            </Text>
          </View>
        </View>

        {/* SELETOR DE TEMA */}
        <Text className="text-lg font-bold text-[#1b1b1d] dark:text-white mb-3">
          Aparência
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

        {/* OPÇÕES ADICIONAIS */}
        <Text className="text-lg font-bold text-[#1b1b1d] dark:text-white mb-3">
          Configurações
        </Text>

        <View className="bg-[#f8f9fa] dark:bg-zinc-900 rounded-2xl overflow-hidden mb-6 border border-[#e2dfe1] dark:border-zinc-800">
          <TouchableOpacity
            onPress={() => Alert.alert('Notificações', 'Recurso em desenvolvimento.')}
            className="flex-row items-center justify-between p-4 border-b border-[#e2dfe1] dark:border-zinc-800"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center gap-3">
              <Bell size={20} color={isDark ? '#ffffff' : '#1b1b1d'} />
              <Text className="font-semibold text-[#1b1b1d] dark:text-white">
                Notificações
              </Text>
            </View>
            <CaretRight size={18} color={isDark ? '#a1a1aa' : '#414755'} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => Alert.alert('Privacidade', 'Seus dados estão protegidos.')}
            className="flex-row items-center justify-between p-4"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center gap-3">
              <Shield size={20} color={isDark ? '#ffffff' : '#1b1b1d'} />
              <Text className="font-semibold text-[#1b1b1d] dark:text-white">
                Privacidade
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

      {/* MODAL DE INSERÇÃO DO CÓDIGO DO PERSONAL */}
      <Modal visible={isLinkModalOpen} animationType="slide" transparent>
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-white dark:bg-zinc-900 rounded-t-3xl p-6 border-t border-[#e2dfe1] dark:border-zinc-800">
            {/* Cabeçalho do Modal */}
            <View className="flex-row items-center justify-between mb-4 pb-3 border-b border-[#e2dfe1] dark:border-zinc-800">
              <View className="flex-row items-center gap-2">
                <View className="w-9 h-9 rounded-xl bg-[#59C83A]/10 items-center justify-center border border-[#59C83A]/30">
                  <Key size={20} color="#59C83A" weight="bold" />
                </View>
                <Text className="text-lg font-extrabold text-[#1b1b1d] dark:text-white">
                  Código do Personal
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setIsLinkModalOpen(false)}
                className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 items-center justify-center"
              >
                <X size={18} color={isDark ? '#ffffff' : '#1b1b1d'} />
              </TouchableOpacity>
            </View>

            <Text className="text-xs text-[#71717a] dark:text-zinc-400 mb-4 leading-5">
              Peça o código exclusivo de convite (ex: <Text className="font-bold text-[#59C83A]">PERS-A1B2</Text>) ao seu Personal Trainer para permitir a prescrição de suas fichas.
            </Text>

            {/* Campo do Código */}
            <TextInput
              className="bg-[#f8f9fa] dark:bg-zinc-950 border border-[#e2dfe1] dark:border-zinc-800 rounded-2xl px-4 py-3.5 text-lg font-extrabold text-[#1b1b1d] dark:text-white tracking-widest uppercase mb-5 text-center"
              placeholder="PERS-XXXX"
              placeholderTextColor={isDark ? '#71717a' : '#a09da1'}
              value={inviteCodeInput}
              onChangeText={setInviteCodeInput}
              autoCapitalize="characters"
              autoCorrect={false}
            />

            {/* Botão de Confirmação */}
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
                  <Text className="text-white font-extrabold text-base ml-2">
                    Confirmar Vínculo
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}