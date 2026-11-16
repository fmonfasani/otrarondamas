import { Outlet, isRouteErrorResponse, useRouteError } from '@remix-run/react';
import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { requireAuth } from '~/services/auth.server';
import { platformRequest } from '~/utils/platform';

/**
 * Wapsell platform administration area (OR-B4-020). Signed-in only, and only for the
 * platform administrators the API recognises (PLATFORM_ADMIN_EMAILS); a Business role,
 * even Owner, is not enough.
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const token = await requireAuth(request);
  await platformRequest(token, '/overview');
  return json({ authorized: true });
}

export default function PlatformAdminLayout() {
  return (
    <div data-area="platform-admin">
      <Outlet />
    </div>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const denied = isRouteErrorResponse(error) && error.status === 403;
  const missing = isRouteErrorResponse(error) && error.status === 404;
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f6f2] p-6 text-[#211f1b]">
      <div className="max-w-md rounded-2xl border border-[#e8e4dc] bg-white p-8 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#99938b]">Wapsell · Plataforma</p>
        <h1 className="mt-3 text-xl font-semibold">
          {denied ? 'Sección reservada' : missing ? 'No encontrado' : 'No pudimos cargar la plataforma'}
        </h1>
        <p className="mt-2 text-sm text-[#77736d]">
          {denied
            ? 'Esta sección es solo para el equipo administrador de Wapsell.'
            : missing
              ? 'Ese negocio no existe.'
              : 'Probá de nuevo en unos minutos.'}
        </p>
        <a href="/es/dashboard" className="mt-6 inline-block text-sm font-medium text-[#b85c4a] underline">
          Ir a mi panel
        </a>
      </div>
    </main>
  );
}
