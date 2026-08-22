# 🏋️ Treino Pesado Academia

App mobile de academia com **dois perfis de uso**: o **Aluno**, que executa e acompanha seus treinos, e o **Personal Trainer**, que gerencia alunos, monta treinos e acompanha a frequência. Construído com **React Native + Expo Router**, estilizado com **NativeWind (Tailwind)** e com **Supabase** como backend (Auth + Postgres).

---

## Sumário

- [Visão geral](#visão-geral)
- [Stack técnica](#stack-técnica)
- [Arquitetura e navegação](#arquitetura-e-navegação)
- [Funcionalidades por perfil](#funcionalidades-por-perfil)
- [Modelo de dados (Supabase)](#modelo-de-dados-supabase)
- [GIFs de exercícios](#gifs-de-exercícios)
- [Estrutura de pastas](#estrutura-de-pastas)
- [Como rodar o projeto](#como-rodar-o-projeto)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Roadmap](#roadmap)
- [Notas e cuidados](#notas-e-cuidados)

---

## Visão geral

O **Treino Pesado Academia** conecta a academia (Personal Trainer) ao aluno em um único app:

- O **Aluno** entra, executa treinos com cronômetro de série e de descanso, monta seus próprios treinos personalizados a partir do catálogo de exercícios da academia, e acompanha seu histórico.
- O **Personal Trainer** vê a lista de alunos, monta modelos de treino em uma biblioteca própria, prescreve rotinas para alunos específicos e acompanha a frequência (assiduidade) semanal de todos.

O app decide automaticamente qual experiência mostrar de acordo com a coluna `role` do perfil do usuário logado (`aluno` ou `personal`).

---

## Stack técnica

| Camada | Tecnologia |
|---|---|
| Framework | **Expo ~54** + **React Native 0.81** + **React 19** |
| Navegação | **Expo Router 6** (roteamento por arquivos, grupos de rota) |
| Estilização | **NativeWind 4** (Tailwind CSS para React Native) |
| Backend / Banco | **Supabase** (Postgres + Auth) via `@supabase/supabase-js` |
| Persistência de sessão | `@react-native-async-storage/async-storage` |
| Ícones | `phosphor-react-native` (+ `@expo/vector-icons` como apoio) |
| Imagens/GIFs | `expo-image` (GIFs animados locais, ver seção própria) |
| Linguagem | **TypeScript** |

> Não há gerenciador de estado global (Redux/Zustand) nem camada de cache (React Query): cada tela busca seus próprios dados diretamente do Supabase com `useState` + `useEffect`/`useFocusEffect`, o que mantém o projeto simples e fácil de acompanhar.

---

## Arquitetura e navegação

O app usa **grupos de rota do Expo Router** para separar autenticação, e dentro da área logada, separar os dois perfis:

```
app/
├── _layout.tsx                # Root layout: observa sessão do Supabase e
│                               # redireciona entre (auth) e (app)
├── index.tsx
│
├── (auth)/                    # Pilha pública (sem sessão)
│   ├── _layout.tsx
│   ├── login.tsx
│   ├── register.tsx
│   └── reset-password.tsx
│
└── (app)/                     # Pilha protegida (com sessão)
    ├── _layout.tsx            # Lê profiles.role e força a sub-rota certa
    ├── index.tsx              # "Porteiro": decide (aluno) ou (personal)
    │
    ├── (aluno)/
    │   ├── _layout.tsx                 # Stack: (tabs) + telas empilhadas
    │   ├── (tabs)/_layout.tsx          # Tab bar: Início, Meus Treinos, Histórico, Perfil
    │   ├── (tabs)/index.tsx            # Categorias + treinos personalizados recentes
    │   ├── (tabs)/my-workouts.tsx      # Lista dos treinos personalizados do aluno
    │   ├── (tabs)/history.tsx          # Histórico de treinos concluídos
    │   ├── (tabs)/profile.tsx          # Perfil, estatísticas e configurações
    │   ├── category/[id].tsx           # Exercícios de uma categoria
    │   ├── exercise/[id].tsx           # Detalhe do exercício (GIF + instruções)
    │   ├── create-workout.tsx          # Montagem de treino personalizado
    │   ├── custom-workout/[id].tsx     # Detalhe de um treino personalizado
    │   ├── workout-detail.tsx          # Detalhe de um treino prescrito pelo Personal
    │   └── execute-workout.tsx         # Execução em tempo real (cronômetros + registro)
    │
    └── (personal)/
        ├── _layout.tsx           # Tab bar: Alunos, Biblioteca, Frequência, Perfil
        ├── index.tsx             # Lista/busca de alunos
        ├── routines.tsx          # Biblioteca de modelos + prescrição para alunos
        ├── attendance.tsx        # Painel de frequência semanal dos alunos
        ├── profile.tsx           # Perfil do Personal e estatísticas
        ├── student-detail.tsx    # Detalhe de um aluno (rotinas prescritas, stats)
        └── create-workout.tsx    # Criação de modelo de treino / rotina
```

**Fluxo de proteção de rotas:**

1. `app/_layout.tsx` observa a sessão do Supabase (`onAuthStateChange`) e redireciona quem não está logado para `(auth)/login`, e quem já está logado para dentro de `(app)`.
2. `app/(app)/index.tsx` funciona como um "porteiro": busca a `role` do perfil (`profiles.role`) e manda para `(app)/(aluno)` ou `(app)/(personal)`.
3. `app/(app)/_layout.tsx` reforça essa regra a cada troca de rota, impedindo que um aluno acesse as telas de personal e vice-versa.

---

## Funcionalidades por perfil

### 👤 Aluno

- **Login / Cadastro / Recuperação de senha** via Supabase Auth (e-mail e senha).
- **Início**: saudação, categorias de treino (Peito, Costas, Pernas, Ombros, Bíceps, Tríceps...) e acesso rápido aos treinos personalizados recentes.
- **Exercícios por categoria**: lista os exercícios cadastrados pela academia para aquele grupo muscular.
- **Detalhe do exercício**: GIF demonstrativo animado do movimento + instruções de execução.
- **Montar treino personalizado** (`create-workout`): o aluno escolhe exercícios do catálogo e monta seu próprio treino (`custom_workouts` + `custom_workout_exercises`), definindo séries, repetições e carga.
- **Meus Treinos**: lista os treinos personalizados já montados, com atalho para executar.
- **Execução do treino em tempo real** (`execute-workout`):
  - Cronômetro principal do treino (play/pause).
  - Marcação de séries concluídas por exercício.
  - **Cronômetro de descanso** entre séries (padrão de 60s).
  - Modal com o GIF de demonstração do exercício durante a execução.
  - Ao concluir, salva o registro em `workout_logs` (título do treino + duração total).
- **Histórico**: lista os treinos já concluídos (`workout_logs`), com data e duração.
- **Perfil**: nome, e-mail, estatísticas (quantidade de treinos personalizados, tempo total treinado) e preferência de tema (claro/escuro/sistema).
- Também executa **rotinas prescritas pelo Personal** (`workout_plans` / `plan_exercises`) através da tela `workout-detail`.

### 🧑‍🏫 Personal Trainer

- **Alunos**: lista e busca todos os alunos vinculados.
- **Detalhe do aluno**: estatísticas (total de treinos, data do último treino) e rotinas (`workout_plans`) já prescritas para aquele aluno especificamente.
- **Biblioteca** (`routines`): modelos de treino reutilizáveis (registros de `workout_plans` com `student_id = NULL`), que podem ser copiados/atribuídos a um aluno específico.
- **Criar treino / rotina** (`create-workout`): monta uma rotina com nome, descrição, objetivo, dias da semana e lista de exercícios (`plan_exercises`), como modelo de biblioteca ou já atribuída a um aluno.
- **Frequência** (`attendance`): painel com os registros de treino (`workout_logs`) de todos os alunos, permitindo visualizar quem treinou na semana e a taxa de assiduidade geral.
- **Perfil**: dados pessoais, estatísticas (nº de modelos na biblioteca, nº de treinos prescritos) e preferência de tema.

---

## Modelo de dados (Supabase)

Tabelas efetivamente usadas pelo app (inferidas do código-fonte):

| Tabela | Papel |
|---|---|
| `profiles` | Perfil do usuário: `id` (= `auth.users.id`), `full_name`, `email`, `birth_date`, **`role`** (`'aluno'` \| `'personal'`) |
| `categories` | Categorias de treino: `id`, `title`, `image_url` |
| `exercises` | Catálogo de exercícios da academia: `id`, `name`, `category_id`, além de campos de série/reps/carga padrão e a chave do GIF (ver seção seguinte) |
| `custom_workouts` | Treinos personalizados criados pelo próprio aluno: `id`, `title`, `created_at`, dono (usuário) |
| `custom_workout_exercises` | Itens de um treino personalizado: exercício, `sets`, `reps`, `weight`, ligado a `custom_workouts` e `exercises` |
| `workout_plans` | Rotinas/modelos do Personal: `id`, `name`, `description`, `objective`, `days_of_week`, `student_id` (⚠️ `NULL` = modelo de biblioteca; preenchido = prescrito a um aluno específico) |
| `plan_exercises` | Itens de uma rotina (`workout_plans`): `exercise_id`, `name`, `sets`, `reps`, `notes`, `order_index` |
| `workout_logs` | Histórico de treinos concluídos: `id`, `user_id`/`student_id`, `workout_title`, `duration_seconds`, `created_at` — usado tanto no Histórico do aluno quanto no painel de Frequência do Personal |

> ⚠️ Este README documenta o modelo **a partir do código já implementado**. Ao provisionar um novo projeto Supabase do zero, recomenda-se recriar essas tabelas com **Row Level Security (RLS)** ativado, garantindo que:
> - um aluno só leia/escreva seus próprios `custom_workouts`, `custom_workout_exercises` e `workout_logs`;
> - um Personal só leia/escreva `workout_plans`/`plan_exercises` dos alunos vinculados a ele;
> - `categories` e `exercises` sejam de leitura pública para usuários autenticados (catálogo da academia).

A coluna `role` em `profiles` não é escolhida no cadastro (o formulário de registro cria o perfil sem essa coluna) — o padrão do banco deve assumir `'aluno'`, e a promoção para `'personal'` é feita manualmente (ex: diretamente no Supabase Studio) pela administração da academia.

---

## GIFs de exercícios

Diferente de uma abordagem com Supabase Storage, os GIFs de demonstração são **assets locais** empacotados no próprio app:

- Ficam em `assets/gifs/<grupo-muscular>/<exercicio>.gif` (ex: `assets/gifs/pernas/agachamento-livre.gif`).
- `lib/exerciseGifs.ts` centraliza um dicionário `LOCAL_EXERCISE_GIFS` que mapeia uma **chave de texto** (ex: `agachamento_livre`) para o `require()` do arquivo.
- Cada exercício no banco guarda essa chave (`gif_key`); a função `getExerciseGif(gifKey)` resolve a chave para o asset correspondente, com fallback para um GIF padrão caso a chave não seja encontrada.

**Para adicionar um novo exercício com GIF:**
1. Coloque o arquivo `.gif` em `assets/gifs/<categoria>/`.
2. Registre uma nova linha em `LOCAL_EXERCISE_GIFS` no `lib/exerciseGifs.ts` apontando para o arquivo.
3. Cadastre o exercício em `exercises` no Supabase usando essa mesma chave no campo correspondente.

---

## Estrutura de pastas

```
.
├── app/                     # Rotas (Expo Router)
│   ├── (auth)/
│   └── (app)/
│       ├── (aluno)/
│       └── (personal)/
├── assets/
│   └── gifs/                # GIFs de exercícios organizados por grupo muscular
├── lib/
│   ├── supabase.ts          # Client do Supabase com sessão persistente
│   └── exerciseGifs.ts       # Dicionário de GIFs locais
├── app.json
├── babel.config.js
├── metro.config.js           # Integração NativeWind + Metro
├── global.css                 # Diretivas @tailwind
├── tailwind.config.js
├── tsconfig.json
├── AGENTS.md / CLAUDE.md      # Instruções para agentes de IA (ver nota abaixo)
└── todo.md                    # Roadmap do produto
```

---

## Como rodar o projeto

### Pré-requisitos
- Node.js LTS
- Conta e projeto criado no [Supabase](https://supabase.com)
- Expo Go (para testar rapidamente no celular) ou emulador Android/iOS

### Passo a passo

```bash
# 1. Instalar as dependências
npm install

# 2. Configurar as variáveis de ambiente (ver seção abaixo)
cp .env.example .env

# 3. Rodar o projeto
npx expo start
```

Em seguida, escaneie o QR Code com o app **Expo Go**, ou pressione `a`/`i` no terminal para abrir em um emulador Android/iOS.

---

## Variáveis de ambiente

O client em `lib/supabase.ts` lê as credenciais do Supabase via variáveis de ambiente públicas do Expo:

```env
EXPO_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=SUA_ANON_KEY_AQUI
```

> Use sempre a **anon key** (nunca a `service_role key`) no app — a segurança dos dados deve ser garantida por políticas de **Row Level Security** no Supabase, não pelo client.

---

## Roadmap

### ✅ Fase 1 — Essenciais para o lançamento (MVP v1.0)
- [x] Execução do treino em tempo real (aluno): iniciar treino, marcar séries, cronômetro de descanso e salvamento automático ao concluir.
- [x] Histórico (aluno): registro dos treinos passados.
- [x] Aba de Frequência (Personal): quais alunos treinaram na semana e taxa de assiduidade.

### 🔜 Fase 2 — Expansão e diferenciais (v1.1)
- [ ] Cadastro de novos exercícios pelo Personal (formulário com GIF, grupo muscular e instruções).
- [ ] Avaliação física e anamnese (peso corporal, % de gordura, medidas).
- [ ] Módulo de mensagens e avisos entre Personal e Aluno.

---

## Notas e cuidados

- **`AGENTS.md`** deste projeto sinaliza que o Expo passou por mudanças relevantes de versão e recomenda **sempre consultar a documentação versionada** em `https://docs.expo.dev/versions/v54.0.0/` antes de alterar código relacionado ao SDK — vale a pena manter esse hábito ao evoluir o app.
- O app usa **tema claro/escuro automático** (`useColorScheme` + classes `dark:` do NativeWind) em praticamente todas as telas.
- A cor de destaque da identidade visual é o verde **`#59C83A`**.
- Não há biblioteca de cache/sincronização (como React Query): ao adicionar novas telas, siga o padrão já usado (`useState` + `useFocusEffect` para recarregar dados sempre que a tela ganha foco).