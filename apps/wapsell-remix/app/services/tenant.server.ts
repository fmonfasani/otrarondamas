import { getSession } from './auth.server';

export interface TenantContext {
  empresaId: string;
  empresaName: string;
  userId: string;
}

export async function getTenantFromSession(
  request: Request
): Promise<TenantContext | null> {
  const session = await getSession(request.headers.get('Cookie'));

  const empresaId = session.get('empresaId');
  const empresaName = session.get('empresaName');
  const userId = session.get('userId');

  if (!empresaId || !userId) {
    return null;
  }

  return { empresaId, empresaName, userId };
}

export async function validateTenantAccess(
  request: Request,
  requiredEmpresaId: string
): Promise<boolean> {
  const tenant = await getTenantFromSession(request);

  if (!tenant) {
    return false;
  }

  return tenant.empresaId === requiredEmpresaId;
}

export function appendTenantHeaders(
  headers: HeadersInit,
  tenant: TenantContext
): HeadersInit {
  return {
    ...headers,
    'X-Empresa-Id': tenant.empresaId,
    'X-User-Id': tenant.userId,
  };
}

export async function fetchTenantData(
  endpoint: string,
  request: Request,
  options: RequestInit = {}
) {
  const tenant = await getTenantFromSession(request);

  if (!tenant) {
    throw new Response('Unauthorized', { status: 401 });
  }

  const session = await getSession(request.headers.get('Cookie'));
  const jwt = session.get('jwt');

  const headers = appendTenantHeaders(
    {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    },
    tenant
  );

  const response = await fetch(
    `${process.env.VITE_API_URL}${endpoint}`,
    {
      ...options,
      headers,
    }
  );

  return response;
}
