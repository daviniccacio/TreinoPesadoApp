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
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Dumbbell, Mail, Lock, Eye, EyeOff } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Identifica se o celular está em modo escuro
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Estados do formulário de login
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  /**
   * Processa a autenticação com e-mail e senha no Supabase
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
        Alert.alert('Erro ao entrar', 'E-mail ou senha incorretos.');
      }
    } catch (err) {
      Alert.alert('Erro', 'Ocorreu um erro inesperado ao conectar.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
        className="bg-white dark:bg-zinc-950 px-6"
        style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {/* Cabeçalho Visual */}
        <View className="items-center mb-8 mt-4">
          <View className="w-20 h-20 bg-[#0058bc] rounded-3xl items-center justify-center mb-4 border border-[#004bb0]">
            <Dumbbell size={40} color="#ffffff" />
          </View>
          <Text className="text-3xl font-extrabold text-[#1b1b1d] dark:text-white">
            Treino Pesado
          </Text>
          <Text className="text-sm text-[#414755] dark:text-zinc-400 mt-1 text-center font-medium">
            Entre para continuar a sua evolução
          </Text>
        </View>

        {/* Formulário */}
        <View className="space-y-4">
          {/* Campo de E-mail */}
          <View>
            <Text className="text-sm font-semibold text-[#1b1b1d] dark:text-white mb-1.5">
              E-mail
            </Text>
            <View className="flex-row items-center bg-[#f0edef] dark:bg-zinc-900 rounded-2xl px-4 py-3.5 border border-[#e2dfe1] dark:border-zinc-800">
              <Mail size={20} color={isDark ? '#a1a1aa' : '#414755'} />
              <TextInput
                className="flex-1 ml-3 text-[#1b1b1d] dark:text-white text-base"
                placeholder="seu.email@exemplo.com"
                placeholderTextColor={isDark ? '#71717a' : '#a09da1'}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Campo de Senha */}
          <View className="mt-3">
            <Text className="text-sm font-semibold text-[#1b1b1d] dark:text-white mb-1.5">
              Senha
            </Text>
            <View className="flex-row items-center bg-[#f0edef] dark:bg-zinc-900 rounded-2xl px-4 py-3.5 border border-[#e2dfe1] dark:border-zinc-800">
              <Lock size={20} color={isDark ? '#a1a1aa' : '#414755'} />
              <TextInput
                className="flex-1 ml-3 text-[#1b1b1d] dark:text-white text-base"
                placeholder="Sua senha secreta"
                placeholderTextColor={isDark ? '#71717a' : '#a09da1'}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                {showPassword ? (
                  <EyeOff size={20} color={isDark ? '#a1a1aa' : '#414755'} />
                ) : (
                  <Eye size={20} color={isDark ? '#a1a1aa' : '#414755'} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Botão de Envio */}
          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            className="bg-[#0058bc] py-4 rounded-2xl items-center mt-6 border border-[#004bb0]"
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-white font-bold text-lg">Entrar</Text>
            )}
          </TouchableOpacity>

          {/* Link para Cadastro */}
          <TouchableOpacity
            onPress={() => router.push('/(auth)/register')}
            className="items-center py-3 mt-2 mb-4"
          >
            <Text className="text-[#0058bc] dark:text-sky-400 font-semibold text-sm">
              Não tem uma conta? Cadastre-se
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}