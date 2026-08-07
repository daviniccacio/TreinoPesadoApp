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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

export default function AuthScreen() {
  const insets = useSafeAreaInsets();

  // Estados do formulário
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [birthDate, setBirthDate] = useState<string>('');

  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Formata a data automaticamente no padrão DD/MM/AAAA
  function handleBirthDateChange(text: string) {
    const cleaned = text.replace(/\D/g, '');
    let formatted = cleaned;

    if (cleaned.length > 2 && cleaned.length <= 4) {
      formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    } else if (cleaned.length > 4) {
      formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`;
    }

    setBirthDate(formatted);
  }

  // Processa o Login ou o Cadastro
  async function handleAuth() {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Campos obrigatórios', 'Por favor, preencha o e-mail e a senha.');
      return;
    }

    if (isSignUp) {
      if (!firstName.trim() || !lastName.trim() || !birthDate.trim()) {
        Alert.alert('Campos obrigatórios', 'Por favor, preencha nome, sobrenome e data de nascimento.');
        return;
      }
    }

    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password,
          options: {
            data: {
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              birth_date: birthDate.trim(),
            },
          },
        });

        if (error) {
          Alert.alert('Erro ao cadastrar', error.message);
        } else {
          Alert.alert(
            'Sucesso!',
            'Conta criada com sucesso! Caso a confirmação de e-mail esteja ativa, verifique sua caixa de entrada.'
          );
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });

        if (error) {
          Alert.alert('Erro ao entrar', 'E-mail ou senha incorretos.');
        }
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
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center', // Alinhamento centralizado correto para ScrollView
        }}
        className="bg-white px-6"
        style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
      >
        {/* Cabeçalho Visual */}
        <View className="items-center mb-6 mt-4">
          <View className="w-20 h-20 bg-[#0058bc] rounded-3xl items-center justify-center mb-4">
            <Ionicons name="barbell" size={40} color="#ffffff" />
          </View>
          <Text className="text-3xl font-extrabold text-[#1b1b1d]">
            Treino Pesado
          </Text>
          <Text className="text-sm text-[#414755] mt-1 text-center">
            {isSignUp
              ? 'Crie sua conta para acompanhar seus treinos'
              : 'Entre para continuar a sua evolução'}
          </Text>
        </View>

        {/* Formulário */}
        <View className="space-y-3">
          {isSignUp && (
            <>
              {/* Nome e Sobrenome */}
              <View className="flex-row justify-between">
                <View className="w-[48%]">
                  <Text className="text-sm font-semibold text-[#1b1b1d] mb-1">
                    Nome
                  </Text>
                  <View className="flex-row items-center bg-[#f0edef] rounded-2xl px-3 py-3">
                    <TextInput
                      className="flex-1 text-[#1b1b1d] text-base"
                      placeholder="Seu nome"
                      placeholderTextColor="#a09da1"
                      value={firstName}
                      onChangeText={setFirstName}
                    />
                  </View>
                </View>

                <View className="w-[48%]">
                  <Text className="text-sm font-semibold text-[#1b1b1d] mb-1">
                    Sobrenome
                  </Text>
                  <View className="flex-row items-center bg-[#f0edef] rounded-2xl px-3 py-3">
                    <TextInput
                      className="flex-1 text-[#1b1b1d] text-base"
                      placeholder="Sobrenome"
                      placeholderTextColor="#a09da1"
                      value={lastName}
                      onChangeText={setLastName}
                    />
                  </View>
                </View>
              </View>

              {/* Data de Nascimento */}
              <View className="mt-3">
                <Text className="text-sm font-semibold text-[#1b1b1d] mb-1">
                  Data de Nascimento
                </Text>
                <View className="flex-row items-center bg-[#f0edef] rounded-2xl px-4 py-3">
                  <Ionicons name="calendar-outline" size={20} color="#414755" />
                  <TextInput
                    className="flex-1 ml-3 text-[#1b1b1d] text-base"
                    placeholder="DD/MM/AAAA"
                    placeholderTextColor="#a09da1"
                    value={birthDate}
                    onChangeText={handleBirthDateChange}
                    keyboardType="numeric"
                    maxLength={10}
                  />
                </View>
              </View>
            </>
          )}

          {/* E-mail */}
          <View className="mt-3">
            <Text className="text-sm font-semibold text-[#1b1b1d] mb-1">
              E-mail
            </Text>
            <View className="flex-row items-center bg-[#f0edef] rounded-2xl px-4 py-3">
              <Ionicons name="mail-outline" size={20} color="#414755" />
              <TextInput
                className="flex-1 ml-3 text-[#1b1b1d] text-base"
                placeholder="seu.email@exemplo.com"
                placeholderTextColor="#a09da1"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Senha */}
          <View className="mt-3">
            <Text className="text-sm font-semibold text-[#1b1b1d] mb-1">
              Senha
            </Text>
            <View className="flex-row items-center bg-[#f0edef] rounded-2xl px-4 py-3">
              <Ionicons name="lock-closed-outline" size={20} color="#414755" />
              <TextInput
                className="flex-1 ml-3 text-[#1b1b1d] text-base"
                placeholder="Sua senha secreta"
                placeholderTextColor="#a09da1"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#414755"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Botão de Envio */}
          <TouchableOpacity
            onPress={handleAuth}
            disabled={loading}
            className="bg-[#0058bc] py-4 rounded-2xl items-center mt-6"
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-white font-bold text-lg">
                {isSignUp ? 'Criar Conta' : 'Entrar'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Alternar modo */}
          <TouchableOpacity
            onPress={() => setIsSignUp(!isSignUp)}
            className="items-center py-3 mt-2 mb-4"
          >
            <Text className="text-[#0058bc] font-semibold text-sm">
              {isSignUp
                ? 'Já possui uma conta? Faça login'
                : 'Não tem uma conta? Cadastre-se'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}