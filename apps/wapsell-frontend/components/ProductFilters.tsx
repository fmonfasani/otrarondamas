'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';

interface ProductFiltersProps {
  search: string;
  setSearch: (value: string) => void;
  familiaId: string;
  setFamiliaId: (value: string) => void;
}

interface Familia {
  id: string;
  nombre: string;
}

export default function ProductFilters({
  search,
  setSearch,
  familiaId,
  setFamiliaId,
}: ProductFiltersProps) {
  const t = useTranslations();
  const [familias, setFamilias] = useState<Familia[]>([]);
  const [loadingFamilias, setLoadingFamilias] = useState(true);

  useEffect(() => {
    const fetchFamilias = async () => {
      try {
        const jwt = localStorage.getItem('jwt');
        const res = await fetch('/api/familias', {
          headers: { Authorization: `Bearer ${jwt}` },
        });

        if (res.ok) {
          const data = await res.json();
          setFamilias(data.items || []);
        }
      } catch (error) {
        console.error('Failed to fetch familias:', error);
      } finally {
        setLoadingFamilias(false);
      }
    };

    fetchFamilias();
  }, []);

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Search Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('common.search')}
          </label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('productos.searchPlaceholder')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D97757] focus:border-transparent"
          />
        </div>

        {/* Familia Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('productos.family')}
          </label>
          <select
            value={familiaId}
            onChange={(e) => setFamiliaId(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D97757] focus:border-transparent"
          >
            <option value="">{t('common.all')}</option>
            {loadingFamilias ? (
              <option disabled>{t('common.loading')}</option>
            ) : (
              familias.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nombre}
                </option>
              ))
            )}
          </select>
        </div>
      </div>
    </div>
  );
}
