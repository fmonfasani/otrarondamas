// S-V1-02 — Conceptual contract of BusinessContext (read-only, no
// persistence).
//
// BusinessContext answers: who acts, in which Business, with which
// Membership/role/permissions? In V1 only the authenticated actor exists
// (USER); ANON/CUSTOMER are reserved for future Conversation/messaging and
// are not built in this slice.
export type BusinessActorType = 'USER';

export interface BusinessContext {
  // Business concept. In V1 == physical Empresa.id (see the adapter in
  // business-context.service.ts). Never accepted raw from input.
  businessId: string;
  userId: string;
  membershipId: string;
  role: string;
  // Legacy source (UsuarioPermiso of the session's Usuario), the same one
  // PermissionsGuard uses at login. NOT migrated: read-only.
  permissions: string[];
  actorType: BusinessActorType;
}
