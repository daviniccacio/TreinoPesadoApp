// ============================================================================
// DOCUMENTAÇÃO: PAINEL DE GESTÃO ADMINISTRATIVA (ADMIN DASHBOARD)
// ============================================================================
// Lista todos os alunos/usuários do aplicativo, exibe estatísticas gerais e
// permite ao Administrador alterar o status de acesso (Ativo/Bloqueado).
// ============================================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  useColorScheme,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  MagnifyingGlass,
  Users,
  ShieldCheck,
  User,
  UserCheck,
  SignOut,
  X,
  LockLaminated,
} from 'phosphor-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MotiView } from 'moti';
import { supabase } from '../../../lib/supabase';
import { CustomModal } from '../../../components/CustomModal';
import { useRouter } from 'expo-router';

interface UserProfile {
  id: string;
  full_name: string;
  email?: string;
  role: string;
  is_blocked: boolean;
  created_at: string;
}

/**
 * Busca todos os perfis cadastrados no sistema (Exclusivo para Admin)
 */
async function fetchAllUsers(): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, is_blocked, created_at')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return (data || []).map((user: any) => ({
    id: user.id,
    full_name: user.full_name || 'Usuário Sem Nome',
    role: user.role || 'aluno',
    is_blocked: !!user.is_blocked,
    created_at: user.created_at,
  }));
}

