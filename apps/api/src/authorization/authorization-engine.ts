import { Logger } from '@nestjs/common';
import {
  CUSTOMER_POLICY,
  LEGACY_PERMISSION_MAP,
  ROLE_PERMISSIONS,
  canonicalRoleFor,
  isPermission,
  roleHasPermission,
  type Permission,
  type Role,
} from './canonical-permissions';
import {
  AUTHENTICATED,
  PROVIDER_WEBHOOK,
  resolveRequirement,
  type CanonicalRequest,
  type CanonicalRequirement,
} from './canonical-permission.decorator';

/**
 * Single canonical authorization engine — stage 2 of the Authorization spec v0.2
 * (§5.3, OR-B4-024; backlog #161).
 *
 * It resolves `role → matrix` and decides a request in canonical terms. Since the cut-over
 * (OR-B4-026) it is AUTHORITATIVE by default (`enforce`): the legacy decision (per-user
 * `UsuarioPermiso`, RoleTemplate/CapabilityGrant) is only compared and logged. Setting
 * AUTHZ_ENGINE_MODE=shadow restores the legacy guards as the deciders.
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
    | 'UNDECLARED'
    | 'SELF_SERVICE'
    | 'CUSTOMER_POLICY'
    | 'PROVIDER_WEBHOOK'
    | 'PLATFORM_POLICY';
}

export interface EvaluationInput {
  /**
   * Legacy `@RequirePermission` / `@Authorize` code, or a canonical permission; `''` when
   * the endpoint has no legacy decorator.
   */
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
  const mappedRole = input.legacyRole ? canonicalRoleFor(input.legacyRole) : undefined;
  const canonicalRole = mappedRole ?? null;
  const none = { required: [] as readonly Permission[], canonicalRole, ambiguous: false };

  // Policy markers (non-permission policies).
  if (typeof declared === 'string' && declared !== CUSTOMER_POLICY) {
    if (declared === AUTHENTICATED) {
      return input.active
        ? { ...none, decision: 'ALLOW', reason: 'SELF_SERVICE' }
        : { ...none, decision: 'DENY', reason: 'INACTIVE' };
    }
    return {
      ...none,
      decision: 'NOT_APPLICABLE',
      reason: declared === PROVIDER_WEBHOOK ? 'PROVIDER_WEBHOOK' : 'PLATFORM_POLICY',
    };
  }
  // AUTH-10: an endpoint with neither a legacy code nor a declaration fails closed.
  if (declared === undefined && input.code === '') {
    return { ...none, decision: 'DENY', reason: 'UNDECLARED' };
  }

  const translated = declared ?? translateCode(input.code);
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
  source: 'RequirePermission' | 'Authorize' | 'Authenticated';
  principalId: string;
}

/**
 * Cut-over switch (OR-B4-025/026, plan `05a-AUTHORIZATION-CUTOVER-PLAN.md`):
 *  - `shadow`: the legacy guards decide; the engine only logs divergences.
 *  - `enforce`: the engine decides; the legacy decision is logged as the divergence.
 * Unknown values fall back to the code default.
 */
export type AuthzEngineMode = 'shadow' | 'enforce';
/** Cut-over activated by OR-B4-026 (plan step 3). */
export const DEFAULT_AUTHZ_ENGINE_MODE: AuthzEngineMode = 'enforce';

export function authzEngineMode(env: NodeJS.ProcessEnv = process.env): AuthzEngineMode {
  const value = env.AUTHZ_ENGINE_MODE?.trim().toLowerCase();
  return value === 'shadow' || value === 'enforce' ? value : DEFAULT_AUTHZ_ENGINE_MODE;
}

/**
 * The guards' single decision point. In `shadow` mode it returns the legacy outcome; in
 * `enforce` mode the canonical one — except for NOT_APPLICABLE policies (customer,
 * provider webhook, platform), which other guards decide, so the legacy outcome stands.
 * In `enforce` mode an internal error fails closed.
 */
export function decide(
  input: ShadowInput,
  mode: AuthzEngineMode = authzEngineMode(),
): { allowed: boolean; evaluation?: CanonicalEvaluation } {
  if (mode === 'shadow') {
    return { allowed: input.legacyAllowed, evaluation: shadowCompare(input, mode) };
  }
  const evaluation = shadowCompare(input, mode);
  if (!evaluation) return { allowed: false };
  if (evaluation.decision === 'NOT_APPLICABLE') return { allowed: input.legacyAllowed, evaluation };
  return { allowed: evaluation.decision === 'ALLOW', evaluation };
}

/**
 * Codes a role satisfies, for handlers that read `request.capabilities` (audit visibility):
 * the canonical permissions plus every legacy code whose translation the role holds.
 */
export function capabilitiesForRole(legacyRole: string | null | undefined): string[] {
  const role = legacyRole ? canonicalRoleFor(legacyRole) : undefined;
  if (!role) return [];
  const legacy = Object.keys(LEGACY_PERMISSION_MAP).filter(
    (code) => evaluate({ code, legacyRole, active: true }).decision === 'ALLOW',
  );
  return [...ROLE_PERMISSIONS[role], ...legacy];
}

/**
 * Evaluates and logs when the canonical and legacy decisions differ. It never throws:
 * an internal error returns `undefined`. Logs carry only the principal id, codes and
 * roles — no tokens or personal data.
 */
export function shadowCompare(
  input: ShadowInput,
  mode: AuthzEngineMode = 'shadow',
): CanonicalEvaluation | undefined {
  try {
    const result = evaluate(input);
    if (result.decision === 'NOT_APPLICABLE') return result;
    const canonicalAllowed = result.decision === 'ALLOW';
    if (canonicalAllowed !== input.legacyAllowed) {
      shadowLogger.warn(
        JSON.stringify({
          event: mode === 'shadow' ? 'authz.shadow.divergence' : 'authz.enforce.divergence',
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
