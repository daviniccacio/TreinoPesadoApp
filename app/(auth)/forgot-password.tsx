// ============================================================================
// TELA 1: SOLICITAR CÓDIGO DE RECUPERAÇÃO (FORGOT PASSWORD)
// ============================================================================

import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EnvelopeSimple, PaperPlaneRight, ArrowLeft } from "phosphor-react-native";
import { MotiView } from "moti";
import { supabase } from "../../lib/supabase";
import { CustomModal } from "../../components/CustomModal";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  // ESTADO DO MODAL PERSONALIZADO DE ALERTA
  const [modalConfig, setModalConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: "success" | "danger" | "info";
    confirmText: string;
    cancelText: string;
    showCancelButton: boolean;
    onConfirm: () => void;
  }>({
    visible: false,
    title: "",
    message: "",
    type: "info",
    confirmText: "Entendi",
    cancelText: "Cancelar",
    showCancelButton: false,
    onConfirm: () => {},
  });

  function showAlertModal({
    title,
    message,
    type = "info",
    confirmText = "Entendi",
    cancelText = "Cancelar",
    showCancelButton = false,
    onConfirm,
  }: {
    title: string;
    message: string;
    type?: "success" | "danger" | "info";
    confirmText?: string;
    cancelText?: string;
    showCancelButton?: boolean;
    onConfirm?: () => void;
  }) {
    setModalConfig({
      visible: true,
      title,
      message,
      type,
      confirmText,
      cancelText,
      showCancelButton,
      onConfirm: () => {
        setModalConfig((prev) => ({ ...prev, visible: false }));
        if (onConfirm) onConfirm();
      },
    });
  }

  async function handleSendCode() {
    if (!email.trim()) {
      showAlertModal({
        title: "Atenção",
        message: "Por favor, informe o seu e-mail de acesso.",
        type: "info",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());

      if (error) {
        showAlertModal({
          title: "Erro ao Enviar",
          message: error.message || "Não foi possível enviar o código de verificação.",
          type: "danger",
        });
      } else {
        showAlertModal({
          title: "Código Enviado! 📩",
          message: "Enviamos um código de 6 dígitos para o seu e-mail. Verifique a caixa de entrada ou spam.",
          type: "success",
          confirmText: "Digitar Código",
          onConfirm: () => {
            router.push({
              pathname: "/reset-password" as any,
              params: { email: email.trim() },
            });
          },
        });
      }
    } catch (err) {
      showAlertModal({
        title: "Erro",
        message: "Ocorreu uma falha ao solicitar o código de recuperação.",
        type: "danger",
      });
    } finally {
      setLoading(false);
    }
  }

  const safeTopPadding = Math.max(insets?.top || 0, 16);
  const safeBottomPadding = Math.max(insets?.bottom || 0, 16);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="bg-white dark:bg-zinc-950"
    >
      <ScrollView
        contentContainerStyle={{
          paddingTop: safeTopPadding + 12,
          paddingBottom: safeBottomPadding + 24,
          paddingHorizontal: 24,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* BOTÃO VOLTAR */}
        <TouchableOpacity
          onPress={() => router.back()}
          className="flex-row items-center mb-6 py-1"
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color={isDark ? "#a1a1aa" : "#71717a"} />
          <Text className="text-sm font-bold text-[#71717a] dark:text-zinc-400 ml-2">
            Voltar para o Login
          </Text>
        </TouchableOpacity>

        {/* 1. CABEÇALHO ANIMADO */}
        <MotiView
          from={{ opacity: 0, translateY: -12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "spring", damping: 24, stiffness: 160 }}
          className="mb-8"
        >
          <Text className="text-2xl font-black text-[#1b1b1d] dark:text-white mb-2">
            Esqueceu a Senha?
          </Text>
          <Text className="text-xs text-[#71717a] dark:text-zinc-400 font-medium leading-relaxed">
            Informe o seu e-mail cadastrado para receber o código de verificação de 6 dígitos.
          </Text>
        </MotiView>

        {/* 2. FORMULÁRIO */}
        <MotiView
          from={{ opacity: 0, translateY: 12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "spring", damping: 22, stiffness: 150, delay: 30 }}
        >
          {/* Campo: E-mail */}
          <View className="mb-6">
            <Text className="text-xs font-bold uppercase tracking-wider text-[#71717a] dark:text-zinc-400 mb-2 ml-1">
              E-mail
            </Text>
            <View className="flex-row items-center h-14 bg-[#f8f9fa] dark:bg-zinc-900 rounded-2xl px-4 border border-[#e2dfe1] dark:border-zinc-800">
              <EnvelopeSimple size={20} color={isDark ? "#59C83A" : "#414755"} />
              <TextInput
                style={{ textAlignVertical: "center" }}
                className="flex-1 ml-3 text-[#1b1b1d] dark:text-white text-sm font-medium h-full py-0"
                placeholder="seuemail@exemplo.com"
                placeholderTextColor={isDark ? "#71717a" : "#a09da1"}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Botão de Enviar */}
          <TouchableOpacity
            onPress={handleSendCode}
            disabled={loading}
            style={{ backgroundColor: "#59C83A" }}
            className="h-14 rounded-2xl items-center flex-row justify-center shadow-md"
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <PaperPlaneRight size={20} color="#FFFFFF" weight="bold" />
                <Text className="text-white font-extrabold text-base ml-2">
                  Enviar Código OTP
                </Text>
              </>
            )}
          </TouchableOpacity>
        </MotiView>
      </ScrollView>

      {/* MODAL DE ALERTA */}
      <CustomModal
        visible={modalConfig.visible}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        confirmText={modalConfig.confirmText}
        cancelText={modalConfig.cancelText}
        showCancelButton={modalConfig.showCancelButton}
        onConfirm={modalConfig.onConfirm}
        onClose={() => setModalConfig((prev) => ({ ...prev, visible: false }))}
      />
    </KeyboardAvoidingView>
  );
}