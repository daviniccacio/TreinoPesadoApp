// ============================================================================
// DOCUMENTAÇÃO: MODAL DE 3 ÚLTIMAS NOTIFICAÇÕES DO USUÁRIO (INTEGRADO À VPS)
// ============================================================================
// Exibe as 3 notificações mais recentes registradas para o usuário logado,
// permitindo marcação de leitura individual/coletiva via API Node.js/Postgres
// e garantindo espaçamento seguro em relação à barra de navegação nativa.
// ============================================================================

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  Platform,
  useColorScheme,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, X, Megaphone, Barbell, CheckCircle } from 'phosphor-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// IMPORTAÇÃO DA API DA VPS E DO CONTEXTO DE AUTENTICAÇÃO
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

// --- TIPAGENS DE DADOS ---
interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
}

interface UserNotificationModalProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Busca apenas as 3 notificações mais recentes do usuário logado na VPS.
 */
async function fetchLatestThreeNotifications(userId?: string): Promise<NotificationItem[]> {
  if (!userId) return [];

  try {
    const response = await api.get(`/api/notifications/latest?userId=${userId}`);
    return response.data || [];
  } catch (error: any) {
    console.error('❌ Erro ao buscar notificações recentes:', error.message);
    return [];
  }
}

export function UserNotificationModal({
  visible,
  onClose,
}: UserNotificationModalProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const queryClient = useQueryClient();

  // 🟢 OBTÉM O USUÁRIO LOGADO DO CONTEXTO DE AUTENTICAÇÃO
  const { user } = useAuth();
  const userId = user?.id;

  // 🟢 CÁLCULO DINÂMICO DE ESPAÇAMENTO INFERIOR (SAFE AREA)
  const safeBottomPadding =
    Platform.OS === 'ios'
      ? Math.max(insets?.bottom || 0, 20) + 16
      : Math.max(insets?.bottom || 0, 16) + 20;

  // --- CONSULTA COM TANSTACK QUERY CONECTADA À VPS ---
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['user-latest-3-notifications', userId],
    queryFn: () => fetchLatestThreeNotifications(userId),
    enabled: visible && !!userId,
  });

  // --- MUTAÇÃO PARA MARCAR COMO LIDA INDIVIDUALMENTE VIA VPS ---
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      await api.put('/api/notifications/read', { notificationId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-latest-3-notifications', userId] });
      queryClient.invalidateQueries({ queryKey: ['user-notifications', userId] });
      queryClient.invalidateQueries({ queryKey: ['user-unread-notifications-status'] });
    },
    onError: (error: any) => {
      console.error('❌ Erro ao marcar notificação como lida:', error.message);
    },
  });

  // --- MUTAÇÃO PARA MARCAR TODAS COMO LIDAS VIA VPS ---
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!userId) return;
      await api.put('/api/notifications/read-all', { userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-latest-3-notifications', userId] });
      queryClient.invalidateQueries({ queryKey: ['user-notifications', userId] });
      queryClient.invalidateQueries({ queryKey: ['user-unread-notifications-status'] });
    },
    onError: (error: any) => {
      console.error('❌ Erro ao marcar todas as notificações como lidas:', error.message);
    },
  });

  const hasUnread = notifications.some((n) => !n.read);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/60 justify-end">
        <View
          style={{ paddingBottom: safeBottomPadding }}
          className="bg-white dark:bg-zinc-900 rounded-t-3xl p-5 border-t border-[#e2dfe1] dark:border-zinc-800"
        >
          {/* CABEÇALHO DO MODAL */}
          <View className="flex-row items-center justify-between pb-3 border-b border-[#e2dfe1] dark:border-zinc-800 mb-4">
            <View className="flex-row items-center">
              <View className="w-9 h-9 rounded-xl bg-[#59C83A]/10 items-center justify-center border border-[#59C83A]/30 mr-2.5">
                <Bell size={20} color="#59C83A" weight="bold" />
              </View>
              <View>
                <Text className="text-base font-outfit text-[#1b1b1d] dark:text-white">
                  Últimos Avisos
                </Text>
                <Text className="text-[11px] font-sans-medium text-[#71717a] dark:text-zinc-400">
                  Exibindo até 3 notificações recentes
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 items-center justify-center"
            >
              <X size={18} color={isDark ? '#ffffff' : '#1b1b1d'} />
            </TouchableOpacity>
          </View>

          {/* CONTEÚDO DA LISTA DE NOTIFICAÇÕES */}
          {isLoading ? (
            <View className="py-10 justify-center items-center">
              <ActivityIndicator size="large" color="#59C83A" />
            </View>
          ) : notifications.length === 0 ? (
            <View className="py-10 justify-center items-center">
              <Bell size={36} color={isDark ? '#71717a' : '#a1a1aa'} />
              <Text className="text-xs font-sans-bold text-[#71717a] dark:text-zinc-400 mt-2">
                Nenhuma notificação encontrada
              </Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} className="max-h-96">
              {notifications.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.8}
                  onPress={() => {
                    if (!item.read) markAsReadMutation.mutate(item.id);
                  }}
                  className={`p-4 rounded-2xl mb-3 border ${
                    item.read
                      ? 'bg-[#f8f9fa] dark:bg-zinc-800/40 border-[#e2dfe1] dark:border-zinc-800'
                      : 'bg-[#59C83A]/10 border-[#59C83A]/40'
                  }`}
                >
                  <View className="flex-row items-center mb-1">
                    <View className="mr-2">
                      {item.type === 'ANNOUNCEMENT' ? (
                        <Megaphone size={18} color="#59C83A" />
                      ) : (
                        <Barbell size={18} color="#59C83A" />
                      )}
                    </View>
                    <Text className="text-sm font-outfit text-[#1b1b1d] dark:text-white flex-1">
                      {item.title}
                    </Text>
                    {!item.read && (
                      <View className="w-2.5 h-2.5 rounded-full bg-[#59C83A]" />
                    )}
                  </View>
                  <Text className="text-xs font-sans-medium text-[#414755] dark:text-zinc-300 mt-1 leading-5">
                    {item.message}
                  </Text>
                </TouchableOpacity>
              ))}

              {/* BOTÃO PARA MARCAR TODAS COMO LIDAS */}
              {hasUnread && (
                <TouchableOpacity
                  onPress={() => markAllAsReadMutation.mutate()}
                  disabled={markAllAsReadMutation.isPending}
                  className="mt-1 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex-row items-center justify-center gap-1.5"
                >
                  <CheckCircle size={16} color={isDark ? '#a1a1aa' : '#71717a'} weight="bold" />
                  <Text className="text-xs font-sans-bold text-[#71717a] dark:text-zinc-300">
                    Marcar todas como lidas
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          )}

          {/* BOTÃO FECHAR */}
          <TouchableOpacity
            onPress={onClose}
            className="bg-[#59C83A] py-3.5 rounded-xl items-center mt-4"
            activeOpacity={0.8}
          >
            <Text className="text-xs font-sans-bold text-white">Fechar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}