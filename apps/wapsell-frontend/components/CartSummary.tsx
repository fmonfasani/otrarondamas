'use client';

import { useTranslations } from 'next-intl';

interface CartItemType {
  id: string;
  cantidad: number;
  precio: number;
}

interface CartSummaryProps {
  items: CartItemType[];
  onCheckout: () => void;
}

const TAX_RATE = 0.21; // IVA 21%

export default function CartSummary({ items, onCheckout }: CartSummaryProps) {
  const t = useTranslations();

  const subtotal = items.reduce((sum, item) => sum + item.cantidad * item.precio, 0);
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;

  return (
    <div className="cart-summary bg-white rounded-lg shadow-md p-6 sticky top-6">
      <h3 className="font-bold text-lg mb-6 text-[#1A1815]">{t('carrito.summary')}</h3>

      <div className="space-y-3 mb-6">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">{t('carrito.subtotal')}</span>
          <span className="font-medium">${subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">{t('carrito.tax')} (21%)</span>
          <span className="font-medium">${tax.toFixed(2)}</span>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-4 mb-6">
        <div className="flex justify-between font-bold text-lg">
          <span>{t('carrito.total')}</span>
          <span className="text-[#D97757]">${total.toFixed(2)}</span>
        </div>
      </div>

      <button
        onClick={onCheckout}
        className="w-full py-3 bg-[#D97757] text-white rounded-lg font-semibold hover:bg-[#C86543] transition"
      >
        {t('carrito.checkout')}
      </button>
    </div>
  );
}
