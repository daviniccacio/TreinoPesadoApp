// ============================================================================
// DOCUMENTAÇÃO: FUNÇÃO DE LOGIN COM REDIRECIONAMENTO EXPLÍCITO
// ============================================================================
// Submeta os dados para a API na VPS e força a transição de tela sem travar.
// ============================================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  EnvelopeSimple,
  LockSimple,
  Eye,
  EyeSlash,
  ArrowRight,
  Lightning,
} from 'phosphor-react-native';
import { MotiView } from 'moti';

import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useThrottledCallback } from '../../lib/useThrottle';
import { CustomModal } from '../../components/CustomModal';
import { AuthLoadingOverlay } from '../../components/AppLoaders';
import { useTheme } from '../../context/ThemeContext';

const BRAND_GREEN = '#59C83A';
const BRAND_GREEN_DEEP = '#2F7A16';
const HERO_BG = '#0F1F0A';

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();
  const { isDark } = useTheme();

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const [modalConfig, setModalConfig] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info' as 'success' | 'danger' | 'info',
    confirmText: 'Entendi',
    cancelText: 'Cancelar',
    showCancelButton: false,
    onConfirm: () => {},
  });

  function showAlertModal({
    title,
    message,
    type = 'info',
    confirmText = 'Entendi',
    cancelText = 'Cancelar',
    showCancelButton = false,
    onConfirm,
  }: {
    title: string;
    message: string;
    type?: 'success' | 'danger' | 'info';
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

  async function handleLogin() {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password.trim()) {
      showAlertModal({
        title: 'Campos Obrigatórios',
        message: 'Por favor, preencha o e-mail e a senha.',
        type: 'info',
      });
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      showAlertModal({
        title: 'E-mail Inválido ⚠️',
        message: 'Por favor, digite um e-mail no formato correto.',
        type: 'danger',
      });
      return;
    }

    setLoading(true);

    try {
      // 1. Envia requisição para a VPS
      const response = await api.post('/api/auth/login', {
        email: cleanEmail,
        password: password.trim(),
      });

      const { token, user } = response.data;

      if (!user || !user.id) {
        throw new Error('Resposta do servidor em formato inválido.');
      }

      // 2. Registra no AuthContext
      await signIn({
        id: String(user.id),
        email: user.email,
        name: user.name || 'Usuário',
        role: user.role || 'aluno',
        token,
      });

      console.log('✅ [Login] Sucesso! Direcionando para a área do aluno...');

      // 3. REDIRECIONAMENTO DIRETO (Evita travar na tela de login)
      setLoading(false);
      
      if (user.role === 'admin') {
        router.replace('/(app)/(admin)' as any);
      } else if (user.role === 'personal') {
        router.replace('/(app)/(personal)' as any);
      } else {
        router.replace('/(app)/(aluno)' as any);
      }

    } catch (err: any) {
      setLoading(false);
      console.error('❌ [Login] Erro:', err.message || err);

      const mensagemErro =
        err.response?.data?.erro ||
        err.message ||
        'Não foi possível conectar ao servidor.';

      showAlertModal({
        title: 'Erro ao entrar',
        message: mensagemErro,
        type: 'danger',
        confirmText: 'Entendi',
      });
    }
  }

  const handleLoginThrottled = useThrottledCallback(handleLogin, 2000);

  const safeTopPadding = Math.max(insets?.top || 0, 16);
  const safeBottomPadding = Math.max(insets?.bottom || 0, 16);

  return (
    <View className={`flex-1 ${isDark ? 'bg-zinc-950' : 'bg-white'}`}>
      <StatusBar style="light" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* CABEÇALHO EDITORIAL */}
          <View
            style={{
              backgroundColor: HERO_BG,
              paddingTop: safeTopPadding + 8,
              borderBottomLeftRadius: 88,
              borderBottomRightRadius: 20,
            }}
            className="pb-10 px-6 overflow-hidden"
          >
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
                  Bem-vindo
                </Text>
                <Text
                  style={{ color: BRAND_GREEN }}
                  className="font-outfit text-[34px] leading-[36px] mb-3"
                >
                  de volta.
                </Text>
                <Text className="font-sans-medium text-sm text-zinc-400">
                  Continue a sua evolução hoje.
                </Text>
              </MotiView>
            </View>
          </View>

          {/* FORMULÁRIO */}
          <MotiView
            from={{ opacity: 0, translateY: 12 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 22, stiffness: 150, delay: 80 }}
            className="px-6 pt-8"
            style={{ paddingBottom: safeBottomPadding }}
          >
            {/* E-mail */}
            <View className="mb-3">
              <Text
                className={`font-sans-bold text-xs uppercase tracking-wider mb-2 ml-1 ${
                  isDark ? 'text-zinc-400' : 'text-[#71717a]'
                }`}
              >
                E-mail
              </Text>
              <View
                className={`flex-row items-center rounded-2xl pl-2 pr-4 py-2 border ${
                  isDark
                    ? 'bg-zinc-900 border-zinc-800'
                    : 'bg-[#f8f9fa] border-[#e2dfe1]'
                }`}
              >
                <View
                  className="w-9 h-9 rounded-full items-center justify-center mr-3"
                  style={{
                    backgroundColor: isDark
                      ? 'rgba(89,200,58,0.15)'
                      : 'rgba(89,200,58,0.1)',
                  }}
                >
                  <EnvelopeSimple size={18} color={BRAND_GREEN} weight="bold" />
                </View>
                <TextInput
                  className={`font-sans-medium flex-1 text-base ${
                    isDark ? 'text-white' : 'text-[#1b1b1d]'
                  }`}
                  placeholder="seu.email@exemplo.com"
                  placeholderTextColor={isDark ? '#71717a' : '#a09da1'}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Senha */}
            <View className="mb-1">
              <Text
                className={`font-sans-bold text-xs uppercase tracking-wider mb-2 ml-1 ${
                  isDark ? 'text-zinc-400' : 'text-[#71717a]'
                }`}
              >
                Senha
              </Text>
              <View
                className={`flex-row items-center rounded-2xl pl-2 pr-4 py-2 border ${
                  isDark
                    ? 'bg-zinc-900 border-zinc-800'
                    : 'bg-[#f8f9fa] border-[#e2dfe1]'
                }`}
              >
                <View
                  className="w-9 h-9 rounded-full items-center justify-center mr-3"
                  style={{
                    backgroundColor: isDark
                      ? 'rgba(89,200,58,0.15)'
                      : 'rgba(89,200,58,0.1)',
                  }}
                >
                  <LockSimple size={18} color={BRAND_GREEN} weight="bold" />
                </View>
                <TextInput
                  className={`font-sans-medium flex-1 text-base ${
                    isDark ? 'text-[#ffffff]' : 'text-[#1b1b1d]'
                  }`}
                  placeholder="Sua senha secreta"
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

            {/* Esqueci minha senha */}
            <TouchableOpacity
              onPress={() => {
                router.push({
                  pathname: '/(auth)/forgot-password' as any,
                  params: { email: email.trim().toLowerCase() },
                });
              }}
              className="items-end mb-5 py-1"
            >
              <Text style={{ color: BRAND_GREEN }} className="font-sans-bold text-xs">
                Esqueceu a senha?
              </Text>
            </TouchableOpacity>

            {/* Botão Entrar */}
            <TouchableOpacity
              onPress={handleLoginThrottled}
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
              <Text className="font-outfit text-white text-lg tracking-wide mr-2">
                Entrar
              </Text>
              <ArrowRight size={20} color="#ffffff" weight="bold" />
            </TouchableOpacity>

            {/* Link para Cadastro */}
            <TouchableOpacity
              onPress={() => router.push('/(auth)/register')}
              className="items-center py-4 mt-2"
            >
              <Text
                className={`font-sans text-sm ${
                  isDark ? 'text-zinc-400' : 'text-[#71717a]'
                }`}
              >
                Não tem uma conta?{' '}
                <Text style={{ color: BRAND_GREEN }} className="font-sans-bold">
                  Cadastre-se
                </Text>
              </Text>
            </TouchableOpacity>
          </MotiView>
        </ScrollView>
      </KeyboardAvoidingView>

      <CustomModal
        visible={modalConfig.visible}
        isDark={isDark}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        confirmText={modalConfig.confirmText}
        cancelText={modalConfig.cancelText}
        showCancelButton={modalConfig.showCancelButton}
        onConfirm={modalConfig.onConfirm}
        onClose={() => setModalConfig((prev) => ({ ...prev, visible: false }))}
      />

      <AuthLoadingOverlay
        visible={loading}
        message="Entrando na sua conta..."
      />
    </View>
  );
}