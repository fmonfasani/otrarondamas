/**
 * User Management Panel Component
 * Displays table of team members with role and status management
 * Allows inline editing and deletion with confirmation
 */

import { Form } from '@remix-run/react';
import { useState } from 'react';
import ConfirmationDialog from './ConfirmationDialog';

interface User {
  id: string;
  nombre?: string;
  name?: string;
  email: string;
  role: 'OWNER' | 'ADMIN' | 'MANAGER' | 'STAFF' | 'READONLY';
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  lastAccessAt?: string;
  joinedAt: string;
}

interface UserManagementPanelProps {
  users: User[];
  currentUserId: string;
  isLoading?: boolean;
}

const ROLE_LABELS = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  STAFF: 'Staff',
  READONLY: 'Viewer',
};

const ROLE_COLORS = {
  OWNER: 'bg-purple-100 text-purple-800',
  ADMIN: 'bg-blue-100 text-blue-800',
  MANAGER: 'bg-green-100 text-green-800',
  STAFF: 'bg-yellow-100 text-yellow-800',
  READONLY: 'bg-gray-100 text-gray-800',
};

const STATUS_COLORS = {
  ACTIVE: 'bg-green-100 text-green-800',
  INACTIVE: 'bg-gray-100 text-gray-800',
  SUSPENDED: 'bg-red-100 text-red-800',
};

export default function UserManagementPanel({
  users,
  currentUserId,
  isLoading = false,
}: UserManagementPanelProps) {
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<string | null>(null);

  const userName = (user: User) => user.nombre || user.name || user.email;

  const lastAccess = (date?: string) => {
    if (!date) return 'Never';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            {/* Header */}
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                  Last Access
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                  Actions
                </th>
              </tr>
            </thead>

            {/* Body */}
            <tbody className="divide-y divide-gray-200">
              {users.map((user) => {
                const isCurrentUser = user.id === currentUserId;
                const isEditing = editingRole === user.id;

                return (
                  <tr key={user.id} className="hover:bg-gray-50 transition">
                    {/* User Info */}
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {userName(user)}
                          {isCurrentUser && (
                            <span className="ml-2 text-xs text-blue-600 font-semibold">
                              (You)
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-600">{user.email}</p>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-6 py-4">
                      {isEditing && !isCurrentUser ? (
                        <Form method="post" className="inline">
                          <input type="hidden" name="_action" value="update" />
                          <input type="hidden" name="userId" value={user.id} />
                          <select
                            name="role"
                            defaultValue={user.role}
                            onChange={(e) => {
                              e.currentTarget.form?.submit();
                            }}
                            disabled={isLoading}
                            className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="READONLY">Viewer</option>
                            <option value="STAFF">Staff</option>
                            <option value="MANAGER">Manager</option>
                            <option value="ADMIN">Admin</option>
                            <option value="OWNER">Owner</option>
                          </select>
                        </Form>
                      ) : (
                        <span
                          className={`inline-block px-3 py-1 text-xs font-semibold rounded ${
                            ROLE_COLORS[user.role]
                          } cursor-pointer hover:opacity-80`}
                          onClick={() => !isCurrentUser && setEditingRole(user.id)}
                        >
                          {ROLE_LABELS[user.role]}
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      {user.status && (
                        <span
                          className={`inline-block px-3 py-1 text-xs font-semibold rounded ${
                            STATUS_COLORS[user.status]
                          }`}
                        >
                          {user.status}
                        </span>
                      )}
                    </td>

                    {/* Last Access */}
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {lastAccess(user.lastAccessAt)}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {!isCurrentUser && (
                          <>
                            <button
                              onClick={() => setEditingRole(isEditing ? null : user.id)}
                              className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
                            >
                              {isEditing ? 'Cancel' : 'Edit'}
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(user.id)}
                              className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition"
                            >
                              Remove
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <ConfirmationDialog
          title="Remove User"
          message="Are you sure you want to remove this user from your team? They will lose access to all resources."
          confirmLabel="Remove User"
          confirmVariant="danger"
          onConfirm={() => {
            const user = users.find((u) => u.id === deleteConfirm);
            if (user) {
              const form = document.createElement('form');
              form.method = 'POST';
              form.innerHTML = `
                <input type="hidden" name="_action" value="delete" />
                <input type="hidden" name="userId" value="${user.id}" />
              `;
              document.body.appendChild(form);
              form.submit();
              document.body.removeChild(form);
            }
            setDeleteConfirm(null);
          }}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </>
  );
}
