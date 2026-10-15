import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { apiConfigured, clearSession, restoreUser, signIn as apiSignIn, type ApiUser } from '@/lib/hrApi';

export type AppUser = ApiUser;

type AuthContextValue = {
  user: AppUser | null;
  loading: boolean;
  configured: boolean;
  signIn: (username: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: React.PropsWithChildren) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    restoreUser()
      .then((storedUser) => {
        if (mounted) setUser(storedUser);
      })
      .catch((error: unknown) => {
        console.error('Unable to restore sign-in session:', error);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    configured: apiConfigured,
    signIn: async (username, password) => {
      try {
        setUser(await apiSignIn(username.trim(), password));
        return null;
      } catch (error) {
        return error instanceof Error ? error.message : 'เข้าสู่ระบบไม่สำเร็จ';
      }
    },
    signOut: async () => {
      await clearSession();
      setUser(null);
    },
  }), [loading, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
