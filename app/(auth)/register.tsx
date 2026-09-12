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
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  EnvelopeSimple,
  LockSimple,
  User,
  Eye,
  EyeSlash,
  ArrowRight,
  Sparkle,
  PersonSimpleRun,
} from 'phosphor-react-native';
import { z } from 'zod';
import { MotiView } from 'moti';
import { supabase } from '../../lib/supabase';
import { useThrottledCallback } from '../../lib/useThrottle';
import { CustomModal } from '../../components/CustomModal';

const BRAND_GREEN = '#59C83A';
const BRAND_GREEN_DEEP = '#2F7A16';
const HERO_BG = '#0F1F0A';

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

/** Anel de pulso animado — mesmo componente usado no Login, mantém a identidade consistente. */
function PulseRing({ delay = 0, size = 96 }: { delay?: number; size?: number }) {
  return (
    <MotiView
      from={{ scale: 0.7, opacity: 0.35 }}
      animate={{ scale: 1.55, opacity: 0 }}
      transition={{ type: 'timing', duration: 2800, loop: true, delay }}
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 1,
        borderColor: BRAND_GREEN,
      }}
    />
  );
}

/** Selo/badge premium do hero — idêntico ao do Login (glow permanente + disco com profundidade). */
function EnergyBadge() {
  return (
    <View className="items-center justify-center" style={{ width: 100, height: 100 }}>
      <View
        style={{
          position: 'absolute',
          width: 100,
          height: 100,
          borderRadius: 50,
          backgroundColor: BRAND_GREEN,
          opacity: 0.12,
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: BRAND_GREEN,
          opacity: 0.16,
        }}
      />

      <PulseRing size={72} delay={0} />
      <PulseRing size={72} delay={1400} />

      <View
        style={{
          width: 60,
          height: 60,
          borderRadius: 30,
          backgroundColor: BRAND_GREEN,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.25)',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 6,
        }}
      >
        <View
          style={{
            position: 'absolute',
            bottom: -18,
            width: 70,
            height: 40,
            borderRadius: 35,
            backgroundColor: BRAND_GREEN_DEEP,
            opacity: 0.55,
          }}
        />
        <View
          style={{
            position: 'absolute',
            top: -14,
            left: -10,
            width: 38,
            height: 26,
            borderRadius: 20,
            backgroundColor: '#ffffff',
            opacity: 0.22,
            transform: [{ rotate: '-20deg' }],
          }}
        />
        <Sparkle size={24} color="#ffffff" weight="bold" />
      </View>
    </View>
  );
}

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
    <View className="flex-1 bg-white dark:bg-zinc-950">
      <StatusBar style="light" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* ============================================================ */}
          {/* HERO EDITORIAL — mesma linguagem visual do Login              */}
          {/* ============================================================ */}
          <View
            style={{
              backgroundColor: HERO_BG,
              paddingTop: safeTopPadding + 8,
              borderBottomLeftRadius: 88,
              borderBottomRightRadius: 20,
            }}
            className="pb-10 px-6 overflow-hidden"
          >
            <View
              style={{
                position: 'absolute',
                width: '160%',
                height: 46,
                backgroundColor: BRAND_GREEN,
                opacity: 0.08,
                top: 92,
                left: -60,
                transform: [{ rotate: '-7deg' }],
              }}
            />

            <View className="flex-row items-center mb-8">
              <View className="w-8 h-8 rounded-full bg-white items-center justify-center overflow-hidden mr-2">
                <Image
                  source={require('../../assets/splash.png')}
                  className="w-full h-full"
                  resizeMode="contain"
                />
              </View>
              <Text className="font-sans-bold text-[11px] uppercase tracking-[2px] text-zinc-400">
                Treino Pesado · Academia
              </Text>
            </View>

            <View className="flex-row items-center justify-between">
              <MotiView
                from={{ opacity: 0, translateY: -10 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'spring', damping: 24, stiffness: 160 }}
                className="flex-1 pr-3"
              >
                <Text className="font-outfit text-white text-[34px] leading-[36px]">
                  Comece
                </Text>
                <Text
                  style={{ color: BRAND_GREEN }}
                  className="font-outfit text-[34px] leading-[36px] mb-3"
                >
                  sua jornada.
                </Text>
                <Text className="font-sans-medium text-sm text-zinc-400">
                  Crie sua conta em menos de 1 minuto.
                </Text>
              </MotiView>

              <EnergyBadge />
            </View>
          </View>

          {/* ============================================================ */}
          {/* FORMULÁRIO                                                    */}
          {/* ============================================================ */}
          <MotiView
            from={{ opacity: 0, translateY: 12 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 22, stiffness: 150, delay: 80 }}
            className="px-6 pt-8"
            style={{ paddingBottom: safeBottomPadding }}
          >
            {/* Seleção de Tipo de Conta */}
            <Text className="font-sans-bold text-xs uppercase tracking-wider text-[#71717a] dark:text-zinc-400 mb-2 ml-1">
              Tipo de conta
            </Text>
            <View className="flex-row gap-3 mb-5">
              <TouchableOpacity
                onPress={() => setRole("aluno")}
                className={`flex-1 flex-row items-center justify-center py-3.5 rounded-2xl border ${
                  role === "aluno"
                    ? "bg-[#59C83A]/10 border-[#59C83A]"
                    : "bg-[#f8f9fa] dark:bg-zinc-900 border-[#e2dfe1] dark:border-zinc-800"
                }`}
              >
                <User
                  size={16}
                  color={role === "aluno" ? BRAND_GREEN : (isDark ? '#71717a' : '#a09da1')}
                  weight={role === "aluno" ? "bold" : "regular"}
                />
                <Text
                  className={`font-sans-bold text-xs ml-2 ${
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
                className={`flex-1 flex-row items-center justify-center py-3.5 rounded-2xl border ${
                  role === "personal"
                    ? "bg-[#59C83A]/10 border-[#59C83A]"
                    : "bg-[#f8f9fa] dark:bg-zinc-900 border-[#e2dfe1] dark:border-zinc-800"
                }`}
              >
                <PersonSimpleRun
                  size={16}
                  color={role === "personal" ? BRAND_GREEN : (isDark ? '#71717a' : '#a09da1')}
                  weight={role === "personal" ? "bold" : "regular"}
                />
                <Text
                  className={`font-sans-bold text-xs ml-2 ${
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
            <View className="mb-3">
              <Text className="font-sans-bold text-xs uppercase tracking-wider text-[#71717a] dark:text-zinc-400 mb-2 ml-1">
                Nome completo
              </Text>
              <View className="flex-row items-center bg-[#f8f9fa] dark:bg-zinc-900 rounded-2xl pl-2 pr-4 py-2 border border-[#e2dfe1] dark:border-zinc-800">
                <View
                  className="w-9 h-9 rounded-full items-center justify-center mr-3"
                  style={{ backgroundColor: isDark ? 'rgba(89,200,58,0.15)' : 'rgba(89,200,58,0.1)' }}
                >
                  <User size={18} color={BRAND_GREEN} weight="bold" />
                </View>
                <TextInput
                  className="font-sans-medium flex-1 text-[#1b1b1d] dark:text-white text-base"
                  placeholder="Seu nome"
                  placeholderTextColor={isDark ? '#71717a' : '#a09da1'}
                  value={name}
                  onChangeText={setName}
                />
              </View>
            </View>

            {/* Campo E-mail */}
            <View className="mb-3">
              <Text className="font-sans-bold text-xs uppercase tracking-wider text-[#71717a] dark:text-zinc-400 mb-2 ml-1">
                E-mail
              </Text>
              <View className="flex-row items-center bg-[#f8f9fa] dark:bg-zinc-900 rounded-2xl pl-2 pr-4 py-2 border border-[#e2dfe1] dark:border-zinc-800">
                <View
                  className="w-9 h-9 rounded-full items-center justify-center mr-3"
                  style={{ backgroundColor: isDark ? 'rgba(89,200,58,0.15)' : 'rgba(89,200,58,0.1)' }}
                >
                  <EnvelopeSimple size={18} color={BRAND_GREEN} weight="bold" />
                </View>
                <TextInput
                  className="font-sans-medium flex-1 text-[#1b1b1d] dark:text-white text-base"
                  placeholder="seu.email@exemplo.com"
                  placeholderTextColor={isDark ? '#71717a' : '#a09da1'}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Campo Senha */}
            <View className="mb-1">
              <Text className="font-sans-bold text-xs uppercase tracking-wider text-[#71717a] dark:text-zinc-400 mb-2 ml-1">
                Senha
              </Text>
              <View className="flex-row items-center bg-[#f8f9fa] dark:bg-zinc-900 rounded-2xl pl-2 pr-4 py-2 border border-[#e2dfe1] dark:border-zinc-800">
                <View
                  className="w-9 h-9 rounded-full items-center justify-center mr-3"
                  style={{ backgroundColor: isDark ? 'rgba(89,200,58,0.15)' : 'rgba(89,200,58,0.1)' }}
                >
                  <LockSimple size={18} color={BRAND_GREEN} weight="bold" />
                </View>
                <TextInput
                  className="font-sans-medium flex-1 text-[#1b1b1d] dark:text-white text-base"
                  placeholder="Sua senha"
                  placeholderTextColor={isDark ? '#71717a' : '#a09da1'}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                  {showPassword ? (
                    <EyeSlash size={20} color={isDark ? '#71717a' : '#a09da1'} />
                  ) : (
                    <Eye size={20} color={isDark ? '#71717a' : '#a09da1'} />
                  )}
                </TouchableOpacity>
              </View>
            </View>
            <Text className="font-sans text-[11px] text-[#71717a] dark:text-zinc-500 ml-1 mb-6">
              Mín. 8 caracteres, 1 maiúscula, 1 número e 1 caractere especial.
            </Text>

            {/* Botão de Cadastro */}
            <TouchableOpacity
              onPress={handleRegisterThrottled}
              disabled={loading}
              style={{
                backgroundColor: BRAND_GREEN,
                shadowColor: BRAND_GREEN,
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.35,
                shadowRadius: 14,
                elevation: 8,
              }}
              className="flex-row py-4 rounded-2xl items-center justify-center active:opacity-90"
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <Text className="font-outfit text-white text-lg tracking-wide mr-2">
                    Cadastrar
                  </Text>
                  <ArrowRight size={20} color="#ffffff" weight="bold" />
                </>
              )}
            </TouchableOpacity>

            {/* Retorno para Login */}
            <TouchableOpacity
              onPress={() => router.replace("/(auth)/login")}
              className="items-center py-4 mt-2"
            >
              <Text className="font-sans text-sm text-[#71717a] dark:text-zinc-400">
                Já possui uma conta?{" "}
                <Text style={{ color: BRAND_GREEN }} className="font-sans-bold">
                  Faça Login
                </Text>
              </Text>
            </TouchableOpacity>
          </MotiView>
        </ScrollView>
      </KeyboardAvoidingView>

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