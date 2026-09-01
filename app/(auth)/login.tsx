import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
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
import { supabase } from '../../lib/supabase';
import { useThrottledCallback } from '../../lib/useThrottle';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // --- ESTADOS DE LOGIN ---
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // --- ESTADOS DE RECUPERAÇÃO DE SENHA ---
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [resetEmail, setResetEmail] = useState<string>('');
  const [resetLoading, setResetLoading] = useState<boolean>(false);

  /**
   * Executa o login com e-mail e senha
   */
  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Campos obrigatórios', 'Por favor, preencha o e-mail e a senha.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        // Captura o bloqueio de Rate Limit retornado pelo Supabase (HTTP 429)
        if (error.status === 429 || error.message.toLowerCase().includes('rate limit')) {
          Alert.alert(
            'Muitas Tentativas! 🛡️',
            'Você realizou várias tentativas de login em pouco tempo. Por motivos de segurança, aguarde alguns minutos antes de tentar novamente.'
          );
          return;
        }

        Alert.alert(
          'Erro ao entrar',
          'E-mail ou senha incorretos. Deseja redefinir sua senha?',
          [
            { text: 'Tentar novamente', style: 'cancel' },
            {
              text: 'Redefinir Senha',
              onPress: () => {
                setResetEmail(email.trim());
                setModalVisible(true);
              },
            },
          ]
        );
      }
    } catch (err) {
      Alert.alert('Erro', 'Ocorreu um erro inesperado ao conectar.');
    } finally {
      setLoading(false);
    }
  }

  // ============================================================================
  // 2. FUNÇÃO DE REDEFINIÇÃO DE SENHA COM TRATAMENTO DE RATE LIMIT
  // ============================================================================
  async function handleResetPassword() {
    if (!resetEmail.trim()) {
      Alert.alert('Atenção', 'Informe o seu e-mail para receber o link de redefinição.');
      return;
    }

    try {
      setResetLoading(true);

      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
        redirectTo: 'seuapp://reset-password',
      });

      if (error) {
        // Captura o bloqueio de Rate Limit (HTTP 429) no envio de e-mails
        if (error.status === 429 || error.message.toLowerCase().includes('rate limit')) {
          Alert.alert(
            'Limite de Envios Excedido! ⏳',
            'Você solicitou a redefinição de senha muitas vezes. Por favor, aguarde alguns minutos antes de tentar novamente.'
          );
          return;
        }

        Alert.alert('Erro', error.message || 'Não foi possível enviar o e-mail.');
      } else {
        Alert.alert(
          'E-mail Enviado! 📩',
          'Enviamos um link de redefinição para o seu e-mail. Verifique sua caixa de entrada e spam.',
          [{ text: 'OK', onPress: () => setModalVisible(false) }]
        );
      }
    } catch (err) {
      Alert.alert('Erro', 'Ocorreu uma falha ao solicitar a redefinição.');
    } finally {
      setResetLoading(false);
    }
  }

  // ============================================================================
  // 3. CRIAÇÃO DOS CALLBACKS PROTEGIDOS CONTRA CLIQUE DUPLO (THROTTLE)
  // ============================================================================
  const handleLoginThrottled = useThrottledCallback(handleLogin, 2000);
  const handleResetPasswordThrottled = useThrottledCallback(handleResetPassword, 2000)

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
        className="bg-white dark:bg-zinc-950 px-6 py-8"
        style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {/* Cabeçalho Visual */}
        <View className="items-center mb-10">
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
        </View>

        {/* Formulário */}
        <View className="space-y-4">
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

          {/* Link Esqueci Minha Senha */}
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

          {/* Link Cadastro */}
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
        </View>

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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}