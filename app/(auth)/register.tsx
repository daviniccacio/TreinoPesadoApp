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
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { User, Mail, Lock, Dumbbell, ArrowLeft } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  /**
   * Processa o cadastro de novo usuário no Supabase
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
        // Tenta registrar o perfil do usuário na tabela pública se configurada
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
        className="bg-white dark:bg-zinc-950 px-6"
        style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {/* Botão de Voltar para Login */}
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-[#f0edef] dark:bg-zinc-900 items-center justify-center border border-transparent dark:border-zinc-800 mb-4"
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color={isDark ? '#ffffff' : '#1b1b1d'} />
        </TouchableOpacity>

        {/* Cabeçalho Visual */}
        <View className="items-center mb-6">
          <View className="w-16 h-16 bg-[#0058bc] rounded-2xl items-center justify-center mb-3 border border-[#004bb0]">
            <Dumbbell size={32} color="#ffffff" />
          </View>
          <Text className="text-3xl font-bold text-[#1b1b1d] dark:text-white">
            Criar Conta
          </Text>
          <Text className="text-sm text-[#414755] dark:text-zinc-400 mt-1 text-center font-medium">
            Comece sua jornada de treinos hoje.
          </Text>
        </View>

        {/* Formulário */}
        <View className="space-y-3">
          {/* Campo Nome Completo */}
          <View>
            <Text className="text-sm font-semibold text-[#1b1b1d] dark:text-white mb-1.5">
              Nome Completo
            </Text>
            <View className="flex-row items-center bg-[#f0edef] dark:bg-zinc-900 rounded-2xl px-4 py-3.5 border border-[#e2dfe1] dark:border-zinc-800">
              <User size={20} color={isDark ? '#a1a1aa' : '#414755'} />
              <TextInput
                className="flex-1 ml-3 text-[#1b1b1d] dark:text-white text-base"
                placeholder="Seu nome completo"
                placeholderTextColor={isDark ? '#71717a' : '#a09da1'}
                value={fullName}
                onChangeText={setFullName}
              />
            </View>
          </View>

          {/* Campo E-mail */}
          <View className="mt-3">
            <Text className="text-sm font-semibold text-[#1b1b1d] dark:text-white mb-1.5">
              E-mail
            </Text>
            <View className="flex-row items-center bg-[#f0edef] dark:bg-zinc-900 rounded-2xl px-4 py-3.5 border border-[#e2dfe1] dark:border-zinc-800">
              <Mail size={20} color={isDark ? '#a1a1aa' : '#414755'} />
              <TextInput
                className="flex-1 ml-3 text-[#1b1b1d] dark:text-white text-base"
                placeholder="seu@email.com"
                placeholderTextColor={isDark ? '#71717a' : '#a09da1'}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
          </View>

          {/* Campo Senha */}
          <View className="mt-3">
            <Text className="text-sm font-semibold text-[#1b1b1d] dark:text-white mb-1.5">
              Senha
            </Text>
            <View className="flex-row items-center bg-[#f0edef] dark:bg-zinc-900 rounded-2xl px-4 py-3.5 border border-[#e2dfe1] dark:border-zinc-800">
              <Lock size={20} color={isDark ? '#a1a1aa' : '#414755'} />
              <TextInput
                className="flex-1 ml-3 text-[#1b1b1d] dark:text-white text-base"
                placeholder="••••••••"
                placeholderTextColor={isDark ? '#71717a' : '#a09da1'}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>
          </View>

          {/* Botão Cadastrar */}
          <TouchableOpacity
            className="bg-[#0058bc] py-4 rounded-2xl items-center mt-6 border border-[#004bb0]"
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-white font-bold text-lg">Cadastrar</Text>
            )}
          </TouchableOpacity>

          {/* Alternar para Login */}
          <TouchableOpacity
            onPress={() => router.replace('/(auth)/login')}
            className="items-center py-3 mt-2 mb-4"
          >
            <Text className="text-[#414755] dark:text-zinc-400 font-medium text-sm">
              Já possui uma conta?{' '}
              <Text className="text-[#0058bc] dark:text-sky-400 font-bold">
                Faça Login
              </Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}