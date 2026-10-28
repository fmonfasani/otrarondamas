import { createCookieSessionStorage } from '@remix-run/node';

// Session storage configuration
export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: '__session',
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
    sameSite: 'lax',
    secrets: [process.env.SESSION_SECRET || 'dev-secret'],
    secure: process.env.NODE_ENV === 'production',
  },
});

export const { getSession, commitSession, destroySession } = sessionStorage;

// JWT validation function
export async function validateJWT(token: string): Promise<boolean> {
  try {
    if (!token) return false;

    const response = await fetch(`${process.env.VITE_API_URL}/auth/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    return response.ok;
  } catch {
    return false;
  }
}

// Get current user from NestJS API
export async function getCurrentUser(token: string) {
  try {
    const response = await fetch(`${process.env.VITE_API_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

// Login function (call NestJS API)
export async function loginWithNestJS(email: string, password: string) {
  try {
    const response = await fetch(`${process.env.VITE_API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error('Invalid credentials');
    }

    const data = await response.json();
    return {
      token: data.access_token,
      user: data.user,
      empresas: data.empresas,
    };
  } catch (error) {
    throw new Error('Login failed');
  }
}

// Require auth middleware
export async function requireAuth(request: Request) {
  const session = await getSession(request.headers.get('Cookie'));
  const token = session.get('jwt');

  if (!token) {
    throw new Response('Unauthorized', { status: 401 });
  }

  const isValid = await validateJWT(token);
  if (!isValid) {
    throw new Response('Token expired', { status: 401 });
  }

  return token;
}
