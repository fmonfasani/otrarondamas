import { getSession } from './services/auth.server';

export async function authMiddleware(request: Request) {
  const session = await getSession(request.headers.get('Cookie'));
  const jwt = session.get('jwt');
  const url = new URL(request.url);

  // Public routes (no auth required)
  const publicRoutes = [
    '/',
    '/es',
    '/en',
    '/es/auth',
    '/en/auth',
    '/api/health',
  ];

  const isPublicRoute = publicRoutes.some(route => url.pathname === route || url.pathname.startsWith(route + '/'));

  if (isPublicRoute) {
    return null;
  }

  // Protected routes (auth required)
  if (!jwt) {
    return new Response('Unauthorized', { status: 401 });
  }

  return null;
}
