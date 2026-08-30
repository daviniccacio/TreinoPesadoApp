# 🏋️‍♂️ Treino Pesado Academia

O **Treino Pesado Academia** é um aplicativo mobile completo desenvolvido para a gestão de fichas de treino, consultoria esportiva personalizada e acompanhamento de rotinas de exercícios físicos.

---

## 👥 Perfis de Usuário e Fluxos de Navegação

O aplicativo conta com controle de acesso baseado em papéis (*Role-Based Access Control* - RBAC) integrado ao Supabase Auth, dividindo-se em duas experiências distintas:

### 👨‍🏫 Personal Trainer
* **Código de Acesso Exclusivo**: Possui um código único gerado automaticamente (ex: `PERS-D7DA`) para ser compartilhado com seus alunos.
* **Biblioteca de Rotinas**: Cria, edita e gerencia modelos de fichas reutilizáveis na nuvem.
* **Atribuição Direta**: Clona e vincula modelos de treinos diretamente para alunos específicos de sua carteira.
* **Gestão de Carteira**: Acompanha a quantidade de alunos vinculados e visualiza detalhes do perfil de cada um.

### 🏋️‍♀️ Aluno / Atleta
* **Vínculo por Convite**: Conecta-se ao seu Personal Trainer inserindo o código de acesso do instrutor no perfil.
* **Execução de Treinos**: Acessa e executa treinos prescritos pelo seu Personal ou explora categorias de exercícios.
* **Criação Personalizada**: Monta treinos próprios e rotinas avulsas diretamente pelo aplicativo.
* **Estatísticas e Histórico**: Registra automaticamente o tempo investido em treino e as sessões concluídas no histórico (`workout_logs`).

---

## 🛠️ Tecnologias Utilizadas

* **Frontend Framework**: [React Native](https://reactnative.dev/) com [Expo SDK 51](https://expo.dev/)
* **Roteamento**: [Expo Router](https://docs.expo.dev/router/introduction/) (File-based Routing)
* **Linguagem**: [TypeScript](https://www.typescriptlang.org/)
* **Estilização**: [NativeWind](https://www.nativewind.dev/) (Tailwind CSS adaptado para mobile)
* **Gerenciamento de Estado e Cache**: [TanStack Query v5](https://tanstack.com/query/latest) (React Query)
* **Backend e Infraestrutura**: [Supabase](https://supabase.com/) (Autenticação, PostgreSQL, Storage para GIFs e Row Level Security)
* **Ícones**: [Phosphor Icons React Native](https://phosphoricons.com/)

---

## 🗄️ Estrutura do Banco de Dados (Supabase)

* **`profiles`**: Dados cadastrais dos usuários (`id`, `full_name`, `role`, `personal_id`, `invite_code`).
* **`workout_plans`**: Fichas e rotinas de treino (modelos da biblioteca ou planos atribuídos a alunos).
* **`plan_exercises`**: Exercícios pertencentes a cada ficha com número de séries, repetições e notas.
* **`custom_workouts` & `custom_workout_exercises`**: Treinos montados de forma avulsa pelo próprio aluno.
* **`categories` & `exercises`**: Biblioteca central de grupos musculares e demonstrações dos exercícios.
* **`workout_logs`**: Registros de sessões concluídas e duração total de treino.

---

## 🚀 Como Executar o Projeto Localmente

### Pré-requisitos
* **Node.js** (v18.0.0 ou superior)
* Gerenciador de pacotes **pnpm**, **npm** ou **yarn**
* Aplicativo **Expo Go** instalado no smartphone ou um emulador Android/iOS configurado

### Passo a Passo

1. **Clonar o repositório:**
   ```bash
   git clone [https://github.com/daviniccacio/TreinoPesadoApp.git](https://github.com/daviniccacio/TreinoPesadoApp.git)
   cd TreinoPesadoApp

    Instalar as dependências:
    Bash

    pnpm install

    Configurar as Variáveis de Ambiente:
    Crie um arquivo .env na raiz do projeto com as credenciais do seu projeto no Supabase:
    Snippet de código

    EXPO_PUBLIC_SUPABASE_URL=[https://seu-projeto.supabase.co](https://seu-projeto.supabase.co)
    EXPO_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon-publica

    Iniciar o servidor de desenvolvimento:
    Bash

    npx expo start -c

    Executar no dispositivo:
    Escaneie o QR Code exibido no terminal utilizando a câmera do dispositivo móvel (iOS) ou o aplicativo Expo Go (Android).


---

### Instruções para Salvar no GitHub

Abra o terminal na pasta do seu projeto e execute os comandos para salvar a documentação no repositório:

```bash
  # 1. Certifique-se de estar na branch develop
  git checkout develop

  # 2. Registre as alterações no arquivo README.md
  git add README.md

  # 3. Crie o commit
  git commit -m "docs: atualizacao do README.md com perfis de Personal e Aluno"

  # 4. Envie para o GitHub
  git push origin develop

📝 Licença

Este projeto está sob a licença MIT. Desenvolvido por Davi Nicacio para otimizar o acompanhamento e prescrição de treinos esportivos.