export default function AdminDashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  // --- CONSULTA TANSTACK QUERY ---
  const {
    data: users = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['admin-users-list'],
    queryFn: fetchAllUsers,
  });

  // --- MUTAÇÃO PARA BLOQUEAR / DESBLOQUEAR USUÁRIO ---
  const toggleBlockMutation = useMutation({
    mutationFn: async ({
      userId,
      shouldBlock,
    }: {
      userId: string;
      shouldBlock: boolean;
    }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_blocked: shouldBlock })
        .eq('id', userId);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users-list'] });
      setSelectedUser(null);
    },
  });

  // Filtro de busca por nome
  const filteredUsers = users.filter((u) =>
    u.full_name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const totalUsers = users.length;
  const activeUsers = users.filter((u) => !u.is_blocked).length;
  const blockedUsers = users.filter((u) => u.is_blocked).length;

  const safeTopPadding = Math.max(insets?.top || 0, 16);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace('/');
  }

  return (
    <View
      className="flex-1 bg-white dark:bg-zinc-950 px-5"
      style={{ paddingTop: safeTopPadding + 10 }}
    >
      {/* 1. CABEÇALHO ADMIN */}
      <MotiView
        from={{ opacity: 0, translateY: -10 }}
        animate={{ opacity: 1, translateY: 0 }}
        className="flex-row items-center justify-between mb-5 pb-3 border-b border-[#e2dfe1] dark:border-zinc-800"
      >
        <View className="flex-row items-center gap-2.5">
          <View className="w-10 h-10 rounded-2xl bg-[#59C83A]/10 items-center justify-center border border-[#59C83A]/30">
            <ShieldCheck size={22} color="#59C83A" weight="bold" />
          </View>
          <View>
            <Text className="text-xl font-outfit-extrabold text-[#1b1b1d] dark:text-white">
              Painel Admin
            </Text>
            <Text className="text-xs font-sans-medium text-[#71717a] dark:text-zinc-400">
              Gestão de Contas do Aplicativo
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleSignOut}
          className="w-9 h-9 rounded-xl bg-red-500/10 items-center justify-center border border-red-500/20"
        >
          <SignOut size={18} color="#e11d48" />
        </TouchableOpacity>
      </MotiView>

      {/* 2. CARDS DE RESUMO ESTATÍSTICO */}
      <MotiView
        from={{ opacity: 0, translateY: 10 }}
        animate={{ opacity: 1, translateY: 0 }}
        className="flex-row gap-3 mb-5"
      >
        <View className="flex-1 bg-[#f8f9fa] dark:bg-zinc-900 p-3.5 rounded-2xl border border-[#e2dfe1] dark:border-zinc-800 items-center">
          <Users size={20} color="#59C83A" />
          <Text className="text-lg font-outfit-extrabold text-[#1b1b1d] dark:text-white mt-1">
            {totalUsers}
          </Text>
          <Text className="text-[10px] font-sans-bold text-[#71717a] dark:text-zinc-400">
            Total
          </Text>
        </View>

        <View className="flex-1 bg-[#f8f9fa] dark:bg-zinc-900 p-3.5 rounded-2xl border border-[#e2dfe1] dark:border-zinc-800 items-center">
          <UserCheck size={20} color="#10b981" />
          <Text className="text-lg font-outfit-extrabold text-[#1b1b1d] dark:text-white mt-1">
            {activeUsers}
          </Text>
          <Text className="text-[10px] font-sans-bold text-emerald-600 dark:text-emerald-400">
            Ativos
          </Text>
        </View>

        <View className="flex-1 bg-[#f8f9fa] dark:bg-zinc-900 p-3.5 rounded-2xl border border-[#e2dfe1] dark:border-zinc-800 items-center">
          <User size={20} color="#ef4444" />
          <Text className="text-lg font-outfit-extrabold text-[#1b1b1d] dark:text-white mt-1">
            {blockedUsers}
          </Text>
          <Text className="text-[10px] font-sans-bold text-red-500">
            Bloqueados
          </Text>
        </View>
      </MotiView>

      {/* 3. BARRA DE BUSCA */}
      <View className="flex-row items-center bg-[#f8f9fa] dark:bg-zinc-900 border border-[#e2dfe1] dark:border-zinc-800 rounded-2xl px-4 py-3 mb-4">
        <MagnifyingGlass size={18} color={isDark ? '#59C83A' : '#71717a'} />
        <TextInput
          className="flex-1 ml-3 text-xs font-sans-medium text-[#1b1b1d] dark:text-white"
          placeholder="Buscar usuário por nome..."
          placeholderTextColor={isDark ? '#71717a' : '#a09da1'}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <X size={16} color={isDark ? '#a1a1aa' : '#71717a'} />
          </TouchableOpacity>
        )}
      </View>

      {/* 4. LISTA DE USUÁRIOS */}
      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#59C83A" />
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#59C83A"
            />
          }
          renderItem={({ item }) => (
            <View
              className={`p-4 rounded-2xl mb-3 border flex-row items-center justify-between ${
                item.is_blocked
                  ? 'bg-red-500/10 border-red-500/30'
                  : 'bg-[#f8f9fa] dark:bg-zinc-900 border-[#e2dfe1] dark:border-zinc-800'
              }`}
            >
              <View className="flex-1 mr-2">
                <View className="flex-row items-center gap-2 mb-0.5">
                  <Text className="text-sm font-outfit-bold text-[#1b1b1d] dark:text-white">
                    {item.full_name}
                  </Text>
                  <View
                    className={`px-2 py-0.5 rounded-full ${
                      item.role === 'admin'
                        ? 'bg-purple-500/20 border border-purple-500/40'
                        : item.role === 'personal'
                        ? 'bg-blue-500/20 border border-blue-500/40'
                        : 'bg-zinc-200 dark:bg-zinc-800'
                    }`}
                  >
                    <Text className="text-[9px] font-sans-bold uppercase text-zinc-700 dark:text-zinc-300">
                      {item.role}
                    </Text>
                  </View>
                </View>

                <Text className="text-[11px] font-sans-medium text-[#71717a] dark:text-zinc-400">
                  Status: {item.is_blocked ? '🔴 Bloqueado' : '🟢 Ativo'}
                </Text>
              </View>

              {/* Botão de Ação: Bloquear / Desbloquear */}
              {item.role !== 'admin' && (
                <TouchableOpacity
                  onPress={() => setSelectedUser(item)}
                  className={`px-3 py-2 rounded-xl flex-row items-center gap-1.5 ${
                    item.is_blocked ? 'bg-emerald-600' : 'bg-red-500'
                  }`}
                >
                  <LockLaminated size={14} color="#ffffff" weight="bold" />
                  <Text className="text-xs font-sans-bold text-white">
                    {item.is_blocked ? 'Liberar' : 'Bloquear'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        />
      )}

      {/* 5. MODAL DE CONFIRMAÇÃO DE ALTERAÇÃO DE DE STATUS */}
      {selectedUser && (
        <CustomModal
          visible={!!selectedUser}
          title={
            selectedUser.is_blocked
              ? 'Desbloquear Usuário'
              : 'Bloquear Acesso'
          }
          message={
            selectedUser.is_blocked
              ? `Deseja reativar o acesso de ${selectedUser.full_name} ao aplicativo?`
              : `Tem certeza que deseja proibir o acesso de ${selectedUser.full_name}?`
          }
          type={selectedUser.is_blocked ? 'success' : 'danger'}
          confirmText={selectedUser.is_blocked ? 'Desbloquear' : 'Bloquear'}
          cancelText="Cancelar"
          showCancelButton
          onConfirm={() =>
            toggleBlockMutation.mutate({
              userId: selectedUser.id,
              shouldBlock: !selectedUser.is_blocked,
            })
          }
          onClose={() => setSelectedUser(null)}
        />
      )}
    </View>
  );
}