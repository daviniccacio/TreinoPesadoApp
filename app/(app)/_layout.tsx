import { Stack } from 'expo-router';

/**
 * Layout raiz da área protegida (Apenas um contentor de navegação)
 */
export default function AppRootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}