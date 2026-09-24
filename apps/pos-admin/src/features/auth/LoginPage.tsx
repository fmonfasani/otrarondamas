import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth, ApiError } from './AuthContext';
import { API_BASE_URL } from '../../lib/api';
import { Eye, EyeOff, Truck, Package, Star, Tag, User, Lock } from 'lucide-react';
import loginBarBg from '../../assets/login-bar-bg.webp';
import loginLogo from '../../assets/login-logo.webp';
import loginProducts from '../../assets/login-products.webp';

/**
 * LoginPage — diseño "premium" con assets reales del proyecto
 * (assets/brand/): fondo de bar real desenfocado, logo oficial sobre
 * fondo negro, composición de productos recortada de Loginv3.0.png
 * (con fade en los bordes para integrarse sin bordes duros — ver
 * docs/scaffolding-notas.md para el detalle del procesamiento).
 * Contenedor con efecto glassmorphism sobre el fondo, no se usa
 * ninguna captura de referencia completa como fondo del formulario.
 *
 * El login sigue siendo el real contra POST /auth/login (ver
 * AuthContext) — nada de esto es mock.
 *
 * "Ingresar con Google" navega (no es un fetch) a GET /auth/google, que
 * redirige a la pantalla de consentimiento de Google; el backend
 * redirige de vuelta a /auth/google/callback con el token, ver
 * GoogleCallbackPage. "¿Olvidaste tu contraseña?" sigue mostrando un
 * aviso explícito al click: no hay flujo de recuperación en el backend
 * todavía.
 *
 * "Recordarme" es funcional: decide si la sesión se guarda en
 * localStorage (persiste entre cierres) o sessionStorage (se pierde
 * al cerrar la pestaña) — ver AuthContext.tsx y lib/api.ts.
 */
