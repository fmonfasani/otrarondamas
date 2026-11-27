import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { recordAudit } from '../auditoria/audit-catalog';
import { pricingSettingsOf, type PricingSettings } from './pricing-settings';
import { locationOf, type StoreLocation } from './ubicacion';

/** What a customer can see of the Business: kept in Empresa.configuracion.negocio. */
export type BusinessContact = {
  telefono: string;
  direccion: string;
  horario: string;
  descripcion: string;
};

const CONTACT_KEYS: Array<keyof BusinessContact> = [
  'telefono',
  'direccion',
  'horario',
  'descripcion',
];

/** How the store shows the Catálogo: kept in Empresa.configuracion.tienda (OR-B4-046 rule 3). */
export type StoreSettings = {
  /** Hide published products without stock; otherwise they show «Sin stock». */
  ocultarSinStock: boolean;
  /** Marketplace (Owner, 2026-11-26): shows in Wapsell's explorer; on unless the Owner turns it off. */
  enExplorador: boolean;
};

export function storeSettingsOf(configuracion: Prisma.JsonValue | null): StoreSettings {
  const raw = ((configuracion ?? {}) as { tienda?: Record<string, unknown> }).tienda ?? {};
  return {
    ocultarSinStock: raw.ocultarSinStock === true,
    enExplorador: raw.enExplorador !== false,
  };
}

export function contactOf(configuracion: Prisma.JsonValue | null): BusinessContact {
  const raw = ((configuracion ?? {}) as { negocio?: Record<string, unknown> }).negocio ?? {};
  return Object.fromEntries(
    CONTACT_KEYS.map((k) => [k, typeof raw[k] === 'string' ? (raw[k] as string) : '']),
  ) as BusinessContact;
}

/**
 * Ajustes del negocio — its name and the contact details the store shows. The slug (store
 * address) is not editable here: changing it would break every link already shared.
 */
@Injectable()
export class NegocioService {
  constructor(private readonly prisma: PrismaService) {}

  async get(companyId: string) {
    const business = await this.prisma.empresa.findUnique({
      where: { id: companyId },
      select: { nombre: true, slug: true, configuracion: true },
    });
    if (!business) throw new NotFoundException('Negocio no encontrado');
    return {
      nombre: business.nombre,
      slug: business.slug,
      ...contactOf(business.configuracion),
      ...storeSettingsOf(business.configuracion),
      ...pricingSettingsOf(business.configuracion),
    };
  }

  /** OR-B4-051 rule 1: the payment-method discounts, kept in configuracion.precios, audited. */
  async updatePricing(companyId: string, userId: string, data: PricingSettings) {
    return this.prisma.$transaction(async (tx) => {
      const business = await tx.empresa.findUnique({
        where: { id: companyId },
        select: { configuracion: true },
      });
      if (!business) throw new NotFoundException('Negocio no encontrado');
      const before = pricingSettingsOf(business.configuracion);
      const after = pricingSettingsOf({ precios: data } as Prisma.JsonValue);
      const current = (business.configuracion ?? {}) as Record<string, unknown>;
      await tx.empresa.update({
        where: { id: companyId },
        data: { configuracion: { ...current, precios: after } as Prisma.InputJsonValue },
      });
      await recordAudit(tx, companyId, userId, {
        accion: 'NEGOCIO_DESCUENTOS_MEDIO_PAGO',
        entidad: 'Empresa',
        entidadId: companyId,
        antes: before,
        despues: after,
      });
      return after;
    });
  }

  async update(
    companyId: string,
    userId: string,
    data: { nombre: string } & Partial<BusinessContact> & Partial<StoreSettings>,
  ) {
    const before = await this.get(companyId);
    const nombre = data.nombre.trim();
    const contact = Object.fromEntries(
      CONTACT_KEYS.map((k) => [k, (data[k] ?? before[k]).trim()]),
    ) as BusinessContact;
    const store: StoreSettings = {
      ocultarSinStock: data.ocultarSinStock ?? before.ocultarSinStock,
      enExplorador: data.enExplorador ?? before.enExplorador,
    };
    try {
      await this.prisma.$transaction(async (tx) => {
        const business = await tx.empresa.findUniqueOrThrow({
          where: { id: companyId },
          select: { configuracion: true },
        });
        const current = (business.configuracion ?? {}) as Record<string, unknown>;
        const config = {
          ...current,
          negocio: contact,
          tienda: { ...((current.tienda ?? {}) as Record<string, unknown>), ...store },
        };
        await tx.empresa.update({
          where: { id: companyId },
          data: { nombre, configuracion: config as Prisma.InputJsonValue },
        });
        await tx.auditLog.create({
          data: {
            empresaId: companyId,
            usuarioId: userId,
            accion: 'UPDATE',
            entidadAfectada: 'Empresa',
            entidadId: companyId,
            valoresAnteriores: before,
            valoresPosteriores: { nombre, ...contact, ...store },
          },
        });
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Ya hay otro negocio con ese nombre en Wapsell.');
      }
      throw error;
    }
    return this.get(companyId);
  }

  /**
   * Marketplace, step 4 — the store's place on the map, and what to search it from (the address
   * of Ajustes and the city and province of the profile).
   */
  async location(companyId: string) {
    const business = await this.prisma.empresa.findUnique({
      where: { id: companyId },
      select: { configuracion: true },
    });
    if (!business) throw new NotFoundException('Negocio no encontrado');
    const perfil =
      ((business.configuracion ?? {}) as { perfil?: Record<string, unknown> }).perfil ?? {};
    const text = (k: string) => (typeof perfil[k] === 'string' ? (perfil[k] as string) : '');
    return {
      ubicacion: locationOf(business.configuracion),
      sugerida: {
        direccion: contactOf(business.configuracion).direccion,
        ciudad: text('ciudad'),
        provincia: text('provincia'),
      },
    };
  }

  /** The Owner confirms the pin (or removes it with null). Audited. */
  async setLocation(
    companyId: string,
    userId: string,
    data: Omit<StoreLocation, 'confirmadaAt'> | null,
    now = new Date(),
  ) {
    return this.prisma.$transaction(async (tx) => {
      const business = await tx.empresa.findUnique({
        where: { id: companyId },
        select: { configuracion: true },
      });
      if (!business) throw new NotFoundException('Negocio no encontrado');
      const before = locationOf(business.configuracion);
      const after: StoreLocation | null = data
        ? { ...data, direccion: data.direccion.trim(), confirmadaAt: now.toISOString() }
        : null;
      const { ubicacion: _old, ...rest } = (business.configuracion ?? {}) as Record<
        string,
        unknown
      >;
      void _old;
      await tx.empresa.update({
        where: { id: companyId },
        data: {
          configuracion: (after ? { ...rest, ubicacion: after } : rest) as Prisma.InputJsonValue,
        },
      });
      await recordAudit(tx, companyId, userId, {
        accion: 'NEGOCIO_UBICACION',
        entidad: 'Empresa',
        entidadId: companyId,
        antes: before,
        despues: after,
      });
      return { ubicacion: after };
    });
  }
}
