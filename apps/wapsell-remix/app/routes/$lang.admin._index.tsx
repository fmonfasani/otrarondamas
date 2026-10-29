/**
 * Admin Panel Route
 * Administrative interface for system management
 */

import type { LoaderFunction, MetaFunction } from '@remix-run/node';
import { useLoaderData, useParams } from '@remix-run/react';
import { createProtectedLoader } from '~/utils/route-guards.server';
import { getTenantContext } from '~/utils/tenant-context.server';

interface AdminLoaderData {
  tenantContext: any;
  locale: string;
}

const adminLoader: LoaderFunction = async ({ request, params }) => {
  // Admin routes require elevated permissions
  // In production, verify user role via API
  return createProtectedLoader(
    async (context) => {
      const tenantContext = await getTenantContext(request);
      return {
        tenantId: tenantContext?.empresaId,
      };
    },
    { fallbackLocale: params.lang as string }
  )(
    { request, params } as any
  );
};

export const loader = adminLoader;

export const meta: MetaFunction<typeof loader> = () => [
  { title: 'Admin - Wapsell' },
  { name: 'description', content: 'Administration Panel' },
];

export default function AdminPanel() {
  const { locale } = useLoaderData<AdminLoaderData>();
  const { lang } = useParams();

  const adminSections = [
    {
      title: lang === 'es' ? 'Usuarios' : 'Users',
      description: lang === 'es' ? 'Gestiona usuarios del sistema' : 'Manage system users',
      icon: '👥',
      href: '/usuarios',
    },
    {
      title: lang === 'es' ? 'Permisos' : 'Permissions',
      description: lang === 'es' ? 'Configura permisos y roles' : 'Configure permissions and roles',
      icon: '🔐',
      href: '/permisos',
    },
    {
      title: lang === 'es' ? 'Configuración' : 'Settings',
      description: lang === 'es' ? 'Configuración del sistema' : 'System settings',
      icon: '⚙️',
      href: '/configuracion',
    },
    {
      title: lang === 'es' ? 'Auditoría' : 'Audit',
      description: lang === 'es' ? 'Registros de auditoría' : 'Audit logs',
      icon: '📋',
      href: '/auditoria',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          {lang === 'es' ? 'Panel Administrativo' : 'Admin Panel'}
        </h1>
        <p className="text-gray-600 mt-2">
          {lang === 'es'
            ? 'Gestiona tu sistema y configuraciones'
            : 'Manage your system and settings'}
        </p>
      </div>

      {/* Admin Sections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {adminSections.map((section) => (
          <div
            key={section.href}
            className="bg-white rounded-lg shadow hover:shadow-lg transition p-6 cursor-pointer"
          >
            <div className="flex items-start gap-4">
              <div className="text-4xl">{section.icon}</div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  {section.title}
                </h3>
                <p className="text-gray-600 text-sm mt-1">
                  {section.description}
                </p>
                <button className="mt-4 text-blue-600 font-medium text-sm hover:text-blue-700 transition">
                  {lang === 'es' ? 'Acceder →' : 'Access →'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {lang === 'es' ? 'Actividad Reciente' : 'Recent Activity'}
        </h2>
        <div className="space-y-3">
          <div className="py-3 border-b border-gray-200 flex justify-between items-center">
            <span className="text-sm text-gray-600">
              {lang === 'es' ? 'Usuario creado' : 'User created'}
            </span>
            <span className="text-xs text-gray-500">
              {lang === 'es' ? 'Hace 2 horas' : '2 hours ago'}
            </span>
          </div>
          <div className="py-3 border-b border-gray-200 flex justify-between items-center">
            <span className="text-sm text-gray-600">
              {lang === 'es' ? 'Configuración actualizada' : 'Settings updated'}
            </span>
            <span className="text-xs text-gray-500">
              {lang === 'es' ? 'Hace 1 día' : '1 day ago'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