export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  // ?error=google: el callback de Google (auth.controller.ts) redirige
  // acá si el intercambio OAuth o la resolución del usuario falla del
  // lado del backend — no hay forma de mostrar un mensaje más específico,
  // el error real solo existe en los logs del servidor.
  const [error, setError] = useState<string | null>(
    searchParams.get('error') === 'google' ? 'No se pudo completar el ingreso con Google.' : null,
  );
  const [submitting, setSubmitting] = useState(false);
  const [avisoDeshabilitado, setAvisoDeshabilitado] = useState(false);

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

  function avisarRecuperacionNoDisponible() {
    setAvisoDeshabilitado(true);
  }

  const beneficios = [
    { icon: Truck, text: 'ENVÍOS RÁPIDOS' },
    { icon: Package, text: 'AMPLIO CATÁLOGO' },
    { icon: Star, text: 'LAS MEJORES MARCAS' },
    { icon: Tag, text: 'PRECIOS MAYORISTAS' },
  ];

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-10 overflow-hidden bg-black">
      {/* Fondo: foto real de bar, desenfocada, con overlay oscuro para
          que no compita visualmente con el contenedor del formulario. */}
      <div
        className="absolute inset-0 bg-cover bg-center scale-110 blur-sm"
        style={{ backgroundImage: `url(${loginBarBg})` }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-black/70" aria-hidden="true" />

      {/* Contenedor con efecto glassmorphism */}
      <div className="relative w-full max-w-5xl rounded-2xl border border-white/10 bg-black/60 shadow-2xl shadow-black/50 backdrop-blur-xl overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          {/* PANEL IZQUIERDO — marca, beneficios, productos.
              Oculto en mobile/tablet chico para priorizar el
              formulario (sección 6 del pedido de diseño); reaparece a
              partir de lg. */}
          <div className="hidden lg:flex flex-col justify-between p-10 xl:p-12 bg-black/40 relative">
            <div>
              <img src={loginLogo} alt="Otra Ronda Más" className="w-full max-w-[280px] mb-10" />
              <ul className="space-y-4">
                {beneficios.map((b) => {
                  const Icon = b.icon;
                  return (
                    <li key={b.text} className="flex items-center gap-4 text-white">
                      <Icon className="w-6 h-6 text-yellow-400 flex-shrink-0" strokeWidth={2} />
                      <span className="text-base font-bold tracking-wide">{b.text}</span>
                    </li>
                  );
                })}
              </ul>
            </div>

            <img
              src={loginProducts}
              alt="Coca-Cola, Corona, Heineken, Pepsi, Lay's y snacks"
              className="w-full mt-8"
            />
          </div>

          {/* PANEL DERECHO — formulario */}
          <div className="flex items-center justify-center p-6 sm:p-10 xl:p-14">
            <div className="w-full max-w-sm">
              {/* Logo visible solo en mobile/tablet, donde el panel de
                  marca está oculto — mantiene la identidad visible
                  (sección 6: "asegurar que la identidad de marca se
                  mantenga visible" en celular). */}
              <img src={loginLogo} alt="Otra Ronda Más" className="w-40 mb-6 lg:hidden" />

              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Bienvenido</h1>
              <p className="text-gray-300 mb-8">Ingresá a tu cuenta para gestionar tu negocio.</p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="email" className="block text-white text-sm font-semibold mb-2">
                    Usuario o email
                  </label>
                  <div className="relative">
                    <User
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                      aria-hidden="true"
                    />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Ingrese su usuario o email"
                      className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/15 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 transition-colors"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-white text-sm font-semibold mb-2">
                    Contraseña
                  </label>
                  <div className="relative">
                    <Lock
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                      aria-hidden="true"
                    />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Ingrese su contraseña"
                      className="w-full pl-11 pr-11 py-3 bg-white/5 border border-white/15 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 transition-colors"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 bg-white/5 border border-white/20 rounded accent-yellow-400"
                    />
                    <span className="text-gray-300 text-sm">Recordarme</span>
                  </label>
                  {/* Sin disabled/aria-disabled: necesita responder al
                      click para mostrar el aviso — marcarlo
                      aria-disabled le mentiría a lectores de pantalla
                      sobre si el control reacciona (bug real
                      encontrado con un test de Playwright en un
                      rediseño anterior con un botón equivalente). */}
                  <button
                    type="button"
                    onClick={avisarRecuperacionNoDisponible}
                    className="text-yellow-400/70 hover:text-yellow-400 text-sm font-semibold transition-colors"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/40 rounded-lg">
                    <p role="alert" className="text-red-400 text-sm">
                      {error}
                    </p>
                  </div>
                )}

                {avisoDeshabilitado && (
                  <div className="p-3 bg-white/5 border border-white/15 rounded-lg">
                    <p className="text-gray-300 text-sm">
                      La recuperación de contraseña todavía no está disponible — contactá al dueño
                      para restablecerla.
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 px-4 bg-yellow-400 text-black font-bold rounded-lg hover:bg-yellow-300 active:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 focus:ring-offset-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? 'Ingresando…' : 'Ingresar'}
                  {!submitting && <span aria-hidden="true">→</span>}
                </button>
              </form>

              <div className="my-7 flex items-center gap-4">
                <div className="flex-1 h-px bg-white/15" />
                <span className="text-gray-500 text-sm">o</span>
                <div className="flex-1 h-px bg-white/15" />
              </div>

              {/* <a>, no <button onClick>: tiene que ser una navegación
                  real del navegador a la API (GET /auth/google), no un
                  fetch — Google no permite iniciar el flujo OAuth desde
                  XHR/fetch, necesita la navegación de nivel top para
                  poder mostrar su propia pantalla de consentimiento. */}
              <a
                href={`${API_BASE_URL}/auth/google`}
                className="w-full py-3 px-4 border border-white/20 text-gray-300 font-semibold rounded-lg hover:bg-white/5 transition-colors flex items-center justify-center gap-3"
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
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
