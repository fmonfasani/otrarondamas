import { Outlet } from '@remix-run/react';

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Wapsell</h1>
          <p className="text-gray-500 mt-2">Business Management</p>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
