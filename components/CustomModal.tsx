// ============================================================================
// DOCUMENTAÇÃO: COMPONENTE DE MODAL REUTILIZÁVEL COM SUPORTE A TEMAS (LIGHT/DARK)
// ============================================================================
// Exibe alertas, confirmações e avisos no sistema, adaptando dinamicamente
// as cores de fundo, bordas e textos de acordo com a preferência de tema.
// ============================================================================

import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import {
  CheckCircle,
  WarningCircle,
  Info,
  X,
} from 'phosphor-react-native';

export interface CustomModalProps {
  visible: boolean;
  title: string;
  message: string;
  type?: 'success' | 'danger' | 'info';
  confirmText?: string;
  cancelText?: string;
  showCancelButton?: boolean;
  isDark?: boolean; // 🟢 Prop opcional para sincronizar com o tema da tela pai
  onConfirm: () => void;
  onClose: () => void;
}

export function CustomModal({
  visible,
  title,
  message,
  type = 'info',
  confirmText = 'Entendi',
  cancelText = 'Cancelar',
  showCancelButton = false,
  isDark: customIsDark,
  onConfirm,
  onClose,
}: CustomModalProps) {
  const systemColorScheme = useColorScheme();
  
  // 🟢 Se 'isDark' for passado via prop, usa ele; senão, usa o tema do sistema
  const isDark = customIsDark !== undefined ? customIsDark : systemColorScheme === 'dark';

  if (!visible) return null;

  // Configuração visual por tipo de alerta
  const iconMap = {
    success: <CheckCircle size={32} color="#10b981" weight="bold" />,
    danger: <WarningCircle size={32} color="#ef4444" weight="bold" />,
    info: <Info size={32} color="#59C83A" weight="bold" />,
  };

  const badgeBgMap = {
    success: 'bg-emerald-500/10 border-emerald-500/30',
    danger: 'bg-red-500/10 border-red-500/30',
    info: 'bg-[#59C83A]/10 border-[#59C83A]/30',
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/60 justify-center items-center px-6">
        <View
          className={`w-full rounded-3xl p-6 border shadow-2xl ${
            isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-[#e2dfe1]'
          }`}
        >
          {/* BOTÃO DE FECHAR (X) */}
          <TouchableOpacity
            onPress={onClose}
            className={`absolute top-4 right-4 w-8 h-8 rounded-full items-center justify-center z-10 ${
              isDark ? 'bg-zinc-800' : 'bg-zinc-100'
            }`}
          >
            <X size={16} color={isDark ? '#a1a1aa' : '#71717a'} />
          </TouchableOpacity>

          {/* ÍCONE E TÍTULO */}
          <View className="items-center mb-4 pt-2">
            <View
              className={`w-14 h-14 rounded-2xl items-center justify-center border mb-3 ${badgeBgMap[type]}`}
            >
              {iconMap[type]}
            </View>

            <Text
              className={`text-lg font-outfit-bold text-center ${
                isDark ? 'text-white' : 'text-[#1b1b1d]'
              }`}
            >
              {title}
            </Text>
          </View>

          {/* MENSAGEM */}
          <Text
            className={`text-xs font-sans-medium text-center mb-6 leading-5 ${
              isDark ? 'text-zinc-400' : 'text-[#71717a]'
            }`}
          >
            {message}
          </Text>

          {/* BOTÕES DE AÇÃO */}
          <View className="flex-row gap-3">
            {showCancelButton && (
              <TouchableOpacity
                onPress={onClose}
                className={`flex-1 py-3.5 rounded-2xl items-center border ${
                  isDark
                    ? 'bg-zinc-800 border-zinc-700'
                    : 'bg-zinc-100 border-[#e2dfe1]'
                }`}
              >
                <Text
                  className={`font-sans-bold text-xs ${
                    isDark ? 'text-zinc-300' : 'text-zinc-700'
                  }`}
                >
                  {cancelText}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={onConfirm}
              className={`flex-1 py-3.5 rounded-2xl items-center ${
                type === 'danger'
                  ? 'bg-red-500'
                  : type === 'success'
                  ? 'bg-emerald-600'
                  : 'bg-[#59C83A]'
              }`}
            >
              <Text className="font-sans-bold text-xs text-white">
                {confirmText}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}