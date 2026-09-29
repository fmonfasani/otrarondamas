import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { ClienteSession } from '../../lib/api';

export type { ClienteSession };

interface AuthContextValue {
  cliente: ClienteSession | null;
  token: string | null;
  cargando: boolean;
  setSession: (token: string, cliente: ClienteSession) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = 'orm_cliente_token';
const CLIENTE_KEY = 'orm_cliente_session';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  });
  const [cliente, setCliente] = useState<ClienteSession | null>(() => {
    try {
      const raw = localStorage.getItem(CLIENTE_KEY);
      return raw ? (JSON.parse(raw) as ClienteSession) : null;
    } catch {
      return null;
    }
  });
  const [cargando] = useState(false);

  // Sincroniza localStorage cuando cambia el estado
  useEffect(() => {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* private window / blocked storage */
    }
  }, [token]);

  useEffect(() => {
    try {
      if (cliente) localStorage.setItem(CLIENTE_KEY, JSON.stringify(cliente));
      else localStorage.removeItem(CLIENTE_KEY);
    } catch {
      /* private window */
    }
  }, [cliente]);

  const setSession = useCallback((newToken: string, newCliente: ClienteSession) => {
    setToken(newToken);
    setCliente(newCliente);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setCliente(null);
  }, []);

  return (
    <AuthContext.Provider value={{ cliente, token, cargando, setSession, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth fuera de AuthProvider');
  return ctx;
}
