import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function RegisterScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleRegister() {
    if (!email || !password || !fullName) {
      Alert.alert('Erro', 'Preencha todos os campos.');
      return;
    }

    setLoading(true);

    const { data: { user }, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      Alert.alert('Erro no cadastro', error.message);
      setLoading(false);
      return;
    }

    if (user) {
      // Salva o nome na tabela public.profiles
      const { error: profileError } = await supabase.from('profiles').insert([
        { id: user.id, full_name: fullName }
      ]);

      setLoading(false);

      if (profileError) {
        Alert.alert('Aviso', 'Conta criada, mas houve um erro ao salvar o perfil.');
      } else {
        Alert.alert('Sucesso', 'Conta criada com sucesso!');
        router.replace('/(auth)/login');
      }
    }
  }

  return (
    <View className="flex-1 bg-background justify-center p-6">
      <View className="mb-8">
        <Text className="text-3xl font-bold text-primary mb-2">Criar Conta</Text>
        <Text className="text-gray-600 text-base">Comece sua jornada de treinos hoje.</Text>
      </View>

      <View className="space-y-4 mb-6">
        <View>
          <Text className="text-gray-700 font-medium mb-1">Nome Completo</Text>
          <TextInput
            className="bg-surface border border-gray-200 rounded-lg p-3 text-base"
            placeholder="Seu nome"
            value={fullName}
            onChangeText={setFullName}
          />
        </View>

        <View className="mt-3">
          <Text className="text-gray-700 font-medium mb-1">E-mail</Text>
          <TextInput
            className="bg-surface border border-gray-200 rounded-lg p-3 text-base"
            placeholder="seu@email.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View className="mt-3">
          <Text className="text-gray-700 font-medium mb-1">Senha</Text>
          <TextInput
            className="bg-surface border border-gray-200 rounded-lg p-3 text-base"
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>
      </View>

      <TouchableOpacity
        className="bg-primary p-4 rounded-lg items-center shadow-sm"
        onPress={handleRegister}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-white font-bold text-lg">Cadastrar</Text>
        )}
      </TouchableOpacity>

      <View className="flex-row justify-center mt-6">
        <Text className="text-gray-600">Já possui uma conta? </Text>
        <Link href="/(auth)/login" className="text-primary font-bold">
          Faça Login
        </Link>
      </View>
    </View>
  );
}