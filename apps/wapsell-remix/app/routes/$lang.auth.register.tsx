import { json, type ActionFunction, type LoaderFunction } from '@remix-run/node';
import { redirect } from '@remix-run/node';
import { Link } from '@remix-run/react';
import { RegisterForm } from '~/components/auth/RegisterForm';
import { getApiBaseUrl } from '~/services/api.server';
import { getSession } from '~/services/auth.server';

export const loader: LoaderFunction = async ({ request }) => {
  const session = await getSession(request.headers.get('Cookie'));
  if (session.get('jwt')) return redirect('/es/dashboard');
  return json({});
};

export const action: ActionFunction = async ({ request, params }) => {
  if (request.method !== 'POST') return null;

  const formData = await request.formData();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const name = formData.get('name') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  if (!email || !password || !name || !confirmPassword) {
    return json({ error: 'Todos los campos son requeridos' }, { status: 400 });
  }

  if (password !== confirmPassword) {
    return json({ error: 'Las contraseñas no coinciden' }, { status: 400 });
  }

  if (password.length < 6) {
    return json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 });
  }

  try {
    const apiUrl = getApiBaseUrl();
    const response = await fetch(`${apiUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      const message = typeof data.message === 'string' ? data.message : 'El registro falló. Intentá más tarde.';
      return json({ error: message }, { status: 400 });
    }

    const locale = params.lang || 'es';
    return redirect(`/${locale}/auth/login`);
  } catch (error) {
    if (error instanceof Response) throw error;
    return json({ error: 'El registro falló. Intentá más tarde.' }, { status: 502 });
  }
};

export default function RegisterPage() {
  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <Link to="/" className="app-brand">
          <span className="brand-mark">W</span>
          <span>WAPSELL</span>
        </Link>
        <h1>Crear cuenta</h1>
        <RegisterForm />
      </div>
    </div>
  );
}
