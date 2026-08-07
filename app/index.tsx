// app/index.tsx
import { Redirect } from 'expo-router';

export default function Index() {
  // Redireciona o usuário para o grupo de autenticação
  return <Redirect href="/(auth)/login" />;
}