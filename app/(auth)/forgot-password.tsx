// ============================================================================
// DOCUMENTAÇÃO: TELA 1 - SOLICITAR CÓDIGO DE RECUPERAÇÃO (VERSÃO VPS)
// ============================================================================
// Esta tela envia a requisição para a API na VPS, que gera o código OTP e
// envia o e-mail via Resend, redirecionando o usuário para a tela /verify-otp.
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
import { CustomModal } from "../../components/CustomModal";
import { api } from "../../services/api"; // Serviço de chamada HTTP Axios configurado para a VPS

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const [modalConfig, setModalConfig] = useState({
    visible: false,
    title: "",
    message: "",
    type: "info" as "success" | "danger" | "info",
  });

  // --------------------------------------------------------------------------
  // SOLICITAÇÃO DE CÓDIGO OTP VIA API DA VPS
  // --------------------------------------------------------------------------
  async function handleSendCode() {
    const cleanEmail = email.trim();

    if (!cleanEmail) {
      setModalConfig({
        visible: true,
        title: "Atenção",
        message: "Por favor, informe o seu e-mail de acesso.",
        type: "info",
      });
      return;
    }

    setLoading(true);

    try {
      // Faz a chamada para a nossa API na VPS em vez do Supabase
      await api.post("/auth/forgot-password", { email: cleanEmail });

      // NAVEGAÇÃO AUTOMÁTICA IMEDIATA PARA A TELA DE VERIFICAÇÃO DO OTP
      router.push({
        pathname: "/verify-otp" as any,
        params: { email: cleanEmail },
      });
    } catch (err: any) {
      console.error("❌ Erro ao solicitar código:", err?.response?.data || err?.message);

      const errorMessage =
        err?.response?.data?.error ||
        "Não foi possível enviar o código no momento. Tente novamente em instantes.";

      setModalConfig({
        visible: true,
        title: "Atenção ⚠️",
        message: errorMessage,
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
        <MotiView
          from={{ opacity: 0, translateX: -15 }}
          animate={{ opacity: 1, translateX: 0 }}
          transition={{ type: "spring", damping: 20, stiffness: 150 }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            className="flex-row items-center mb-6 py-1"
            activeOpacity={0.7}
          >
            <ArrowLeft size={20} color={isDark ? "#a1a1aa" : "#71717a"} />
            <Text className="text-sm font-sans-bold text-[#71717a] dark:text-zinc-400 ml-2">
              Voltar para o Login
            </Text>
          </TouchableOpacity>
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: -16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "spring", damping: 22, stiffness: 160, delay: 100 }}
          className="mb-8"
        >
          <Text className="text-2xl font-outfit-extrabold text-[#1b1b1d] dark:text-white mb-2">
            Esqueceu a Senha?
          </Text>
          <Text className="text-xs font-sans-regular text-[#71717a] dark:text-zinc-400 leading-relaxed">
            Informe o seu e-mail cadastrado para receber o código de verificação de 6 dígitos.
          </Text>
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "spring", damping: 20, stiffness: 140, delay: 200 }}
        >
          <View className="mb-6">
            <Text className="text-xs font-sans-bold uppercase tracking-wider text-[#71717a] dark:text-zinc-400 mb-2 ml-1">
              E-mail
            </Text>
            <View className="flex-row items-center h-14 bg-[#f8f9fa] dark:bg-zinc-900 rounded-2xl px-4 border border-[#e2dfe1] dark:border-zinc-800">
              <EnvelopeSimple size={20} color={isDark ? "#59C83A" : "#414755"} />
              <TextInput
                className="flex-1 ml-3 text-[#1b1b1d] dark:text-white text-sm font-sans-medium h-full py-0"
                placeholder="seuemail@exemplo.com"
                placeholderTextColor={isDark ? "#71717a" : "#a09da1"}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <TouchableOpacity
            onPress={handleSendCode}
            disabled={loading}
            style={{ backgroundColor: "#59C83A" }}
            className="h-14 rounded-2xl items-center flex-row justify-center shadow-md active:opacity-90"
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <PaperPlaneRight size={20} color="#FFFFFF" weight="bold" />
                <Text className="text-white text-base font-outfit ml-2">
                  Enviar Código
                </Text>
              </>
            )}
          </TouchableOpacity>
        </MotiView>
      </ScrollView>

      <CustomModal
        visible={modalConfig.visible}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        confirmText="Entendi"
        onConfirm={() => setModalConfig((prev) => ({ ...prev, visible: false }))}
        onClose={() => setModalConfig((prev) => ({ ...prev, visible: false }))}
      />
    </KeyboardAvoidingView>
  );
}