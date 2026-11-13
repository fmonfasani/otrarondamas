import { json, type LinksFunction, type LoaderFunctionArgs } from '@remix-run/node';
import { Outlet, useLoaderData, useParams } from '@remix-run/react';
import panelStyles from '../styles/panel.css?url';
import { AppShell, type ShellUser } from '~/components/panel/AppShell';
import { requireAuth, getCurrentUser, sessionDossierState } from '~/services/auth.server';
import { dossierStanding } from '~/utils/team';

export const links: LinksFunction = () => [{ rel: 'stylesheet', href: panelStyles }];

/**
 * Business panel layout. Requires a staff session (anonymous visitors go to the login
 * page and come back). This layout is NOT a security boundary: the API authorizes every
 * call with the role matrix.
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const token = await requireAuth(request);
  const user = await getCurrentUser(token);
  if (!user) throw new Response('No pudimos verificar tu sesión.', { status: 401 });
  const shellUser: ShellUser = {
    nombre: user.nombre ?? user.email,
    empresaNombre: user.empresaNombre ?? '',
    rol: user.rol ?? '',
    dossier: dossierStanding(user.rol ?? '', user.estadoLegajo, sessionDossierState(token)),
  };
  return json({ user: shellUser });
}

export default function BusinessLayout() {
  const { user } = useLoaderData<typeof loader>();
  const { lang = 'es' } = useParams();
  return (
    <AppShell user={user} lang={lang}>
      <Outlet />
    </AppShell>
  );
}
