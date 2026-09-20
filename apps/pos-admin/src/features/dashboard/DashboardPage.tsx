import { useEffect, useState } from 'react';
import type { AuthenticatedUser } from '@otrarondamas/shared-types';
import { api } from '../../lib/api';
import { useAuth, ApiError } from '../auth/AuthContext';

/**
 * Pantalla placeholder post-login. Llama a GET /auth/me al montar para
 * confirmar contra la API real (no solo contra localStorage) que el
 * token sigue siendo válido — si la API lo rechaza, cierra la sesión.
 */
export function DashboardPage() {
  const { user: cachedUser, logout } = useAuth();
  const [verifiedUser, setVerifiedUser] = useState<AuthenticatedUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .me()
      .then(setVerifiedUser)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          logout();
        } else {
          setError('No se pudo verificar la sesión contra la API');
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <h2>Panel</h2>
      {/* TODO: diseño visual pendiente */}
      {error && <p role="alert">{error}</p>}
      {verifiedUser ? (
        <dl>
          <dt>Usuario</dt>
          <dd>{verifiedUser.nombre}</dd>
          <dt>Email</dt>
          <dd>{verifiedUser.email}</dd>
          <dt>Empresa</dt>
          <dd>{verifiedUser.empresaId}</dd>
          <dt>Permisos</dt>
          <dd>{verifiedUser.permisos.join(', ') || '(ninguno)'}</dd>
        </dl>
      ) : (
        !error && <p>Verificando sesión contra la API…</p>
      )}
      <p>Sesión guardada localmente: {cachedUser?.email}</p>
      <button onClick={logout}>Cerrar sesión</button>
    </div>
  );
}
