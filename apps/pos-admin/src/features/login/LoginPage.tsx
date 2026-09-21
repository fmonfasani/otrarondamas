import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && password) {
      // Guardar en localStorage que está logueado
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('userEmail', email);
      // Redirigir al dashboard
      navigate('/');
    }
  };

  return (
    <div className="flex h-screen">
      {/* Left side - Logo */}
      <div className="hidden md:flex w-1/2 bg-brand-dark flex-col items-center justify-center p-8">
        <div className="text-center">
          <div className="text-8xl mb-8">🍷</div>
          <h1 className="text-6xl font-bold text-brand-yellow mb-4">OTRA</h1>
          <h1 className="text-6xl font-bold text-white mb-2">RONDA</h1>
          <h1 className="text-6xl font-bold text-brand-yellow">MAS</h1>
          <p className="text-gray-400 text-xl mt-8">Gestión Comercial</p>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="w-full md:w-1/2 bg-gray-100 flex items-center justify-center p-8">
        <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-3xl font-bold text-brand-dark mb-2">Login</h2>
          <p className="text-gray-600 mb-8">Ingresá a tu cuenta</p>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-brand-dark mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:border-brand-yellow focus:ring-2 focus:ring-brand-yellow focus:ring-opacity-20"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-brand-dark mb-2">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:border-brand-yellow focus:ring-2 focus:ring-brand-yellow focus:ring-opacity-20"
                required
              />
            </div>

            <Button variant="primary" className="w-full" type="submit">
              Ingresar
            </Button>
          </form>

          <div className="mt-8 p-4 bg-blue-50 rounded-md border border-blue-200">
            <p className="text-xs text-gray-600 font-semibold mb-2">CREDENCIALES DEMO:</p>
            <p className="text-xs text-gray-700">Email: demo@otraronda.com</p>
            <p className="text-xs text-gray-700">Contraseña: demo123</p>
            <p className="text-xs text-gray-500 mt-2">(Usa cualquier combinación - demo sin validación)</p>
          </div>
        </div>
      </div>
    </div>
  );
};
