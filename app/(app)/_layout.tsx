// app/(app)/_layout.tsx
import { Redirect, Slot } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { ActivityIndicator, View } from 'react-native';

export default function AppLayout() {
  const [role, setRole] = useState<'aluno' | 'personal' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkRole() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return setLoading(false);

      const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      setRole(data?.role);
      setLoading(false);
    }
    checkRole();
  }, []);

  if (loading) return <ActivityIndicator />;

  // Redireciona automaticamente baseado na role
  if (role === 'personal') return <Redirect href="/(personal)" />;
  if (role === 'aluno') return <Redirect href="/(aluno)" />;

  return <Slot />; // Fallback
}