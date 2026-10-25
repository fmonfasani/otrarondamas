import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { CAPABILITY_KEY } from '../decorators/authorize.decorator';
import type { AuthenticatedUser } from '../auth.types';

/**
 * Hierarchical capability authorization (Phase 2 P1-2).
 *
 * Loads Membership context + RoleGrant + CapabilityGrant from the database,
 * flattens the capability set (role defaults + grants - denials), and checks
 * whether the required capability is in the set.
 *
 * It must always be applied AFTER JwtAuthGuard, because it depends on
 * request.user already populated by the JWT strategy.
 *
 * Capabilities are loaded from the database on every request (RoleGrant +
 * CapabilityGrant are sources of truth; JWT claims are informational only).
 * Revoking a capability takes effect on the next request without token re-issue.
 *
 * Design Decision (D-005): RoleTemplate is global (empresaId null in Phase 2).
 * Membership is the authorization principal, not User alone (a user can belong
 * to multiple businesses with different roles).
 */
@Injectable()
export class AuthorizationGuard implements CanActivate {
  private readonly logger = new Logger(AuthorizationGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredCapability = this.reflector.getAllAndOverride<string | undefined>(
      CAPABILITY_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredCapability) {
      return true; // Endpoint without @Authorize metadata: only requires authentication.
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser | undefined;

    if (!user) {
      throw new UnauthorizedException('Sesión no autenticada');
    }

    // Only staff users (usuarios) can be checked for capabilities; customers don't have roles
    if (user.type !== 'usuario') {
      throw new ForbiddenException('Este permiso requiere una identidad de usuario interno');
    }

    // Load Membership context with RoleGrant + CapabilityGrant
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_businessId: {
          userId: user.id,
          businessId: user.empresaId,
        },
      },
      include: {
        roleGrant: {
          include: {
            roleTemplate: {
              include: {
                capabilities: {
                  include: {
                    capabilityDef: true,
                  },
                },
              },
            },
            capabilityGrants: {
              include: {
                capability: true,
              },
            },
          },
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('Membership no encontrado');
    }

    if (membership.status !== 'ACTIVE') {
      throw new UnauthorizedException('La membresía no está activa');
    }

    if (!membership.roleGrant) {
      // Phase 2 P1-2: RoleGrant may be null during migration.
      // After backfill is complete, this should be treated as an error.
      this.logger.warn(
        `Membership ${membership.id} has no RoleGrant. Phase 2 P1-2 migration may be incomplete.`,
      );
      throw new ForbiddenException('RoleGrant no encontrado (migración incompleta)');
    }

    // Flatten capabilities: role defaults + grants - denials
    const capabilities = new Set<string>();

    // Step 1: Add role defaults (capabilities from RoleTemplate)
    if (membership.roleGrant.roleTemplate.capabilities) {
      membership.roleGrant.roleTemplate.capabilities.forEach((roleCapability) => {
        capabilities.add(roleCapability.capabilityDef.code);
      });
    }

    // Step 2: Apply grants/denials (CapabilityGrant overrides)
    if (membership.roleGrant.capabilityGrants) {
      membership.roleGrant.capabilityGrants.forEach((grant) => {
        if (grant.grantType === 'GRANT') {
          capabilities.add(grant.capability.code);
        } else if (grant.grantType === 'DENY') {
          // Phase 3+: explicit denials
          capabilities.delete(grant.capability.code);
        }
      });
    }

    // Check if user has the required capability
    if (!capabilities.has(requiredCapability)) {
      throw new ForbiddenException(
        `Requiere la capacidad '${requiredCapability}'. Capacidades disponibles: ${Array.from(capabilities).join(', ')}`,
      );
    }

    return true;
  }
}
