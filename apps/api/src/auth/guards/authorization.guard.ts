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
import { BusinessContextService } from '../../business-context/business-context.service';
import type { BusinessContext } from '../../business-context/business-context.types';
import { CAPABILITY_KEY } from '../decorators/authorize.decorator';
import type { AuthenticatedUser } from '../auth.types';
import {
  authzEngineMode,
  capabilitiesForRole,
  decide,
} from '../../authorization/authorization-engine';
import { readCanonicalRequirement } from '../../authorization/canonical-permission.decorator';

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
    private readonly businessContextService: BusinessContextService,
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

    // Resolve the canonical User + active Membership from the authenticated
    // legacy identity. JWT user.id is a legacy Usuario ID, not Membership.userId.
    const businessContext: BusinessContext =
      await this.businessContextService.resolveForAuthenticatedUser(user);

    if (!businessContext.membershipId) {
      throw new ForbiddenException('No se pudo resolver la membresía activa');
    }

    request.businessContext = businessContext;

    // Load the exact membership selected by BusinessContextService.
    const membership = await this.prisma.membership.findUnique({
      where: { id: businessContext.membershipId },
      include: {
        RoleGrant: {
          include: {
            RoleTemplate: {
              include: {
                RoleCapability: {
                  include: {
                    CapabilityDefinition: true,
                  },
                },
              },
            },
            CapabilityGrant: {
              include: {
                CapabilityDefinition: true,
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

    // #161 stage 2: canonical engine in shadow mode — logs divergences, never decides.
    // #161: `shadow` = RoleTemplate/CapabilityGrant decide and the engine logs;
    // `enforce` (cut-over, OR-B4-026) = the role matrix decides, overrides are ignored (AUTH-04).
    const mode = authzEngineMode();
    const judge = (legacyAllowed: boolean) =>
      decide(
        {
          source: 'Authorize',
          code: requiredCapability,
          principalId: membership.id,
          legacyRole: membership.role,
          active: true,
          legacyAllowed,
          declared: readCanonicalRequirement(context),
          request,
        },
        mode,
      ).allowed;

    if (mode === 'enforce') {
      const legacyAllowed = this.legacyCapabilities(membership).has(requiredCapability);
      request.capabilities = capabilitiesForRole(membership.role);
      if (!judge(legacyAllowed)) {
        throw new ForbiddenException(`Requiere la capacidad '${requiredCapability}'`);
      }
      return true;
    }

    if (!membership.RoleGrant) {
      judge(false);
      // Phase 2 P1-2: RoleGrant may be null during migration.
      // After backfill is complete, this should be treated as an error.
      this.logger.warn(
        `Membership ${membership.id} has no RoleGrant. Phase 2 P1-2 migration may be incomplete.`,
      );
      throw new ForbiddenException('RoleGrant no encontrado (migración incompleta)');
    }

    const capabilities = this.legacyCapabilities(membership);

    // Expose the resolved capability set to handlers that need dynamic
    // visibility rules (for example, own audit logs vs. all business logs).
    request.capabilities = Array.from(capabilities);

    // Check if user has the required capability
    judge(capabilities.has(requiredCapability));
    if (!capabilities.has(requiredCapability)) {
      throw new ForbiddenException(
        `Requiere la capacidad '${requiredCapability}'. Capacidades disponibles: ${Array.from(capabilities).join(', ')}`,
      );
    }

    return true;
  }

  /** Legacy P1-2 capability set: role defaults + grants - denials (empty without RoleGrant). */
  private legacyCapabilities(membership: {
    RoleGrant: {
      RoleTemplate: { RoleCapability: { CapabilityDefinition: { code: string } }[] };
      CapabilityGrant: { grantType: string; CapabilityDefinition: { code: string } }[];
    } | null;
  }): Set<string> {
    const capabilities = new Set<string>();
    if (!membership.RoleGrant) return capabilities;

    // Step 1: Add role defaults (capabilities from RoleTemplate)
    membership.RoleGrant.RoleTemplate.RoleCapability?.forEach((roleCapability) => {
      capabilities.add(roleCapability.CapabilityDefinition.code);
    });

    // Step 2: Apply grants/denials (CapabilityGrant overrides)
    membership.RoleGrant.CapabilityGrant?.forEach((grant) => {
      if (grant.grantType === 'GRANT') {
        capabilities.add(grant.CapabilityDefinition.code);
      } else if (grant.grantType === 'DENY') {
        // Phase 3+: explicit denials
        capabilities.delete(grant.CapabilityDefinition.code);
      }
    });
    return capabilities;
  }
}
