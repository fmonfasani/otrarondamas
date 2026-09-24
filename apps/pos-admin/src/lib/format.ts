/**
 * Helpers de formateo para el POS.
 * Importes en formato argentino ($18.146,71) y fechas localizadas.
 */

export function formatImporte(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '$0,00';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '$0,00';
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatFecha(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatFechaCorta(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
  });
}

/** Formatea número de venta con ceros a la izquierda: #00000125 */
export function formatNumeroVenta(numero: number | null | undefined): string {
  if (numero === null || numero === undefined) return '#-';
  return `#${String(numero).padStart(8, '0')}`;
}
