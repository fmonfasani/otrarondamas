import { Form, useActionData, redirect } from '@remix-run/react';
import { json, type ActionFunction, type LoaderFunction } from '@remix-run/node';
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
  const actionData = useActionData<typeof action>();

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h1 className="text-2xl font-bold mb-6">Login</h1>

        <Form method="post">
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Email
            </label>
            <input
              type="email"
              name="email"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              Password
            </label>
            <input
              type="password"
              name="password"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {actionData?.error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
              {actionData.error}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition"
          >
            Sign In
          </button>
        </Form>
      </div>
    </div>
  );
}
