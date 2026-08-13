import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useColorScheme,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { User, Mail, Lock, ArrowLeft, Eye, EyeOff } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';

/**
 * Tela de Cadastro Moderna alinhada à identidade visual #59C83A do Treino Pesado Academia
 */
export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Detecta se o dispositivo está no modo escuro
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Estados do formulário de cadastro
  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  /**
   * Processa o cadastro do novo usuário no Supabase
   */
  async function handleRegister() {
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Erro', 'Preencha todos os campos obrigatórios.');
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            first_name: fullName.trim(),
          },
        },
      });

      if (error) {
        Alert.alert('Erro no cadastro', error.message);
        return;
      }

      if (user) {
        // Tenta registrar o perfil do usuário na tabela pública
        await supabase.from('profiles').insert([
          { id: user.id, full_name: fullName.trim() },
        ]);

        Alert.alert('Sucesso! 🎉', 'Conta criada com sucesso!');
        router.replace('/(auth)/login');
      }
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível concluir o cadastro.');
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
        {/* Botão de Voltar para Tela de Login */}
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-[#f8f9fa] dark:bg-zinc-900 items-center justify-center border border-[#e2dfe1] dark:border-zinc-800 mb-2 self-start"
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color={isDark ? '#59C83A' : '#1b1b1d'} />
        </TouchableOpacity>

        {/* Cabeçalho Visual com a Logo Dinâmica */}
        <View className="items-center mb-6">
          <View className="w-36 h-36 rounded-3xl items-center justify-center overflow-hidden mb-1">
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
          <Text className="text-2xl font-extrabold text-[#1b1b1d] dark:text-white">
            Criar Conta
          </Text>
          <Text className="text-xs text-[#71717a] dark:text-zinc-400 mt-1 text-center font-medium tracking-wide">
            Comece sua jornada de treinos hoje.
          </Text>
        </View>

        {/* Formulário de Cadastro */}
        <View className="space-y-3">
          {/* Campo Nome Completo */}
          <View className="mb-2">
            <Text className="text-xs font-bold uppercase tracking-wider text-[#71717a] dark:text-zinc-400 mb-1.5 ml-1">
              Nome Completo
            </Text>
            <View className="flex-row items-center bg-[#f8f9fa] dark:bg-zinc-900 rounded-2xl px-4 py-3.5 border border-[#e2dfe1] dark:border-zinc-800">
              <User size={20} color={isDark ? '#59C83A' : '#414755'} />
              <TextInput
                className="flex-1 ml-3 text-[#1b1b1d] dark:text-white text-base font-medium"
                placeholder="Seu nome completo"
                placeholderTextColor={isDark ? '#71717a' : '#a09da1'}
                value={fullName}
                onChangeText={setFullName}
              />
            </View>
          </View>

          {/* Campo E-mail */}
          <View className="mb-2">
            <Text className="text-xs font-bold uppercase tracking-wider text-[#71717a] dark:text-zinc-400 mb-1.5 ml-1">
              E-mail
            </Text>
            <View className="flex-row items-center bg-[#f8f9fa] dark:bg-zinc-900 rounded-2xl px-4 py-3.5 border border-[#e2dfe1] dark:border-zinc-800">
              <Mail size={20} color={isDark ? '#59C83A' : '#414755'} />
              <TextInput
                className="flex-1 ml-3 text-[#1b1b1d] dark:text-white text-base font-medium"
                placeholder="seu@email.com"
                placeholderTextColor={isDark ? '#71717a' : '#a09da1'}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
          </View>

          {/* Campo Senha com Alternância de Visibilidade */}
          <View className="mb-2">
            <Text className="text-xs font-bold uppercase tracking-wider text-[#71717a] dark:text-zinc-400 mb-1.5 ml-1">
              Senha
            </Text>
            <View className="flex-row items-center bg-[#f8f9fa] dark:bg-zinc-900 rounded-2xl px-4 py-3.5 border border-[#e2dfe1] dark:border-zinc-800">
              <Lock size={20} color={isDark ? '#59C83A' : '#414755'} />
              <TextInput
                className="flex-1 ml-3 text-[#1b1b1d] dark:text-white text-base font-medium"
                placeholder="••••••••"
                placeholderTextColor={isDark ? '#71717a' : '#a09da1'}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                {showPassword ? (
                  <EyeOff size={20} color={isDark ? '#59C83A' : '#414755'} />
                ) : (
                  <Eye size={20} color={isDark ? '#59C83A' : '#414755'} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Botão Cadastrar */}
          <TouchableOpacity
            onPress={handleRegister}
            disabled={loading}
            style={{ backgroundColor: '#59C83A' }}
            className="py-4 rounded-2xl items-center mt-4 shadow-md active:opacity-90"
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-white font-extrabold text-lg tracking-wide">
                Cadastrar
              </Text>
            )}
          </TouchableOpacity>

          {/* Link para Voltar ao Login */}
          <TouchableOpacity
            onPress={() => router.replace('/(auth)/login')}
            className="items-center py-4 mt-2"
          >
            <Text className="text-sm text-[#71717a] dark:text-zinc-400">
              Já possui uma conta?{' '}
              <Text style={{ color: '#59C83A' }} className="font-bold">
                Faça Login
              </Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}