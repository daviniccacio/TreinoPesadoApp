import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

interface BaseExercise {
  id: string;
  name: string;
  category_id: string;
}

interface SelectedExercise extends BaseExercise {
  sets: number;
  reps: string;
  weight: string;
}

export default function CreateWorkoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [workoutTitle, setWorkoutTitle] = useState<string>('');
  const [availableExercises, setAvailableExercises] = useState<BaseExercise[]>([]);
  const [selectedExercises, setSelectedExercises] = useState<SelectedExercise[]>([]);
  
  const [loading, setLoading] = useState<boolean>(false);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    fetchAvailableExercises();
  }, []);

  async function fetchAvailableExercises() {
    try {
      const { data, error } = await supabase
        .from('exercises')
        .select('id, name, category_id')
        .order('name', { ascending: true });

      if (!error && data) {
        setAvailableExercises(data);
      }
    } catch (err) {
      console.error('Erro ao carregar exercícios:', err);
    }
  }

  function handleSelectExercise(exercise: BaseExercise) {
    const alreadySelected = selectedExercises.some((e) => e.id === exercise.id);
    if (alreadySelected) {
      Alert.alert('Aviso', 'Este exercício já foi adicionado ao seu treino.');
      return;
    }

    setSelectedExercises((prev) => [
      ...prev,
      { ...exercise, sets: 3, reps: '10-12', weight: '0 kg' },
    ]);
    setModalVisible(false);
  }

  function handleRemoveExercise(id: string) {
    setSelectedExercises((prev) => prev.filter((e) => e.id !== id));
  }

  function handleUpdateExerciseField(
    id: string,
    field: 'sets' | 'reps' | 'weight',
    value: any
  ) {
    setSelectedExercises((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  }

  async function handleSaveWorkout() {
    if (!workoutTitle.trim()) {
      Alert.alert('Atenção', 'Por favor, digite um nome para o seu treino.');
      return;
    }

    if (selectedExercises.length === 0) {
      Alert.alert('Atenção', 'Adicione pelo menos um exercício ao seu treino.');
      return;
    }

    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado.');

      const { data: workoutData, error: workoutError } = await supabase
        .from('custom_workouts')
        .insert([{ user_id: user.id, title: workoutTitle.trim() }])
        .select()
        .single();

      if (workoutError) throw workoutError;

      const workoutExercisesPayload = selectedExercises.map((ex) => ({
        custom_workout_id: workoutData.id,
        exercise_id: ex.id,
        sets: Number(ex.sets),
        reps: ex.reps,
        weight: ex.weight,
      }));

      const { error: itemsError } = await supabase
        .from('custom_workout_exercises')
        .insert(workoutExercisesPayload);

      if (itemsError) throw itemsError;

      Alert.alert('Sucesso! 🎉', 'Seu treino customizado foi criado!');
      router.back();
    } catch (err: any) {
      console.error('Erro ao salvar treino:', err);
      Alert.alert('Erro', 'Não foi possível salvar o seu treino.');
    } finally {
      setLoading(false);
    }
  }

  const filteredExercises = availableExercises.filter(
    (ex) =>
      ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ex.category_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      {/* Cabeçalho */}
      <View className="flex-row items-center justify-between px-5 py-3 border-b border-[#f0edef]">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-[#f0edef] items-center justify-center"
        >
          <Ionicons name="arrow-back" size={20} color="#1b1b1d" />
        </TouchableOpacity>

        <Text className="text-lg font-bold text-[#1b1b1d]">Montar Meu Treino</Text>

        <TouchableOpacity
          onPress={handleSaveWorkout}
          disabled={loading}
          className="bg-[#0058bc] px-4 py-2 rounded-xl"
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
        <View className="mb-6">
          <Text className="text-sm font-bold text-[#1b1b1d] mb-2">
            Nome do Treino
          </Text>
          <TextInput
            className="bg-[#f0edef] px-4 py-3 rounded-2xl text-[#1b1b1d] font-medium text-base"
            placeholder="Ex: Treino A - Peito e Tríceps"
            placeholderTextColor="#a09da1"
            value={workoutTitle}
            onChangeText={setWorkoutTitle}
          />
        </View>

        {/* Exercícios Selecionados */}
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-lg font-bold text-[#1b1b1d]">
            Exercícios ({selectedExercises.length})
          </Text>
          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            className="flex-row items-center bg-[#eef2ff] px-3 py-1.5 rounded-full border border-[#dbeaff]"
          >
            <Ionicons name="add-circle-outline" size={18} color="#0058bc" />
            <Text className="text-xs text-[#0058bc] font-bold ml-1">
              Adicionar
            </Text>
          </TouchableOpacity>
        </View>

        {selectedExercises.length === 0 ? (
          <View className="bg-[#f8f9fa] p-8 rounded-2xl border border-dashed border-[#e2dfe1] items-center my-4">
            <Ionicons name="barbell-outline" size={36} color="#808591" />
            <Text className="text-[#414755] font-medium mt-2 text-center text-sm">
              Nenhum exercício selecionado ainda.
            </Text>
            <TouchableOpacity
              onPress={() => setModalVisible(true)}
              className="mt-3 bg-[#0058bc] px-4 py-2 rounded-xl"
            >
              <Text className="text-white font-bold text-xs">Escolher Exercícios</Text>
            </TouchableOpacity>
          </View>
        ) : (
          selectedExercises.map((item, index) => (
            <View
              key={item.id}
              className="bg-[#f0edef] p-4 rounded-2xl mb-3 border border-[#e2dfe1]"
            >
              <View className="flex-row justify-between items-center mb-2">
                <Text className="font-bold text-[#1b1b1d] text-base flex-1 mr-2">
                  {index + 1}. {item.name}
                </Text>
                <TouchableOpacity onPress={() => handleRemoveExercise(item.id)}>
                  <Ionicons name="trash-outline" size={20} color="#e11d48" />
                </TouchableOpacity>
              </View>

              <View className="flex-row justify-between mt-2 gap-2">
                <View className="flex-1 bg-white p-2 rounded-xl border border-[#e2dfe1]">
                  <Text className="text-[10px] text-[#414755] font-bold">SÉRIES</Text>
                  <TextInput
                    className="font-bold text-[#0058bc] text-sm p-0 mt-0.5"
                    keyboardType="numeric"
                    value={String(item.sets)}
                    onChangeText={(v) => handleUpdateExerciseField(item.id, 'sets', v)}
                  />
                </View>

                <View className="flex-1 bg-white p-2 rounded-xl border border-[#e2dfe1]">
                  <Text className="text-[10px] text-[#414755] font-bold">REPS</Text>
                  <TextInput
                    className="font-bold text-[#0058bc] text-sm p-0 mt-0.5"
                    value={item.reps}
                    onChangeText={(v) => handleUpdateExerciseField(item.id, 'reps', v)}
                  />
                </View>

                <View className="flex-1 bg-white p-2 rounded-xl border border-[#e2dfe1]">
                  <Text className="text-[10px] text-[#414755] font-bold">CARGA</Text>
                  <TextInput
                    className="font-bold text-[#0058bc] text-sm p-0 mt-0.5"
                    value={item.weight}
                    onChangeText={(v) => handleUpdateExerciseField(item.id, 'weight', v)}
                  />
                </View>
              </View>
            </View>
          ))
        )}

        <View className="h-10" />
      </ScrollView>

      {/* Modal de Busca de Exercícios */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl h-[80%] p-5">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold text-[#1b1b1d]">
                Selecionar Exercício
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close-circle" size={28} color="#414755" />
              </TouchableOpacity>
            </View>

            <View className="bg-[#f0edef] flex-row items-center px-4 py-2 rounded-2xl mb-4">
              <Ionicons name="search" size={18} color="#414755" />
              <TextInput
                className="flex-1 ml-2 text-[#1b1b1d]"
                placeholder="Buscar por nome ou grupo..."
                placeholderTextColor="#a09da1"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            <FlatList
              data={filteredExercises}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => handleSelectExercise(item)}
                  className="p-3 border-b border-[#f0edef] flex-row justify-between items-center"
                >
                  <View>
                    <Text className="font-bold text-[#1b1b1d]">{item.name}</Text>
                    <Text className="text-xs text-[#0058bc] uppercase font-bold">
                      {item.category_id}
                    </Text>
                  </View>
                  <Ionicons name="add" size={22} color="#0058bc" />
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}