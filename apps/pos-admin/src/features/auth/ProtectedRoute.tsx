import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

/**
 * Redirige a /login si no hay usuario en el contexto (poblado tras un
 * login exitoso o leído de localStorage al recargar). No vuelve a
 * verificar el token contra la API en cada navegación interna: eso lo
 * hace DashboardPage al montar, llamando a GET /auth/me.
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
