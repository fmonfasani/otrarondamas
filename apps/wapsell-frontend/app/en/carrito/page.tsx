'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import CartItem from '@/components/CartItem';
import CartSummary from '@/components/CartSummary';
import CheckoutForm from '@/components/CheckoutForm';
import EmptyState from '@/components/EmptyState';
import { useTranslations } from 'next-intl';

interface CartItemType {
  id: string;
  productoId: string;
  cantidad: number;
  precio: number;
  producto: { nombre: string; sku: string };
}

function CarritoContent() {
  const { empresa } = useAuth();
  const t = useTranslations();
  const [items, setItems] = useState<CartItemType[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutMode, setCheckoutMode] = useState(false);

  useEffect(() => {
    const fetchCarrito = async () => {
      if (!empresa?.id) return;

      try {
        const jwt = localStorage.getItem('jwt');
        const res = await fetch('/api/carrito', {
          headers: { Authorization: `Bearer ${jwt}` },
        });

        if (res.ok) {
          const data = await res.json();
          setItems(data.items || []);
        }
      } catch (error) {
        console.error('Failed to fetch carrito:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCarrito();
  }, [empresa?.id]);

  const handleRemove = async (itemId: string) => {
    try {
      const jwt = localStorage.getItem('jwt');
      await fetch(`/api/carrito/${itemId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${jwt}` },
      });
      setItems(items.filter((i) => i.id !== itemId));
    } catch (error) {
      console.error('Failed to remove item:', error);
    }
  };

  const handleCheckout = async (formData: Record<string, unknown>) => {
    try {
      const jwt = localStorage.getItem('jwt');
      const res = await fetch('/api/carrito/checkout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${jwt}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const { pedidoId } = (await res.json()) as { pedidoId: string };
        window.location.href = `/es/mis-pedidos/${pedidoId}`;
      }
    } catch (error) {
      console.error('Checkout failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-600">{t('common.loading')}</p>
      </div>
    );
  }

  if (items.length === 0 && !checkoutMode) {
    return (
      <EmptyState
        message={t('carrito.empty')}
        action={t('carrito.emptyAction')}
        actionLink="/es/productos"
      />
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-[#1A1815] mb-2">{t('carrito.title')}</h1>
        <p className="text-gray-600">{t('carrito.subtitle')}</p>
      </div>

      {!checkoutMode ? (
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2">
            <div className="bg-white rounded-lg shadow-sm">
              {items.map((item) => (
                <CartItem key={item.id} item={item} onRemove={handleRemove} />
              ))}
            </div>
          </div>
          <div>
            <CartSummary items={items} onCheckout={() => setCheckoutMode(true)} />
          </div>
        </div>
      ) : (
        <CheckoutForm
          items={items}
          onSubmit={handleCheckout}
          onBack={() => setCheckoutMode(false)}
        />
      )}
    </div>
  );
}

export default function CarritoPage() {
  return (
    <ProtectedRoute requireEmpresa={true}>
      <DashboardLayout>
        <CarritoContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
