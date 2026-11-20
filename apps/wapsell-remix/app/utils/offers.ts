/** OR-B4-046 §4.4 (D4, stage C3): pure helpers of the offers screen, wired to /ofertas. */
import { formatMoney, parseArsNumber } from './format';

export type OfferState = 'programada' | 'vigente' | 'terminada';

export type Offer = {
  id: string;
  nombre: string;
  tipo: 'PORCENTAJE' | 'PRECIO';
  descuentoPorcentaje: number | null;
  precioOferta: number | null;
  desde: string;
  hasta: string;
  soloTienda: boolean;
  terminadaEn: string | null;
  estado: OfferState;
  categoria: { id: string; nombre: string } | null;
  productos: Array<{ id: string; nombre: string }>;
};

export const OFFER_STATES: Record<OfferState, { label: string; tone: string }> = {
  vigente: { label: 'Vigente', tone: 'success' },
  programada: { label: 'Programada', tone: 'secondary' },
  terminada: { label: 'Terminada', tone: 'muted' },
};

/** Who creates and ends offers (PROMOTIONS_MANAGE, §4.11): the Owner and the Admin. */
export const canManageOffers = (role: string) => ['OWNER', 'ADMIN'].includes(role);

const AR = 'America/Argentina/Buenos_Aires';
const dayOf = (date: Date) =>
  new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', timeZone: AR }).format(date);

/** Today in Argentina, as a date field wants it (AAAA-MM-DD). */
export function todayAR(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: AR }).format(now);
}

/** «del 21/11 al 30/11»: the API keeps the end as the next midnight, so the last day is the one before. */
export function offerDays(offer: Pick<Offer, 'desde' | 'hasta'>): string {
  const first = dayOf(new Date(offer.desde));
  const last = dayOf(new Date(new Date(offer.hasta).getTime() - 1));
  return first === last ? `el ${first}` : `del ${first} al ${last}`;
}

/** «20 % menos» or «a $ 999,00». */
export function offerWhat(offer: Pick<Offer, 'tipo' | 'descuentoPorcentaje' | 'precioOferta'>): string {
  if (offer.tipo === 'PRECIO') return `a ${formatMoney(offer.precioOferta ?? 0)}`;
  return `${String(offer.descuentoPorcentaje ?? 0).replace('.', ',')} % menos`;
}

/** «Toda la categoría Bebidas», «Yerba 1 kg» or «3 productos». */
export function offerFor(offer: Pick<Offer, 'categoria' | 'productos'>): string {
  if (offer.categoria) return `Toda la categoría ${offer.categoria.nombre}`;
  if (offer.productos.length === 1) return offer.productos[0].nombre;
  return `${offer.productos.length} productos`;
}

export type OfferBody = {
  nombre: string;
  tipo: 'PORCENTAJE' | 'PRECIO';
  descuentoPorcentaje?: number;
  precioOferta?: number;
  desde: string;
  hasta: string;
  soloTienda: boolean;
  productoIds?: string[];
  familiaId?: string;
};

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Reads the new-offer form; the API checks everything again. */
export function offerPayload(form: FormData, today = todayAR()): { ok: true; body: OfferBody } | { ok: false; message: string } {
  const nombre = String(form.get('nombre') ?? '').trim();
  if (nombre.length < 2) return { ok: false, message: 'Poné un nombre a la oferta (por ejemplo «Semana de la yerba»).' };
  const tipo = form.get('tipo') === 'PRECIO' ? 'PRECIO' : 'PORCENTAJE';
  const value = parseArsNumber(String(form.get('valor') ?? '').replace(/%/g, ''));
  const desde = String(form.get('desde') ?? '');
  const hasta = String(form.get('hasta') ?? '');
  if (!DAY.test(desde) || !DAY.test(hasta)) return { ok: false, message: 'Elegí el primer y el último día de la oferta.' };
  if (hasta < desde) return { ok: false, message: 'El último día no puede ser antes del primero.' };
  if (hasta < today) return { ok: false, message: 'Esos días ya pasaron.' };
  const alcance = form.get('alcance') === 'categoria' ? 'categoria' : 'productos';
  const body: OfferBody = { nombre, tipo, desde, hasta, soloTienda: form.get('soloTienda') === 'true' };
  if (tipo === 'PORCENTAJE') {
    if (value === null || Number.isNaN(value) || value < 1 || value > 99) {
      return { ok: false, message: 'El descuento va de 1 a 99 %.' };
    }
    body.descuentoPorcentaje = Math.round(value * 100) / 100;
  } else {
    if (value === null || Number.isNaN(value) || !(value > 0)) return { ok: false, message: 'Escribí el precio de oferta.' };
    body.precioOferta = Math.round(value * 100) / 100;
  }
  if (alcance === 'categoria') {
    if (tipo === 'PRECIO') return { ok: false, message: 'Una oferta para toda una categoría va con porcentaje.' };
    const familiaId = String(form.get('familiaId') ?? '');
    if (!familiaId) return { ok: false, message: 'Elegí la categoría.' };
    body.familiaId = familiaId;
  } else {
    const ids = [...new Set(form.getAll('productoId').map(String).filter(Boolean))];
    if (ids.length === 0) return { ok: false, message: 'Marcá al menos un producto.' };
    if (ids.length > 500) return { ok: false, message: 'Una oferta lleva hasta 500 productos.' };
    body.productoIds = ids;
  }
  return { ok: true, body };
}
