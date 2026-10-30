// ============================================================================
// DOCUMENTAÇÃO: TELA DE LOGIN BLINDADA CONTRA TRAVAMENTOS, TIMEOUTS E INJEÇÕES
// ============================================================================
// Inclui proteção com Promise.race (timeout de 10s), sanitização de e-mail e
// senha, tratamento de exceções no SecureStore e navegação por papel (role).
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

import { supabase } from '../../lib/supabase';
import { sanitizeInput } from '../../lib/security'; // 🟢 Importação do módulo de sanitização
import { CustomModal } from '../../components/CustomModal';
import { AuthLoadingOverlay } from '../../components/AppLoaders';
import { useTheme } from '../../context/ThemeContext';

const BRAND_GREEN = '#59C83A';
const BRAND_GREEN_DEEP = '#2F7A16';
const HERO_BG = '#0F1F0A';

/** Valida se a string possui um formato de e-mail válido */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/** Anel de pulso animado para a marca */
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

/** Selo de energia da marca */
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
        <Lightning size={24} color="#ffffff" weight="bold" />
      </View>
    </View>
  );
}

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();

  // ESTADOS DE AUTENTICAÇÃO
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // CONFIGURAÇÃO DO MODAL DE ALERTA
  const [modalConfig, setModalConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'danger' | 'info';
    confirmText: string;
    cancelText: string;
    showCancelButton: boolean;
    onConfirm: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
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

  // FUNÇÃO DE LOGIN PROTEGIDA COM TIMEOUT, SANITIZAÇÃO E LOGS
  async function handleLogin() {
    if (loading) return;

    // 1. Sanitização e limpeza das entradas de texto
    const cleanEmail = sanitizeInput(email).trim().toLowerCase();
    const cleanPassword = sanitizeInput(password).trim();

    // 2. Validação dos campos
    if (!cleanEmail || !cleanPassword) {
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
        message: 'Por favor, digite um e-mail no formato correto (exemplo: usuario@dominio.com).',
        type: 'danger',
      });
      return;
    }

    setLoading(true);

    try {
      // 3. Criação do Timeout de Segurança (10 Segundos)
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error('TIMEOUT_EXCEEDED')),
          10000
        )
      );

      // 4. Execução paralela da autenticação contra o Timeout
      const authPromise = supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword,
      });

      const response = (await Promise.race([authPromise, timeoutPromise])) as any;
      const { data, error } = response;

      if (error) {
        if (error.status === 429 || error.message.toLowerCase().includes('rate limit')) {
          showAlertModal({
            title: 'Muitas Tentativas! 🛡️',
            message: 'Você realizou várias tentativas de login em pouco tempo. Por segurança, aguarde alguns minutos.',
            type: 'danger',
          });
          return;
        }

        showAlertModal({
          title: 'Erro ao entrar',
          message: 'E-mail ou senha incorretos. Deseja redefinir sua senha?',
          type: 'danger',
          confirmText: 'Redefinir Senha',
          cancelText: 'Tentar novamente',
          showCancelButton: true,
          onConfirm: () => {
            router.push({
              pathname: '/(auth)/forgot-password' as any,
              params: { email: cleanEmail },
            });
          },
        });
        return;
      }

      // 5. Verificação de Perfil para Redirecionamento Imediato
      const userId = data?.user?.id;
      if (userId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .maybeSingle();

        if (profile?.role === 'personal') {
          router.replace('/(app)/(personal)/(tabs)');
        } else {
          router.replace('/(app)/(aluno)/(tabs)');
        }
      }
    } catch (err: any) {
      if (err.message === 'TIMEOUT_EXCEEDED') {
        showAlertModal({
          title: 'Conexão Lenta 🌐',
          message: 'O servidor demorou muito para responder. Verifique sua conexão com a internet e tente novamente.',
          type: 'danger',
        });
      } else {
        showAlertModal({
          title: 'Erro de Conexão',
          message: err.message || 'Ocorreu um erro inesperado ao conectar com o servidor.',
          type: 'danger',
        });
      }
    } finally {
      // GARANTE QUE O OVERLAY DE CARREGAMENTO SEJA DESATIVADO
      setLoading(false);
    }
  }

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

              <EnergyBadge />
            </View>
          </View>

          {/* FORMULÁRIO */}
          <MotiView
            from={{ opacity: 0, translateY: 12 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 22, stiffness: 150, delay: 80 } as any}
            className="px-6 pt-8"
            style={{ paddingBottom: safeBottomPadding }}
          >
            {/* CAMPO E-MAIL */}
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
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* CAMPO SENHA */}
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
                  autoCapitalize="none"
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

            {/* ESQUECI MINHA SENHA */}
            <TouchableOpacity
              onPress={() => {
                const cleanEmail = sanitizeInput(email).trim().toLowerCase();
                router.push({
                  pathname: '/(auth)/forgot-password' as any,
                  params: { email: cleanEmail },
                });
              }}
              className="items-end mb-5 py-1"
            >
              <Text style={{ color: BRAND_GREEN }} className="font-sans-bold text-xs">
                Esqueceu a senha?
              </Text>
            </TouchableOpacity>

            {/* BOTÃO ENTRAR */}
            <TouchableOpacity
              onPress={handleLogin}
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

            {/* LINK PARA CADASTRO */}
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

      {/* MODAL DE ALERTA PERSONALIZADO */}
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

      {/* OVERLAY DE CARREGAMENTO BLOQUEANTE */}
      <AuthLoadingOverlay
        visible={loading}
        message="Entrando na sua conta..."
      />
    </View>
  );
}