/**
 * Dashboard Settings Route
 * Owner/Admin-only route for business configuration
 * Requires OWNER or ADMIN role
 */

import { LoaderFunction, ActionFunction, json } from '@remix-run/node';
import { useLoaderData, useParams, Form, useActionData } from '@remix-run/react';
import { createProtectedLoader, requireRole, createProtectedAction } from '~/utils/route-guards.server';
import { useState } from 'react';

interface BusinessSettings {
  businessName: string;
  email: string;
  phone: string;
  website?: string;
  currency: string;
  language: string;
  timezone: string;
}

interface SettingsLoaderData {
  settings: BusinessSettings;
}

export const loader: LoaderFunction = createProtectedLoader(
  async (context) => {
    const hasAccess = await requireRole(
      context.tenantContext,
      ['owner', 'admin'],
      context.token
    );

    if (!hasAccess) {
      throw new Response('Forbidden: Admin access required', { status: 403 });
    }

    const apiUrl = process.env.VITE_API_URL || 'http://localhost:8600';

    try {
      const response = await fetch(
        `${apiUrl}/settings?empresaId=${context.tenantContext.empresaId}`,
        {
          headers: {
            Authorization: `Bearer ${context.token}`,
          },
        }
      );

      if (!response.ok) {
        return json({
          settings: {
            businessName: 'Mi Negocio',
            email: 'contact@mybusiness.com',
            phone: '+1 234 567 8900',
            website: 'https://mybusiness.com',
            currency: 'USD',
            language: 'es',
            timezone: 'America/New_York',
          },
        });
      }

      const data = await response.json();
      return json(data);
    } catch (error) {
      console.error('[Settings Loader] Error fetching settings:', error);
      return json({
        settings: {
          businessName: 'Mi Negocio',
          email: 'contact@mybusiness.com',
          phone: '+1 234 567 8900',
          currency: 'USD',
          language: 'es',
          timezone: 'America/New_York',
        },
      });
    }
  },
  { fallbackLocale: 'es' }
);

export const action: ActionFunction = createProtectedAction(
  async (context) => {
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
    const actionType = formData.get('_action');
    const apiUrl = process.env.VITE_API_URL || 'http://localhost:8600';

    if (actionType === 'update-business') {
      try {
        const updateData = {
          businessName: formData.get('businessName'),
          email: formData.get('email'),
          phone: formData.get('phone'),
          website: formData.get('website'),
        };

        const response = await fetch(
          `${apiUrl}/settings/business`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${context.token}`,
            },
            body: JSON.stringify(updateData),
          }
        );

        if (!response.ok) {
          return json(
            { error: 'Failed to update business settings' },
            { status: response.status }
          );
        }

        return json({ success: true, message: 'Business settings updated successfully' });
      } catch (error) {
        console.error('[Settings Action] Error updating business:', error);
        return json({ error: 'Failed to update settings' }, { status: 500 });
      }
    }

    return json({ error: 'Unknown action' }, { status: 400 });
  },
  { allowedMethods: ['POST'] }
);

export default function SettingsPage() {
  const { lang } = useParams();
  const { settings } = useLoaderData<SettingsLoaderData>();
  const actionData = useActionData();
  const locale = (lang || 'es') as 'es' | 'en';
  const [activeTab, setActiveTab] = useState<'business' | 'whatsapp' | 'regional'>(
    'business'
  );

  const tabs = [
    { id: 'business', label: locale === 'es' ? 'Negocio' : 'Business' },
    { id: 'whatsapp', label: 'WhatsApp' },
    { id: 'regional', label: locale === 'es' ? 'Regional' : 'Regional' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {locale === 'es' ? 'Configuración' : 'Settings'}
        </h1>
        <p className="text-gray-600 mt-1">
          {locale === 'es'
            ? 'Personaliza tu negocio y preferencias'
            : 'Customize your business and preferences'}
        </p>
      </div>

      {actionData?.success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
          {actionData.message}
        </div>
      )}

      {actionData?.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
          {actionData.error}
        </div>
      )}

      <div className="border-b border-gray-200">
        <div className="flex gap-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-4 font-medium border-b-2 transition ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'business' && (
        <Form method="post" className="bg-white rounded-lg shadow p-6 max-w-2xl">
          <input type="hidden" name="_action" value="update-business" />
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {locale === 'es' ? 'Nombre del Negocio' : 'Business Name'}
              </label>
              <input
                type="text"
                name="businessName"
                defaultValue={settings.businessName}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {locale === 'es' ? 'Email de Contacto' : 'Contact Email'}
              </label>
              <input
                type="email"
                name="email"
                defaultValue={settings.email}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {locale === 'es' ? 'Teléfono' : 'Phone'}
              </label>
              <input
                type="tel"
                name="phone"
                defaultValue={settings.phone}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {locale === 'es' ? 'Sitio Web' : 'Website'}
              </label>
              <input
                type="url"
                name="website"
                defaultValue={settings.website}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://example.com"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              {locale === 'es' ? 'Guardar Cambios' : 'Save Changes'}
            </button>
          </div>
        </Form>
      )}

      {activeTab === 'whatsapp' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-2xl">
          <h3 className="text-lg font-bold text-blue-900 mb-4">WhatsApp Integration</h3>
          <p className="text-sm text-blue-800">
            {locale === 'es'
              ? 'La integración de WhatsApp se configura en tu cuenta.'
              : 'WhatsApp integration is configured in your account settings.'}
          </p>
        </div>
      )}

      {activeTab === 'regional' && (
        <Form method="post" className="bg-white rounded-lg shadow p-6 max-w-2xl">
          <input type="hidden" name="_action" value="update-regional" />
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {locale === 'es' ? 'Moneda' : 'Currency'}
              </label>
              <select
                name="currency"
                defaultValue={settings.currency}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="MXN">MXN</option>
                <option value="ARS">ARS</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {locale === 'es' ? 'Zona Horaria' : 'Timezone'}
              </label>
              <select
                name="timezone"
                defaultValue={settings.timezone}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="America/New_York">America/New_York</option>
                <option value="America/Mexico_City">America/Mexico_City</option>
                <option value="America/Buenos_Aires">America/Buenos_Aires</option>
              </select>
            </div>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              {locale === 'es' ? 'Guardar Cambios' : 'Save Changes'}
            </button>
          </div>
        </Form>
      )}
    </div>
  );
}
