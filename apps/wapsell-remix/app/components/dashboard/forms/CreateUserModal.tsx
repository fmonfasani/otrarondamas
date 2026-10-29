/**
 * Create User Modal Component
 * Form for creating new users directly in the system
 */

import { Form } from '@remix-run/react';
import FormField from './FormField';
import FormButton from './FormButton';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLoading?: boolean;
}

const ROLES = [
  { value: 'READONLY', label: 'Viewer (Read-only)' },
  { value: 'STAFF', label: 'Staff (Orders & Products)' },
  { value: 'MANAGER', label: 'Manager (Teams & Reports)' },
  { value: 'ADMIN', label: 'Admin (Full Access)' },
];

export default function CreateUserModal({
  isOpen,
  onClose,
  isLoading = false,
}: CreateUserModalProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Add New User</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
            >
              ×
            </button>
          </div>

          {/* Body */}
          <Form method="post" className="p-6 space-y-4">
            <input type="hidden" name="_action" value="create" />

            <FormField
              label="Full Name"
              name="nombre"
              type="text"
              required
              placeholder="John Doe"
            />

            <FormField
              label="Email Address"
              name="email"
              type="email"
              required
              placeholder="john@example.com"
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role <span className="text-red-600">*</span>
              </label>
              <select
                name="role"
                defaultValue="STAFF"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {ROLES.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Footer */}
            <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
              >
                Cancel
              </button>
              <FormButton
                type="submit"
                label="Create User"
                isLoading={isLoading}
                className="flex-1"
              />
            </div>
          </Form>
        </div>
      </div>
    </>
  );
}
