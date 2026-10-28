'use client';

import React, { useState } from 'react';
import { useAuth, useLocale } from './AuthContext';
import { useTranslations } from 'next-intl';

const BusinessSelector: React.FC = () => {
  const { empresa, empresas, switchEmpresa, isLoading } = useAuth();
  const locale = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const t = useTranslations();

  const handleSwitch = async (empresaId: string) => {
    try {
      await switchEmpresa(empresaId);
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to switch empresa:', error);
    }
  };

  if (!empresa) {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2 rounded bg-[#D97757] text-white hover:bg-[#C86543] transition-colors flex items-center gap-2"
        disabled={isLoading}
      >
        <span className="text-sm">{empresa.nombre}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-white text-gray-800 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
          <div className="px-4 py-2 border-b border-gray-200 font-semibold text-sm">
            {t('businessSelector.title')}
          </div>

          {empresas.length === 0 ? (
            <div className="px-4 py-4 text-center text-gray-500 text-sm">
              {t('businessSelector.noBusinesses')}
            </div>
          ) : (
            <ul className="divide-y">
              {empresas.map((emp) => (
                <li key={emp.id}>
                  <button
                    onClick={() => handleSwitch(emp.id)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-100 transition-colors flex items-center justify-between"
                  >
                    <div>
                      <div className="font-medium text-sm">{emp.nombre}</div>
                      <div className="text-xs text-gray-500">{emp.plan}</div>
                    </div>
                    {emp.id === empresa.id && (
                      <svg
                        className="w-5 h-5 text-[#D97757]"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 rounded-b-lg">
            <a href={`/${locale}/negocios`} className="text-sm text-[#D97757] hover:text-[#C86543] font-medium">
              {t('businessSelector.manageBusinesses')}
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessSelector;
