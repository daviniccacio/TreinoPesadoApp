import { z } from 'zod';

// Schema para validação individual dos exercícios do plano
export const planExerciseSchema = z.object({
  exercise_id: z.string().uuid('ID de exercício inválido.'),
  sets: z
    .string()
    .min(1, 'Informe a quantidade de séries.')
    .max(10, 'Valor de séries muito alto.'),
  reps: z
    .string()
    .min(1, 'Informe as repetições.')
    .max(30, 'Texto de repetições muito longo.'),
  notes: z.string().max(100, 'Observação muito longa.').optional().nullable(),
});

// Schema principal para criação e edição do plano de treino
export const createWorkoutPlanSchema = z.object({
  name: z
    .string()
    .min(3, 'O nome do treino deve ter pelo menos 3 caracteres.')
    .max(60, 'O nome do treino é muito longo (máximo 60 caracteres).'),
  description: z
    .string()
    .max(250, 'A descrição pode ter no máximo 250 caracteres.')
    .optional()
    .nullable(),
  objective: z.string().min(1, 'Selecione um objetivo válido.'),
  days_of_week: z
    .array(z.string())
    .min(1, 'Selecione pelo menos um dia da semana para o plano.'),
  exercises: z
    .array(planExerciseSchema)
    .min(1, 'Adicione pelo menos um exercício ao plano de treino.'),
});

export type CreateWorkoutPlanInput = z.infer<typeof createWorkoutPlanSchema>;