import { createHmac } from 'crypto';

export interface StaffTokenClaims {
  sub: string;
  email: string;
  nombre: string;
  empresaId: string;
  permisos: string[];
}

/** HS256 token with the claim shape issued by /auth/login for staff (type=usuario). */
export function signStaffToken(claims: StaffTokenClaims): string {
  const b64url = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const header = b64url({ alg: 'HS256', typ: 'JWT' });
  const payload = b64url({
    ...claims,
    rol: 'OWNER',
    estadoLegajo: 'APROBADO',
    type: 'usuario',
    exp: Math.floor(Date.now() / 1000) + 3600,
  });
  const signature = createHmac('sha256', process.env.JWT_SECRET as string)
    .update(`${header}.${payload}`)
    .digest('base64url');
  return `${header}.${payload}.${signature}`;
}
