// S-V1-02 — Canonical BusinessContext. No persistence.
//
// STAFF contexts are backed by User + ACTIVE Membership. Public store
// requests use an ANONYMOUS context: Business is resolved from the stable
// public slug and no Membership is created or inferred.
export type BusinessActorType = 'USER' | 'ANONYMOUS';

export interface BusinessContext {
  // Business concept. In V1 == physical Empresa.id (see the adapter in
  // business-context.service.ts). Never accepted raw from request input.
  businessId: string;
  // Present only for USER contexts; anonymous actors have no global User.
  userId: string | null;
  // Present only for USER contexts; anonymous actors have no Membership.
  membershipId: string | null;
  // Present only for USER contexts.
  role: string | null;
  // Legacy permission source for USER contexts. Anonymous contexts are
  // deliberately permission-less and are never treated as staff sessions.
  permissions: string[];
  actorType: BusinessActorType;
}
