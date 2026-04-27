import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import type { User } from '../types';

interface AuthCtx {
  user: User | null; token: string | null; isAuthenticated: boolean; loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthCtx>({} as AuthCtx);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('chengeto_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      api.me().then(r => setUser(r.user)).catch(() => { setToken(null); localStorage.removeItem('chengeto_token'); }).finally(() => setLoading(false));
    } else { setLoading(false); }
  }, [token]);

  const login = useCallback(async (username: string, password: string) => {
    const res = await api.login(username, password);
    localStorage.setItem('chengeto_token', res.token);
    setToken(res.token);
    setUser(res.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('chengeto_token');
    setToken(null); setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
