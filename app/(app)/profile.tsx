import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

interface UserStats {
  completedWorkouts: number;
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

  const [stats, setStats] = useState<UserStats>({
    completedWorkouts: 0,
    favoriteCount: 0,
  });
  const [profile, setProfile] = useState<UserProfileData>({
    fullName: 'Atleta',
    email: 'Carregando...',
    birthDate: '',
  });
  const [loading, setLoading] = useState<boolean>(true);

  useFocusEffect(
    useCallback(() => {
      fetchUserDataAndStats();
    }, [])
  );

  async function fetchUserDataAndStats() {
    try {
      setLoading(true);

      // Obter dados do usuário logado
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const metadata = user.user_metadata || {};
        const firstName = metadata.first_name || '';
        const lastName = metadata.last_name || '';
        const fullName = `${firstName} ${lastName}`.trim() || 'Atleta Treino Pesado';

        setProfile({
          fullName,
          email: user.email || '',
          birthDate: metadata.birth_date || '',
        });
      }

      // Contagem de treinos e favoritos
      const { count: historyCount } = await supabase
        .from('workout_history')
        .select('*', { count: 'exact', head: true });

      const { count: favCount } = await supabase
        .from('favorites')
        .select('*', { count: 'exact', head: true });

      setStats({
        completedWorkouts: historyCount || 0,
        favoriteCount: favCount || 0,
      });
    } catch (err) {
      console.error('Erro ao carregar perfil:', err);
    } finally {
      setLoading(false);
    }
  }

  // Função de logout reforçada com tratamento de exceções
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
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      {/* Cabeçalho */}
      <View className="px-5 py-4 border-b border-[#f0edef] flex-row justify-between items-center">
        <Text className="text-xl font-extrabold text-[#1b1b1d]">Meu Perfil</Text>
        <TouchableOpacity
          className="w-10 h-10 rounded-full bg-[#f0edef] items-center justify-center"
          activeOpacity={0.7}
        >
          <Ionicons name="settings-outline" size={20} color="#1b1b1d" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-5 pt-6" showsVerticalScrollIndicator={false}>
        {/* Cartão do Usuário */}
        <View className="items-center mb-6">
          <View className="w-24 h-24 rounded-full bg-[#0058bc] items-center justify-center mb-3">
            <Ionicons name="person" size={48} color="#ffffff" />
          </View>
          <Text className="text-2xl font-extrabold text-[#1b1b1d]">
            {profile.fullName}
          </Text>
          <Text className="text-sm text-[#414755] mt-1 font-medium">
            {profile.email}
          </Text>
          {profile.birthDate ? (
            <View className="flex-row items-center mt-2 bg-[#f0edef] px-3 py-1 rounded-full">
              <Ionicons name="cake-outline" size={14} color="#414755" />
              <Text className="text-xs text-[#414755] ml-1 font-medium">
                Nascimento: {profile.birthDate}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Bloco de Estatísticas */}
        <Text className="text-lg font-bold text-[#1b1b1d] mb-3">Resumo de Atividades</Text>

        {loading ? (
          <View className="py-6 items-center">
            <ActivityIndicator size="small" color="#0058bc" />
          </View>
        ) : (
          <View className="flex-row justify-between mb-6">
            <View className="w-[48%] bg-[#f0edef] p-4 rounded-2xl items-center">
              <Ionicons name="checkmark-done-circle-outline" size={28} color="#0058bc" />
              <Text className="text-2xl font-extrabold text-[#1b1b1d] mt-1">
                {stats.completedWorkouts}
              </Text>
              <Text className="text-xs text-[#414755] mt-1 text-center font-medium">
                Treinos Concluídos
              </Text>
            </View>

            <View className="w-[48%] bg-[#f0edef] p-4 rounded-2xl items-center">
              <Ionicons name="heart-outline" size={28} color="#e11d48" />
              <Text className="text-2xl font-extrabold text-[#1b1b1d] mt-1">
                {stats.favoriteCount}
              </Text>
              <Text className="text-xs text-[#414755] mt-1 text-center font-medium">
                Exercícios Favoritos
              </Text>
            </View>
          </View>
        )}

        {/* Menu de Configurações */}
        <Text className="text-lg font-bold text-[#1b1b1d] mb-3">Opções da Conta</Text>

        <View className="bg-[#f0edef] rounded-2xl overflow-hidden mb-6">
          <TouchableOpacity className="flex-row items-center justify-between p-4 border-b border-[#e2dfe1]">
            <View className="flex-row items-center gap-3">
              <Ionicons name="create-outline" size={20} color="#1b1b1d" />
              <Text className="font-semibold text-[#1b1b1d]">Editar Perfil</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#414755" />
          </TouchableOpacity>

          <TouchableOpacity className="flex-row items-center justify-between p-4 border-b border-[#e2dfe1]">
            <View className="flex-row items-center gap-3">
              <Ionicons name="notifications-outline" size={20} color="#1b1b1d" />
              <Text className="font-semibold text-[#1b1b1d]">Notificações e Lembretes</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#414755" />
          </TouchableOpacity>

          <TouchableOpacity className="flex-row items-center justify-between p-4">
            <View className="flex-row items-center gap-3">
              <Ionicons name="shield-checkmark-outline" size={20} color="#1b1b1d" />
              <Text className="font-semibold text-[#1b1b1d]">Privacidade e Dados</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#414755" />
          </TouchableOpacity>
        </View>

        {/* Botão de Sair */}
        <TouchableOpacity
          onPress={handleSignOut}
          className="bg-[#ffebe8] p-4 rounded-2xl items-center flex-row justify-center mb-10"
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={20} color="#e11d48" />
          <Text className="text-[#e11d48] font-bold text-base ml-2">Sair da Conta</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}