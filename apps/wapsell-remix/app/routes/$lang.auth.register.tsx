import { json, type ActionFunction } from '@remix-run/node';
import { redirect } from '@remix-run/react';
import { RegisterForm } from '~/components/auth/RegisterForm';

interface RegisterData {
  email: string;
  password: string;
  name: string;
  confirmPassword: string;
}

export const action: ActionFunction = async ({ request, params }) => {
  if (request.method !== 'POST') return null;

  const formData = await request.formData();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const name = formData.get('name') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  // Validate form data
  if (!email || !password || !name || !confirmPassword) {
    return json({ error: 'All fields are required' }, { status: 400 });
  }

  // Validate password match
  if (password !== confirmPassword) {
    return json({ error: 'Passwords do not match' }, { status: 400 });
  }

  // Validate password length
  if (password.length < 6) {
    return json({ error: 'Password must be at least 6 characters' }, { status: 400 });
  }

  try {
    const apiUrl = process.env.VITE_API_URL || 'http://localhost:3000';
    const response = await fetch(`${apiUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });

    if (!response.ok) {
      const error = await response.json();
      return json({ error: error.message || 'Registration failed' }, { status: 400 });
    }

    const locale = params.lang || 'es';
    return redirect(`/${locale}/auth/login`);
  } catch (error) {
    return json({ error: 'Registration failed. Please try again.' }, { status: 500 });
  }
};

export default function RegisterPage() {
  return <RegisterForm />;
}
