'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthContext';

export default function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [touched, setTouched] = useState({
    email: false,
    password: false,
  });

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isEmailValid = formData.email === '' || emailRegex.test(formData.email);
  const showEmailError = touched.email && !isEmailValid;

  // Password validation
  const isPasswordValid = formData.password.length >= 1;
  const showPasswordError = touched.password && !isPasswordValid;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name } = e.target;
    setTouched(prev => ({
      ...prev,
      [name]: true,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Mark all fields as touched to show validation errors
    setTouched({
      email: true,
      password: true,
    });

    // Early return if validation fails
    if (!isEmailValid || !isPasswordValid) {
      setError('Por favor, completa los campos correctamente');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Login failed');
      }

      const data = await response.json();
      await login(data.token, data.empresas, data.empresaId);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 sm:px-0">
      <div className="bg-white rounded-2xl shadow-lg p-8 sm:p-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-[#1A1815] mb-2">
            Inicia Sesión
          </h1>
          <p className="text-base text-gray-600">
            Accede a tu cuenta Wapsell para continuar
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm font-medium animate-in fade-in">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email Field */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-semibold text-[#1A1815] mb-2"
            >
              Correo Electrónico
            </label>
            <div className="relative">
              <input
                id="email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="ejemplo@empresa.com"
                disabled={loading}
                required
                className={`w-full px-4 py-3 border rounded-lg transition-all outline-none ${
                  showEmailError
                    ? 'border-red-300 focus:ring-2 focus:ring-red-200 focus:border-red-400'
                    : 'border-[#E8E5E0] focus:ring-2 focus:ring-[#D97757] focus:ring-opacity-20 focus:border-[#D97757]'
                } ${loading ? 'bg-gray-50 text-gray-500' : 'bg-white'}`}
              />
              {showEmailError && (
                <svg
                  className="absolute right-3 top-3.5 w-5 h-5 text-red-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>
            {showEmailError && (
              <p className="mt-1 text-sm text-red-600">
                Por favor ingresa un correo válido
              </p>
            )}
          </div>

          {/* Password Field */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-[#1A1815]"
              >
                Contraseña
              </label>
              <a
                href="/auth/recover"
                className="text-xs text-[#D97757] hover:text-[#C86543] font-medium transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </a>
            </div>
            <div className="relative">
              <input
                id="password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="••••••••"
                disabled={loading}
                required
                className={`w-full px-4 py-3 border rounded-lg transition-all outline-none ${
                  showPasswordError
                    ? 'border-red-300 focus:ring-2 focus:ring-red-200 focus:border-red-400'
                    : 'border-[#E8E5E0] focus:ring-2 focus:ring-[#D97757] focus:ring-opacity-20 focus:border-[#D97757]'
                } ${loading ? 'bg-gray-50 text-gray-500' : 'bg-white'}`}
              />
              {showPasswordError && (
                <svg
                  className="absolute right-3 top-3.5 w-5 h-5 text-red-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>
            {showPasswordError && (
              <p className="mt-1 text-sm text-red-600">
                La contraseña es requerida
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 px-4 font-semibold text-white rounded-lg transition-all duration-200 ${
              loading
                ? 'bg-gray-400 cursor-not-allowed opacity-75'
                : 'bg-[#D97757] hover:bg-[#C86543] active:scale-95 shadow-sm hover:shadow-md'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              {loading && (
                <svg
                  className="w-5 h-5 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              )}
              <span>{loading ? 'Ingresando...' : 'Ingresar'}</span>
            </div>
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#E8E5E0]" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">o</span>
          </div>
        </div>

        {/* Sign Up Link */}
        <p className="text-center text-gray-700 text-sm">
          ¿No tienes cuenta?{' '}
          <a
            href="/auth/signup"
            className="text-[#D97757] font-semibold hover:text-[#C86543] transition-colors"
          >
            Regístrate aquí
          </a>
        </p>
      </div>

      {/* Footer Text */}
      <p className="text-center text-xs text-gray-500 mt-6">
        Al iniciar sesión aceptas nuestros{' '}
        <a href="/terms" className="text-[#D97757] hover:underline">
          términos de servicio
        </a>{' '}
        y{' '}
        <a href="/privacy" className="text-[#D97757] hover:underline">
          política de privacidad
        </a>
      </p>
    </div>
  );
}
