// ============================================================================
// TELA 2: VALIDAR CÓDIGO OTP E REDEFINIR SENHA (RESET PASSWORD)
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
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LockSimple, CheckCircle, Eye, EyeSlash, EnvelopeSimple, Hash, ArrowLeft } from "phosphor-react-native";
import { MotiView } from "moti";
import { supabase } from "../../lib/supabase";
import { CustomModal } from "../../components/CustomModal";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [email, setEmail] = useState<string>(params.email ?? "");
  const [code, setCode] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
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

  async function handleUpdatePassword() {
    if (!email.trim()) {
      showAlertModal({
        title: "Atenção",
        message: "Informe o e-mail cadastrado.",
        type: "info",
      });
      return;
    }

    if (!code.trim() || code.trim().length < 6) {
      showAlertModal({
        title: "Atenção",
        message: "O código de verificação deve ter 6 dígitos.",
        type: "info",
      });
      return;
    }

    if (!newPassword.trim() || newPassword.length < 6) {
      showAlertModal({
        title: "Atenção",
        message: "A nova senha deve ter pelo menos 6 caracteres.",
        type: "info",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      showAlertModal({
        title: "Atenção",
        message: "As senhas digitadas não coincidem.",
        type: "info",
      });
      return;
    }

    setLoading(true);

    try {
      // 1. Valida o código OTP recebido por e-mail
      const { error: otpError } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: code.trim(),
        type: "recovery",
      });

      if (otpError) {
        showAlertModal({
          title: "Código Inválido",
          message: "O código digitado é incorreto ou já expirou. Verifique o seu e-mail.",
          type: "danger",
        });
        setLoading(false);
        return;
      }

      // 2. Com a sessão temporária autorizada, atualiza a senha do usuário
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword.trim(),
      });

      if (updateError) {
        showAlertModal({
          title: "Erro",
          message: updateError.message || "Não foi possível atualizar a senha.",
          type: "danger",
        });
      } else {
        showAlertModal({
          title: "Sucesso! 🎉",
          message: "Sua senha foi redefinida com sucesso!",
          type: "success",
          confirmText: "Ir para o Login",
          onConfirm: () => router.replace("/login" as any),
        });
      }
    } catch (err) {
      showAlertModal({
        title: "Erro",
        message: "Ocorreu uma falha ao atualizar a senha.",
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
          className="flex-row items-center mb-4 py-1"
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color={isDark ? "#a1a1aa" : "#71717a"} />
          <Text className="text-sm font-bold text-[#71717a] dark:text-zinc-400 ml-2">
            Voltar
          </Text>
        </TouchableOpacity>

        {/* 1. CABEÇALHO ANIMADO */}
        <MotiView
          from={{ opacity: 0, translateY: -12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "spring", damping: 24, stiffness: 160 }}
          className="mb-6"
        >
          <Text className="text-2xl font-black text-[#1b1b1d] dark:text-white mb-2">
            Criar Nova Senha
          </Text>
          <Text className="text-xs text-[#71717a] dark:text-zinc-400 font-medium leading-relaxed">
            Insira o código enviado para o seu e-mail e defina a sua nova senha.
          </Text>
        </MotiView>

        {/* 2. CAMPOS DO FORMULÁRIO ANIMADOS */}
        <MotiView
          from={{ opacity: 0, translateY: 12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "spring", damping: 22, stiffness: 150, delay: 30 }}
        >
          {/* Campo: E-mail */}
          <View className="mb-3.5">
            <Text className="text-xs font-bold uppercase tracking-wider text-[#71717a] dark:text-zinc-400 mb-1.5 ml-1">
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

          {/* Campo: Código OTP */}
          <View className="mb-3.5">
            <Text className="text-xs font-bold uppercase tracking-wider text-[#59C83A] mb-1.5 ml-1">
              Código de 6 dígitos (OTP)
            </Text>
            <View className="flex-row items-center h-14 bg-[#f8f9fa] dark:bg-zinc-900 rounded-2xl px-4 border border-[#59C83A]/50">
              <Hash size={20} color="#59C83A" />
              <TextInput
                style={{ textAlignVertical: "center" }}
                className="flex-1 ml-3 text-[#1b1b1d] dark:text-white text-base font-mono font-bold tracking-widest h-full py-0"
                placeholder="123456"
                placeholderTextColor={isDark ? "#71717a" : "#a09da1"}
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                maxLength={6}
              />
            </View>
          </View>

          {/* Campo: Nova Senha */}
          <View className="mb-3.5">
            <Text className="text-xs font-bold uppercase tracking-wider text-[#71717a] dark:text-zinc-400 mb-1.5 ml-1">
              Nova Senha
            </Text>
            <View className="flex-row items-center h-14 bg-[#f8f9fa] dark:bg-zinc-900 rounded-2xl px-4 border border-[#e2dfe1] dark:border-zinc-800">
              <LockSimple size={20} color={isDark ? "#59C83A" : "#414755"} />
              <TextInput
                style={{ textAlignVertical: "center" }}
                className="flex-1 ml-3 text-[#1b1b1d] dark:text-white text-sm font-medium h-full py-0"
                placeholder="Digite a nova senha"
                placeholderTextColor={isDark ? "#71717a" : "#a09da1"}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                {showPassword ? (
                  <EyeSlash size={20} color={isDark ? "#71717a" : "#414755"} />
                ) : (
                  <Eye size={20} color={isDark ? "#71717a" : "#414755"} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Campo: Confirmar Nova Senha */}
          <View className="mb-6">
            <Text className="text-xs font-bold uppercase tracking-wider text-[#71717a] dark:text-zinc-400 mb-1.5 ml-1">
              Confirmar Nova Senha
            </Text>
            <View className="flex-row items-center h-14 bg-[#f8f9fa] dark:bg-zinc-900 rounded-2xl px-4 border border-[#e2dfe1] dark:border-zinc-800">
              <LockSimple size={20} color={isDark ? "#59C83A" : "#414755"} />
              <TextInput
                style={{ textAlignVertical: "center" }}
                className="flex-1 ml-3 text-[#1b1b1d] dark:text-white text-sm font-medium h-full py-0"
                placeholder="Confirme a nova senha"
                placeholderTextColor={isDark ? "#71717a" : "#a09da1"}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
              />
            </View>
          </View>

          {/* Botão de Enviar */}
          <TouchableOpacity
            onPress={handleUpdatePassword}
            disabled={loading}
            style={{ backgroundColor: "#59C83A" }}
            className="h-14 rounded-2xl items-center flex-row justify-center shadow-md"
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <CheckCircle size={20} color="#FFFFFF" weight="bold" />
                <Text className="text-white font-extrabold text-base ml-2">
                  Salvar Nova Senha
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