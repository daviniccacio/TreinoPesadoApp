import React from 'react';
import { View, Text, TouchableOpacity, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SignOut, User } from 'phosphor-react-native';
import { supabase } from '../../../lib/supabase';

/**
 * Tela de Perfil do Personal com opção de Terminar Sessão
 */
export default function PersonalProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  async function handleSignOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Erro ao terminar sessão:', error.message);
        return;
      }
      // Redireciona o utilizador para o fluxo de autenticação
      router.replace('/(auth)');
    } catch (err) {
      console.error('Erro inesperado ao sair:', err);
    }
  }

  return (
    <View 
      className="flex-1 bg-white dark:bg-zinc-950 px-5 justify-between pb-10"
      style={{ paddingTop: insets.top + 10 }}
    >
      {/* Cabeçalho e Informações */}
      <View>
        <View className="mb-6 border-b border-[#f0edef] dark:border-zinc-800 pb-4">
          <Text className="text-2xl font-extrabold text-[#1b1b1d] dark:text-white">
            Meu Perfil
          </Text>
          <Text className="text-sm text-[#71717a] dark:text-zinc-400 mt-1">
            Informações da conta administrativa
          </Text>
        </View>

        {/* Cartão de Identificação */}
        <View className="bg-[#f8f9fa] dark:bg-zinc-900 p-5 rounded-2xl border border-[#e2dfe1] dark:border-zinc-800 flex-row items-center mb-6">
          <View className="w-12 h-12 rounded-full bg-[#59C83A]/10 items-center justify-center mr-4 border border-[#59C83A]/20">
            <User size={24} color="#59C83A" weight="bold" />
          </View>
          <View className="flex-1">
            <Text className="text-lg font-bold text-[#1b1b1d] dark:text-white">
              Personal Trainer
            </Text>
            <Text className="text-xs text-[#71717a] dark:text-zinc-400 mt-0.5">
              Acesso total ao painel de gestão
            </Text>
          </View>
        </View>
      </View>

      {/* Botão de Terminar Sessão */}
      <TouchableOpacity
        onPress={handleSignOut}
        className="w-full bg-red-500/10 dark:bg-red-500/10 border border-red-500/30 py-4 rounded-2xl flex-row items-center justify-center"
        activeOpacity={0.8}
      >
        <SignOut size={20} color="#ef4444" weight="bold" />
        <Text className="text-red-500 font-bold text-base ml-2">
          Terminar Sessão
        </Text>
      </TouchableOpacity>
    </View>
  );
}