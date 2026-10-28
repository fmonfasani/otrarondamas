import { redirect, json, type ActionFunction, type LoaderFunction } from '@remix-run/node';
import { LoginForm } from '~/components/auth/LoginForm';
import { loginWithNestJS, getSession, commitSession } from '~/services/auth.server';

export const loader: LoaderFunction = async ({ request }) => {
  const session = await getSession(request.headers.get('Cookie'));
  const jwt = session.get('jwt');

  // If already logged in, redirect to dashboard
  if (jwt) {
    return redirect('/es/dashboard');
  }

  return json({});
};

export const action: ActionFunction = async ({ request, params }) => {
  if (request.method !== 'POST') return null;

  const formData = await request.formData();
  const email = formData.get('email');
  const password = formData.get('password');

  if (typeof email !== 'string' || typeof password !== 'string') {
    return json({ error: 'Invalid form data' }, { status: 400 });
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
      headers: {
        'Set-Cookie': await commitSession(session),
      },
    });
  } catch (error) {
    return json(
      { error: 'Invalid credentials' },
      { status: 400 }
    );
  }
};

export default function LoginPage() {
  return <LoginForm />;
}
