import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { insideArgentina } from '../negocio/ubicacion';

export const MAX_ADDRESSES = 10;

export type AddressInput = {
  etiqueta: string;
  direccion: string;
  indicaciones?: string;
  lat: number;
  lng: number;
};

const FIELDS = {
  id: true,
  etiqueta: true,
  direccion: true,
  indicaciones: true,
  lat: true,
  lng: true,
} as const;

/**
 * OR-B4-054, fase 2b — the addresses a buyer saves («Casa», «Trabajo») to receive orders in any
 * store. They belong to the buyer's Wapsell account (Comprador), which has no business: this
 * service uses the system client (ADR-DAT-019, like the favorites) and every query is filtered by
 * that buyer. A store customer reaches them only through their own Cliente's link to the account;
 * an account of one store alone has none (it can still type an address for one order).
 */
@Injectable()
export class AddressesService {
  constructor(private readonly prisma: PrismaService) {}

  /** The buyer behind a store customer, or null for an account of that store alone. */
  async buyerOf(companyId: string, customerId: string): Promise<string | null> {
    const cliente = await this.prisma.cliente.findFirst({
      where: { id: customerId, empresaId: companyId },
      select: { compradorId: true },
    });
    return cliente?.compradorId ?? null;
  }

  list(buyerId: string) {
    return this.prisma.compradorDireccion.findMany({
      where: { compradorId: buyerId },
      orderBy: { createdAt: 'asc' },
      select: FIELDS,
    });
  }

  private clean(input: AddressInput) {
    if (!insideArgentina(input.lat, input.lng)) {
      throw new BadRequestException('Ese punto no está en Argentina. Mové el pin a tu dirección.');
    }
    const indicaciones = input.indicaciones?.trim();
    return {
      etiqueta: input.etiqueta.trim(),
      direccion: input.direccion.trim(),
      indicaciones: indicaciones ? indicaciones : null,
      lat: input.lat,
      lng: input.lng,
    };
  }

  async create(buyerId: string, input: AddressInput) {
    const data = this.clean(input);
    const count = await this.prisma.compradorDireccion.count({ where: { compradorId: buyerId } });
    if (count >= MAX_ADDRESSES) {
      throw new BadRequestException(
        `Podés guardar hasta ${MAX_ADDRESSES} direcciones. Borrá alguna para sumar otra.`,
      );
    }
    return this.prisma.compradorDireccion.create({
      data: { ...data, compradorId: buyerId },
      select: FIELDS,
    });
  }

  async update(buyerId: string, id: string, input: AddressInput) {
    const changed = await this.prisma.compradorDireccion.updateMany({
      where: { id, compradorId: buyerId },
      data: this.clean(input),
    });
    if (changed.count !== 1) throw new NotFoundException('Esa dirección no está en tu cuenta.');
    return this.prisma.compradorDireccion.findFirst({
      where: { id, compradorId: buyerId },
      select: FIELDS,
    });
  }

  async remove(buyerId: string, id: string) {
    const removed = await this.prisma.compradorDireccion.deleteMany({
      where: { id, compradorId: buyerId },
    });
    if (removed.count !== 1) throw new NotFoundException('Esa dirección no está en tu cuenta.');
    return { ok: true };
  }
}
