import React from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from "react-native";
import { CheckCircle, WarningCircle, Info, X } from "phosphor-react-native";

export interface CustomModalProps {
  visible: boolean;
  title: string;
  message: string;
  type?: "success" | "danger" | "info";
  confirmText?: string;
  cancelText?: string;
  showCancelButton?: boolean;
  showCloseButton?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * Componente de Modal com Design de Alta Fidelidade e Layout Flexível
 */
export function CustomModal({
  visible,
  title,
  message,
  type = "info",
  confirmText = "OK",
  cancelText = "Cancelar",
  showCancelButton = true,
  showCloseButton = true,
  onConfirm,
  onClose,
}: CustomModalProps) {
  // Define o ícone e o esquema de cores conforme o tipo do modal
  const renderIcon = () => {
    switch (type) {
      case "danger":
        return (
          <View className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-950/60 items-center justify-center border-4 border-red-50 dark:border-red-900/30 mb-3">
            <WarningCircle size={32} color="#ef4444" weight="bold" />
          </View>
        );
      case "success":
        return (
          <View className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 items-center justify-center border-4 border-emerald-50 dark:border-emerald-900/30 mb-3">
            <CheckCircle size={32} color="#59C83A" weight="bold" />
          </View>
        );
      default:
        return (
          <View className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-950/60 items-center justify-center border-4 border-blue-50 dark:border-blue-900/30 mb-3">
            <Info size={32} color="#3b82f6" weight="bold" />
          </View>
        );
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      {/* Fundo escurecido com fechamento ao tocar fora */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        className="flex-1 bg-black/70 justify-center items-center px-6"
      >
        <TouchableWithoutFeedback>
          <View className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-100 dark:border-zinc-800 shadow-2xl items-center relative">
            
            {/* Botão de Fechar no Canto Superior Direito */}
            {showCloseButton && (
              <TouchableOpacity
                onPress={onClose}
                className="absolute top-4 right-4 p-2 rounded-full bg-zinc-100 dark:bg-zinc-800"
                activeOpacity={0.7}
              >
                <X size={16} color="#71717a" weight="bold" />
              </TouchableOpacity>
            )}

            {/* Ícone Ilustrativo */}
            {renderIcon()}

            {/* Título do Modal */}
            <Text className="text-xl font-black text-center text-zinc-900 dark:text-white mb-1.5">
              {title}
            </Text>

            {/* Mensagem Descritiva */}
            <Text className="text-xs font-medium text-center text-zinc-500 dark:text-zinc-400 mb-6 leading-5 px-2">
              {message}
            </Text>

            {/* Seção de Botões */}
            <View className="w-full flex-row gap-3">
              {showCancelButton && (
                <TouchableOpacity
                  onPress={onClose}
                  className="flex-1 py-3.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 items-center justify-center"
                  activeOpacity={0.7}
                >
                  <Text className="font-bold text-zinc-700 dark:text-zinc-300 text-sm">
                    {cancelText}
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={onConfirm}
                className={`flex-1 py-3.5 rounded-2xl items-center justify-center ${
                  type === "danger"
                    ? "bg-red-500"
                    : type === "success"
                    ? "bg-[#59C83A]"
                    : "bg-zinc-900 dark:bg-white"
                }`}
                activeOpacity={0.8}
              >
                <Text
                  className={`font-bold text-sm ${
                    type === "info"
                      ? "text-white dark:text-zinc-900"
                      : "text-white"
                  }`}
                >
                  {confirmText}
                </Text>
              </TouchableOpacity>
            </View>

          </View>
        </TouchableWithoutFeedback>
      </TouchableOpacity>
    </Modal>
  );
}