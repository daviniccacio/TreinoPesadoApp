// ============================================================================
// DOCUMENTAÇÃO: TELA DE LOGIN INTEGRADA AO TEMA GLOBAL PERSISTENTE (SDK 56+)
// ============================================================================
// Tela de autenticação atualizada para utilizar o hook useTheme(), garantindo
// que a preferência de tema (Claro/Escuro) definida pelo usuário persista
// entre trocas de telas, login e logout.
// ============================================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Modal,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  EnvelopeSimple,
  LockSimple,
  Eye,
  EyeSlash,
  X,
  ArrowRight,
  Lightning,
} from 'phosphor-react-native';
import { MotiView } from 'moti';
import { supabase } from '../../lib/supabase';
import { useThrottledCallback } from '../../lib/useThrottle';
import { CustomModal } from '../../components/CustomModal';

// 🟢 IMPORTAÇÃO DO HOOK DE TEMA GLOBAL
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

  // 🟢 SUBSCRITO AO TEMA GLOBAL DO APLICATIVO
  const { isDark } = useTheme();

  // ESTADOS DE LOGIN
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // ESTADOS DE RECUPERAÇÃO DE SENHA
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [resetEmail, setResetEmail] = useState<string>('');
  const [resetLoading, setResetLoading] = useState<boolean>(false);

  // ESTADO DO MODAL PERSONALIZADO DE ALERTA
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
        message: 'Por favor, digite um e-mail no formato correto (exemplo: usuario@dominio.com).',
        type: 'danger',
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password,
      });

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
            setResetEmail(cleanEmail);
            setModalVisible(true);
          },
        });
      }
    } catch (err) {
      showAlertModal({
        title: 'Erro de Conexão',
        message: 'Ocorreu um erro inesperado ao conectar com o servidor.',
        type: 'danger',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword() {
    const cleanEmail = resetEmail.trim().toLowerCase();

    if (!cleanEmail) {
      setModalVisible(false);
      setTimeout(() => {
        showAlertModal({
          title: 'Atenção',
          message: 'Informe o seu e-mail para receber o link de redefinição.',
          type: 'info',
        });
      }, 350);
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      setModalVisible(false);
      setTimeout(() => {
        showAlertModal({
          title: 'E-mail Inválido ⚠️',
          message: 'O e-mail digitado não possui uma estrutura válida (ex: nome@dominio.com).',
          type: 'danger',
        });
      }, 350);
      return;
    }

    try {
      setResetLoading(true);

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (profile?.role === 'admin') {
        setModalVisible(false);
        setResetLoading(false);

        setTimeout(() => {
          showAlertModal({
            title: 'Acesso Restrito 🛡️',
            message:
              'Contas de Administrador não possuem permissão para redefinir a senha através deste formulário. Entre em contato com o suporte.',
            type: 'danger',
          });
        }, 350);
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: 'seuapp://reset-password',
      });

      setModalVisible(false);
      setResetLoading(false);

      setTimeout(() => {
        if (error) {
          const isInvalid = error.message.toLowerCase().includes('invalid');
          const isRateLimit = error.status === 429 || error.message.toLowerCase().includes('rate limit');

          if (isRateLimit) {
            showAlertModal({
              title: 'Limite de Envios Excedido! ⏳',
              message: 'Você solicitou a redefinição de senha muitas vezes. Aguarde alguns minutos.',
              type: 'danger',
            });
          } else if (isInvalid) {
            showAlertModal({
              title: 'E-mail Não Encontrado ⚠️',
              message: 'Este e-mail não está cadastrado ou o endereço digitado é inválido.',
              type: 'danger',
            });
          } else {
            showAlertModal({
              title: 'Erro no Envio',
              message: error.message || 'Não foi possível enviar o e-mail de recuperação.',
              type: 'danger',
            });
          }
        } else {
          showAlertModal({
            title: 'E-mail Enviado! 📩',
            message: 'Enviamos um link de redefinição para o seu e-mail. Verifique sua caixa de entrada e spam.',
            type: 'success',
          });
        }
      }, 350);
    } catch (err) {
      setModalVisible(false);
      setResetLoading(false);

      setTimeout(() => {
        showAlertModal({
          title: 'Falha na Solicitação',
          message: 'Ocorreu uma falha ao solicitar a redefinição de senha.',
          type: 'danger',
        });
      }, 350);
    }
  }

  const handleLoginThrottled = useThrottledCallback(handleLogin, 2000);
  const handleResetPasswordThrottled = useThrottledCallback(handleResetPassword, 2000);

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

              <EnergyBadge />
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
            {/* Campo E-mail */}
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

            {/* Campo Senha */}
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
                    isDark ? 'text-white' : 'text-[#1b1b1d]'
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
                setResetEmail(email.trim());
                setModalVisible(true);
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
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <Text className="font-outfit text-white text-lg tracking-wide mr-2">
                    Entrar
                  </Text>
                  <ArrowRight size={20} color="#ffffff" weight="bold" />
                </>
              )}
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

      {/* MODAL DE REDEFINIÇÃO DE SENHA */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View className="flex-1 bg-black/60 justify-end">
              <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                <View
                  className={`rounded-t-3xl p-6 border-t ${
                    isDark
                      ? 'bg-zinc-900 border-zinc-800'
                      : 'bg-white border-[#e2dfe1]'
                  }`}
                  style={{ paddingBottom: Math.max(safeBottomPadding + 10, 24) }}
                >
                  <View className="flex-row items-center justify-between mb-4">
                    <Text
                      className={`font-outfit text-lg ${
                        isDark ? 'text-white' : 'text-[#1b1b1d]'
                      }`}
                    >
                      Redefinir Senha
                    </Text>
                    <TouchableOpacity
                      onPress={() => setModalVisible(false)}
                      className={`w-8 h-8 rounded-full items-center justify-center ${
                        isDark ? 'bg-zinc-800' : 'bg-zinc-100'
                      }`}
                    >
                      <X size={18} color={isDark ? '#ffffff' : '#1b1b1d'} />
                    </TouchableOpacity>
                  </View>

                  <Text
                    className={`font-sans-medium text-xs mb-4 leading-5 ${
                      isDark ? 'text-zinc-400' : 'text-[#71717a]'
                    }`}
                  >
                    Digite o seu e-mail cadastrado. Enviaremos um link seguro para você criar uma nova senha.
                  </Text>

                  <View
                    className={`flex-row items-center rounded-2xl px-4 py-3.5 border mb-5 ${
                      isDark
                        ? 'bg-zinc-950 border-zinc-800'
                        : 'bg-[#f8f9fa] border-[#e2dfe1]'
                    }`}
                  >
                    <EnvelopeSimple size={20} color={isDark ? BRAND_GREEN : '#414755'} />
                    <TextInput
                      className={`font-sans-medium flex-1 ml-3 text-base ${
                        isDark ? 'text-white' : 'text-[#1b1b1d]'
                      }`}
                      placeholder="seu.email@exemplo.com"
                      placeholderTextColor={isDark ? '#71717a' : '#a09da1'}
                      value={resetEmail}
                      onChangeText={setResetEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>

                  <TouchableOpacity
                    onPress={handleResetPasswordThrottled}
                    disabled={resetLoading}
                    style={{ backgroundColor: BRAND_GREEN }}
                    className="py-3.5 rounded-2xl items-center shadow-md mb-2"
                  >
                    {resetLoading ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <Text className="font-outfit text-white text-base">
                        Enviar E-mail de Recuperação
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL DE ALERTA PERSONALIZADO (PASSA ISDARK PARA SUCESSO DE TEMA) */}
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
    </View>
  );
}