// S-V1-02 — Contrato conceptual de BusinessContext (lectura, sin persistencia).
//
// BusinessContext responde: ¿quién actúa, en qué Business, con qué
// Membership/rol/permisos? En V1 solo existe el actor autenticado
// (USER); ANON/CUSTOMER quedan reservados para Conversation/mensajería
// futura y no se construyen en este slice.
export type BusinessActorType = 'USER';

export interface BusinessContext {
  // Concepto Business. En V1 == Empresa.id física (ver adapter en
  // business-context.service.ts). Nunca aceptado crudo del input.
  businessId: string;
  userId: string;
  membershipId: string;
  role: string;
  // Fuente legacy (UsuarioPermiso del Usuario de la sesión), misma que
  // usa PermissionsGuard al login. NO migrado: solo lectura.
  permissions: string[];
  actorType: BusinessActorType;
}
