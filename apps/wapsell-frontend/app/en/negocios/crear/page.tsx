'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { empresasApi } from '@/lib/api';
import { useTranslations } from 'next-intl';

const PAISES = ['Argentina', 'Brasil', 'Chile', 'Colombia', 'México', 'Perú', 'España', 'Otro'];

const SECTORES = ['Retail', 'Restaurante', 'Servicios', 'Educación', 'Salud', 'Tecnología', 'Otro'];

function CrearNegocioContent() {
  const router = useRouter();
  const t = useTranslations();

  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    pais: '',
    sector: '',
    plan: 'basico' as const,
    aceptaTerminos: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.nombre.trim()) {
      newErrors.nombre = t('crear.errors.nombreRequired');
    } else if (formData.nombre.length < 3) {
      newErrors.nombre = t('crear.errors.nombreTooShort');
    }

    if (!formData.email.trim()) {
      newErrors.email = t('crear.errors.emailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('crear.errors.emailInvalid');
    }

    if (!formData.pais) {
      newErrors.pais = t('crear.errors.paisRequired');
    }

    if (!formData.aceptaTerminos) {
      newErrors.aceptaTerminos = t('crear.errors.termsRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setIsLoading(true);
      setSubmitError(null);

      const response = await empresasApi.createEmpresa({
        nombre: formData.nombre,
        email: formData.email,
        telefono: formData.telefono || undefined,
        pais: formData.pais,
        sector: formData.sector || undefined,
        plan: formData.plan,
      });

      // Mostrar toast de éxito
      const empresaId = response.id || response.empresaId;

      // Redirigir a onboarding
      router.push(`/negocios/${empresaId}/onboarding`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : t('crear.errors.submitFailed');
      setSubmitError(errorMsg);
      console.error('Error creating empresa:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const target = e.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    const { name, value, type } = target;

    if (type === 'checkbox') {
      setFormData((prev) => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }

    // Limpiar error cuando el usuario empieza a escribir
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-[#1A1815] mb-2">{t('crear.title')}</h1>
        <p className="text-gray-600">{t('crear.subtitle')}</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-8 space-y-6">
        {submitError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            {submitError}
          </div>
        )}

        {/* Nombre */}
        <div>
          <label className="block text-sm font-semibold text-[#1A1815] mb-2">
            {t('crear.form.nombre')} *
          </label>
          <input
            type="text"
            name="nombre"
            value={formData.nombre}
            onChange={handleChange}
            placeholder={t('crear.form.nombrePlaceholder')}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D97757] ${
              errors.nombre ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.nombre && <p className="text-red-600 text-sm mt-1">{errors.nombre}</p>}
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-semibold text-[#1A1815] mb-2">
            {t('crear.form.email')} *
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder={t('crear.form.emailPlaceholder')}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D97757] ${
              errors.email ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email}</p>}
        </div>

        {/* Teléfono */}
        <div>
          <label className="block text-sm font-semibold text-[#1A1815] mb-2">
            {t('crear.form.telefono')}
          </label>
          <input
            type="tel"
            name="telefono"
            value={formData.telefono}
            onChange={handleChange}
            placeholder={t('crear.form.telefonoPlaceholder')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D97757]"
          />
        </div>

        {/* País */}
        <div>
          <label className="block text-sm font-semibold text-[#1A1815] mb-2">
            {t('crear.form.pais')} *
          </label>
          <select
            name="pais"
            value={formData.pais}
            onChange={handleChange}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D97757] ${
              errors.pais ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">{t('crear.form.paisPlaceholder')}</option>
            {PAISES.map((pais) => (
              <option key={pais} value={pais}>
                {pais}
              </option>
            ))}
          </select>
          {errors.pais && <p className="text-red-600 text-sm mt-1">{errors.pais}</p>}
        </div>

        {/* Sector */}
        <div>
          <label className="block text-sm font-semibold text-[#1A1815] mb-2">
            {t('crear.form.sector')}
          </label>
          <select
            name="sector"
            value={formData.sector}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D97757]"
          >
            <option value="">{t('crear.form.sectorPlaceholder')}</option>
            {SECTORES.map((sector) => (
              <option key={sector} value={sector}>
                {sector}
              </option>
            ))}
          </select>
        </div>

        {/* Plan */}
        <div>
          <label className="block text-sm font-semibold text-[#1A1815] mb-4">
            {t('crear.form.plan')} *
          </label>
          <div className="grid grid-cols-2 gap-4">
            {['basico', 'pro'].map((plan) => (
              <label
                key={plan}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  formData.plan === plan
                    ? 'border-[#D97757] bg-[#D97757] bg-opacity-5'
                    : 'border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="plan"
                  value={plan}
                  checked={formData.plan === plan}
                  onChange={handleChange}
                  className="mr-2"
                />
                <span className="font-semibold capitalize">{plan}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Términos */}
        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="aceptaTerminos"
              checked={formData.aceptaTerminos}
              onChange={handleChange}
              className="w-4 h-4 text-[#D97757] rounded focus:ring-2 focus:ring-[#D97757]"
            />
            <span className="text-sm text-gray-700">
              {t('crear.form.terms')}
              <a href="#" className="text-[#D97757] hover:underline">
                {t('crear.form.termsLink')}
              </a>
            </span>
          </label>
          {errors.aceptaTerminos && (
            <p className="text-red-600 text-sm mt-1">{errors.aceptaTerminos}</p>
          )}
        </div>

        {/* Botones */}
        <div className="flex gap-4 pt-6">
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 px-6 py-3 bg-[#D97757] text-white rounded-lg hover:bg-[#C86543] transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? t('común.loading') : t('crear.form.submit')}
          </button>
          <button
            type="button"
            onClick={() => window.history.back()}
            className="flex-1 px-6 py-3 border-2 border-gray-300 text-[#1A1815] rounded-lg hover:bg-gray-50 transition-colors font-semibold"
          >
            {t('común.cancel')}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function CrearNegocio() {
  return (
    <ProtectedRoute requireEmpresa={false}>
      <CrearNegocioContent />
    </ProtectedRoute>
  );
}
