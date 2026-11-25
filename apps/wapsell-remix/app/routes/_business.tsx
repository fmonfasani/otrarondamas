import { json, redirect, type LinksFunction, type LoaderFunctionArgs } from '@remix-run/node';
import { Outlet, useLoaderData, useParams } from '@remix-run/react';
import panelStyles from '../styles/panel.css?url';
import { AppShell, type ShellUser } from '~/components/panel/AppShell';
import { requireAuth, getCurrentUser, sessionDossierState } from '~/services/auth.server';
import { dossierStanding } from '~/utils/team';
import { LiveContext, useLiveSource } from '~/hooks/useLiveUpdates';
import { useUnreadAlerts } from '~/hooks/useUnreadAlerts';

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
  // ADR-IDN-014: the internal Wapsell business has no business panel — its accounts administer
  // the platform.
  if (user.empresaInterna) throw redirect('/es/platform-admin');
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
  // E1/E2: one live stream per tab for the whole panel — the menu's unread count and the
  // Mensajes screen share it.
  const live = useLiveSource('/panel/mensajes/eventos');
  const unread = useUnreadAlerts(live);
  return (
    <LiveContext.Provider value={live}>
      <AppShell user={user} lang={lang} unread={unread.total}>
        <Outlet />
      </AppShell>
    </LiveContext.Provider>
  );
}
