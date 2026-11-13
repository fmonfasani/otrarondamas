/** Shapes of /memberships and /invitaciones, and the pure helpers of the Equipo screen. */

export type TeamMember = {
  membershipId: string;
  userId: string;
  usuarioId: string | null;
  nombre: string;
  email: string;
  role: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE' | string;
  estadoLegajo: 'PENDIENTE' | 'APROBADO' | string | null;
  since: string;
  isViewer: boolean;
};

export type Invitation = {
  id: string;
  email: string;
  rol: string;
  expiraEn: string;
  usadaEn: string | null;
  createdAt: string;
};

/** Roles an Owner/Admin can invite (API INVITABLE_ROLES), with what each one can do. */
export const INVITABLE_ROLES = [
  { value: 'VENDEDOR', label: 'Vendedor', help: 'Vende, atiende mensajes y clientes, confirma pedidos y abre/cierra caja.' },
  { value: 'GESTOR_DE_STOCK', label: 'Gestor de stock', help: 'Carga productos (sin precios), compras, recepciones y ajustes de stock.' },
  { value: 'ADMIN', label: 'Administrador', help: 'Todo, menos la marca y la cuenta de cobro. Puede invitar y suspender.' },
] as const;

export const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Owner',
  ADMIN: 'Administrador',
  VENDEDOR: 'Vendedor',
  ASISTENTE_LOCAL: 'Vendedor',
  GESTOR_DE_STOCK: 'Gestor de stock',
};

export const STATUS_INFO: Record<string, { label: string; tone: string }> = {
  ACTIVE: { label: 'Activo', tone: 'success' },
  SUSPENDED: { label: 'Suspendido', tone: 'warning' },
  INACTIVE: { label: 'Inactivo', tone: 'muted' },
};

/** Dossier state (RF-17): a pending person can sign in but not operate. */
export function dossierInfo(state: string | null) {
  if (state === 'PENDIENTE') return { label: 'Legajo pendiente', tone: 'warning' };
  if (state === 'APROBADO') return { label: 'Legajo aprobado', tone: 'success' };
  return { label: 'Sin legajo', tone: 'muted' };
}

const MISSING: Record<string, string> = {
  dni: 'DNI',
  telefono: 'teléfono',
  direccion: 'dirección',
  cuit: 'CUIT',
  razonSocial: 'razón social',
  condicionIva: 'condición frente al IVA',
  'documento:ANTECEDENTES_PENALES': 'certificado de antecedentes penales',
  'documento:CONSTANCIA_CUIL': 'constancia de CUIL',
};

/** "Le falta: DNI, teléfono y constancia de CUIL." from the API's `faltantes`. */
export function missingSentence(missing: string[]): string {
  const words = missing.map((m) => MISSING[m] ?? m);
  if (words.length === 0) return '';
  const list = words.length === 1 ? words[0] : `${words.slice(0, -1).join(', ')} y ${words.at(-1)}`;
  return `Todavía no se puede aprobar. Le falta cargar: ${list}.`;
}

export function invitationState(invitation: Invitation, now = new Date()) {
  if (invitation.usadaEn) return { label: 'Aceptada', tone: 'success' };
  if (new Date(invitation.expiraEn) <= now) return { label: 'Vencida', tone: 'muted' };
  return { label: 'Pendiente', tone: 'warning' };
}

/** Whether the viewer can suspend/reactivate this person (API rules mirrored). */
export function canChangeStatus(member: TeamMember, viewerRole: string | null) {
  if (member.isViewer) return false;
  if (member.role === 'OWNER') return viewerRole === 'OWNER';
  return true;
}

export const looksLikeEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
