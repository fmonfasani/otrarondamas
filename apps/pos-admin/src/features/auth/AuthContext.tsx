import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { AuthenticatedUser } from '@otrarondamas/shared-types';
import { api, ApiError } from '../../lib/api';

interface AuthContextValue {
  user: AuthenticatedUser | null;
  loading: boolean;
  login: (email: string, password: string, rememberMe: boolean) => Promise<void>;
  completarSesionConToken: (accessToken: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// "Recordarme" real (no decorativo): decide en qué storage vive la
// sesión. localStorage persiste entre cierres de navegador; sessionStorage
// se pierde al cerrar la pestaña/ventana. lib/api.ts's request() debe leer
// de los dos storages (ver ese archivo) porque no sabe de antemano en
// cuál quedó guardado el token de la sesión actual.
function readStoredUser(): AuthenticatedUser | null {
  const raw = localStorage.getItem('user') ?? sessionStorage.getItem('user');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthenticatedUser;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(readStoredUser);
  const [loading, setLoading] = useState(false);

  const login = useCallback(async (email: string, password: string, rememberMe: boolean) => {
    setLoading(true);
    try {
      const { accessToken, usuario } = await api.login({ email, password });
      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem('accessToken', accessToken);
      storage.setItem('user', JSON.stringify(usuario));
      setUser(usuario);
    } finally {
      setLoading(false);
    }
  }, []);

  // Usado por GoogleCallbackPage: el callback de /auth/google/callback en
  // el backend redirige acá con el token en la URL (no puede devolver el
  // usuario completo en un redirect del navegador de forma prolija), así
  // que se pide /auth/me con ese token para completar la sesión — mismo
  // resultado final que login(), pero arrancando de un token ya emitido
  // en vez de credenciales. Siempre usa localStorage: no hay checkbox
  // "Recordarme" en el flujo de Google.
  const completarSesionConToken = useCallback(async (accessToken: string) => {
    setLoading(true);
    try {
      localStorage.setItem('accessToken', accessToken);
      const usuario = await api.me();
      localStorage.setItem('user', JSON.stringify(usuario));
      setUser(usuario);
    } catch (err) {
      localStorage.removeItem('accessToken');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('user');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, completarSesionConToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  }
  return ctx;
}

export { ApiError };
