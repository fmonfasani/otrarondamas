import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, ApiError } from './AuthContext';
import { Button, Input } from '../../components';
import loginHero from '../../assets/login-hero.webp';

/**
 * Rediseño visual siguiendo assets/brand/Login.png (mockup del dueño).
 * Alcance acotado a lo visual: el login sigue siendo el real contra
 * POST /auth/login (ver AuthContext) — nada de esto es mock.
 *
 * "Ingresar con Google", "¿Olvidaste tu contraseña?" y "Recordarme" del
 * mockup NO se implementan funcionalmente en este incremento (decisión
 * explícita del dueño): no hay integración OAuth con Google, no hay
 * flujo de recuperación de contraseña, y el token ya persiste en
 * localStorage sin necesidad de un checkbox. Se omiten en vez de
 * mostrarse como botones que no hacen nada — un control que no cumple
 * lo que promete es peor que no mostrarlo.
 */
export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
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

  return (
    <div className="flex min-h-screen">
      {/* Panel izquierdo: imagen de marca (logo + bullets ya están
          dibujados en el propio asset, ver assets/brand/Login.png).
          Oculto en mobile — el formulario pasa a ocupar toda la
          pantalla, igual que la referencia del mockup, que está pensada
          como layout de escritorio. */}
      <div
        className="hidden md:block md:w-1/2 lg:w-2/5 bg-cover"
        style={{ backgroundImage: `url(${loginHero})`, backgroundPosition: 'top center' }}
        role="img"
        aria-label="Otra Ronda Más — envíos rápidos, amplio catálogo, las mejores marcas, precios mayoristas"
      />

      {/* Panel derecho: formulario real */}
      <div className="flex-1 flex items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-md">
          <h1 className="text-h1 font-bold text-brand-dark mb-2">Iniciar sesión</h1>
          <p className="text-gray-600 mb-8">
            Accedé a tu cuenta y gestioná tus pedidos, clientes y ventas.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              id="email"
              label="Usuario o email"
              type="email"
              placeholder="Ingrese su usuario o email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              id="password"
              label="Contraseña"
              type="password"
              placeholder="Ingrese su contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {error && (
              <p role="alert" className="text-brand-error text-small">
                {error}
              </p>
            )}

            <Button type="submit" disabled={submitting} className="w-full" size="lg">
              {submitting ? 'Ingresando…' : 'Ingresar'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
