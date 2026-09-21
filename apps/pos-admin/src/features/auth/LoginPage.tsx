import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, ApiError } from './AuthContext';
import { Eye, EyeOff } from 'lucide-react';
import loginHero from '../../assets/login-hero.webp';

/**
 * LoginPage con diseño de marca "OTRA RONDA MAS": panel izquierdo con
 * la foto de marca real (logo, bullets y los 5 productos reales del
 * catálogo ya integrados en el propio asset — no se redibujan en CSS);
 * panel derecho con el formulario real contra POST /auth/login (ver
 * AuthContext) — nada de esto es mock.
 *
 * "Ingresar con Google" y "¿Olvidaste tu contraseña?" quedan
 * deshabilitados con un aviso explícito en vez de omitidos: no hay
 * integración OAuth con Google ni flujo de recuperación de contraseña
 * en el backend todavía. Un botón que no hace nada en silencio es peor
 * que uno ausente; uno que explica por qué está desactivado es
 * aceptable — es la decisión que se tomó para este rediseño.
 *
 * "Recordarme" SÍ es funcional: decide si la sesión se guarda en
 * localStorage (persiste entre cierres de navegador) o sessionStorage
 * (se pierde al cerrar la pestaña) — ver AuthContext.tsx y
 * lib/api.ts.
 */
export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [avisoDeshabilitado, setAvisoDeshabilitado] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password, rememberMe);
      navigate('/');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('No se pudo conectar con la API');
      }
    } finally {
      setSubmitting(false);
    }
  }

  function avisarNoDisponible(que: string) {
    setAvisoDeshabilitado(que);
  }

  return (
    <div className="flex min-h-screen bg-gray-900">
      {/* PANEL IZQUIERDO - foto de marca real (logo, bullets y los 5
          productos ya vienen dibujados en el propio asset) */}
      <div
        className="hidden lg:block lg:w-1/2 bg-cover"
        style={{ backgroundImage: `url(${loginHero})`, backgroundPosition: 'top center' }}
        role="img"
        aria-label="Otra Ronda Más — envíos rápidos, amplio catálogo, las mejores marcas, precios mayoristas"
      />

      {/* PANEL DERECHO - FORMULARIO */}
      <div className="w-full lg:w-1/2 bg-gray-800 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="mb-10">
            <h2 className="text-4xl font-bold text-white mb-3">Bienvenido</h2>
            <p className="text-gray-300 text-lg">Ingresá a tu cuenta para gestionar tu negocio.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-white text-sm font-semibold mb-2">
                Usuario o email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ingrese su usuario o email"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400 focus:ring-opacity-20"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-white text-sm font-semibold mb-2">
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ingrese su contraseña"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400 focus:ring-opacity-20"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="absolute right-4 top-3.5 text-gray-400 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-5 h-5 bg-gray-700 border border-gray-600 rounded accent-yellow-400"
                />
                <span className="text-gray-300 text-sm">Recuérdame</span>
              </label>
              {/* Sin disabled/aria-disabled, mismo criterio que el botón
                  de Google más abajo: necesita responder al click para
                  mostrar el aviso. */}
              <button
                type="button"
                onClick={() => avisarNoDisponible('recuperación de contraseña')}
                className="text-yellow-400/60 hover:text-yellow-400 text-sm font-semibold transition-colors cursor-not-allowed"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-500 bg-opacity-20 border border-red-500 rounded-lg">
                <p role="alert" className="text-red-400 text-sm">
                  {error}
                </p>
              </div>
            )}

            {avisoDeshabilitado && (
              <div className="p-3 bg-gray-700 border border-gray-600 rounded-lg">
                <p className="text-gray-300 text-sm">
                  {avisoDeshabilitado === 'Google'
                    ? 'El ingreso con Google todavía no está disponible.'
                    : 'La recuperación de contraseña todavía no está disponible — contactá al dueño para restablecerla.'}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-4 bg-yellow-400 text-black font-bold rounded-lg hover:bg-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? 'Ingresando…' : 'Ingresar'}
              <span>→</span>
            </button>
          </form>

          <div className="my-8 flex items-center gap-4">
            <div className="flex-1 bg-gray-600 h-px"></div>
            <span className="text-gray-400 text-sm">o</span>
            <div className="flex-1 bg-gray-600 h-px"></div>
          </div>

          {/* No lleva disabled/aria-disabled: si estuviera realmente
              deshabilitado, no podría disparar el aviso al hacer click.
              El estilo (cursor-not-allowed, colores apagados) comunica
              visualmente "no disponible todavía" sin mentirle a lectores
              de pantalla sobre si el control responde. */}
          <button
            type="button"
            onClick={() => avisarNoDisponible('Google')}
            className="w-full py-3 px-4 border-2 border-gray-600 text-gray-400 font-semibold rounded-lg cursor-not-allowed flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Ingresar con Google
          </button>
        </div>
      </div>
    </div>
  );
}
