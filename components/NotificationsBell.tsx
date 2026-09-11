// ============================================================================
// DOCUMENTAÇÃO: COMPONENTE BOTÃO DE SININHO E CENTRAL DE NOTIFICAÇÕES
// ============================================================================
// Exibe o contador de notificações não lidas e gerencia a modal de exibição
// e marcação de mensagens lidas em tempo real com TanStack Query.
// ============================================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import { Bell, X, Megaphone, Barbell } from 'phosphor-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
}

export function NotificationBell() {
  const [modalVisible, setModalVisible] = useState(false);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const queryClient = useQueryClient();

  // Consulta Notificações do Usuário
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['user-notifications'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) return [];
      return data as NotificationItem[];
    },
  });

  // Mutação para marcar notificação como lida
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-notifications'] });
    },
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <>
      {/* BOTÃO DO SININHO */}
      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        className="w-10 h-10 rounded-xl bg-[#f8f9fa] dark:bg-zinc-900 justify-center items-center border border-[#e2dfe1] dark:border-zinc-800 relative"
      >
        <Bell size={20} color={isDark ? '#ffffff' : '#1b1b1d'} />
        {unreadCount > 0 && (
          <View className="absolute -top-1 -right-1 bg-[#59C83A] w-5 h-5 rounded-full items-center justify-center border-2 border-white dark:border-zinc-950">
            <Text className="text-[10px] font-sans-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* MODAL CENTRAL DE NOTIFICAÇÕES */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-white dark:bg-zinc-900 rounded-t-3xl p-5 h-[80%] border-t border-[#e2dfe1] dark:border-zinc-800">
            <View className="flex-row items-center justify-between pb-3 border-b border-[#e2dfe1] dark:border-zinc-800 mb-4">
              <Text className="text-lg font-outfit-extrabold text-[#1b1b1d] dark:text-white">
                Notificações
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 items-center justify-center"
              >
                <X size={18} color={isDark ? '#ffffff' : '#1b1b1d'} />
              </TouchableOpacity>
            </View>

            {isLoading ? (
              <View className="flex-1 justify-center items-center">
                <ActivityIndicator size="large" color="#59C83A" />
              </View>
            ) : notifications.length === 0 ? (
              <View className="flex-1 justify-center items-center">
                <Bell size={40} color="#a1a1aa" />
                <Text className="text-sm font-sans-medium text-[#71717a] dark:text-zinc-400 mt-2">
                  Você não possui notificações
                </Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
                {notifications.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => markAsReadMutation.mutate(item.id)}
                    className={`p-4 rounded-2xl mb-3 border ${
                      item.read
                        ? 'bg-zinc-50 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800'
                        : 'bg-[#59C83A]/10 border-[#59C83A]/40'
                    }`}
                  >
                    <View className="flex-row items-center mb-1">
                      {/* 🟢 CORREÇÃO TS2322: Ícones envolvidos em View para evitar o erro de className */}
                      <View className="mr-2">
                        {item.type === 'ANNOUNCEMENT' ? (
                          <Megaphone size={18} color="#59C83A" />
                        ) : (
                          <Barbell size={18} color="#59C83A" />
                        )}
                      </View>
                      <Text className="text-sm font-outfit-bold text-[#1b1b1d] dark:text-white flex-1">
                        {item.title}
                      </Text>
                      {!item.read && (
                        <View className="w-2 h-2 rounded-full bg-[#59C83A]" />
                      )}
                    </View>
                    <Text className="text-xs font-sans-medium text-[#414755] dark:text-zinc-300 mt-1">
                      {item.message}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}