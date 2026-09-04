import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LockSimple, CheckCircle, Eye, EyeSlash } from "phosphor-react-native";
import * as Linking from "expo-linking";
import { MotiView } from "moti";
import { supabase } from "../../lib/supabase";
import { CustomModal } from "../../components/CustomModal";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

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

  useEffect(() => {
    async function handleDeepLink() {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        parseAndSetSession(initialUrl);
      }
    }

    const subscription = Linking.addEventListener("url", (event) => {
      parseAndSetSession(event.url);
    });

    handleDeepLink();

    return () => {
      subscription.remove();
    };
  }, []);

  async function parseAndSetSession(url: string) {
    try {
      if (!url.includes("access_token")) return;

      const hashParams = url.split("#")[1];
      if (!hashParams) return;

      const params = new URLSearchParams(hashParams);
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");

      if (accessToken && refreshToken) {
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
      }
    } catch (error) {
      console.error("Erro ao processar token de redefinição:", error);
    }
  }

  async function handleUpdatePassword() {
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
      const { error } = await supabase.auth.updateUser({
        password: newPassword.trim(),
      });

      if (error) {
        showAlertModal({
          title: "Erro",
          message: error.message || "Não foi possível atualizar a senha.",
          type: "danger",
        });
      } else {
        showAlertModal({
          title: "Sucesso! 🎉",
          message: "Sua senha foi redefinida com sucesso!",
          type: "success",
          confirmText: "Ir para o Login",
          onConfirm: () => router.replace("/(auth)/login"),
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
    <View
      className="flex-1 bg-white dark:bg-zinc-950 px-6 justify-center"
      style={{ paddingTop: safeTopPadding, paddingBottom: safeBottomPadding }}
    >
      {/* 1. CABEÇALHO ANIMADO */}
      <MotiView
        from={{ opacity: 0, translateY: -12 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{
          type: "spring",
          damping: 24,
          stiffness: 160,
        }}
        className="mb-8"
      >
        <Text className="text-2xl font-black text-[#1b1b1d] dark:text-white mb-2">
          Criar Nova Senha
        </Text>
        <Text className="text-xs text-[#71717a] dark:text-zinc-400 font-medium">
          Digite e confirme a sua nova senha de acesso para atualizar a sua conta.
        </Text>
      </MotiView>

      {/* 2. CAMPOS DO FORMULÁRIO ANIMADOS */}
      <MotiView
        from={{ opacity: 0, translateY: 12 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{
          type: "spring",
          damping: 22,
          stiffness: 150,
          delay: 30,
        }}
      >
        {/* Campo: Nova Senha */}
        <View className="mb-4">
          <Text className="text-xs font-bold uppercase tracking-wider text-[#71717a] dark:text-zinc-400 mb-2 ml-1">
            Nova Senha
          </Text>
          <View className="flex-row items-center bg-[#f8f9fa] dark:bg-zinc-900 rounded-2xl px-4 py-3.5 border border-[#e2dfe1] dark:border-zinc-800">
            <LockSimple size={20} color={isDark ? "#59C83A" : "#414755"} />
            <TextInput
              className="flex-1 ml-3 text-[#1b1b1d] dark:text-white text-base font-medium"
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
          <Text className="text-xs font-bold uppercase tracking-wider text-[#71717a] dark:text-zinc-400 mb-2 ml-1">
            Confirmar Nova Senha
          </Text>
          <View className="flex-row items-center bg-[#f8f9fa] dark:bg-zinc-900 rounded-2xl px-4 py-3.5 border border-[#e2dfe1] dark:border-zinc-800">
            <LockSimple size={20} color={isDark ? "#59C83A" : "#414755"} />
            <TextInput
              className="flex-1 ml-3 text-[#1b1b1d] dark:text-white text-base font-medium"
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
          className="py-4 rounded-2xl items-center flex-row justify-center shadow-md"
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

      {/* MODAL DE ALERTA PERSONALIZADO */}
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
    </View>
  );
}