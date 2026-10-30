// ============================================================================
// DOCUMENTAÇÃO: TELA DE CADASTRO COM MÁSCARAS AUTOMÁTICAS, ZOD E SANITIZAÇÃO
// ============================================================================
// Permite o cadastro de Alunos e Personais capturando Nome, E-mail, Telefone,
// Data de Nascimento, Senha e Tipo de Conta com formatação e sanitização.
// ============================================================================

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
  Phone,
  CalendarBlank,
} from 'phosphor-react-native';
import { z } from 'zod';
import { MotiView } from 'moti';

import { supabase } from '../../lib/supabase';
import { sanitizeInput } from '../../lib/security'; // 🟢 Importação da sanitização
import { useThrottledCallback } from '../../lib/useThrottle';
import { CustomModal } from '../../components/CustomModal';

const BRAND_GREEN = '#59C83A';
const BRAND_GREEN_DEEP = '#2F7A16';
const HERO_BG = '#0F1F0A';

// ============================================================================
// FUNÇÕES AUXILIARES DE MÁSCARA E FORMATAÇÃO
// ============================================================================

/** Formata o telefone em tempo real: (XX) XXXXX-XXXX ou (XX) XXXX-XXXX */
function maskPhone(value: string): string {
  const cleanValue = value.replace(/\D/g, "");

  if (cleanValue.length <= 10) {
    return cleanValue
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2")
      .replace(/(-\d{4})\d+?$/, "$1");
  }

  return cleanValue
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2")
    .replace(/(-\d{4})\d+?$/, "$1");
}

/** Formata a data de nascimento em tempo real: DD/MM/AAAA */
function maskDate(value: string): string {
  const cleanValue = value.replace(/\D/g, "");

  return cleanValue
    .replace(/(\d{2})(\d)/, "$1/$2")
    .replace(/(\d{2})\/(\d{2})(\d)/, "$1/$2/$3")
    .replace(/(\/\d{4})\d+?$/, "$1");
}

/** Converte a data de DD/MM/AAAA para YYYY-MM-DD (padrão DATE do PostgreSQL) */
function parseDateToISO(dateString: string): string | null {
  const parts = dateString.split("/");
  if (parts.length === 3) {
    const [day, month, year] = parts;
    if (day.length === 2 && month.length === 2 && year.length === 4) {
      return `${year}-${month}-${day}`;
    }
  }
  return null;
}

// ============================================================================
// ESQUEMA DE VALIDAÇÃO ZOD
// ============================================================================
const registerSchema = z.object({
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres."),
  email: z.string().email("Digite um e-mail válido."),
  phone: z
    .string()
    .min(14, "Digite um telefone válido com DDD ex: (99) 99999-9999."),
  birthDate: z
    .string()
    .length(10, "A data de nascimento deve estar no formato DD/MM/AAAA.")
    .refine((val) => {
      const parts = val.split("/");
      if (parts.length !== 3) return false;
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10);
      const currentYear = new Date().getFullYear();

      if (isNaN(day) || isNaN(month) || isNaN(year)) return false;
      if (month < 1 || month > 12) return false;
      if (day < 1 || day > 31) return false;
      if (year < 1920 || year > currentYear) return false;
      return true;
    }, "Digite uma data de nascimento válida."),
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

function PulseRing({ delay = 0, size = 96 }: { delay?: number; size?: number }) {
  return (
    <MotiView
      from={{ scale: 0.7, opacity: 0.35 }}
      animate={{ scale: 1.55, opacity: 0 }}
      transition={{ type: 'timing', duration: 2800, loop: true, delay } as any}
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

  // ESTADOS DOS CAMPOS
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"aluno" | "personal">("aluno");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // ESTADO DO MODAL PERSONALIZADO
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

  function handlePhoneChange(text: string) {
    setPhone(maskPhone(text));
  }

  function handleDateChange(text: string) {
    setBirthDate(maskDate(text));
  }

  // 🟢 CADASTRO COM SANITIZAÇÃO E VALIDAÇÃO ZOD
  async function handleRegister() {
    const cleanName = sanitizeInput(name).trim();
    const cleanEmail = sanitizeInput(email).trim().toLowerCase();
    const cleanPhone = sanitizeInput(phone).trim();
    const cleanBirthDate = sanitizeInput(birthDate).trim();
    const cleanPassword = sanitizeInput(password).trim();

    const validationResult = registerSchema.safeParse({
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      birthDate: cleanBirthDate,
      password: cleanPassword,
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
      const formattedBirthDate = parseDateToISO(cleanBirthDate);

      const { error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: cleanPassword,
        options: {
          data: {
            full_name: cleanName,
            name: cleanName,
            role: role,
            phone: cleanPhone,
            birth_date: formattedBirthDate,
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
          {/* HERO EDITORIAL */}
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
                transition={{ type: 'spring', damping: 24, stiffness: 160 } as any}
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

          {/* FORMULÁRIO DE CADASTRO */}
          <MotiView
            from={{ opacity: 0, translateY: 12 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 22, stiffness: 150, delay: 80 } as any}
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

            {/* Campo Nome Completo */}
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

            {/* Campo Telefone / WhatsApp */}
            <View className="mb-3">
              <Text className="font-sans-bold text-xs uppercase tracking-wider text-[#71717a] dark:text-zinc-400 mb-2 ml-1">
                Telefone / WhatsApp
              </Text>
              <View className="flex-row items-center bg-[#f8f9fa] dark:bg-zinc-900 rounded-2xl pl-2 pr-4 py-2 border border-[#e2dfe1] dark:border-zinc-800">
                <View
                  className="w-9 h-9 rounded-full items-center justify-center mr-3"
                  style={{ backgroundColor: isDark ? 'rgba(89,200,58,0.15)' : 'rgba(89,200,58,0.1)' }}
                >
                  <Phone size={18} color={BRAND_GREEN} weight="bold" />
                </View>
                <TextInput
                  className="font-sans-medium flex-1 text-[#1b1b1d] dark:text-white text-base"
                  placeholder="(99) 99999-9999"
                  placeholderTextColor={isDark ? '#71717a' : '#a09da1'}
                  value={phone}
                  onChangeText={handlePhoneChange}
                  keyboardType="numeric"
                  maxLength={15}
                />
              </View>
            </View>

            {/* Campo Data de Nascimento */}
            <View className="mb-3">
              <Text className="font-sans-bold text-xs uppercase tracking-wider text-[#71717a] dark:text-zinc-400 mb-2 ml-1">
                Data de Nascimento
              </Text>
              <View className="flex-row items-center bg-[#f8f9fa] dark:bg-zinc-900 rounded-2xl pl-2 pr-4 py-2 border border-[#e2dfe1] dark:border-zinc-800">
                <View
                  className="w-9 h-9 rounded-full items-center justify-center mr-3"
                  style={{ backgroundColor: isDark ? 'rgba(89,200,58,0.15)' : 'rgba(89,200,58,0.1)' }}
                >
                  <CalendarBlank size={18} color={BRAND_GREEN} weight="bold" />
                </View>
                <TextInput
                  className="font-sans-medium flex-1 text-[#1b1b1d] dark:text-white text-base"
                  placeholder="DD/MM/AAAA"
                  placeholderTextColor={isDark ? '#71717a' : '#a09da1'}
                  value={birthDate}
                  onChangeText={handleDateChange}
                  keyboardType="numeric"
                  maxLength={10}
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