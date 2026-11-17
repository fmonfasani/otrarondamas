import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * OR-B4-009 / OR-B4-042 — no new Business joins Wapsell until MFA protects Owner and Admin
 * accounts (and the Wapsell administrator's own). MFA does not exist yet (#163), so creating
 * Businesses is closed. When MFA ships, this becomes «the requesting administrator has MFA
 * active» and the platform reopens.
 */
export const MFA_AVAILABLE = false;

export const CREATION_BLOCKED_MESSAGE =
  'Crear negocios está en pausa hasta activar la verificación en dos pasos (MFA) para Owners y administradores (OR-B4-009).';

export function businessCreationStatus(): { permitido: boolean; motivo: string | null } {
  return MFA_AVAILABLE
    ? { permitido: true, motivo: null }
    : { permitido: false, motivo: CREATION_BLOCKED_MESSAGE };
}

/** 423 Locked: the operation exists and the caller may use it, but it is closed for now. */
export function assertBusinessCreationAllowed() {
  const status = businessCreationStatus();
  if (!status.permitido) {
    throw new HttpException(status.motivo ?? CREATION_BLOCKED_MESSAGE, HttpStatus.LOCKED);
  }
}
