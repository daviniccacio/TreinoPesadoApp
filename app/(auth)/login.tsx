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
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EnvelopeSimple, LockSimple, Eye, EyeSlash } from 'phosphor-react-native';
import { supabase } from '../../lib/supabase';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);

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
                  ? require('../../assets/logo-treino-pesado.png')
                  : require('../../assets/logo-treino-pesado-branco.png')
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
          <View className="mb-3">
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

          {/* Botão Entrar */}
          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            style={{ backgroundColor: '#59C83A' }}
            className="py-4 rounded-2xl items-center mt-4 shadow-md active:opacity-90"
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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}