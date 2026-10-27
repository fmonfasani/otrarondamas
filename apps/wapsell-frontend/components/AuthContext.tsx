'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Empresa {
  id: string;
  nombre: string;
  email: string;
  telefono?: string;
  pais: string;
  sector?: string;
  plan: 'basico' | 'pro' | 'premium';
  usuariosActivos: number;
  ultimaActividad: string;
  createdAt: string;
}

export interface User {
  id: string;
  nombre: string;
  email: string;
  empresas: Empresa[];
}

interface AuthContextType {
  user: User | null;
  empresaId: string | null;
  empresa: Empresa | null;
  empresas: Empresa[];
  isLoading: boolean;
  login: (token: string, empresas: Empresa[], empresaId: string) => Promise<void>;
  switchEmpresa: (empresaId: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const defaultAuthContext: AuthContextType = {
  user: null,
  empresaId: null,
  empresa: null,
  empresas: [],
  isLoading: false,
  login: async () => {},
  switchEmpresa: async () => {},
  logout: () => {},
  isAuthenticated: false,
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    return defaultAuthContext;
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Inicializar desde localStorage y JWT
  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = localStorage.getItem('jwt');
        const storedEmpresaId = localStorage.getItem('empresaId');

        if (!token) {
          setIsLoading(false);
          return;
        }

        // Decodificar JWT (sin validar signature en client)
        const decoded = JSON.parse(atob(token.split('.')[1]));

        // Construir usuario desde JWT
        const currentUser: User = {
          id: decoded.sub,
          nombre: decoded.nombre || decoded.email?.split('@')[0],
          email: decoded.email,
          empresas: decoded.empresas || [],
        };

        setUser(currentUser);
        setEmpresas(decoded.empresas || []);

        // Seleccionar empresa actual
        if (storedEmpresaId) {
          const selected = currentUser.empresas.find(e => e.id === storedEmpresaId);
          if (selected) {
            setEmpresaId(storedEmpresaId);
            setEmpresa(selected);
          } else if (currentUser.empresas.length > 0) {
            const firstEmpresa = currentUser.empresas[0];
            setEmpresaId(firstEmpresa.id);
            setEmpresa(firstEmpresa);
            localStorage.setItem('empresaId', firstEmpresa.id);
          }
        } else if (currentUser.empresas.length > 0) {
          const firstEmpresa = currentUser.empresas[0];
          setEmpresaId(firstEmpresa.id);
          setEmpresa(firstEmpresa);
          localStorage.setItem('empresaId', firstEmpresa.id);
        }
      } catch (error) {
        console.error('Auth init error:', error);
        localStorage.removeItem('jwt');
        localStorage.removeItem('empresaId');
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const switchEmpresa = async (newEmpresaId: string) => {
    try {
      const token = localStorage.getItem('jwt');
      if (!token) throw new Error('No token found');

      const response = await fetch('/api/auth/switch-empresa', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ empresaId: newEmpresaId }),
      });

      if (!response.ok) {
        throw new Error('Failed to switch empresa');
      }

      const data = await response.json();

      // Actualizar JWT y empresaId
      localStorage.setItem('jwt', data.token);
      localStorage.setItem('empresaId', newEmpresaId);

      // Actualizar contexto
      const selected = empresas.find(e => e.id === newEmpresaId);
      if (selected) {
        setEmpresaId(newEmpresaId);
        setEmpresa(selected);
      }

      // Redirigir a dashboard
      window.location.href = '/dashboard';
    } catch (error) {
      console.error('Switch empresa error:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('jwt');
    localStorage.removeItem('empresaId');
    setUser(null);
    setEmpresaId(null);
    setEmpresa(null);
    setEmpresas([]);
    window.location.href = '/auth/login';
  };

  const login = async (token: string, empresasList: Empresa[], empresaId: string): Promise<void> => {
    try {
      // Store token and empresa ID in localStorage
      localStorage.setItem('jwt', token);
      localStorage.setItem('empresaId', empresaId);

      // Decode JWT to extract user data
      const decoded = JSON.parse(atob(token.split('.')[1]));

      // Build user from JWT
      const currentUser: User = {
        id: decoded.sub,
        nombre: decoded.nombre || decoded.email?.split('@')[0],
        email: decoded.email,
        empresas: empresasList,
      };

      // Update auth state
      setUser(currentUser);
      setEmpresas(empresasList);

      // Select current empresa
      const selected = empresasList.find(e => e.id === empresaId);
      if (selected) {
        setEmpresaId(empresaId);
        setEmpresa(selected);
      } else if (empresasList.length > 0) {
        const firstEmpresa = empresasList[0];
        setEmpresaId(firstEmpresa.id);
        setEmpresa(firstEmpresa);
        localStorage.setItem('empresaId', firstEmpresa.id);
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    empresaId,
    empresa,
    empresas,
    isLoading,
    login,
    switchEmpresa,
    logout,
    isAuthenticated: !!user && !!empresaId,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
