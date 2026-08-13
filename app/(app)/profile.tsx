import React, { useState, useEffect, useCallback } from 'react';
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
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  User,
  Calendar,
  Dumbbell,
  Heart,
  Moon,
  Sun,
  Laptop,
  LogOut,
  ChevronRight,
  Shield,
  Bell,
} from 'lucide-react-native';
import { supabase } from '../../lib/supabase';

interface UserStats {
  customWorkoutsCount: number;
  favoriteCount: number;
}

interface UserProfileData {
  fullName: string;
  email: string;
  birthDate: string;
}

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const systemColorScheme = useColorScheme();
  const isDark = systemColorScheme === 'dark';

  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'system'>('system');

  const [stats, setStats] = useState<UserStats>({
    customWorkoutsCount: 0,
    favoriteCount: 0,
  });
  const [profile, setProfile] = useState<UserProfileData>({
    fullName: 'Atleta',
    email: 'Carregando...',
    birthDate: '',
  });
  const [loading, setLoading] = useState<boolean>(true);

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

  const fetchUserDataAndStats = useCallback(async () => {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const metadata = user.user_metadata || {};
        const firstName = metadata.first_name || '';
        const lastName = metadata.last_name || '';
        const fullName =
          `${firstName} ${lastName}`.trim() || 'Atleta Treino Pesado';

        setProfile({
          fullName,
          email: user.email || '',
          birthDate: metadata.birth_date || '',
        });

        const { count: workoutCount } = await supabase
          .from('custom_workouts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        const { count: favCount } = await supabase
          .from('favorites')
          .select('*', { count: 'exact', head: true });

        setStats({
          customWorkoutsCount: workoutCount || 0,
          favoriteCount: favCount || 0,
        });
      }
    } catch (err) {
      console.error('Erro ao carregar perfil:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserDataAndStats();
  }, [fetchUserDataAndStats]);

  useFocusEffect(
    useCallback(() => {
      fetchUserDataAndStats();
    }, [fetchUserDataAndStats])
  );

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
            }
          } catch (err) {
            console.error('Erro ao processar logout:', err);
            Alert.alert('Erro', 'Não foi possível encerrar a sessão.');
          }
        },
      },
    ]);
  }

  return (
    <View className="flex-1 bg-white dark:bg-zinc-950" style={{ paddingTop: insets.top }}>
      {/* Cabeçalho */}
      <View className="px-5 py-4 border-b border-[#f0edef] dark:border-zinc-800 flex-row justify-between items-center">
        <Text className="text-xl font-extrabold text-[#1b1b1d] dark:text-white">
          Meu Perfil
        </Text>
      </View>

      <ScrollView className="flex-1 px-5 pt-6" showsVerticalScrollIndicator={false}>
        {/* Cartão do Usuário */}
        <View className="items-center mb-6">
          <View
            style={{ backgroundColor: '#59C83A' }}
            className="w-24 h-24 rounded-full items-center justify-center mb-3 shadow-sm border border-[#46ab2b]"
          >
            <User size={48} color="#ffffff" />
          </View>
          <Text className="text-2xl font-extrabold text-[#1b1b1d] dark:text-white">
            {profile.fullName}
          </Text>
          <Text className="text-sm text-[#414755] dark:text-zinc-400 mt-1 font-medium">
            {profile.email}
          </Text>
        </View>

        {/* Resumo de Atividades */}
        <Text className="text-lg font-bold text-[#1b1b1d] dark:text-white mb-3">
          Resumo de Atividades
        </Text>

        {loading ? (
          <View className="py-6 items-center">
            <ActivityIndicator size="small" color="#59C83A" />
          </View>
        ) : (
          <View className="flex-row justify-between mb-6">
            <TouchableOpacity
              onPress={() => router.push('/my-workouts')}
              className="w-[48%] bg-[#f8f9fa] dark:bg-zinc-900 p-4 rounded-2xl items-center border border-[#e2dfe1] dark:border-zinc-800"
              activeOpacity={0.8}
            >
              <Dumbbell size={28} color="#59C83A" />
              <Text className="text-2xl font-extrabold text-[#1b1b1d] dark:text-white mt-1">
                {stats.customWorkoutsCount}
              </Text>
              <Text className="text-xs text-[#414755] dark:text-zinc-400 mt-1 text-center font-medium">
                Treinos Criados
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/favorites')}
              className="w-[48%] bg-[#f8f9fa] dark:bg-zinc-900 p-4 rounded-2xl items-center border border-[#e2dfe1] dark:border-zinc-800"
              activeOpacity={0.8}
            >
              <Heart size={28} color="#e11d48" />
              <Text className="text-2xl font-extrabold text-[#1b1b1d] dark:text-white mt-1">
                {stats.favoriteCount}
              </Text>
              <Text className="text-xs text-[#414755] dark:text-zinc-400 mt-1 text-center font-medium">
                Exercícios Favoritos
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Seletor de Tema da Aparência (Com Contraste Corrigido) */}
        <Text className="text-lg font-bold text-[#1b1b1d] dark:text-white mb-3">
          Aparência do Aplicativo
        </Text>

        <View className="bg-[#f8f9fa] dark:bg-zinc-900 rounded-2xl p-2 mb-6 border border-[#e2dfe1] dark:border-zinc-800 flex-row">
          {/* Opção Claro */}
          <TouchableOpacity
            onPress={() => handleThemeChange('light')}
            className={`flex-1 py-3 rounded-xl flex-row items-center justify-center gap-1.5 ${
              themeMode === 'light'
                ? 'bg-white dark:bg-zinc-800 border border-[#e2dfe1] dark:border-zinc-700'
                : 'bg-transparent'
            }`}
          >
            <Sun
              size={16}
              color={themeMode === 'light' ? '#59C83A' : '#9ca3af'}
            />
            <Text
              style={themeMode === 'light' ? { color: '#59C83A' } : undefined}
              className={`font-bold text-xs ${
                themeMode !== 'light' ? 'text-[#414755] dark:text-zinc-300' : ''
              }`}
            >
              Claro
            </Text>
          </TouchableOpacity>

          {/* Opção Escuro */}
          <TouchableOpacity
            onPress={() => handleThemeChange('dark')}
            className={`flex-1 py-3 rounded-xl flex-row items-center justify-center gap-1.5 ${
              themeMode === 'dark'
                ? 'bg-white dark:bg-zinc-800 border border-[#e2dfe1] dark:border-zinc-700'
                : 'bg-transparent'
            }`}
          >
            <Moon
              size={16}
              color={themeMode === 'dark' ? '#59C83A' : '#9ca3af'}
            />
            <Text
              style={themeMode === 'dark' ? { color: '#59C83A' } : undefined}
              className={`font-bold text-xs ${
                themeMode !== 'dark' ? 'text-[#414755] dark:text-zinc-300' : ''
              }`}
            >
              Escuro
            </Text>
          </TouchableOpacity>

          {/* Opção Sistema */}
          <TouchableOpacity
            onPress={() => handleThemeChange('system')}
            className={`flex-1 py-3 rounded-xl flex-row items-center justify-center gap-1.5 ${
              themeMode === 'system'
                ? 'bg-white dark:bg-zinc-800 border border-[#e2dfe1] dark:border-zinc-700'
                : 'bg-transparent'
            }`}
          >
            <Laptop
              size={16}
              color={themeMode === 'system' ? '#59C83A' : '#9ca3af'}
            />
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

        {/* Opções da Conta */}
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
            <ChevronRight size={18} color={isDark ? '#a1a1aa' : '#414755'} />
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
            <ChevronRight size={18} color={isDark ? '#a1a1aa' : '#414755'} />
          </TouchableOpacity>
        </View>

        {/* Botão Sair da Conta */}
        <TouchableOpacity
          onPress={handleSignOut}
          className="bg-[#ffebe8] dark:bg-red-950/40 p-4 rounded-2xl items-center flex-row justify-center mb-10 border border-transparent dark:border-red-900/30"
          activeOpacity={0.8}
        >
          <LogOut size={20} color="#e11d48" />
          <Text className="text-[#e11d48] font-bold text-base ml-2">Sair da Conta</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}