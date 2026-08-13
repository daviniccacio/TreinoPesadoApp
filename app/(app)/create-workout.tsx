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
  useColorScheme,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Plus,
  PlusCircle,
  Trash2,
  Dumbbell,
  XCircle,
  Search,
} from 'lucide-react-native';
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

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

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

      const {
        data: { user },
      } = await supabase.auth.getUser();
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
    <View className="flex-1 bg-white dark:bg-zinc-950" style={{ paddingTop: insets.top }}>
      {/* Cabeçalho */}
      <View className="flex-row items-center justify-between px-5 py-3 border-b border-[#f0edef] dark:border-zinc-800">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-[#f0edef] dark:bg-zinc-900 items-center justify-center border border-transparent dark:border-zinc-800"
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color={isDark ? '#ffffff' : '#1b1b1d'} />
        </TouchableOpacity>

        <Text className="text-lg font-bold text-[#1b1b1d] dark:text-white">
          Montar Meu Treino
        </Text>

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
          <Text className="text-sm font-bold text-[#1b1b1d] dark:text-white mb-2">
            Nome do Treino
          </Text>
          <TextInput
            className="bg-[#f0edef] dark:bg-zinc-900 px-4 py-3 rounded-2xl text-[#1b1b1d] dark:text-white font-medium text-base border border-[#e2dfe1] dark:border-zinc-800"
            placeholder="Ex: Treino A - Peito e Tríceps"
            placeholderTextColor={isDark ? '#71717a' : '#a09da1'}
            value={workoutTitle}
            onChangeText={setWorkoutTitle}
          />
        </View>

        {/* Exercícios Selecionados */}
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-lg font-bold text-[#1b1b1d] dark:text-white">
            Exercícios ({selectedExercises.length})
          </Text>
          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            className="flex-row items-center bg-[#eef2ff] dark:bg-sky-950/40 px-3 py-1.5 rounded-full border border-[#dbeaff] dark:border-sky-900/50"
          >
            <PlusCircle size={16} color={isDark ? '#38bdf8' : '#0058bc'} />
            <Text className="text-xs text-[#0058bc] dark:text-sky-400 font-bold ml-1.5">
              Adicionar
            </Text>
          </TouchableOpacity>
        </View>

        {selectedExercises.length === 0 ? (
          <View className="bg-[#f8f9fa] dark:bg-zinc-900 p-8 rounded-2xl border border-dashed border-[#e2dfe1] dark:border-zinc-800 items-center my-4">
            <Dumbbell size={36} color="#808591" />
            <Text className="text-[#414755] dark:text-zinc-400 font-medium mt-2 text-center text-sm">
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
              className="bg-[#f0edef] dark:bg-zinc-900 p-4 rounded-2xl mb-3 border border-[#e2dfe1] dark:border-zinc-800"
            >
              <View className="flex-row justify-between items-center mb-2">
                <Text className="font-bold text-[#1b1b1d] dark:text-white text-base flex-1 mr-2">
                  {index + 1}. {item.name}
                </Text>
                <TouchableOpacity onPress={() => handleRemoveExercise(item.id)}>
                  <Trash2 size={20} color="#e11d48" />
                </TouchableOpacity>
              </View>

              <View className="flex-row justify-between mt-2 gap-2">
                <View className="flex-1 bg-white dark:bg-zinc-800 p-2 rounded-xl border border-[#e2dfe1] dark:border-zinc-700">
                  <Text className="text-[10px] text-[#414755] dark:text-zinc-400 font-bold">
                    SÉRIES
                  </Text>
                  <TextInput
                    className="font-bold text-[#0058bc] dark:text-sky-400 text-sm p-0 mt-0.5"
                    keyboardType="numeric"
                    value={String(item.sets)}
                    onChangeText={(v) => handleUpdateExerciseField(item.id, 'sets', v)}
                  />
                </View>

                <View className="flex-1 bg-white dark:bg-zinc-800 p-2 rounded-xl border border-[#e2dfe1] dark:border-zinc-700">
                  <Text className="text-[10px] text-[#414755] dark:text-zinc-400 font-bold">
                    REPS
                  </Text>
                  <TextInput
                    className="font-bold text-[#0058bc] dark:text-sky-400 text-sm p-0 mt-0.5"
                    value={item.reps}
                    onChangeText={(v) => handleUpdateExerciseField(item.id, 'reps', v)}
                  />
                </View>

                <View className="flex-1 bg-white dark:bg-zinc-800 p-2 rounded-xl border border-[#e2dfe1] dark:border-zinc-700">
                  <Text className="text-[10px] text-[#414755] dark:text-zinc-400 font-bold">
                    CARGA
                  </Text>
                  <TextInput
                    className="font-bold text-[#0058bc] dark:text-sky-400 text-sm p-0 mt-0.5"
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
          <View className="bg-white dark:bg-zinc-900 rounded-t-3xl h-[80%] p-5 border-t border-[#e2dfe1] dark:border-zinc-800">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold text-[#1b1b1d] dark:text-white">
                Selecionar Exercício
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <XCircle size={26} color={isDark ? '#a1a1aa' : '#414755'} />
              </TouchableOpacity>
            </View>

            <View className="bg-[#f0edef] dark:bg-zinc-800 flex-row items-center px-4 py-2.5 rounded-2xl mb-4 border border-[#e2dfe1] dark:border-zinc-700">
              <Search size={18} color={isDark ? '#a1a1aa' : '#414755'} />
              <TextInput
                className="flex-1 ml-2 text-[#1b1b1d] dark:text-white text-sm"
                placeholder="Buscar por nome ou grupo..."
                placeholderTextColor={isDark ? '#71717a' : '#a09da1'}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
              />
            </View>

            <FlatList
              data={filteredExercises}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => handleSelectExercise(item)}
                  className="p-3 border-b border-[#f0edef] dark:border-zinc-800 flex-row justify-between items-center"
                >
                  <View>
                    <Text className="font-bold text-[#1b1b1d] dark:text-white">
                      {item.name}
                    </Text>
                    <Text className="text-xs text-[#0058bc] dark:text-sky-400 uppercase font-bold">
                      {item.category_id}
                    </Text>
                  </View>
                  <Plus size={22} color={isDark ? '#38bdf8' : '#0058bc'} />
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}