// ============================================================================
// DOCUMENTAÇÃO: TELA DE VERIFICAÇÃO OTP COM SUPORTE A AUTO-FILL NATIVO (VPS)
// ============================================================================
// Esta tela valida o código de 6 dígitos via API da VPS (POST /auth/verify-otp)
// mantendo suporte ao autopreenchimento nativo do iOS e Android.
// ============================================================================

import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, ShieldCheck, WarningCircle } from "phosphor-react-native";
import { MotiView } from "moti";
import { api } from "../../services/api"; // Serviço Axios configurado para a VPS

export default function VerifyOtpScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const insets = useSafeAreaInsets();

  const email = params.email ?? "";
  const [code, setCode] = useState<string[]>(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState<number>(0);

  const inputRefs = useRef<Array<TextInput | null>>([]);

  // 🟢 DISPARO AUTOMÁTICO QUANDO OS 6 DÍGITOS SÃO PREENCHIDOS
  useEffect(() => {
    const fullCode = code.join("");
    if (fullCode.length === 6 && !loading) {
      verifyOtpAutomatically(fullCode);
    }
  }, [code]);

  // --------------------------------------------------------------------------
  // VERIFICAÇÃO DO CÓDIGO OTP NA API DA VPS
  // --------------------------------------------------------------------------
  async function verifyOtpAutomatically(otpString: string) {
    if (!email) {
      setErrorMessage("E-mail não identificado. Volte e tente novamente.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      // Chamada HTTP para a rota /auth/verify-otp da VPS
      await api.post("/auth/verify-otp", {
        email: email.trim(),
        code: otpString.trim(),
      });

      // Redireciona para a tela de criar nova senha passando os parâmetros
      router.push({
        pathname: "/reset-password" as any,
        params: { email: email.trim(), code: otpString.trim() },
      });
    } catch (err: any) {
      console.error("❌ Erro ao verificar OTP:", err?.response?.data || err?.message);
      
      // Efeito visual de tremer e reset dos campos em caso de erro
      setShakeKey((prev) => prev + 1);
      setCode(["", "", "", "", "", ""]);
      
      const responseError = err?.response?.data?.error || "Código de verificação incorreto ou expirado.";
      setErrorMessage(responseError);
      
      // Retorna o foco para o primeiro campo de digitação
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }

  // 🟢 TRATAMENTO DE DIGITAÇÃO E AUTO-FILL NATIVO DO TECLADO
  function handleOtpChange(text: string, index: number) {
    if (errorMessage) setErrorMessage(null);

    // Se o iOS/Android enviou a string inteira de 6 dígitos via Auto-Fill:
    if (text.length >= 6) {
      const digits = text.replace(/\D/g, "").slice(0, 6).split("");
      if (digits.length === 6) {
        setCode(digits);
        inputRefs.current[5]?.focus();
        return;
      }
    }

    // Digitação normal caractere por caractere
    const cleanText = text.replace(/\D/g, "");
    const newCode = [...code];
    newCode[index] = cleanText;
    setCode(newCode);

    if (cleanText && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyPress(e: any, index: number) {
    if (e.nativeEvent.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handleGoBack() {
    router.back();
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
            onPress={handleGoBack}
            className="flex-row items-center mb-6 py-1"
            activeOpacity={0.7}
          >
            <ArrowLeft size={20} color="#71717a" />
            <Text className="text-sm font-sans-bold text-[#71717a] dark:text-zinc-400 ml-2">
              Voltar
            </Text>
          </TouchableOpacity>
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: -16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "spring", damping: 22, stiffness: 160, delay: 100 }}
          className="mb-8"
        >
          <View className="w-12 h-12 rounded-2xl bg-[#59C83A]/15 items-center justify-center mb-3">
            <ShieldCheck size={28} color="#59C83A" weight="bold" />
          </View>
          <Text className="text-2xl font-outfit-extrabold text-[#1b1b1d] dark:text-white mb-2">
            Código de Verificação
          </Text>
          <Text className="text-xs font-sans-regular text-[#71717a] dark:text-zinc-400 leading-relaxed">
            Digite o código de 6 dígitos enviado para{" "}
            <Text className="font-sans-bold text-zinc-900 dark:text-zinc-200">{email}</Text>
          </Text>
        </MotiView>

        <MotiView
          key={shakeKey}
          from={{ translateX: 0 }}
          animate={{ translateX: shakeKey > 0 ? [-12, 12, -8, 8, -4, 4, 0] : 0 }}
          transition={{ type: "timing", duration: 400 }}
          className="mb-4"
        >
          <View className="flex-row justify-between items-center mb-2">
            {code.map((digit, index) => (
              <MotiView
                key={index}
                from={{ opacity: 0, translateY: -20, scale: 0.8 }}
                animate={{ opacity: 1, translateY: 0, scale: 1 }}
                transition={{
                  type: "spring",
                  damping: 15,
                  stiffness: 180,
                  delay: 150 + index * 70,
                }}
                className={`w-12 h-14 rounded-2xl border items-center justify-center bg-[#f8f9fa] dark:bg-zinc-900 ${
                  errorMessage
                    ? "border-red-500 bg-red-500/5"
                    : digit
                    ? "border-[#59C83A] bg-[#59C83A]/5"
                    : "border-[#e2dfe1] dark:border-zinc-800"
                }`}
              >
                <TextInput
                  ref={(ref) => {
                    inputRefs.current[index] = ref;
                  }}
                  className="text-xl font-outfit-bold text-[#1b1b1d] dark:text-white text-center w-full h-full"
                  keyboardType="number-pad"
                  maxLength={index === 0 ? 6 : 1}
                  value={digit}
                  onChangeText={(text) => handleOtpChange(text, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  autoFocus={index === 0}
                  textContentType="oneTimeCode"
                  autoComplete="one-time-code"
                />
              </MotiView>
            ))}
          </View>

          {errorMessage && (
            <MotiView
              from={{ opacity: 0, translateY: -6 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "timing", duration: 200 }}
              className="flex-row items-center justify-center mt-3"
            >
              <WarningCircle size={16} color="#EF4444" weight="fill" />
              <Text className="text-xs font-sans-bold text-red-500 ml-1.5 text-center">
                {errorMessage}
              </Text>
            </MotiView>
          )}

          {loading && (
            <View className="flex-row items-center justify-center mt-4">
              <ActivityIndicator color="#59C83A" size="small" />
              <Text className="ml-2 text-xs font-sans-medium text-[#59C83A]">
                Verificando código...
              </Text>
            </View>
          )}
        </MotiView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}