/**
 * Onboarding Route
 * Post-registration setup flow for new users
 */

import type { LoaderFunction, ActionFunction, MetaFunction } from '@remix-run/node';
import { redirect, json } from '@remix-run/node';
import { useLoaderData, Form, useParams } from '@remix-run/react';
import { getAuthenticatedUser, getSessionFromRequest } from '~/services/auth.server';

interface OnboardingLoaderData {
  user: any;
  locale: string;
  step: 'business' | 'team' | 'complete';
}

export const loader: LoaderFunction = async ({ request, params }) => {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    const locale = params.lang || 'es';
    return redirect(`/${locale}/auth/login`);
  }

  // Check if user already completed onboarding
  // This is a simplistic check - should verify against user profile
  const step = 'business';

  return json({
    user,
    locale: params.lang || 'es',
    step,
  });
};

export const action: ActionFunction = async ({ request, params }) => {
  if (request.method !== 'POST') {
    return json(
      { error: 'Method not allowed' },
      { status: 405 }
    );
  }

  const formData = await request.formData();
  const step = formData.get('step');
  const action = formData.get('_action');
  const locale = params.lang || 'es';

  // Handle form submission
  // In production, validate and save to API
  if (action === 'next-step') {
    // Redirect to next step
    return redirect(`/${locale}/auth/onboarding?step=team`);
  }

  if (action === 'complete') {
    // Complete onboarding and redirect to dashboard
    return redirect(`/${locale}/dashboard`);
  }

  return json({ error: 'Invalid action' }, { status: 400 });
};

export const meta: MetaFunction<typeof loader> = ({ data, params }) => [
  {
    title: params?.lang === 'es'
      ? 'Configuración Inicial - Wapsell'
      : 'Onboarding - Wapsell',
  },
];

export default function OnboardingPage() {
  const { step, locale } = useLoaderData<OnboardingLoaderData>();
  const { lang } = useParams();

  const translations = {
    es: {
      onboarding_title: 'Bienvenido a Wapsell',
      onboarding_subtitle: 'Veamos cómo configurar tu negocio',
      business_step_title: 'Información del Negocio',
      business_step_desc: 'Cuéntanos sobre tu negocio para personalizar tu experiencia',
      business_name: 'Nombre del Negocio',
      business_name_placeholder: 'Ej: Mi Tienda Online',
      business_category: 'Categoría',
      business_category_placeholder: 'Selecciona una categoría',
      next_step: 'Siguiente',
      skip: 'Saltar',
    },
    en: {
      onboarding_title: 'Welcome to Wapsell',
      onboarding_subtitle: 'Let\'s set up your business',
      business_step_title: 'Business Information',
      business_step_desc: 'Tell us about your business to personalize your experience',
      business_name: 'Business Name',
      business_name_placeholder: 'Ex: My Online Store',
      business_category: 'Category',
      business_category_placeholder: 'Select a category',
      next_step: 'Next',
      skip: 'Skip',
    },
  };

  const t = translations[lang as 'es' | 'en'] || translations.es;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl p-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {t.onboarding_title}
          </h1>
          <p className="text-gray-600">
            {t.onboarding_subtitle}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-12">
          <div className="flex justify-between mb-4">
            <div className="flex-1">
              <div className={`h-2 rounded-full ${step === 'business' || step === 'team' || step === 'complete' ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
              <p className="text-xs text-gray-600 mt-2 text-center">{lang === 'es' ? 'Negocio' : 'Business'}</p>
            </div>
            <div className="mx-2"></div>
            <div className="flex-1">
              <div className={`h-2 rounded-full ${step === 'team' || step === 'complete' ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
              <p className="text-xs text-gray-600 mt-2 text-center">{lang === 'es' ? 'Equipo' : 'Team'}</p>
            </div>
            <div className="mx-2"></div>
            <div className="flex-1">
              <div className={`h-2 rounded-full ${step === 'complete' ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
              <p className="text-xs text-gray-600 mt-2 text-center">{lang === 'es' ? 'Listo' : 'Ready'}</p>
            </div>
          </div>
        </div>

        {/* Business Info Step */}
        {(step === 'business') && (
          <Form method="post" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {t.business_step_title}
              </h2>
              <p className="text-gray-600">
                {t.business_step_desc}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.business_name}
              </label>
              <input
                type="text"
                name="businessName"
                placeholder={t.business_name_placeholder}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.business_category}
              </label>
              <select
                name="businessCategory"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none"
              >
                <option value="">
                  {t.business_category_placeholder}
                </option>
                <option value="retail">{lang === 'es' ? 'Retail' : 'Retail'}</option>
                <option value="ecommerce">{lang === 'es' ? 'E-commerce' : 'E-commerce'}</option>
                <option value="services">{lang === 'es' ? 'Servicios' : 'Services'}</option>
                <option value="other">{lang === 'es' ? 'Otro' : 'Other'}</option>
              </select>
            </div>

            <div className="flex gap-4 pt-6">
              <button
                type="submit"
                name="_action"
                value="next-step"
                className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                {t.next_step}
              </button>
              <button
                type="submit"
                name="_action"
                value="complete"
                className="px-6 py-3 text-gray-700 font-semibold hover:bg-gray-100 rounded-lg transition"
              >
                {t.skip}
              </button>
            </div>
          </Form>
        )}

        {/* Team Step */}
        {(step === 'team') && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {lang === 'es' ? 'Invita a tu Equipo' : 'Invite Your Team'}
              </h2>
              <p className="text-gray-600">
                {lang === 'es'
                  ? 'Agrega miembros al equipo para colaborar'
                  : 'Add team members to collaborate'}
              </p>
            </div>

            <Form method="post">
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {lang === 'es' ? 'Correo del equipo' : 'Team email'}
                </label>
                <input
                  type="email"
                  name="teamEmail"
                  placeholder={lang === 'es' ? 'usuario@ejemplo.com' : 'user@example.com'}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none"
                />
              </div>

              <div className="flex gap-4 pt-6">
                <button
                  type="submit"
                  name="_action"
                  value="complete"
                  className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
                >
                  {lang === 'es' ? 'Finalizar' : 'Finish'}
                </button>
                <button
                  type="submit"
                  name="_action"
                  value="complete"
                  className="px-6 py-3 text-gray-700 font-semibold hover:bg-gray-100 rounded-lg transition"
                >
                  {lang === 'es' ? 'Omitir' : 'Skip'}
                </button>
              </div>
            </Form>
          </div>
        )}
      </div>
    </div>
  );
}
