import { Prisma } from '@prisma/client';

/**
 * OR-B4-051 rule 1 (stage C4): the payment-method discounts of a business, kept in
 * Empresa.configuracion.precios. A percent for cash and one for transfer; 0 means none.
 */
export type PricingSettings = {
  descuentoEfectivo: number;
  descuentoTransferencia: number;
};

const percentOf = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 && value < 100
    ? Math.round(value * 100) / 100
    : 0;

export function pricingSettingsOf(configuracion: Prisma.JsonValue | null): PricingSettings {
  const raw = ((configuracion ?? {}) as { precios?: Record<string, unknown> }).precios ?? {};
  return {
    descuentoEfectivo: percentOf(raw.descuentoEfectivo),
    descuentoTransferencia: percentOf(raw.descuentoTransferencia),
  };
}

/** The discount a payment method carries, or null when it carries none. */
export function paymentDiscountFor(
  settings: PricingSettings,
  method: string | undefined,
): Prisma.Decimal | null {
  const percent =
    method === 'efectivo'
      ? settings.descuentoEfectivo
      : method === 'transferencia'
        ? settings.descuentoTransferencia
        : 0;
  return percent > 0 ? new Prisma.Decimal(percent) : null;
}
