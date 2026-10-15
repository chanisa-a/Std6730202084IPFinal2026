import { Redirect } from 'expo-router';

import { LoadingScreen } from '@/components/LoadingScreen';
import { useAuth } from '@/contexts/AuthContext';

export default function EntryScreen() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  return <Redirect href={user ? '/dashboard' : '/login'} />;
}
