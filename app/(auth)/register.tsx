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
import { EnvelopeSimple, LockSimple, User, Eye, EyeSlash } from 'phosphor-react-native';
import { z } from 'zod';
import { supabase } from '../../lib/supabase';

// Schema de validação estrita com Zod
const registerSchema = z.object({
  name: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres.'),
  email: z.string().email('Digite um e-mail válido.'),
  password: z
    .string()
    .min(8, 'A senha deve ter pelo menos 8 caracteres.')
    .regex(/[A-Z]/, 'A senha deve conter pelo menos uma letra maiúscula.')
    .regex(/[0-9]/, 'A senha deve conter pelo menos um número.')
    .regex(/[^a-zA-Z0-9]/, 'A senha deve conter pelo menos um caractere especial (!@#$%^&*).'),
  role: z.enum(['aluno', 'personal']),
});

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'aluno' | 'personal'>('aluno');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleRegister() {
    // 1. Validação client-side com Zod
    const validationResult = registerSchema.safeParse({
      name: name.trim(),
      email: email.trim(),
      password,
      role,
    });

    if (!validationResult.success) {
      // CORREÇÃO AQUI: alterado de .errors para .issues
      const firstError = validationResult.error.issues[0].message;
      Alert.alert('Dados inválidos', firstError);
      return;
    }

    setLoading(true);

    try {
      // 2. Criação do usuário no Supabase
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            name: name.trim(),
            role: role,
          },
        },
      });

      if (error) {
        Alert.alert('Erro no cadastro', error.message || 'Não foi possível criar a conta.');
      } else {
        Alert.alert('Conta criada! 🎉', 'Seu cadastro foi realizado com sucesso.', [
          {
            text: 'Ir para o Login',
            onPress: () => router.replace('/(auth)/login'),
          },
        ]);
      }
    } catch (err) {
      Alert.alert('Erro', 'Ocorreu um erro inesperado ao realizar o cadastro.');
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
        <View className="mb-6">
          <Text className="text-2xl font-black text-[#1b1b1d] dark:text-white mb-1">
            Criar Conta
          </Text>
          <Text className="text-xs text-[#71717a] dark:text-zinc-400 font-medium">
            Preencha os campos abaixo para iniciar sua jornada
          </Text>
        </View>

        {/* Seleção de Tipo de Conta */}
        <View className="flex-row gap-3 mb-5">
          <TouchableOpacity
            onPress={() => setRole('aluno')}
            className={`flex-1 py-3 rounded-2xl items-center border ${
              role === 'aluno'
                ? 'bg-[#59C83A]/10 border-[#59C83A]'
                : 'bg-[#f8f9fa] dark:bg-zinc-900 border-[#e2dfe1] dark:border-zinc-800'
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                role === 'aluno' ? 'text-[#59C83A]' : 'text-[#71717a] dark:text-zinc-400'
              }`}
            >
              Sou Aluno
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setRole('personal')}
            className={`flex-1 py-3 rounded-2xl items-center border ${
              role === 'personal'
                ? 'bg-[#59C83A]/10 border-[#59C83A]'
                : 'bg-[#f8f9fa] dark:bg-zinc-900 border-[#e2dfe1] dark:border-zinc-800'
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                role === 'personal' ? 'text-[#59C83A]' : 'text-[#71717a] dark:text-zinc-400'
              }`}
            >
              Sou Personal
            </Text>
          </TouchableOpacity>
        </View>

        {/* Campo Nome */}
        <View className="mb-4">
          <Text className="text-xs font-bold uppercase tracking-wider text-[#71717a] dark:text-zinc-400 mb-2 ml-1">
            Nome Completo
          </Text>
          <View className="flex-row items-center bg-[#f8f9fa] dark:bg-zinc-900 rounded-2xl px-4 py-3.5 border border-[#e2dfe1] dark:border-zinc-800">
            <User size={20} color={isDark ? '#59C83A' : '#414755'} />
            <TextInput
              className="flex-1 ml-3 text-[#1b1b1d] dark:text-white text-base font-medium"
              placeholder="Seu nome"
              placeholderTextColor={isDark ? '#71717a' : '#a09da1'}
              value={name}
              onChangeText={setName}
            />
          </View>
        </View>

        {/* Campo E-mail */}
        <View className="mb-4">
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
        <View className="mb-6">
          <Text className="text-xs font-bold uppercase tracking-wider text-[#71717a] dark:text-zinc-400 mb-2 ml-1">
            Senha
          </Text>
          <View className="flex-row items-center bg-[#f8f9fa] dark:bg-zinc-900 rounded-2xl px-4 py-3.5 border border-[#e2dfe1] dark:border-zinc-800">
            <LockSimple size={20} color={isDark ? '#59C83A' : '#414755'} />
            <TextInput
              className="flex-1 ml-3 text-[#1b1b1d] dark:text-white text-base font-medium"
              placeholder="Mín. 8 caracteres, 1 maiúscula, 1 num e 1 especial"
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

        {/* Botão de Cadastro */}
        <TouchableOpacity
          onPress={handleRegister}
          disabled={loading}
          style={{ backgroundColor: '#59C83A' }}
          className="py-4 rounded-2xl items-center shadow-md active:opacity-90"
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="text-white font-extrabold text-lg tracking-wide">
              Cadastrar
            </Text>
          )}
        </TouchableOpacity>

        {/* Retorno para Login */}
        <TouchableOpacity
          onPress={() => router.replace('/(auth)/login')}
          className="items-center py-4 mt-3"
        >
          <Text className="text-sm text-[#71717a] dark:text-zinc-400">
            Já possui uma conta?{' '}
            <Text style={{ color: '#59C83A' }} className="font-bold">
              Faça Login
            </Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}