import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Plus,
  CaretRight,
  Barbell,
  CalendarBlank,
  UserCheck,
  User,
  Sparkle,
} from 'phosphor-react-native';
import { supabase } from '../../../lib/supabase';

/**
 * Interface Unificada para exibir treinos de ambas as origens
 */
interface UnifiedWorkout {
  id: string;
  title: string;
  description?: string | null;
  dayOfWeekList: string[]; // Lista normalizada em minúsculas (ex: ['segunda', 'quarta'])
  displayDays: string; // Texto formatado para exibição
  exerciseCount: number;
  origin: 'personal' | 'student';
  createdAt: string;
}

const DAYS_FILTER = [
  { id: 'todos', label: 'Todos os Dias' },
  { id: 'segunda', label: 'Seg' },
  { id: 'terca', label: 'Ter' },
  { id: 'quarta', label: 'Qua' },
  { id: 'quinta', label: 'Qui' },
  { id: 'sexta', label: 'Sex' },
  { id: 'sabado', label: 'Sáb' },
  { id: 'domingo', label: 'Dom' },
];

const CATEGORY_FILTER = [
  { id: 'todos', label: 'Todos' },
  { id: 'personal', label: 'Do Personal' },
  { id: 'student', label: 'Criados por Mim' },
];

export default function MyWorkoutsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [workouts, setWorkouts] = useState<UnifiedWorkout[]>([]);
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>('todos');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('todos');
  const [loading, setLoading] = useState<boolean>(true);

  // Recarrega os treinos sempre que a tela entra em foco
  useFocusEffect(
    useCallback(() => {
      fetchAllWorkouts();
    }, [])
  );

  /**
   * Remove acentos e converte texto para minúsculas (ex: "Sábado" -> "sabado")
   */
  function normalizeText(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  /**
   * Busca simultaneamente os treinos criados pelo aluno e os prescritos pelo personal
   */
  async function fetchAllWorkouts() {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      // 1. Consulta os treinos criados pelo próprio aluno
      const { data: studentData, error: studentError } = await supabase
        .from('custom_workouts')
        .select(`
          id,
          title,
          day_of_week,
          created_at,
          custom_workout_exercises (id)
        `)
        .eq('user_id', user.id);

      if (studentError) {
        console.error('Erro ao buscar treinos do aluno:', studentError.message);
      }

      // 2. Consulta os treinos prescritos pelo Personal Trainer
      const { data: personalData, error: personalError } = await supabase
        .from('workout_plans')
        .select(`
          id,
          name,
          description,
          days_of_week,
          created_at,
          plan_exercises (id)
        `)
        .eq('student_id', user.id);

      if (personalError) {
        console.error('Erro ao buscar treinos do personal:', personalError.message);
      }

      // 3. Normaliza e combina ambas as listas
      const formattedStudentWorkouts: UnifiedWorkout[] = (studentData || []).map((item: any) => {
        const rawDay = item.day_of_week || '';
        const normalized = rawDay ? [normalizeText(rawDay)] : [];

        return {
          id: item.id,
          title: item.title,
          dayOfWeekList: normalized,
          displayDays: rawDay ? rawDay.charAt(0).toUpperCase() + rawDay.slice(1) : 'Geral',
          exerciseCount: item.custom_workout_exercises?.length || 0,
          origin: 'student',
          createdAt: item.created_at,
        };
      });

      const formattedPersonalWorkouts: UnifiedWorkout[] = (personalData || []).map((item: any) => {
        const rawDaysArr: string[] = item.days_of_week || [];
        const normalizedDays = rawDaysArr.map((d) => normalizeText(d));

        return {
          id: item.id,
          title: item.name,
          description: item.description,
          dayOfWeekList: normalizedDays,
          displayDays: rawDaysArr.length > 0 ? rawDaysArr.join(', ') : 'Geral',
          exerciseCount: item.plan_exercises?.length || 0,
          origin: 'personal',
          createdAt: item.created_at,
        };
      });

      // Une as duas listas e ordena pela data de criação mais recente
      const combined = [...formattedPersonalWorkouts, ...formattedStudentWorkouts].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setWorkouts(combined);
    } catch (err) {
      console.error('Erro inesperado ao buscar treinos:', err);
    } finally {
      setLoading(false);
    }
  }

  // Lógica de Filtragem (Por Categoria e Por Dia da Semana)
  const filteredWorkouts = workouts.filter((workout) => {
    // Filtro 1: Categoria (Personal x Aluno)
    if (selectedCategoryFilter !== 'todos' && workout.origin !== selectedCategoryFilter) {
      return false;
    }

    // Filtro 2: Dia da Semana
    if (selectedDayFilter !== 'todos') {
      if (workout.dayOfWeekList.length === 0) return false;
      const matchesDay = workout.dayOfWeekList.some((d) => d.includes(selectedDayFilter));
      if (!matchesDay) return false;
    }

    return true;
  });

  return (
    <View className="flex-1 bg-white dark:bg-zinc-950" style={{ paddingTop: insets.top }}>
      {/* CABEÇALHO */}
      <View className="px-5 py-4 border-b border-[#f0edef] dark:border-zinc-800 flex-row justify-between items-center">
        <View>
          <Text className="text-2xl font-extrabold text-[#1b1b1d] dark:text-white">
            Meus Treinos
          </Text>
          <Text className="text-xs text-[#71717a] dark:text-zinc-400 mt-0.5">
            Suas fichas pessoais e prescrições
          </Text>
        </View>

        <View className="bg-[#59C83A]/10 border border-[#59C83A]/30 px-3 py-1 rounded-full flex-row items-center">
          <Sparkle size={14} color="#59C83A" weight="bold" />
          <Text className="text-xs font-extrabold text-[#59C83A] ml-1">
            {filteredWorkouts.length} {filteredWorkouts.length === 1 ? 'Treino' : 'Treinos'}
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-5 pt-4" showsVerticalScrollIndicator={false}>
        {/* BOTÃO NO TOPO: MONTAR NOVO TREINO (ALUNO) */}
        <TouchableOpacity
          onPress={() => router.push('/create-workout')}
          style={{ backgroundColor: '#59C83A' }}
          className="p-4 rounded-2xl flex-row items-center justify-between mb-5 shadow-sm active:opacity-90"
          activeOpacity={0.8}
        >
          <View className="flex-row items-center gap-3">
            <View className="w-10 h-10 rounded-full bg-white/20 items-center justify-center">
              <Plus size={24} color="#ffffff" weight="bold" />
            </View>
            <View>
              <Text className="text-white font-extrabold text-base">Montar Novo Treino</Text>
              <Text className="text-white/90 text-xs font-medium">Crie sua própria rotina</Text>
            </View>
          </View>
          <CaretRight size={20} color="#ffffff" weight="bold" />
        </TouchableOpacity>

        {/* SELETOR DE CATEGORIA (TODOS / PERSONAL / MEUS TREINOS) */}
        <View className="bg-[#f8f9fa] dark:bg-zinc-900 p-1.5 rounded-2xl border border-[#e2dfe1] dark:border-zinc-800 flex-row mb-4">
          {CATEGORY_FILTER.map((cat) => {
            const isSelected = selectedCategoryFilter === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setSelectedCategoryFilter(cat.id)}
                className={`flex-1 py-2.5 rounded-xl items-center justify-center ${
                  isSelected
                    ? 'bg-white dark:bg-zinc-800 border border-[#e2dfe1] dark:border-zinc-700 shadow-sm'
                    : 'bg-transparent'
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    isSelected ? 'text-[#59C83A]' : 'text-[#71717a] dark:text-zinc-400'
                  }`}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* FILTRO POR DIA DA SEMANA */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-5 flex-row max-h-10"
        >
          {DAYS_FILTER.map((day) => {
            const isSelected = selectedDayFilter === day.id;
            return (
              <TouchableOpacity
                key={day.id}
                onPress={() => setSelectedDayFilter(day.id)}
                style={isSelected ? { backgroundColor: '#59C83A', borderColor: '#59C83A' } : undefined}
                className={`py-2 px-3.5 rounded-xl mr-2 border ${
                  isSelected
                    ? ''
                    : 'bg-[#f8f9fa] dark:bg-zinc-900 border-[#e2dfe1] dark:border-zinc-800'
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    isSelected ? 'text-white' : 'text-[#414755] dark:text-zinc-400'
                  }`}
                >
                  {day.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* LISTA DE TREINOS ENCONTRADOS */}
        <Text className="text-sm font-bold text-[#1b1b1d] dark:text-white mb-3">
          Fichas Disponíveis ({filteredWorkouts.length})
        </Text>

        {loading ? (
          <View className="py-12 items-center">
            <ActivityIndicator size="large" color="#59C83A" />
            <Text className="mt-3 text-[#414755] dark:text-zinc-400 font-medium text-xs">
              Carregando treinos...
            </Text>
          </View>
        ) : filteredWorkouts.length === 0 ? (
          <View className="bg-[#f8f9fa] dark:bg-zinc-900 p-8 rounded-2xl border border-dashed border-[#e2dfe1] dark:border-zinc-800 items-center my-2">
            <Barbell size={40} color={isDark ? '#71717a' : '#808591'} />
            <Text className="text-[#1b1b1d] dark:text-white font-bold mt-2 text-base text-center">
              Nenhum treino encontrado
            </Text>
            <Text className="text-[#414755] dark:text-zinc-400 text-xs text-center mt-1">
              {selectedDayFilter !== 'todos' || selectedCategoryFilter !== 'todos'
                ? 'Tente alterar os filtros selecionados acima.'
                : 'Você ainda não possui treinos cadastrados ou prescritos.'}
            </Text>
          </View>
        ) : (
          filteredWorkouts.map((workout) => {
            const isPersonal = workout.origin === 'personal';

            return (
              <TouchableOpacity
                key={`${workout.origin}-${workout.id}`}
                onPress={() => {
                  if (isPersonal) {
                    router.push(`/(aluno)/workout-detail?id=${workout.id}`);
                  } else {
                    router.push(`/custom-workout/${workout.id}`);
                  }
                }}
                className="bg-[#f8f9fa] dark:bg-zinc-900 p-4 rounded-2xl mb-3 border border-[#e2dfe1] dark:border-zinc-800"
                activeOpacity={0.8}
              >
                {/* LINHA SUPERIOR: BADGE DE ORIGEM */}
                <View className="flex-row items-center justify-between mb-2">
                  {isPersonal ? (
                    <View className="bg-[#59C83A]/10 border border-[#59C83A]/30 px-2.5 py-1 rounded-md flex-row items-center">
                      <UserCheck size={12} color="#59C83A" weight="bold" />
                      <Text className="text-[10px] font-extrabold text-[#59C83A] ml-1">
                        Prescrito pelo Personal
                      </Text>
                    </View>
                  ) : (
                    <View className="bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 px-2.5 py-1 rounded-md flex-row items-center">
                      <User size={12} color={isDark ? '#a1a1aa' : '#71717a'} weight="bold" />
                      <Text className="text-[10px] font-extrabold text-[#71717a] dark:text-zinc-300 ml-1">
                        Criado por mim
                      </Text>
                    </View>
                  )}

                  <CaretRight size={18} color="#59C83A" />
                </View>

                {/* TÍTULO E DETALHES DO TREINO */}
                <Text className="text-base font-extrabold text-[#1b1b1d] dark:text-white mb-1.5">
                  {workout.title}
                </Text>

                <View className="flex-row items-center gap-2">
                  <Text style={{ color: '#59C83A' }} className="text-xs font-bold">
                    {workout.exerciseCount} {workout.exerciseCount === 1 ? 'exercício' : 'exercícios'}
                  </Text>

                  {workout.displayDays ? (
                    <View className="bg-white dark:bg-zinc-950 px-2 py-0.5 rounded-md flex-row items-center border border-[#e2dfe1] dark:border-zinc-800">
                      <CalendarBlank size={11} color={isDark ? '#a1a1aa' : '#71717a'} />
                      <Text className="text-[10px] font-bold text-[#71717a] dark:text-zinc-400 ml-1">
                        {workout.displayDays}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })
        )}

        <View className="h-10" />
      </ScrollView>
    </View>
  );
}