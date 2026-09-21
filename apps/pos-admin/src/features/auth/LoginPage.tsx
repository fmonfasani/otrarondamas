import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, ApiError } from './AuthContext';
import { Button, Card, CardBody, CardHeader, Input } from '../../components';

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
    <div className="flex items-center justify-center min-h-screen bg-brand-light px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-h2 font-bold text-brand-dark">OtraRonda</h1>
          <p className="text-gray-600">Ingresá a tu cuenta</p>
        </div>
        <Card>
          <CardHeader>
            <h2 className="text-h3 font-bold">Login</h2>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                id="email"
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Input
                id="password"
                label="Contraseña"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              {error && (
                <p role="alert" className="text-brand-error text-small">
                  {error}
                </p>
              )}
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? 'Ingresando...' : 'Ingresar'}
              </Button>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
