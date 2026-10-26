'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { empresasApi } from '@/lib/api';
import { Empresa } from '@/components/AuthContext';
import { useTranslations } from 'next-intl';

const PAISES = [
  'Argentina',
  'Brasil',
  'Chile',
  'Colombia',
  'México',
  'Perú',
  'España',
  'Otro',
];

const SECTORES = [
  'Retail',
  'Restaurante',
  'Servicios',
  'Educación',
  'Salud',
  'Tecnología',
  'Otro',
];

function SettingsContent() {
  const params = useParams();
  const empresaId = params.id as string;
  const t = useTranslations();

  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    pais: '',
    sector: '',
    plan: 'basico' as const,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const loadEmpresa = async () => {
      try {
        setIsLoading(true);
        const data = await empresasApi.getEmpresa(empresaId);
        setEmpresa(data);
        setFormData({
          nombre: data.nombre,
          email: data.email,
          telefono: data.telefono || '',
          pais: data.pais,
          sector: data.sector || '',
          plan: data.plan,
        });
      } catch (err) {
        setError(
          err instanceof Error ? err.message : t('settings.errors.loadFailed')
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadEmpresa();
  }, [empresaId, t]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nombre.trim()) {
      setError(t('settings.errors.nombreRequired'));
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      setSuccess(null);

      await empresasApi.updateEmpresa(empresaId, formData);

      setSuccess(t('settings.success.saved'));
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t('settings.errors.saveFailed')
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsSaving(true);
      await empresasApi.deleteEmpresa(empresaId);
      window.location.href = '/negocios';
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t('settings.errors.deleteFailed')
      );
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D97757]"></div>
          <p className="text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-[#1A1815] mb-2">
          {t('settings.title')}
        </h1>
        <p className="text-gray-600">{empresa?.nombre}</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
          {success}
        </div>
      )}

      {/* Business Settings */}
      <form
        onSubmit={handleSave}
        className="bg-white rounded-lg shadow-sm p-8 space-y-6 mb-8"
      >
        <h2 className="text-2xl font-bold text-[#1A1815]">
          {t('settings.businessInfo')}
        </h2>

        <div>
          <label className="block text-sm font-semibold text-[#1A1815] mb-2">
            {t('settings.form.nombre')}
          </label>
          <input
            type="text"
            name="nombre"
            value={formData.nombre}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D97757]"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-[#1A1815] mb-2">
            {t('settings.form.email')}
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D97757]"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-[#1A1815] mb-2">
            {t('settings.form.telefono')}
          </label>
          <input
            type="tel"
            name="telefono"
            value={formData.telefono}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D97757]"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-[#1A1815] mb-2">
              {t('settings.form.pais')}
            </label>
            <select
              name="pais"
              value={formData.pais}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D97757]"
            >
              {PAISES.map((pais) => (
                <option key={pais} value={pais}>
                  {pais}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#1A1815] mb-2">
              {t('settings.form.sector')}
            </label>
            <select
              name="sector"
              value={formData.sector}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D97757]"
            >
              <option value="">{t('settings.form.sectorPlaceholder')}</option>
              {SECTORES.map((sector) => (
                <option key={sector} value={sector}>
                  {sector}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-[#1A1815] mb-2">
            {t('settings.form.plan')}
          </label>
          <select
            name="plan"
            value={formData.plan}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D97757]"
          >
            <option value="basico">Básico</option>
            <option value="pro">Pro</option>
            <option value="premium">Premium</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="w-full px-6 py-3 bg-[#D97757] text-white rounded-lg hover:bg-[#C86543] transition-colors font-semibold disabled:opacity-50"
        >
          {isSaving ? t('common.saving') : t('settings.form.save')}
        </button>
      </form>

      {/* Quick Actions */}
      <div className="space-y-4">
        <button className="w-full px-6 py-3 border-2 border-gray-300 text-[#1A1815] rounded-lg hover:bg-gray-50 transition-colors font-semibold">
          {t('settings.changePassword')}
        </button>

        <a
          href={`/negocios/${empresaId}/team`}
          className="block w-full px-6 py-3 border-2 border-gray-300 text-[#1A1815] rounded-lg hover:bg-gray-50 transition-colors font-semibold text-center"
        >
          {t('settings.team')}
        </a>
      </div>

      {/* Danger Zone */}
      <div className="mt-12 p-6 bg-red-50 border-2 border-red-200 rounded-lg">
        <h3 className="text-xl font-bold text-red-800 mb-4">
          {t('settings.dangerZone')}
        </h3>

        {showDeleteConfirm ? (
          <div className="space-y-4">
            <p className="text-red-700">{t('settings.deleteConfirm')}</p>
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={isSaving}
                className="flex-1 px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors font-semibold disabled:opacity-50"
              >
                {isSaving ? t('common.deleting') : t('settings.deleteConfirmButton')}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-6 py-2 bg-gray-300 text-[#1A1815] rounded hover:bg-gray-400 transition-colors font-semibold"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
          >
            {t('settings.deleteButton')}
          </button>
        )}
      </div>
    </div>
  );
}

export default function Settings() {
  return (
    <ProtectedRoute requireEmpresa={false}>
      <SettingsContent />
    </ProtectedRoute>
  );
}
