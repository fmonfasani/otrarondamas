'use client';

import { useState } from 'react';
import { useAuth } from '@/components/AuthContext';
import { useTranslations } from 'next-intl';

interface CartItemType {
  id: string;
  cantidad: number;
  precio: number;
  producto: { nombre: string; sku: string };
}

interface FormDataType {
  clienteName: string;
  clienteEmail: string;
  clientePhone: string;
  notes: string;
}

type CheckoutFormDataType = FormDataType & {
  items: Array<{ productoId: string; cantidad: number }>;
};

interface CheckoutFormProps {
  items: CartItemType[];
  onSubmit: (formData: CheckoutFormDataType) => void;
  onBack: () => void;
}

export default function CheckoutForm({ items, onSubmit, onBack }: CheckoutFormProps) {
  const { user } = useAuth();
  const t = useTranslations();
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormDataType>({
    clienteName: user?.nombre || '',
    clienteEmail: user?.email || '',
    clientePhone: user?.telefono || '',
    notes: '',
  });

  const subtotal = items.reduce((sum, item) => sum + item.cantidad * item.precio, 0);
  const tax = subtotal * 0.21;
  const total = subtotal + tax;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await onSubmit({
        ...formData,
        items: items.map((item) => ({
          productoId: item.producto.sku,
          cantidad: item.cantidad,
        })),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-3 gap-6">
        {/* Form */}
        <div className="col-span-2">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-2xl font-bold mb-6 text-[#1A1815]">{t('carrito.checkout')}</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('common.name')}
                </label>
                <input
                  type="text"
                  name="clienteName"
                  value={formData.clienteName}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D97757] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('common.email')}
                </label>
                <input
                  type="email"
                  name="clienteEmail"
                  value={formData.clienteEmail}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D97757] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('common.phone')}
                </label>
                <input
                  type="tel"
                  name="clientePhone"
                  value={formData.clientePhone}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D97757] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('carrito.notes')}
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={4}
                  placeholder={t('carrito.notesPlaceholder')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D97757] focus:border-transparent"
                />
              </div>
            </div>

            {/* Order Summary */}
            <div className="mt-8 pt-6 border-t">
              <h3 className="font-bold mb-4 text-[#1A1815]">{t('carrito.orderSummary')}</h3>
              <div className="space-y-2 mb-4">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>
                      {item.producto.nombre} x {item.cantidad}
                    </span>
                    <span>${(item.cantidad * item.precio).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t pt-2">
                <div className="flex justify-between text-sm mb-1">
                  <span>{t('carrito.subtotal')}</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span>{t('carrito.tax')} (21%)</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>{t('carrito.total')}</span>
                  <span className="text-[#D97757]">${total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 mt-6">
              <button
                type="button"
                onClick={onBack}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                {t('common.back')}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-4 py-2 bg-[#D97757] text-white rounded-lg hover:bg-[#C86543] font-medium disabled:bg-gray-400"
              >
                {submitting ? t('carrito.processing') : t('carrito.confirmOrder')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
