import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// S-V1-01 — Lectura de pertenencias (read-only).
//
// Este servicio NUNCA crea, actualiza ni elimina Users/Memberships (eso
// lo hacen la migración y el backfill, fuera del runtime). Solo resuelve
// qué memberships corresponden a una identidad autenticada.
//
// Regla de aislamiento: el caller pasa el id de la SESIÓN (Usuario.id del
// JWT), nunca un userId arbitrario. El vínculo Usuario → User es el
// `usuarioId` explícito del backfill; sin vínculo no hay memberships.
// Así es imposible que el User A vea memberships del User B por input.
@Injectable()
export class MembershipService {
  constructor(private readonly prisma: PrismaService) {}

  // Resuelve el User canónico a partir del Usuario legacy de la sesión.
  // null = identidad aún sin backfill (pre-migración o cuenta nueva sin
  // correr el script): el caller devuelve lista vacía, nunca inventa.
  async findUserByLegacyUsuarioId(usuarioId: string) {
    return this.prisma.user.findUnique({ where: { usuarioId } });
  }

  // Memberships propias del User indicado, con el Business resuelto.
  // No acepta businessId: no filtra ni salta tenancy, devuelve TODO lo
  // propio (el aislamiento vive en que el userId viene de la sesión).
  async getMembershipsForUser(userId: string) {
    const memberships = await this.prisma.membership.findMany({
      where: { userId },
      include: { business: { select: { id: true, nombre: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return memberships.map((m) => ({
      id: m.id,
      role: m.role,
      status: m.status,
      businessId: m.businessId,
      businessNombre: m.business.nombre,
      createdAt: m.createdAt.toISOString(),
    }));
  }
}
