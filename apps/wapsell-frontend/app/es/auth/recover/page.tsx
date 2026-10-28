'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import Link from 'next/link';

export default function RecoverPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Request failed');
      }

      setSubmitted(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FAF9F5] via-[#FCF9F5] to-[#F8F5F0] flex flex-col items-center justify-center px-4 py-8 sm:py-12">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#D97757] rounded-full opacity-5" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#6A9BCC] rounded-full opacity-5" />
      </div>

      {/* Main content */}
      <div className="w-full max-w-md relative z-10">
        {/* Logo and branding */}
        <div className="text-center mb-10 sm:mb-12">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#D97757] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg sm:text-xl">W</span>
            </div>
            <span className="text-3xl sm:text-4xl font-bold text-[#1A1815]">Wapsell</span>
          </div>

          {/* Tagline */}
          <p className="text-sm sm:text-base text-gray-600">Recupera tu contraseña</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 sm:p-10">
          {!submitted ? (
            <>
              <h1 className="text-3xl sm:text-4xl font-bold text-[#1A1815] mb-2">
                Recupera tu contraseña
              </h1>
              <p className="text-base text-gray-600 mb-8">
                Ingresa tu correo electrónico y te enviaremos un enlace para resetear tu contraseña.
              </p>

              {/* Error Message */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm font-medium">
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
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-semibold text-[#1A1815] mb-2"
                  >
                    Correo Electrónico
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ejemplo@empresa.com"
                    disabled={loading}
                    required
                    className="w-full px-4 py-3 border border-[#E8E5E0] rounded-lg focus:ring-2 focus:ring-[#D97757] focus:ring-opacity-20 focus:border-[#D97757] outline-none transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-3 px-4 font-semibold text-white rounded-lg transition-all duration-200 ${
                    loading
                      ? 'bg-gray-400 cursor-not-allowed opacity-75'
                      : 'bg-[#D97757] hover:bg-[#C86543] active:scale-95'
                  }`}
                >
                  {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
                </button>
              </form>
            </>
          ) : (
            <>
              {/* Success State */}
              <div className="text-center">
                <div className="mb-6 flex justify-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </div>

                <h2 className="text-2xl font-bold text-[#1A1815] mb-2">¡Correo enviado!</h2>
                <p className="text-gray-600 mb-8">
                  Hemos enviado un enlace de recuperación a{' '}
                  <span className="font-semibold">{email}</span>. Por favor revisa tu bandeja de
                  entrada.
                </p>

                <Link
                  href="/auth/login"
                  className="inline-block py-3 px-6 bg-[#D97757] text-white font-semibold rounded-lg hover:bg-[#C86543] transition-colors"
                >
                  Volver al login
                </Link>
              </div>
            </>
          )}

          {/* Back to login link */}
          {!submitted && (
            <p className="text-center mt-6 text-gray-600 text-sm">
              ¿Recuerdas tu contraseña?{' '}
              <Link
                href="/auth/login"
                className="text-[#D97757] font-semibold hover:text-[#C86543] transition-colors"
              >
                Volver al login
              </Link>
            </p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-16 sm:mt-20 text-center text-xs text-gray-500 relative z-10">
        <p>© 2026 Wapsell. Todos los derechos reservados.</p>
      </div>
    </div>
  );
}
