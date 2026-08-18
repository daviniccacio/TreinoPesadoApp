import { Redirect } from 'expo-router';

/**
 * Ponto de entrada do app: redireciona para a tela de login por padrão.
 * O RootLayout interceptará caso o usuário já possua sessão ativa.
 */
export default function Index() {
  return <Redirect href="/(auth)/login" />;
}