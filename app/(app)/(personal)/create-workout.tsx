import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  useColorScheme,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'phosphor-react-native';
import { supabase } from '../../../lib/supabase';

const DAYS_OF_WEEK = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

export default function CreateWorkoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [title, setTitle] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState('Segunda');
  const [targetArea, setTargetArea] = useState('');
  const [objective, setObjective] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSaveWorkout() {
    if (!title.trim()) {
      Alert.alert('Atenção', 'Por favor, digite o nome do treino.');
      return;
    }

    try {
      setLoading(true);

      // Obtém ID do Personal logado
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase.from('workout_templates').insert([
        {
          personal_id: user?.id,
          title: title.trim(),
          day_of_week: dayOfWeek,
          target_area: targetArea.trim() || null,
          objective: objective.trim() || null,
          description: description.trim() || null,
        },
      ]);

      if (error) throw error;

      Alert.alert('Sucesso! 🎉', 'Modelo de treino salvo na sua biblioteca.');
      router.back();
    } catch (err: any) {
      console.error('Erro ao criar treino:', err);
      Alert.alert('Erro', 'Não foi possível salvar o treino.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="flex-1 bg-white dark:bg-zinc-950" style={{ paddingTop: insets.top }}>
      {/* Cabeçalho */}
      <View className="flex-row items-center justify-between px-5 py-3 border-b border-[#f0edef] dark:border-zinc-800">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-[#f8f9fa] dark:bg-zinc-900 items-center justify-center border border-[#e2dfe1] dark:border-zinc-800"
        >
          <ArrowLeft size={20} color={isDark ? '#59C83A' : '#1b1b1d'} />
        </TouchableOpacity>

        <Text className="text-lg font-bold text-[#1b1b1d] dark:text-white">
          Criar Novo Treino
        </Text>

        <TouchableOpacity
          onPress={handleSaveWorkout}
          disabled={loading}
          style={{ backgroundColor: '#59C83A' }}
          className="px-4 py-2 rounded-xl flex-row items-center"
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text className="text-white font-bold text-sm">Salvar</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-5 pt-4" showsVerticalScrollIndicator={false}>
        {/* Nome do Treino */}
        <View className="mb-4">
          <Text className="text-xs font-bold uppercase text-[#71717a] dark:text-zinc-400 mb-1.5">
            Nome do Treino *
          </Text>
          <TextInput
            className="bg-[#f8f9fa] dark:bg-zinc-900 px-4 py-3 rounded-2xl text-[#1b1b1d] dark:text-white font-medium border border-[#e2dfe1] dark:border-zinc-800"
            placeholder="Ex: Treino A - Superior"
            placeholderTextColor={isDark ? '#71717a' : '#a09da1'}
            value={title}
            onChangeText={setTitle}
          />
        </View>

        {/* Dia da Semana */}
        <View className="mb-4">
          <Text className="text-xs font-bold uppercase text-[#71717a] dark:text-zinc-400 mb-1.5">
            Dia da Semana Sugerido
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
            {DAYS_OF_WEEK.map((day) => (
              <TouchableOpacity
                key={day}
                onPress={() => setDayOfWeek(day)}
                style={dayOfWeek === day ? { backgroundColor: '#59C83A' } : undefined}
                className={`px-4 py-2 rounded-xl mr-2 border ${
                  dayOfWeek === day
                    ? 'border-[#59C83A]'
                    : 'bg-[#f8f9fa] dark:bg-zinc-900 border-[#e2dfe1] dark:border-zinc-800'
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    dayOfWeek === day ? 'text-white' : 'text-[#414755] dark:text-zinc-400'
                  }`}
                >
                  {day}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* O que trabalha */}
        <View className="mb-4">
          <Text className="text-xs font-bold uppercase text-[#71717a] dark:text-zinc-400 mb-1.5">
            O que trabalha?
          </Text>
          <TextInput
            className="bg-[#f8f9fa] dark:bg-zinc-900 px-4 py-3 rounded-2xl text-[#1b1b1d] dark:text-white font-medium border border-[#e2dfe1] dark:border-zinc-800"
            placeholder="Ex: Peito, Tríceps e Ombro"
            placeholderTextColor={isDark ? '#71717a' : '#a09da1'}
            value={targetArea}
            onChangeText={setTargetArea}
          />
        </View>

        {/* Finalidade */}
        <View className="mb-4">
          <Text className="text-xs font-bold uppercase text-[#71717a] dark:text-zinc-400 mb-1.5">
            Finalidade / Objetivo
          </Text>
          <TextInput
            className="bg-[#f8f9fa] dark:bg-zinc-900 px-4 py-3 rounded-2xl text-[#1b1b1d] dark:text-white font-medium border border-[#e2dfe1] dark:border-zinc-800"
            placeholder="Ex: Emagrecimento, Definição, Hipertrofia"
            placeholderTextColor={isDark ? '#71717a' : '#a09da1'}
            value={objective}
            onChangeText={setObjective}
          />
        </View>

        {/* Comentários / Descrição */}
        <View className="mb-8">
          <Text className="text-xs font-bold uppercase text-[#71717a] dark:text-zinc-400 mb-1.5">
            Comentários e Descrição
          </Text>
          <TextInput
            className="bg-[#f8f9fa] dark:bg-zinc-900 px-4 py-3 rounded-2xl text-[#1b1b1d] dark:text-white font-medium border border-[#e2dfe1] dark:border-zinc-800 min-h-[100px]"
            placeholder="Ex: Fazer intervalo de 45 segundos entre as séries. Focar na cadência de movimento."
            placeholderTextColor={isDark ? '#71717a' : '#a09da1'}
            value={description}
            onChangeText={setDescription}
            multiline
            textAlignVertical="top"
          />
        </View>
      </ScrollView>
    </View>
  );
}