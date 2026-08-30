import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  useColorScheme,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LockSimple, CheckCircle, Eye, EyeSlash } from "phosphor-react-native";
import * as Linking from "expo-linking";
import { supabase } from "../../lib/supabase";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  // Escuta a abertura da URL profunda ao clicar no link do e-mail
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

  /**
   * Extrai os tokens da URL recebida e inicia a sessão temporária no Supabase
   */
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

  /**
   * Atualiza a senha do usuário no Supabase
   */
  async function handleUpdatePassword() {
    if (!newPassword.trim() || newPassword.length < 6) {
      Alert.alert("Atenção", "A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Atenção", "As senhas digitadas não coincidem.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword.trim(),
      });

      if (error) {
        Alert.alert(
          "Erro",
          error.message || "Não foi possível atualizar a senha.",
        );
      } else {
        Alert.alert("Sucesso! 🎉", "Sua senha foi redefinida com sucesso!", [
          {
            text: "Ir para o Login",
            onPress: () => router.replace("/(auth)/login"),
          },
        ]);
      }
    } catch (err) {
      Alert.alert("Erro", "Ocorreu uma falha ao atualizar a senha.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View
      className="flex-1 bg-white dark:bg-zinc-950 px-6 justify-center"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <View className="mb-8">
        <Text className="text-2xl font-black text-[#1b1b1d] dark:text-white mb-2">
          Criar Nova Senha
        </Text>
        <Text className="text-xs text-[#71717a] dark:text-zinc-400 font-medium">
          Digite e confirme a sua nova senha de acesso para atualizar a sua
          conta.
        </Text>
      </View>

      {/* CAMPO: NOVA SENHA */}
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

      {/* CAMPO: CONFIRMAR NOVA SENHA */}
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

      {/* BOTÃO DE ENVIAR */}
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
    </View>
  );
}
