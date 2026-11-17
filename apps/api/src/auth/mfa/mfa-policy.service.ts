import { Injectable } from '@nestjs/common';
import { MembershipStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const CACHE_MS = 60_000;
const ROLES_THAT_NEED_MFA = new Set(['OWNER', 'ADMIN']);

/** The Wapsell administrators (same list as PlatformAdminGuard). */
export function platformAdminEmails(): Set<string> {
  return new Set(
    (process.env.PLATFORM_ADMIN_EMAILS ?? '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

/**
 * OR-B3-014, OR-B4-009, OR-B4-044 — who must pass the second factor to use a session:
 * an Owner or Admin of any Business (active Membership, or the legacy role while both models
 * coexist), a Wapsell platform administrator, and anyone who turned MFA on by choice.
 * Answers are cached for a minute per account (the check runs on every request).
 */
@Injectable()
export class MfaPolicyService {
  private readonly cache = new Map<string, { value: boolean; until: number }>();

  constructor(private readonly prisma: PrismaService) {}

  forget(usuarioId: string) {
    this.cache.delete(usuarioId);
  }

  async requiresMfa(usuarioId: string, now = Date.now()): Promise<boolean> {
    const hit = this.cache.get(usuarioId);
    if (hit && hit.until > now) return hit.value;
    const value = await this.compute(usuarioId);
    this.cache.set(usuarioId, { value, until: now + CACHE_MS });
    return value;
  }

  private async compute(usuarioId: string): Promise<boolean> {
    const factor = await this.prisma.mfaFactor.findUnique({
      where: { usuarioId },
      select: { confirmedAt: true },
    });
    return Boolean(factor?.confirmedAt) || this.requiredByRole(usuarioId);
  }

  /** Required by role or platform access, regardless of a factor turned on by choice. */
  async requiredByRole(usuarioId: string): Promise<boolean> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { email: true, rol: true },
    });
    if (!usuario) return false;
    if (ROLES_THAT_NEED_MFA.has(usuario.rol)) return true;
    if (platformAdminEmails().has(usuario.email.toLowerCase())) return true;
    const managing = await this.prisma.membership.count({
      where: {
        status: MembershipStatus.ACTIVE,
        role: { in: ['OWNER', 'ADMIN'] },
        User: { usuarioId },
      },
    });
    return managing > 0;
  }
}
