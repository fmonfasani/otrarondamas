import { redirect, json, type ActionFunction, type LoaderFunction } from '@remix-run/node';
import { Link } from '@remix-run/react';
import { LoginForm } from '~/components/auth/LoginForm';
import { loginWithNestJS, getSession, commitSession } from '~/services/auth.server';

export const loader: LoaderFunction = async ({ request }) => {
  const session = await getSession(request.headers.get('Cookie'));
  if (session.get('jwt')) return redirect('/es/dashboard');
  return json({});
};

export const action: ActionFunction = async ({ request, params }) => {
  if (request.method !== 'POST') return null;
  const formData = await request.formData();
  const email = formData.get('email');
  const password = formData.get('password');

  if (typeof email !== 'string' || typeof password !== 'string') {
    return json({ error: 'Formulario inválido' }, { status: 400 });
  }

  try {
    const { token, user, empresas } = await loginWithNestJS(email, password);
    const session = await getSession();
    session.set('jwt', token);
    session.set('userId', user.id);
    session.set('empresas', empresas);
    session.set('empresaId', empresas[0]?.id);
    const locale = params.lang || 'es';
    return redirect(`/${locale}/dashboard`, {
      headers: { 'Set-Cookie': await commitSession(session) },
    });
  } catch (error) {
    if (error instanceof Response) throw error;
    return json({ error: 'Email o contraseña incorrectos' }, { status: 400 });
  }
};

export default function LoginPage() {
  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <Link to="/" className="app-brand">
          <span className="brand-mark">W</span>
          <span>WAPSELL</span>
        </Link>
        <h1>Ingresar</h1>
        <LoginForm />
      </div>
    </div>
  );
}
