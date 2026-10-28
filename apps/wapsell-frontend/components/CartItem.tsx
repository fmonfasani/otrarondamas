'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

interface CartItemType {
  id: string;
  productoId: string;
  cantidad: number;
  precio: number;
  producto: { nombre: string; sku: string };
}

interface CartItemProps {
  item: CartItemType;
  onRemove: (id: string) => void;
}

export default function CartItem({ item, onRemove }: CartItemProps) {
  const t = useTranslations();
  const [removing, setRemoving] = useState(false);

  const handleRemove = async () => {
    setRemoving(true);
    await onRemove(item.id);
    setRemoving(false);
  };

  const subtotal = item.cantidad * item.precio;

  return (
    <div className="cart-item flex justify-between items-center p-4 border-b last:border-b-0 hover:bg-gray-50">
      <div className="flex-1">
        <h3 className="font-bold text-gray-800">{item.producto.nombre}</h3>
        <p className="text-sm text-gray-600">{item.producto.sku}</p>
        <p className="text-sm text-gray-600 mt-1">
          {t('carrito.quantity')}: {item.cantidad} x ${item.precio.toFixed(2)}
        </p>
      </div>

      <div className="text-right ml-4">
        <p className="font-bold text-lg text-[#1A1815]">${subtotal.toFixed(2)}</p>
        <button
          onClick={handleRemove}
          disabled={removing}
          className="text-red-500 text-sm hover:underline mt-2 disabled:text-gray-400"
        >
          {removing ? t('common.removing') : t('common.remove')}
        </button>
      </div>
    </div>
  );
}
