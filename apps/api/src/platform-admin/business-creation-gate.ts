import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * OR-B4-009 / OR-B4-042 / OR-B4-044 — a new Business joins Wapsell only through a Wapsell
 * administrator whose account has the second factor (MFA) active.
 */
export const CREATION_BLOCKED_MESSAGE =
  'Para crear negocios tu cuenta tiene que tener activa la verificación en dos pasos (MFA) (OR-B4-009).';

/** The command-line script never creates a second Business in production: that goes through the platform. */
export const SCRIPT_BLOCKED_MESSAGE =
  'En producción los negocios nuevos se crean desde la plataforma, con MFA (OR-B4-042).';

export function businessCreationStatus(viewerHasMfa: boolean): {
  permitido: boolean;
  motivo: string | null;
} {
  return viewerHasMfa
    ? { permitido: true, motivo: null }
    : { permitido: false, motivo: CREATION_BLOCKED_MESSAGE };
}

/** 423 Locked: the operation exists and the caller may use it, but not without MFA. */
export function assertBusinessCreationAllowed(viewerHasMfa: boolean) {
  const status = businessCreationStatus(viewerHasMfa);
  if (!status.permitido) {
    throw new HttpException(status.motivo ?? CREATION_BLOCKED_MESSAGE, HttpStatus.LOCKED);
  }
}
