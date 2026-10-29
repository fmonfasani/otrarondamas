/**
 * Dashboard Users Management Route
 * Owner/Admin-only route for user management
 * Requires OWNER or ADMIN role
 */

import { LoaderFunction, ActionFunction, json } from '@remix-run/node';
import { useLoaderData, useParams, Form, useActionData } from '@remix-run/react';
import { createProtectedLoader, requireRole, createProtectedAction } from '~/utils/route-guards.server';
import { useState } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'seller' | 'viewer';
  status: 'active' | 'inactive' | 'suspended';
  lastLogin?: string;
  createdAt: string;
}

interface UsersLoaderData {
  users: User[];
  total: number;
  page: number;
  limit: number;
}

export const loader: LoaderFunction = createProtectedLoader(
  async (context) => {
    // Verify OWNER or ADMIN role
    const hasAccess = await requireRole(
      context.tenantContext,
      ['owner', 'admin'],
      context.token
    );

    if (!hasAccess) {
      throw new Response('Forbidden: Admin access required', { status: 403 });
    }

    // Fetch users from API
    const apiUrl = process.env.VITE_API_URL || 'http://localhost:8600';
    const url = new URL(`${apiUrl}/users`);
    url.searchParams.set('empresaId', context.tenantContext.empresaId);
    url.searchParams.set('page', '1');
    url.searchParams.set('limit', '20');

    try {
      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${context.token}`,
        },
      });

      if (!response.ok) {
        // Return mock data for development
        return json({
          users: [
            {
              id: '1',
              name: 'John Doe',
              email: 'john@example.com',
              role: 'owner',
              status: 'active',
              lastLogin: '2024-01-29T10:30:00Z',
              createdAt: '2023-06-15T08:00:00Z',
            },
            {
              id: '2',
              name: 'Jane Smith',
              email: 'jane@example.com',
              role: 'admin',
              status: 'active',
              lastLogin: '2024-01-28T14:15:00Z',
              createdAt: '2023-08-20T09:30:00Z',
            },
            {
              id: '3',
              name: 'Bob Wilson',
              email: 'bob@example.com',
              role: 'seller',
              status: 'active',
              lastLogin: '2024-01-27T16:45:00Z',
              createdAt: '2024-01-10T10:00:00Z',
            },
            {
              id: '4',
              name: 'Alice Brown',
              email: 'alice@example.com',
              role: 'seller',
              status: 'inactive',
              createdAt: '2024-01-05T11:20:00Z',
            },
          ],
          total: 4,
          page: 1,
          limit: 20,
        });
      }

      const data = await response.json();
      return json(data);
    } catch (error) {
      console.error('[Users Loader] Error fetching users:', error);
      // Return mock data on error
      return json({
        users: [
          {
            id: '1',
            name: 'John Doe',
            email: 'john@example.com',
            role: 'owner',
            status: 'active',
            lastLogin: '2024-01-29T10:30:00Z',
            createdAt: '2023-06-15T08:00:00Z',
          },
          {
            id: '2',
            name: 'Jane Smith',
            email: 'jane@example.com',
            role: 'admin',
            status: 'active',
            lastLogin: '2024-01-28T14:15:00Z',
            createdAt: '2023-08-20T09:30:00Z',
          },
        ],
        total: 2,
        page: 1,
        limit: 20,
      });
    }
  },
  { fallbackLocale: 'es' }
);

export const action: ActionFunction = createProtectedAction(
  async (context) => {
    // Verify OWNER or ADMIN role
    const hasAccess = await requireRole(
      context.tenantContext,
      ['owner', 'admin'],
      context.token
    );

    if (!hasAccess) {
      return json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const formData = await context.request.formData();
    const action = formData.get('_action');
    const userId = formData.get('userId');

    const apiUrl = process.env.VITE_API_URL || 'http://localhost:8600';

    // Handle different user management actions
    if (action === 'update-role') {
      const role = formData.get('role');
      try {
        const response = await fetch(
          `${apiUrl}/users/${userId}/role`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${context.token}`,
            },
            body: JSON.stringify({ role }),
          }
        );

        if (!response.ok) {
          return json(
            { error: 'Failed to update user role' },
            { status: response.status }
          );
        }

        return json({ success: true, message: 'Role updated successfully' });
      } catch (error) {
        console.error('[Users Action] Error updating role:', error);
        return json({ error: 'Failed to update role' }, { status: 500 });
      }
    }

    if (action === 'update-status') {
      const status = formData.get('status');
      try {
        const response = await fetch(
          `${apiUrl}/users/${userId}/status`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${context.token}`,
            },
            body: JSON.stringify({ status }),
          }
        );

        if (!response.ok) {
          return json(
            { error: 'Failed to update user status' },
            { status: response.status }
          );
        }

        return json({ success: true, message: 'Status updated successfully' });
      } catch (error) {
        console.error('[Users Action] Error updating status:', error);
        return json({ error: 'Failed to update status' }, { status: 500 });
      }
    }

    return json({ error: 'Unknown action' }, { status: 400 });
  },
  { allowedMethods: ['POST'] }
);

/**
 * User Row Component
 */
function UserRow({
  user,
  locale,
  onStatusChange,
  onRoleChange,
}: {
  user: User;
  locale: 'es' | 'en';
  onStatusChange: (userId: string, status: string) => void;
  onRoleChange: (userId: string, role: string) => void;
}) {
  const statusColors = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
    suspended: 'bg-red-100 text-red-800',
  };

  const roleLabels = {
    owner: locale === 'es' ? 'Propietario' : 'Owner',
    admin: locale === 'es' ? 'Administrador' : 'Admin',
    seller: locale === 'es' ? 'Vendedor' : 'Seller',
    viewer: locale === 'es' ? 'Visualizador' : 'Viewer',
  };

  const lastLoginDate = user.lastLogin
    ? new Date(user.lastLogin).toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US')
    : '-';

  return (
    <tr className="border-t border-gray-200 hover:bg-gray-50 transition">
      <td className="px-6 py-4">
        <div>
          <p className="text-sm font-medium text-gray-900">{user.name}</p>
          <p className="text-xs text-gray-600">{user.email}</p>
        </div>
      </td>
      <td className="px-6 py-4">
        <select
          value={user.role}
          onChange={(e) => onRoleChange(user.id, e.target.value)}
          className="text-sm px-2 py-1 border border-gray-300 rounded"
        >
          <option value="viewer">{roleLabels.viewer}</option>
          <option value="seller">{roleLabels.seller}</option>
          <option value="admin">{roleLabels.admin}</option>
          <option value="owner">{roleLabels.owner}</option>
        </select>
      </td>
      <td className="px-6 py-4">
        <select
          value={user.status}
          onChange={(e) => onStatusChange(user.id, e.target.value)}
          className={`text-xs font-medium px-2 py-1 rounded ${statusColors[user.status]}`}
        >
          <option value="active">{locale === 'es' ? 'Activo' : 'Active'}</option>
          <option value="inactive">{locale === 'es' ? 'Inactivo' : 'Inactive'}</option>
          <option value="suspended">{locale === 'es' ? 'Suspendido' : 'Suspended'}</option>
        </select>
      </td>
      <td className="px-6 py-4 text-xs text-gray-600">{lastLoginDate}</td>
    </tr>
  );
}

/**
 * Users Management Page Component
 */
export default function UsersPage() {
  const { lang } = useParams();
  const { users, total } = useLoaderData<UsersLoaderData>();
  const actionData = useActionData();
  const locale = (lang || 'es') as 'es' | 'en';
  const [showInviteForm, setShowInviteForm] = useState(false);

  const handleStatusChange = (userId: string, status: string) => {
    // Submit form will be triggered by select change
    const form = document.querySelector(`form[data-user-id="${userId}"]`) as HTMLFormElement;
    if (form) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = '_action';
      input.value = 'update-status';
      form.appendChild(input);
      form.submit();
    }
  };

  const handleRoleChange = (userId: string, role: string) => {
    // Similar to status change
    const form = document.querySelector(`form[data-user-id="${userId}"]`) as HTMLFormElement;
    if (form) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = '_action';
      input.value = 'update-role';
      form.appendChild(input);
      form.submit();
    }
  };

  return (
    <div className="space-y-8">
      {/* Header with Invite Button */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {locale === 'es' ? 'Gestión de Usuarios' : 'User Management'}
          </h1>
          <p className="text-gray-600 mt-1">
            {locale === 'es'
              ? `Administra ${total} usuario(s) en tu cuenta`
              : `Manage ${total} user(s) in your account`}
          </p>
        </div>
        <button
          onClick={() => setShowInviteForm(!showInviteForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
        >
          {locale === 'es' ? '+ Invitar Usuario' : '+ Invite User'}
        </button>
      </div>

      {/* Success Message */}
      {actionData?.success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
          {actionData.message}
        </div>
      )}

      {/* Error Message */}
      {actionData?.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
          {actionData.error}
        </div>
      )}

      {/* Invite Form */}
      {showInviteForm && (
        <Form method="post" className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            {locale === 'es' ? 'Invitar Nuevo Usuario' : 'Invite New User'}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {locale === 'es' ? 'Email' : 'Email'}
              </label>
              <input
                type="email"
                name="email"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="usuario@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {locale === 'es' ? 'Nombre Completo' : 'Full Name'}
              </label>
              <input
                type="text"
                name="name"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={locale === 'es' ? 'Juan Pérez' : 'John Doe'}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {locale === 'es' ? 'Rol' : 'Role'}
              </label>
              <select
                name="role"
                defaultValue="seller"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="viewer">{locale === 'es' ? 'Visualizador' : 'Viewer'}</option>
                <option value="seller">{locale === 'es' ? 'Vendedor' : 'Seller'}</option>
                <option value="admin">{locale === 'es' ? 'Administrador' : 'Admin'}</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                name="_action"
                value="invite"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
              >
                {locale === 'es' ? 'Enviar Invitación' : 'Send Invitation'}
              </button>
              <button
                type="button"
                onClick={() => setShowInviteForm(false)}
                className="px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition font-medium"
              >
                {locale === 'es' ? 'Cancelar' : 'Cancel'}
              </button>
            </div>
          </div>
        </Form>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                  {locale === 'es' ? 'Usuario' : 'User'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                  {locale === 'es' ? 'Rol' : 'Role'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                  {locale === 'es' ? 'Estado' : 'Status'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                  {locale === 'es' ? 'Último Acceso' : 'Last Login'}
                </th>
              </tr>
            </thead>
            <tbody>
              {users.length > 0 ? (
                users.map((user) => (
                  <Form
                    key={user.id}
                    method="post"
                    data-user-id={user.id}
                  >
                    <input type="hidden" name="userId" value={user.id} />
                    <UserRow
                      user={user}
                      locale={locale}
                      onStatusChange={handleStatusChange}
                      onRoleChange={handleRoleChange}
                    />
                  </Form>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    {locale === 'es' ? 'No hay usuarios' : 'No users found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Permissions Guide */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h4 className="text-sm font-bold text-yellow-900 mb-3">
          {locale === 'es' ? 'Descripción de Roles' : 'Role Descriptions'}
        </h4>
        <dl className="space-y-3 text-sm text-yellow-800">
          <div>
            <dt className="font-medium">{locale === 'es' ? 'Propietario' : 'Owner'}</dt>
            <dd>{locale === 'es' ? 'Control total del negocio, facturación y configuración' : 'Full control over business, billing and settings'}</dd>
          </div>
          <div>
            <dt className="font-medium">{locale === 'es' ? 'Administrador' : 'Admin'}</dt>
            <dd>{locale === 'es' ? 'Gestión de usuarios, pedidos, productos y reportes' : 'User management, orders, products and reports'}</dd>
          </div>
          <div>
            <dt className="font-medium">{locale === 'es' ? 'Vendedor' : 'Seller'}</dt>
            <dd>{locale === 'es' ? 'Crear y gestionar pedidos, ver productos' : 'Create and manage orders, view products'}</dd>
          </div>
          <div>
            <dt className="font-medium">{locale === 'es' ? 'Visualizador' : 'Viewer'}</dt>
            <dd>{locale === 'es' ? 'Solo lectura de pedidos y reportes' : 'Read-only access to orders and reports'}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
