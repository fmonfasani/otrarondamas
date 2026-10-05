import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { MembershipService } from '../membership/membership.service';
import { PrismaService } from '../prisma/prisma.service';
import type { BusinessContext } from './business-context.types';

// S-V1-02 — Resolución de contexto de negocio + adapter a legacy.
//
// Flujo: AuthenticatedUser (request.user, JWT intacto)
//   → User canónico vía vínculo explícito del backfill
//   → su Membership ACTIVE (única en V1)
//   → BusinessContext
//   → adapter businessId → empresaId verificado
//   → infraestructura legacy (forEmpresa).
//
// Este servicio NO crea una vía paralela de aislamiento: el enforcement
// sigue siendo empresaScopeExtension; acá solo se resuelve y verifica el
// contexto. Sin Membership válida → fail-closed explícito, nunca contexto
// parcial ni default silencioso.
@Injectable()
export class BusinessContextService {
  constructor(
    private readonly membershipService: MembershipService,
    private readonly prisma: PrismaService,
  ) {}

  // Resuelve el contexto del actor autenticado. Falla cerrado si:
  // - no es identidad usuario (clientes no tienen Membership en V1);
  // - no hay User vinculado (cuenta sin backfill);
  // - no hay Membership ACTIVE (incluye solo-SUSPENDED);
  // - hay más de una ACTIVE (sin selector de Business: elección
  //   arbitraria prohibida; el selector pertenece a un slice futuro).
  async resolveForAuthenticatedUser(auth: AuthenticatedUser): Promise<BusinessContext> {
    if (auth.type !== 'usuario') {
      throw new ForbiddenException('BusinessContext V1 requiere identidad de usuario');
    }
    const user = await this.membershipService.findUserByLegacyUsuarioId(auth.id);
    if (!user) {
      throw new NotFoundException('Identidad sin User vinculado: backfill pendiente');
    }
    const memberships = await this.membershipService.getMembershipsForUser(user.id);
    const activas = memberships.filter((m) => m.status === 'ACTIVE');
    if (activas.length === 0) {
      throw new ForbiddenException('Sin Membership activa: contexto denegado');
    }
    if (activas.length > 1) {
      throw new ConflictException(
        'Múltiples Memberships activas: se requiere selección explícita de Business (fuera de V1)',
      );
    }
    const membership = activas[0];
    // Adapter como aserción: verifica la equivalencia Business→Empresa
    // antes de entregar el contexto (falla si el Business dejó de existir).
    await this.resolveEmpresaId(membership.businessId);
    const permissions = await this.permisosLegacy(auth.id);
    return {
      businessId: membership.businessId,
      userId: user.id,
      membershipId: membership.id,
      role: membership.role,
      permissions,
      actorType: 'USER',
    };
  }

  // Adapter Business → Empresa (V1: equivalencia verificada, no asumida).
  // Verifica que el businessId exista como Empresa y devuelve su id para
  // la infraestructura legacy. Un id inexistente o arbitrario → throw:
  // el adapter nunca inventa un empresaId.
  async resolveEmpresaId(businessId: string): Promise<string> {
    const empresa = await this.prisma.empresa.findUnique({
      where: { id: businessId },
      select: { id: true },
    });
    if (!empresa) {
      throw new NotFoundException('Business inexistente: no se deriva empresaId');
    }
    return empresa.id;
  }

  // Permisos legacy del Usuario de la sesión (misma fuente que el login).
  // Si el Usuario ya no existe: mínimo privilegio (lista vacía), nunca
  // inventar permisos.
  private async permisosLegacy(usuarioId: string): Promise<string[]> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      include: { usuarioPermisos: { include: { permiso: true } } },
    });
    if (!usuario) return [];
    return usuario.usuarioPermisos.map((up) => up.permiso.nombre);
  }
}
