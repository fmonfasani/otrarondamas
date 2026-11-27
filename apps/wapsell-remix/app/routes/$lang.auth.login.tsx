import {
  json,
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  type MetaFunction,
} from '@remix-run/node';
import { AuthShell } from '~/components/auth/AuthShell';
import { LoginForm } from '~/components/auth/LoginForm';
import { guardConnection } from '~/utils/connection';
import type { ClientActionFunctionArgs } from '@remix-run/react';
import {
  commitApiSession,
  commitSession,
  getSession,
  isMfaStep,
  loginWithNestJS,
  safeRedirectPath,
} from '~/services/auth.server';
import { deviceFrom } from '~/services/mfa.server';
import { buyerApi, buyerSignInCookie, type BuyerLogin } from '~/services/buyer-session.server';
import { buyerHome, workDestination } from '~/utils/entrada';

/** Where a buyer may be sent after signing in: their home or a store, nothing else. */
function buyerDestination(redirectTo: string | null) {
  // Marketplace: a customer lands in «Explorar» unless they were going to a store or their account.
  return buyerHome(safeRedirectPath(redirectTo, '/explorar'));
}

export const meta: MetaFunction = () => [{ title: 'Ingresar · Wapsell' }];

export { REMEMBER_ME_MAX_AGE } from '~/services/auth.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request.headers.get('Cookie'));
  if (session.get('jwt')) {
    const redirectTo = new URL(request.url).searchParams.get('redirectTo');
    return redirect(safeRedirectPath(redirectTo, `/panel`));
  }
  // «Ingresar con Google» only once Google OAuth is configured for this deployment.
  return json({ google: process.env.GOOGLE_LOGIN_ENABLED === '1' });
}

export async function action({ request, params }: ActionFunctionArgs) {
  const formData = await request.formData();
  const email = formData.get('email');
  const password = formData.get('password');
  const remember = formData.get('remember') === '1';

  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    return json(
      {
        error: 'Completa tu correo y tu contraseña.',
        email: typeof email === 'string' ? email : '',
      },
      { status: 400 },
    );
  }

  try {
    const result = await loginWithNestJS(email, password, await deviceFrom(request));
    const lang = params.lang ?? 'es';
    const redirectTo = workDestination(new URL(request.url).searchParams.get('redirectTo'), request.headers.get('Cookie'));
    if (isMfaStep(result)) {
      // OR-B4-044: the password is right; the second factor comes next. The ticket stays on
      // the web server (session cookie), never in the page.
      const session = await getSession(request.headers.get('Cookie'));
      session.set('mfaTicket', result.ticket);
      session.set('mfaStep', result.mfa);
      session.set('mfaRemember', remember);
      session.set('mfaRedirect', redirectTo);
      session.unset('mfaEnroll');
      const next = result.mfa === 'activar' ? 'activar-mfa' : 'verificacion';
      return redirect(`/${lang}/auth/${next}`, {
        headers: { 'Set-Cookie': await commitSession(session) },
      });
    }
    return redirect(redirectTo, {
      headers: { 'Set-Cookie': await commitApiSession(request, result, remember) },
    });
  } catch (error) {
    if (error instanceof Response) {
      return json(
        { error: 'No pudimos conectarnos. Intenta de nuevo en unos minutos.', email },
        { status: 503 },
      );
    }
    // ADR-IDN-008: the same entry signs in the universal buyer.
    const buyer = await buyerApi<BuyerLogin>('/login', { method: 'POST', body: { email, password } });
    if (buyer.ok) {
      return redirect(buyerDestination(new URL(request.url).searchParams.get('redirectTo')), {
        headers: { 'Set-Cookie': await buyerSignInCookie(request, buyer.data) },
      });
    }
    return json({ error: 'El correo o la contraseña no son correctos.', email }, { status: 400 });
  }
}

/** A dropped connection while sending becomes a message and one automatic retry, never an error page. */
export const clientAction = ({ serverAction }: ClientActionFunctionArgs) => guardConnection(() => serverAction<typeof action>());

export default function LoginPage() {
  return (
    <AuthShell>
      <LoginForm />
    </AuthShell>
  );
}
