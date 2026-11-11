import {
  json,
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  type MetaFunction,
} from '@remix-run/node';
import { AuthShell } from '~/components/auth/AuthShell';
import { LoginForm } from '~/components/auth/LoginForm';
import {
  commitSession,
  getSession,
  loginWithNestJS,
  safeRedirectPath,
} from '~/services/auth.server';

export const meta: MetaFunction = () => [{ title: 'Ingresar · Wapsell' }];

/** "Recordarme": a persistent cookie; unchecked, the session ends with the browser. */
export const REMEMBER_ME_MAX_AGE = 60 * 60 * 24 * 30;

export async function loader({ request, params }: LoaderFunctionArgs) {
  const session = await getSession(request.headers.get('Cookie'));
  if (session.get('jwt')) {
    const redirectTo = new URL(request.url).searchParams.get('redirectTo');
    return redirect(safeRedirectPath(redirectTo, `/${params.lang ?? 'es'}/dashboard`));
  }
  return json({});
}

export async function action({ request, params }: ActionFunctionArgs) {
  const formData = await request.formData();
  const email = formData.get('email');
  const password = formData.get('password');
  const remember = formData.get('remember') === '1';

  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    return json(
      { error: 'Completa tu correo y tu contraseña.', email: typeof email === 'string' ? email : '' },
      { status: 400 },
    );
  }

  try {
    const { token, user, empresas, empresaId } = await loginWithNestJS(email, password);
    const session = await getSession();
    session.set('jwt', token);
    session.set('userId', user?.id);
    session.set('empresas', empresas);
    session.set('empresaId', empresaId ?? empresas[0]?.id);
    const redirectTo = new URL(request.url).searchParams.get('redirectTo');
    return redirect(safeRedirectPath(redirectTo, `/${params.lang ?? 'es'}/dashboard`), {
      headers: {
        'Set-Cookie': await commitSession(session, {
          maxAge: remember ? REMEMBER_ME_MAX_AGE : undefined,
        }),
      },
    });
  } catch (error) {
    if (error instanceof Response) {
      return json(
        { error: 'No pudimos conectarnos. Intenta de nuevo en unos minutos.', email },
        { status: 503 },
      );
    }
    return json({ error: 'El correo o la contraseña no son correctos.', email }, { status: 400 });
  }
}

export default function LoginPage() {
  return (
    <AuthShell>
      <LoginForm />
    </AuthShell>
  );
}
