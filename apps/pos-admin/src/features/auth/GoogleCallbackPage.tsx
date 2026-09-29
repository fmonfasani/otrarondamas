import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth, ApiError } from './AuthContext';

/**
 * Destino de FRONTEND_URL/auth/google/callback (ver
 * apps/api/src/auth/auth.controller.ts: googleCallback). El backend ya
 * hizo todo el intercambio OAuth con Google; acá solo queda tomar el
 * token de la URL y completar la sesión con /auth/me.
 */
export function GoogleCallbackPage() {
  const [searchParams] = useSearchParams();
  const { completarSesionConToken } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  // El efecto no debe correr dos veces con el mismo token (StrictMode en
  // dev monta/desmonta efectos dos veces) — completarSesionConToken no es
  // idempotente de forma inofensiva si el token ya se consumió y algo
  // más cambió el estado en el medio.
  const yaProcesado = useRef(false);

  useEffect(() => {
    if (yaProcesado.current) return;
    yaProcesado.current = true;

    // Todo el trabajo (incluido el caso "sin token") pasa por una
    // promesa: react-hooks/set-state-in-effect marca como riesgoso
    // cualquier setState alcanzable directo desde el cuerpo síncrono del
    // efecto, aunque sea un caso de validación simple — Promise.resolve()
    // lo saca del ciclo de render síncrono actual sin necesitar un
    // setTimeout.
    const token = searchParams.get('token');

    Promise.resolve()
      .then(() => {
        if (!token) {
          throw new Error('No se recibió token de Google.');
        }
        return completarSesionConToken(token);
      })
      .then(() => navigate('/', { replace: true }))
      .catch((err) => {
        if (!token) {
          setError('No se recibió token de Google.');
        } else {
          setError(
            err instanceof ApiError ? err.message : 'No se pudo completar el login con Google.',
          );
        }
      });
  }, [searchParams, completarSesionConToken, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-black text-white">
      {error ? (
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => navigate('/login', { replace: true })}
            className="text-yellow-400 underline"
          >
            Volver al login
          </button>
        </div>
      ) : (
        <p className="text-gray-300">Completando el ingreso con Google…</p>
      )}
    </div>
  );
}
