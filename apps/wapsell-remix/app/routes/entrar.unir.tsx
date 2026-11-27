import { json, redirect, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';
import { Link, useLoaderData } from '@remix-run/react';
import { AuthShell } from '~/components/auth/AuthShell';
import { ApiError, apiRequest } from '~/services/api.server';
import { requireAuth } from '~/services/auth.server';
import { buyerSignInCookie, type BuyerLogin } from '~/services/buyer-session.server';

export const meta: MetaFunction = () => [{ title: 'Unir tus cuentas · Wapsell' }];

/**
 * Login por rol — the emailed link that joins the customer account to the work account. It must
 * be opened with the work session (if not, the login comes first and brings the person back here):
 * the work account and the email inbox are proven by the same person.
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const token = await requireAuth(request);
  const link = new URL(request.url).searchParams.get('token') ?? '';
  try {
    const login = await apiRequest<BuyerLogin>(token, '/auth/comprador/vinculo/confirmar', {
      method: 'POST',
      body: JSON.stringify({ token: link }),
    });
    return redirect('/cuenta?unida=1', { headers: { 'Set-Cookie': await buyerSignInCookie(request, login) } });
  } catch (error) {
    if (error instanceof ApiError) return json({ error: error.message });
    throw error;
  }
}

export default function Unir() {
  const { error } = useLoaderData<typeof loader>();
  return (
    <AuthShell>
      <div className="ws-entrar">
        <h1>No pudimos unir tus cuentas</h1>
        <p className="ws-alert" role="alert">
          {error}
        </p>
        <Link className="ws-button ws-button--primary" to="/entrar">
          Volver a intentar
        </Link>
      </div>
    </AuthShell>
  );
}
