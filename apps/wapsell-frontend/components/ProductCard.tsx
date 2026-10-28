'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

interface Producto {
  id: string;
  nombre: string;
  sku: string;
  precio: number;
  imagen?: string;
  stock: number;
}

export default function ProductCard({ producto }: { producto: Producto }) {
  const t = useTranslations();
  const [adding, setAdding] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleAddToCart = async () => {
    setAdding(true);
    try {
      const jwt = localStorage.getItem('jwt');
      const res = await fetch('/api/carrito/agregar', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${jwt}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productoId: producto.id,
          cantidad: 1,
        }),
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 2000);
      }
    } catch (error) {
      console.error('Failed to add to cart:', error);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="product-card bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition h-full flex flex-col">
      {producto.imagen && (
        <div className="relative h-48 w-full bg-gray-100">
          <Image src={producto.imagen} alt={producto.nombre} fill className="object-cover" />
        </div>
      )}

      <div className="p-4 flex-1 flex flex-col">
        <h3 className="font-bold text-sm mb-2 truncate flex-shrink-0">{producto.nombre}</h3>
        <p className="text-xs text-gray-500 mb-3 flex-shrink-0">{producto.sku}</p>

        <div className="flex-1"></div>

        <div className="flex justify-between items-center mb-3">
          <p className="text-lg font-bold">${producto.precio.toFixed(2)}</p>
          <span
            className={`text-xs px-2 py-1 rounded font-medium ${
              producto.stock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}
          >
            {producto.stock > 0
              ? `${t('common.stock')}: ${producto.stock}`
              : t('common.outOfStock')}
          </span>
        </div>

        <button
          onClick={handleAddToCart}
          disabled={producto.stock === 0 || adding}
          className={`w-full py-2 rounded font-semibold transition ${
            success
              ? 'bg-green-500 text-white'
              : producto.stock === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-[#D97757] text-white hover:bg-[#C86543]'
          }`}
        >
          {success ? t('common.added') : adding ? t('common.adding') : t('productos.addToCart')}
        </button>
      </div>
    </div>
  );
}
