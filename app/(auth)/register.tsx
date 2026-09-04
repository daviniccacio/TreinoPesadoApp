import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useColorScheme,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EnvelopeSimple, LockSimple, User, Eye, EyeSlash } from 'phosphor-react-native';
import { z } from 'zod';
import { MotiView } from 'moti';
import { supabase } from '../../lib/supabase';
import { useThrottledCallback } from '../../lib/useThrottle';
import { CustomModal } from '../../components/CustomModal';

const registerSchema = z.object({
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres."),
  email: z.string().email("Digite um e-mail válido."),
  password: z
    .string()
    .min(8, "A senha deve ter pelo menos 8 caracteres.")
    .regex(/[A-Z]/, "A senha deve conter pelo menos uma letra maiúscula.")
    .regex(/[0-9]/, "A senha deve conter pelo menos um número.")
    .regex(
      /[^a-zA-Z0-9]/,
      "A senha deve conter pelo menos um caractere especial (!@#$%^&*).",
    ),
  role: z.enum(["aluno", "personal"]),
});

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"aluno" | "personal">("aluno");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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

  async function handleRegister() {
    const validationResult = registerSchema.safeParse({
      name: name.trim(),
      email: email.trim(),
      password,
      role,
    });

    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0].message;
      showAlertModal({
        title: "Dados inválidos",
        message: firstError,
        type: "info",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            full_name: name.trim(),
            name: name.trim(),
            role: role,
          },
        },
      });

      if (error) {
        showAlertModal({
          title: "Erro no cadastro",
          message: error.message || "Não foi possível criar a conta.",
          type: "danger",
        });
      } else {
        showAlertModal({
          title: "Conta criada! 🎉",
          message: "Seu cadastro foi realizado com sucesso.",
          type: "success",
          confirmText: "Ir para o Login",
          onConfirm: () => router.replace("/(auth)/login"),
        });
      }
    } catch (err) {
      showAlertModal({
        title: "Erro",
        message: "Ocorreu um erro inesperado ao realizar o cadastro.",
        type: "danger",
      });
    } finally {
      setLoading(false);
    }
  }

  const handleRegisterThrottled = useThrottledCallback(handleRegister, 2000);

  const safeTopPadding = Math.max(insets?.top || 0, 16);
  const safeBottomPadding = Math.max(insets?.bottom || 0, 16);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
        className="bg-white dark:bg-zinc-950 px-6 py-8"
        style={{ paddingTop: safeTopPadding, paddingBottom: safeBottomPadding }}
        showsVerticalScrollIndicator={false}
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
          className="mb-6"
        >
          <Text className="text-2xl font-black text-[#1b1b1d] dark:text-white mb-1">
            Criar Conta
          </Text>
          <Text className="text-xs text-[#71717a] dark:text-zinc-400 font-medium">
            Preencha os campos abaixo para iniciar sua jornada
          </Text>
        </MotiView>

        {/* 2. FORMULÁRIO E SELEÇÃO DE PAPEL ANIMADOS */}
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
          {/* Seleção de Tipo de Conta */}
          <View className="flex-row gap-3 mb-5">
            <TouchableOpacity
              onPress={() => setRole("aluno")}
              className={`flex-1 py-3 rounded-2xl items-center border ${
                role === "aluno"
                  ? "bg-[#59C83A]/10 border-[#59C83A]"
                  : "bg-[#f8f9fa] dark:bg-zinc-900 border-[#e2dfe1] dark:border-zinc-800"
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  role === "aluno"
                    ? "text-[#59C83A]"
                    : "text-[#71717a] dark:text-zinc-400"
                }`}
              >
                Sou Aluno
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setRole("personal")}
              className={`flex-1 py-3 rounded-2xl items-center border ${
                role === "personal"
                  ? "bg-[#59C83A]/10 border-[#59C83A]"
                  : "bg-[#f8f9fa] dark:bg-zinc-900 border-[#e2dfe1] dark:border-zinc-800"
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  role === "personal"
                    ? "text-[#59C83A]"
                    : "text-[#71717a] dark:text-zinc-400"
                }`}
              >
                Sou Personal
              </Text>
            </TouchableOpacity>
          </View>

          {/* Campo Nome */}
          <View className="mb-4">
            <Text className="text-xs font-bold uppercase tracking-wider text-[#71717a] dark:text-zinc-400 mb-2 ml-1">
              Nome Completo
            </Text>
            <View className="flex-row items-center bg-[#f8f9fa] dark:bg-zinc-900 rounded-2xl px-4 py-3.5 border border-[#e2dfe1] dark:border-zinc-800">
              <User size={20} color={isDark ? "#59C83A" : "#414755"} />
              <TextInput
                className="flex-1 ml-3 text-[#1b1b1d] dark:text-white text-base font-medium"
                placeholder="Seu nome"
                placeholderTextColor={isDark ? "#71717a" : "#a09da1"}
                value={name}
                onChangeText={setName}
              />
            </View>
          </View>

          {/* Campo E-mail */}
          <View className="mb-4">
            <Text className="text-xs font-bold uppercase tracking-wider text-[#71717a] dark:text-zinc-400 mb-2 ml-1">
              E-mail
            </Text>
            <View className="flex-row items-center bg-[#f8f9fa] dark:bg-zinc-900 rounded-2xl px-4 py-3.5 border border-[#e2dfe1] dark:border-zinc-800">
              <EnvelopeSimple size={20} color={isDark ? "#59C83A" : "#414755"} />
              <TextInput
                className="flex-1 ml-3 text-[#1b1b1d] dark:text-white text-base font-medium"
                placeholder="seu.email@exemplo.com"
                placeholderTextColor={isDark ? "#71717a" : "#a09da1"}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Campo Senha */}
          <View className="mb-6">
            <Text className="text-xs font-bold uppercase tracking-wider text-[#71717a] dark:text-zinc-400 mb-2 ml-1">
              Senha
            </Text>
            <View className="flex-row items-center bg-[#f8f9fa] dark:bg-zinc-900 rounded-2xl px-4 py-3.5 border border-[#e2dfe1] dark:border-zinc-800">
              <LockSimple size={20} color={isDark ? "#59C83A" : "#414755"} />
              <TextInput
                className="flex-1 ml-3 text-[#1b1b1d] dark:text-white text-base font-medium"
                placeholder="Mín. 8 caracteres, 1 maiúscula, 1 num e 1 especial"
                placeholderTextColor={isDark ? "#71717a" : "#a09da1"}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                {showPassword ? (
                  <EyeSlash size={20} color={isDark ? "#59C83A" : "#414755"} />
                ) : (
                  <Eye size={20} color={isDark ? "#59C83A" : "#414755"} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Botão de Cadastro */}
          <TouchableOpacity
            onPress={handleRegisterThrottled}
            disabled={loading}
            style={{ backgroundColor: "#59C83A" }}
            className="py-4 rounded-2xl items-center shadow-md active:opacity-90"
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-white font-extrabold text-lg tracking-wide">
                Cadastrar
              </Text>
            )}
          </TouchableOpacity>

          {/* Retorno para Login */}
          <TouchableOpacity
            onPress={() => router.replace("/(auth)/login")}
            className="items-center py-4 mt-3"
          >
            <Text className="text-sm text-[#71717a] dark:text-zinc-400">
              Já possui uma conta?{" "}
              <Text style={{ color: "#59C83A" }} className="font-bold">
                Faça Login
              </Text>
            </Text>
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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}