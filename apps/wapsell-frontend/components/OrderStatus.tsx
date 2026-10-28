'use client';

import { useTranslations } from 'next-intl';

interface OrderStatusProps {
  estado: string;
}

export default function OrderStatus({ estado }: OrderStatusProps) {
  const t = useTranslations();

  const getStatusColor = (status: string) => {
    const normalized = status?.toLowerCase() || '';
    switch (normalized) {
      case 'pending':
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
      case 'confirmado':
        return 'bg-blue-100 text-blue-800';
      case 'shipped':
      case 'enviado':
        return 'bg-purple-100 text-purple-800';
      case 'delivered':
      case 'entregado':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
      case 'cancelado':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    const normalized = status?.toLowerCase() || '';
    const key = `misPedidos.status.${normalized}`;
    return t(key);
  };

  return (
    <span
      className={`inline-block text-xs px-3 py-1 rounded-full font-medium ${getStatusColor(
        estado,
      )}`}
    >
      {getStatusLabel(estado)}
    </span>
  );
}
