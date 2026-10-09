// ============================================================================
// DOCUMENTAÇÃO: TELA DE REDEFINIÇÃO DE SENHA COM MEDIDOR ANIMADO E TELA FINAL (VPS)
// ============================================================================
// Inclui réguas de força de senha animadas, envio para a API da VPS e tela
// dedicada de sucesso sem modais que redireciona para a tela de login.
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
import {
  LockSimple,
  CheckCircle,
  Eye,
  EyeSlash,
  ArrowLeft,
  CheckCircle as SuccessIcon,
  WarningCircle,
} from "phosphor-react-native";
import { MotiView, MotiText } from "moti";
import { api } from "../../services/api"; // Serviço Axios configurado para a VPS

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string; code?: string }>();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const email = params.email ?? "";
  const code = params.code ?? "";

  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  // 🟢 ESTADOS DE ERRO E DE SUCESSO DA TELA (SEM MODAIS)
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  // 🟢 ALGORITMO DE AVALIAÇÃO DE FORÇA DA SENHA
  function getPasswordStrength(pass: string) {
    if (!pass) return { score: 0, label: "", color: "#e2dfe1" };

    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 8 && (/[0-9]/.test(pass) || /[^A-Za-z0-9]/.test(pass))) score += 1;
    if (pass.length >= 8 && /[A-Z]/.test(pass) && /[0-9]/.test(pass) && /[^A-Za-z0-9]/.test(pass)) score += 1;

    switch (score) {
      case 1:
        return { score: 1, label: "Senha Fraca", color: "#EF4444" };
      case 2:
        return { score: 2, label: "Senha Moderada", color: "#F59E0B" };
      case 3:
        return { score: 3, label: "Senha Forte", color: "#59C83A" };
      default:
        return { score: 0, label: "Mínimo de 6 caracteres", color: "#EF4444" };
    }
  }

  const strength = getPasswordStrength(newPassword);

  // --------------------------------------------------------------------------
  // ENVIO DA NOVA SENHA PARA A API DA VPS
  // --------------------------------------------------------------------------
  async function handleUpdatePassword() {
    setErrorMessage(null);

    if (!email || !code) {
      setErrorMessage("Sessão inválida. Por favor, solicite um novo código de verificação.");
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage("A nova senha deve conter pelo menos 6 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("As senhas digitadas não coincidem.");
      return;
    }

    setLoading(true);

    try {
      // Faz a requisição HTTP POST para a rota /auth/reset-password
      await api.post("/auth/reset-password", {
        email: email.trim(),
        code: code.trim(),
        newPassword: newPassword.trim(),
      });

      // MOSTRA A TELA DE SUCESSO DEDICADA
      setIsSuccess(true);
    } catch (err: any) {
      console.error("❌ Erro ao redefinir senha:", err?.response?.data || err?.message);
      const msg = err?.response?.data?.error || "Ocorreu uma falha ao salvar a nova senha.";
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  }

  // 🟢 FUNÇÃO DE RETORNO AO LOGIN
  function handleGoToLogin() {
    router.replace("/(auth)/login" as any);
  }

  const safeTopPadding = Math.max(insets?.top || 0, 16);
  const safeBottomPadding = Math.max(insets?.bottom || 0, 16);

  // ============================================================================
  // TELA DE CONFIRMAÇÃO DE SUCESSO (EXIBIDA APÓS A TROCA DA SENHA)
  // ============================================================================
  if (isSuccess) {
    return (
      <View className="flex-1 bg-white dark:bg-zinc-950 justify-center items-center px-6">
        <MotiView
          from={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", damping: 18, stiffness: 160 }}
          className="w-full items-center text-center"
        >
          {/* ÍCONE DE SUCESSO COM BRILHO */}
          <MotiView
            from={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", damping: 12, stiffness: 200, delay: 100 }}
            className="w-20 h-20 rounded-3xl bg-[#59C83A]/15 border border-[#59C83A]/30 items-center justify-center mb-6"
          >
            <SuccessIcon size={48} color="#59C83A" weight="bold" />
          </MotiView>

          {/* TÍTULO */}
          <Text className="text-2xl font-outfit-extrabold text-[#1b1b1d] dark:text-white text-center mb-2">
            Senha Alterada com Sucesso!
          </Text>

          {/* SUBTÍTULO */}
          <Text className="text-xs font-sans-regular text-[#71717a] dark:text-zinc-400 text-center mb-8 leading-relaxed px-4">
            Sua senha foi atualizada no sistema. Agora você já pode acessar a sua conta com a nova credencial.
          </Text>

          {/* BOTÃO PARA IR AO LOGIN */}
          <TouchableOpacity
            onPress={handleGoToLogin}
            style={{ backgroundColor: "#59C83A" }}
            className="w-full h-14 rounded-2xl items-center justify-center shadow-md active:opacity-90"
            activeOpacity={0.8}
          >
            <Text className="text-white text-base font-outfit">
              Ir para o Login
            </Text>
          </TouchableOpacity>
        </MotiView>
      </View>
    );
  }

  // ============================================================================
  // FORMULÁRIO DE NOVA SENHA COM MEDIDOR ANIMADO DE FORÇA
  // ============================================================================
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
        <MotiView
          from={{ opacity: 0, translateX: -15 }}
          animate={{ opacity: 1, translateX: 0 }}
          transition={{ type: "spring", damping: 20, stiffness: 150 }}
        >
          <TouchableOpacity
            onPress={handleGoToLogin}
            className="flex-row items-center mb-6 py-1"
            activeOpacity={0.7}
          >
            <ArrowLeft size={20} color={isDark ? "#a1a1aa" : "#71717a"} />
            <Text className="text-sm font-sans-bold text-[#71717a] dark:text-zinc-400 ml-2">
              Voltar
            </Text>
          </TouchableOpacity>
        </MotiView>

        {/* CABEÇALHO DA TELA */}
        <MotiView
          from={{ opacity: 0, translateY: -16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "spring", damping: 22, stiffness: 160, delay: 100 }}
          className="mb-6"
        >
          <Text className="text-2xl font-outfit-extrabold text-[#1b1b1d] dark:text-white mb-2">
            Criar Nova Senha
          </Text>
          <Text className="text-xs font-sans-regular text-[#71717a] dark:text-zinc-400 leading-relaxed">
            Escolha uma senha segura para proteger o seu perfil no Treino Pesado.
          </Text>
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "spring", damping: 20, stiffness: 140, delay: 200 }}
        >
          {/* CAMPO: NOVA SENHA */}
          <View className="mb-2">
            <Text className="text-xs font-sans-bold uppercase tracking-wider text-[#71717a] dark:text-zinc-400 mb-1.5 ml-1">
              Nova Senha
            </Text>
            <View className="flex-row items-center h-14 bg-[#f8f9fa] dark:bg-zinc-900 rounded-2xl px-4 border border-[#e2dfe1] dark:border-zinc-800">
              <LockSimple size={20} color={isDark ? "#59C83A" : "#414755"} />
              <TextInput
                className="flex-1 ml-3 text-[#1b1b1d] dark:text-white text-sm font-sans-medium h-full py-0"
                placeholder="Digite a nova senha"
                placeholderTextColor={isDark ? "#71717a" : "#a09da1"}
                value={newPassword}
                onChangeText={(text) => {
                  setNewPassword(text);
                  if (errorMessage) setErrorMessage(null);
                }}
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

          {/* 🟢 MEDIDOR ANIMADO DE FORÇA DE SENHA (3 BARRAS COM TRANSIÇÃO SUAVE) */}
          {newPassword.length > 0 && (
            <MotiView
              from={{ opacity: 0, translateY: -4 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "timing", duration: 250 }}
              className="mb-4 px-1"
            >
              <View className="flex-row justify-between items-center gap-2 my-2">
                {/* BARRA 1 */}
                <MotiView
                  animate={{
                    backgroundColor: strength.score >= 1 ? strength.color : isDark ? "#27272a" : "#e4e4e7",
                  }}
                  transition={{ type: "timing", duration: 300 }}
                  className="flex-1 h-1.5 rounded-full"
                />
                {/* BARRA 2 */}
                <MotiView
                  animate={{
                    backgroundColor: strength.score >= 2 ? strength.color : isDark ? "#27272a" : "#e4e4e7",
                  }}
                  transition={{ type: "timing", duration: 300 }}
                  className="flex-1 h-1.5 rounded-full"
                />
                {/* BARRA 3 */}
                <MotiView
                  animate={{
                    backgroundColor: strength.score >= 3 ? strength.color : isDark ? "#27272a" : "#e4e4e7",
                  }}
                  transition={{ type: "timing", duration: 300 }}
                  className="flex-1 h-1.5 rounded-full"
                />
              </View>

              {/* TEXTO EXPLICATIVO ANIMADO */}
              <MotiText
                animate={{ color: strength.color } as any}
                style={{ color: strength.color }}
                transition={{ type: "timing", duration: 300 }}
                className="text-xs font-sans-bold text-right"
              >
                {strength.label}
              </MotiText>
            </MotiView>
          )}

          {/* CAMPO: CONFIRMAR NOVA SENHA */}
          <View className="mb-4 mt-1">
            <Text className="text-xs font-sans-bold uppercase tracking-wider text-[#71717a] dark:text-zinc-400 mb-1.5 ml-1">
              Confirmar Nova Senha
            </Text>
            <View className="flex-row items-center h-14 bg-[#f8f9fa] dark:bg-zinc-900 rounded-2xl px-4 border border-[#e2dfe1] dark:border-zinc-800">
              <LockSimple size={20} color={isDark ? "#59C83A" : "#414755"} />
              <TextInput
                className="flex-1 ml-3 text-[#1b1b1d] dark:text-white text-sm font-sans-medium h-full py-0"
                placeholder="Confirme a nova senha"
                placeholderTextColor={isDark ? "#71717a" : "#a09da1"}
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (errorMessage) setErrorMessage(null);
                }}
                secureTextEntry={!showPassword}
              />
            </View>
          </View>

          {/* 🟢 MENSAGEM DE ERRO INLINE */}
          {errorMessage && (
            <MotiView
              from={{ opacity: 0, translateY: -4 }}
              animate={{ opacity: 1, translateY: 0 }}
              className="flex-row items-center mb-4 ml-1"
            >
              <WarningCircle size={16} color="#EF4444" weight="fill" />
              <Text className="text-xs font-sans-bold text-red-500 ml-1.5">
                {errorMessage}
              </Text>
            </MotiView>
          )}

          {/* BOTÃO DE SALVAR */}
          <TouchableOpacity
            onPress={handleUpdatePassword}
            disabled={loading}
            style={{ backgroundColor: "#59C83A" }}
            className="h-14 rounded-2xl items-center flex-row justify-center shadow-md active:opacity-90 mt-2"
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <CheckCircle size={20} color="#FFFFFF" weight="bold" />
                <Text className="text-white text-base font-outfit ml-2">
                  Salvar Nova Senha
                </Text>
              </>
            )}
          </TouchableOpacity>
        </MotiView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}