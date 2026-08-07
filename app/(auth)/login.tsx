import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert('Erro', 'Preencha todos os campos.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      Alert.alert('Erro ao entrar', error.message);
    } else {
      router.replace('/');
    }
  }

  return (
    <View className="flex-1 bg-background justify-center p-6">
      <View className="mb-8">
        <Text className="text-3xl font-bold text-primary mb-2">Treino Pesado</Text>
        <Text className="text-gray-600 text-base">Entre para acompanhar sua evolução.</Text>
      </View>

      <View className="space-y-4 mb-6">
        <View>
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
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-white font-bold text-lg">Entrar</Text>
        )}
      </TouchableOpacity>

      <View className="flex-row justify-center mt-6">
        <Text className="text-gray-600">Ainda não tem conta? </Text>
        <Link href="/(auth)/register" className="text-primary font-bold">
          Cadastre-se
        </Link>
      </View>
    </View>
  );
}