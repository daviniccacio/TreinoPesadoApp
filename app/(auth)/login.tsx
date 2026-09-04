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
  useColorScheme,
  Image,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EnvelopeSimple, LockSimple, Eye, EyeSlash, X } from 'phosphor-react-native';
import { MotiView } from 'moti';
import { supabase } from '../../lib/supabase';
import { useThrottledCallback } from '../../lib/useThrottle';
import { CustomModal } from '../../components/CustomModal';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

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
    if (!email.trim() || !password.trim()) {
      showAlertModal({
        title: 'Campos Obrigatórios',
        message: 'Por favor, preencha o e-mail e a senha.',
        type: 'info',
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
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
            setResetEmail(email.trim());
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
    if (!resetEmail.trim()) {
      showAlertModal({
        title: 'Atenção',
        message: 'Informe o seu e-mail para receber o link de redefinição.',
        type: 'info',
      });
      return;
    }

    try {
      setResetLoading(true);

      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
        redirectTo: 'seuapp://reset-password',
      });

      if (error) {
        if (error.status === 429 || error.message.toLowerCase().includes('rate limit')) {
          showAlertModal({
            title: 'Limite de Envios Excedido! ⏳',
            message: 'Você solicitou a redefinição de senha muitas vezes. Por favor, aguarde alguns minutos.',
            type: 'danger',
          });
          return;
        }

        showAlertModal({
          title: 'Erro no Envio',
          message: error.message || 'Não foi possível enviar o e-mail de recuperação.',
          type: 'danger',
        });
      } else {
        setModalVisible(false);
        showAlertModal({
          title: 'E-mail Enviado! 📩',
          message: 'Enviamos um link de redefinição para o seu e-mail. Verifique sua caixa de entrada e spam.',
          type: 'success',
        });
      }
    } catch (err) {
      showAlertModal({
        title: 'Falha na Solicitação',
        message: 'Ocorreu uma falha ao solicitar a redefinição de senha.',
        type: 'danger',
      });
    } finally {
      setResetLoading(false);
    }
  }

  const handleLoginThrottled = useThrottledCallback(handleLogin, 2000);
  const handleResetPasswordThrottled = useThrottledCallback(handleResetPassword, 2000);

  const safeTopPadding = Math.max(insets?.top || 0, 16);
  const safeBottomPadding = Math.max(insets?.bottom || 0, 16);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
        className="bg-white dark:bg-zinc-950 px-6 py-8"
        style={{ paddingTop: safeTopPadding, paddingBottom: safeBottomPadding }}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. LOGO E CABEÇALHO ANIMADOS */}
        <MotiView
          from={{ opacity: 0, translateY: -12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{
            type: 'spring',
            damping: 24,
            stiffness: 160,
          }}
          className="items-center mb-10"
        >
          <View className="w-48 h-48 rounded-3xl items-center justify-center overflow-hidden mb-2">
            <Image
              source={
                isDark
                  ? require('../../assets/icon.png')
                  : require('../../assets/splash.png')
              }
              className="w-full h-full"
              resizeMode="contain"
            />
          </View>
          <Text className="text-sm text-[#71717a] dark:text-zinc-400 text-center font-medium tracking-wide">
            Entre para continuar a sua evolução
          </Text>
        </MotiView>

        {/* 2. FORMULÁRIO ANIMADO */}
        <MotiView
          from={{ opacity: 0, translateY: 12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{
            type: 'spring',
            damping: 22,
            stiffness: 150,
            delay: 30,
          }}
          className="space-y-4"
        >
          {/* Campo E-mail */}
          <View className="mb-3">
            <Text className="text-xs font-bold uppercase tracking-wider text-[#71717a] dark:text-zinc-400 mb-2 ml-1">
              E-mail
            </Text>
            <View className="flex-row items-center bg-[#f8f9fa] dark:bg-zinc-900 rounded-2xl px-4 py-3.5 border border-[#e2dfe1] dark:border-zinc-800">
              <EnvelopeSimple size={20} color={isDark ? '#59C83A' : '#414755'} />
              <TextInput
                className="flex-1 ml-3 text-[#1b1b1d] dark:text-white text-base font-medium"
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
            <Text className="text-xs font-bold uppercase tracking-wider text-[#71717a] dark:text-zinc-400 mb-2 ml-1">
              Senha
            </Text>
            <View className="flex-row items-center bg-[#f8f9fa] dark:bg-zinc-900 rounded-2xl px-4 py-3.5 border border-[#e2dfe1] dark:border-zinc-800">
              <LockSimple size={20} color={isDark ? '#59C83A' : '#414755'} />
              <TextInput
                className="flex-1 ml-3 text-[#1b1b1d] dark:text-white text-base font-medium"
                placeholder="Sua senha secreta"
                placeholderTextColor={isDark ? '#71717a' : '#a09da1'}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                {showPassword ? (
                  <EyeSlash size={20} color={isDark ? '#59C83A' : '#414755'} />
                ) : (
                  <Eye size={20} color={isDark ? '#59C83A' : '#414755'} />
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
            className="align-self-end items-end mb-3 py-1"
          >
            <Text style={{ color: '#59C83A' }} className="text-xs font-bold">
              Esqueceu a senha?
            </Text>
          </TouchableOpacity>

          {/* Botão Entrar */}
          <TouchableOpacity
            onPress={handleLoginThrottled}
            disabled={loading}
            style={{ backgroundColor: '#59C83A' }}
            className="py-4 rounded-2xl items-center mt-2 shadow-md active:opacity-90"
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-white font-extrabold text-lg tracking-wide">
                Entrar
              </Text>
            )}
          </TouchableOpacity>

          {/* Link para Cadastro */}
          <TouchableOpacity
            onPress={() => router.push('/(auth)/register')}
            className="items-center py-4 mt-3"
          >
            <Text className="text-sm text-[#71717a] dark:text-zinc-400">
              Não tem uma conta?{' '}
              <Text style={{ color: '#59C83A' }} className="font-bold">
                Cadastre-se
              </Text>
            </Text>
          </TouchableOpacity>
        </MotiView>

        {/* MODAL DE REDEFINIÇÃO DE SENHA */}
        <Modal visible={modalVisible} transparent animationType="slide">
          <View className="flex-1 bg-black/60 justify-end">
            <View className="bg-white dark:bg-zinc-900 rounded-t-3xl p-6 border-t border-[#e2dfe1] dark:border-zinc-800">
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-lg font-extrabold text-[#1b1b1d] dark:text-white">
                  Redefinir Senha
                </Text>
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 items-center justify-center"
                >
                  <X size={18} color={isDark ? '#ffffff' : '#1b1b1d'} />
                </TouchableOpacity>
              </View>

              <Text className="text-xs text-[#71717a] dark:text-zinc-400 mb-4 font-medium leading-5">
                Digite o seu e-mail cadastrado. Enviaremos um link seguro para você criar uma nova senha.
              </Text>

              <View className="flex-row items-center bg-[#f8f9fa] dark:bg-zinc-950 rounded-2xl px-4 py-3.5 border border-[#e2dfe1] dark:border-zinc-800 mb-5">
                <EnvelopeSimple size={20} color={isDark ? '#59C83A' : '#414755'} />
                <TextInput
                  className="flex-1 ml-3 text-[#1b1b1d] dark:text-white text-base font-medium"
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
                style={{ backgroundColor: '#59C83A' }}
                className="py-3.5 rounded-2xl items-center shadow-md mb-2"
              >
                {resetLoading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text className="text-white font-extrabold text-base">
                    Enviar E-mail de Recuperação
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

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