import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { api, portalOf, tokenStore } from '../api/client';
import type { Kitchen, User } from '../types';

interface AuthState {
  user: User | null;
  kitchen: Kitchen | null;
  loading: boolean;
  login: (username: string, password: string, portal: 'admin' | 'kitchen' | 'customer') => Promise<User>;
  setSession: (data: { token: string; user: User; kitchen?: Kitchen | null }) => void;
  refresh: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [kitchen, setKitchen] = useState<Kitchen | null>(null);
  const [loading, setLoading] = useState(true);

  const setSession = useCallback((data: { token: string; user: User; kitchen?: Kitchen | null }) => {
    tokenStore.set(data.token);
    setUser(data.user);
    setKitchen(data.kitchen ?? null);
  }, []);

  const refresh = useCallback(async () => {
    if (!tokenStore.get()) { setLoading(false); return; }
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
      setKitchen(data.kitchen ?? null);
    } catch {
      tokenStore.clear();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Reload the session whenever the user moves between portals (customer / kitchen / admin).
  const portal = portalOf(useLocation().pathname);
  useEffect(() => {
    setLoading(true); setUser(null); setKitchen(null);
    refresh();
  }, [portal, refresh]);

  useEffect(() => {
    const onLogout = () => { setUser(null); setKitchen(null); };
    window.addEventListener('homeplate:logout', onLogout);
    return () => window.removeEventListener('homeplate:logout', onLogout);
  }, []);

  const login = async (username: string, password: string, portal: 'admin' | 'kitchen' | 'customer') => {
    const { data } = await api.post('/auth/login', { username, password, portal });
    setSession(data);
    return data.user as User;
  };

  const logout = () => {
    tokenStore.clear();
    setUser(null);
    setKitchen(null);
  };

  return (
    <AuthContext.Provider value={{ user, kitchen, loading, login, setSession, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
