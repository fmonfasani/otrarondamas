/** Shapes and helpers of Wapsell platform administration (OR-B4-038). */
import { ApiError, apiRequest } from '~/services/api.server';

export type PlatformOverview = {
  generatedAt: string;
  metrics: { businesses: number; newBusinesses: number; users: number; customers: number; orders: number };
  recentBusinesses: Array<{ id: string; nombre: string; slug: string; createdAt: string }>;
};

export type BusinessRow = {
  id: string;
  nombre: string;
  slug: string;
  createdAt: string;
  cobraOnline: boolean;
  owner: { nombre: string; email: string } | null;
  equipo: number;
  productos: number;
  clientes: number;
  pedidos: number;
  vendido30: number;
  ultimaActividad: string | null;
};

export type BusinessList = { total: number; page: number; pageSize: number; items: BusinessRow[] };

export type BusinessDetail = BusinessRow & {
  telefono: string;
  direccion: string;
  equipoPorRol: Record<string, number>;
  devoluciones: number;
  conversaciones: number;
  ultimos30: { mostrador: { operaciones: number; total: number }; tienda: { operaciones: number; total: number } };
};

/** Platform data, or a clear refusal for anyone who is not a platform administrator. */
export async function platformRequest<T>(token: string, path: string): Promise<T> {
  try {
    return await apiRequest<T>(token, `/platform-admin${path}`);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      throw new Response('Esta sección es solo para el equipo administrador de Wapsell.', { status: 403 });
    }
    if (error instanceof ApiError && error.status === 404) throw new Response('Negocio no encontrado', { status: 404 });
    throw error;
  }
}

/** «hace 3 días», «hoy», «sin actividad». */
export function activityLabel(value: string | null, now = new Date()) {
  if (!value) return 'Sin actividad';
  const days = Math.floor((now.getTime() - new Date(value).getTime()) / 86_400_000);
  if (days <= 0) return 'Hoy';
  if (days === 1) return 'Ayer';
  if (days < 30) return `Hace ${days} días`;
  const months = Math.floor(days / 30);
  return months === 1 ? 'Hace 1 mes' : `Hace ${months} meses`;
}

export const ROLE_NAMES: Record<string, string> = {
  OWNER: 'Owner',
  ADMIN: 'Administrador',
  VENDEDOR: 'Vendedor',
  GESTOR_DE_STOCK: 'Gestor de stock',
};

export const numberText = (n: number) => new Intl.NumberFormat('es-AR').format(n);
