import { Logger } from '@nestjs/common';
import {
  CUSTOMER_POLICY,
  LEGACY_PERMISSION_MAP,
  canonicalRoleFor,
  isPermission,
  roleHasPermission,
  type Permission,
  type Role,
} from './canonical-permissions';
import {
  resolveRequirement,
  type CanonicalRequest,
  type CanonicalRequirement,
} from './canonical-permission.decorator';

/**
 * Single canonical authorization engine — stage 2 of the Authorization spec v0.2
 * (§5.3, OR-B4-024; backlog #161).
 *
 * It resolves `role → matrix` and decides a request in canonical terms. In this stage it
 * runs in SHADOW MODE: the legacy guards keep deciding, and the engine's decision is only
 * compared and logged. Making the engine authoritative changes allow/deny for current
 * users (the legacy source of truth is per-user `UsuarioPermiso`, the matrix is per role),
 * which is a legacy permission cut-over and requires an explicit Owner decision
 * (OR-B4-001, OR-B4-010).
 */

export type CanonicalDecision = 'ALLOW' | 'DENY' | 'NOT_APPLICABLE';

export interface CanonicalEvaluation {
  decision: CanonicalDecision;
  /** Canonical permissions the code translates to (empty when unknown or customer policy). */
  required: readonly Permission[];
  canonicalRole: Role | null;
  /** The legacy code covered several operations; stage 3 assigns the exact one per endpoint. */
  ambiguous: boolean;
  reason:
    | 'ROLE_HAS_PERMISSION'
    | 'ROLE_LACKS_PERMISSION'
    | 'NOT_A_MEMBERSHIP_ROLE'
    | 'UNKNOWN_ROLE'
    | 'INACTIVE'
    | 'UNKNOWN_CODE'
    | 'CUSTOMER_POLICY';
}

export interface EvaluationInput {
  /** Legacy `@RequirePermission` / `@Authorize` code, or a canonical permission. */
  code: string;
  /** AS-IS `RolUsuario` of the principal (Usuario.rol or Membership.role). */
  legacyRole: string | null | undefined;
  /** Whether the account / Membership is active. */
  active: boolean;
  /** Endpoint's `@CanonicalPermission` (stage 3). When present it replaces the legacy translation. */
  declared?: CanonicalRequirement;
  /** Raw request, for declarations that depend on the body. */
  request?: CanonicalRequest;
}

/** Canonical permissions a code translates to; `undefined` = unknown code. */
export function translateCode(
  code: string,
): readonly Permission[] | typeof CUSTOMER_POLICY | undefined {
  if (isPermission(code)) return [code];
  return Object.prototype.hasOwnProperty.call(LEGACY_PERMISSION_MAP, code)
    ? LEGACY_PERMISSION_MAP[code]
    : undefined;
}

/**
 * Pure canonical decision. Unknown codes and unknown roles fail closed (AUTH-10).
 * - With an endpoint declaration (stage 3) the role must hold ALL the declared permissions.
 * - Without one, the legacy code is translated (§5.1); a code that maps to several
 *   canonical permissions is allowed when the role holds any of them and flagged `ambiguous`.
 */
export function evaluate(input: EvaluationInput): CanonicalEvaluation {
  const declared =
    input.declared === undefined
      ? undefined
      : resolveRequirement(input.declared, input.request ?? {});
  const translated = declared ?? translateCode(input.code);
  const mappedRole = input.legacyRole ? canonicalRoleFor(input.legacyRole) : undefined;
  const canonicalRole = mappedRole ?? null;

  if (translated === CUSTOMER_POLICY) {
    return {
      decision: 'NOT_APPLICABLE',
      required: [],
      canonicalRole,
      ambiguous: false,
      reason: 'CUSTOMER_POLICY',
    };
  }
  if (!translated || translated.length === 0 || !translated.every(isPermission)) {
    return {
      decision: 'DENY',
      required: [],
      canonicalRole,
      ambiguous: false,
      reason: 'UNKNOWN_CODE',
    };
  }

  const ambiguous = declared === undefined && translated.length > 1;
  const base = { required: translated, canonicalRole, ambiguous };

  if (!input.active) return { ...base, decision: 'DENY', reason: 'INACTIVE' };
  if (mappedRole === undefined) return { ...base, decision: 'DENY', reason: 'UNKNOWN_ROLE' };
  if (mappedRole === null) return { ...base, decision: 'DENY', reason: 'NOT_A_MEMBERSHIP_ROLE' };

  const holds = (permission: Permission) => roleHasPermission(mappedRole, permission);
  const allowed = declared === undefined ? translated.some(holds) : translated.every(holds);
  return allowed
    ? { ...base, decision: 'ALLOW', reason: 'ROLE_HAS_PERMISSION' }
    : { ...base, decision: 'DENY', reason: 'ROLE_LACKS_PERMISSION' };
}

const shadowLogger = new Logger('AuthorizationShadow');

export interface ShadowInput extends EvaluationInput {
  /** Decision the legacy guard is about to enforce. */
  legacyAllowed: boolean;
  /** Which legacy mechanism decided (for the parity report). */
  source: 'RequirePermission' | 'Authorize';
  principalId: string;
}

/**
 * Compares the canonical decision with the legacy one and logs divergences. It never
 * throws and never changes the legacy outcome: any internal error is swallowed.
 * Logs carry only the principal id, codes and roles — no tokens or personal data.
 */
export function shadowCompare(input: ShadowInput): CanonicalEvaluation | undefined {
  try {
    const result = evaluate(input);
    if (result.decision === 'NOT_APPLICABLE') return result;
    const canonicalAllowed = result.decision === 'ALLOW';
    if (canonicalAllowed !== input.legacyAllowed) {
      shadowLogger.warn(
        JSON.stringify({
          event: 'authz.shadow.divergence',
          source: input.source,
          code: input.code,
          principalId: input.principalId,
          legacyRole: input.legacyRole ?? null,
          canonicalRole: result.canonicalRole,
          legacy: input.legacyAllowed ? 'ALLOW' : 'DENY',
          canonical: result.decision,
          reason: result.reason,
          declared: input.declared !== undefined,
          required: result.required,
          ambiguous: result.ambiguous,
        }),
      );
    }
    return result;
  } catch {
    return undefined;
  }
}
