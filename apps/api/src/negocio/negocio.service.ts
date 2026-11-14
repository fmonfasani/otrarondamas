import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

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
    return { nombre: business.nombre, slug: business.slug, ...contactOf(business.configuracion) };
  }

  async update(
    companyId: string,
    userId: string,
    data: { nombre: string } & Partial<BusinessContact>,
  ) {
    const before = await this.get(companyId);
    const nombre = data.nombre.trim();
    const contact = Object.fromEntries(
      CONTACT_KEYS.map((k) => [k, (data[k] ?? before[k]).trim()]),
    ) as BusinessContact;
    try {
      await this.prisma.$transaction(async (tx) => {
        const business = await tx.empresa.findUniqueOrThrow({
          where: { id: companyId },
          select: { configuracion: true },
        });
        const config = {
          ...((business.configuracion ?? {}) as Record<string, unknown>),
          negocio: contact,
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
            valoresPosteriores: { nombre, ...contact },
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
}
