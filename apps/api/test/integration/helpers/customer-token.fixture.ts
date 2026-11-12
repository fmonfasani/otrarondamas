import { createHmac } from 'crypto';

/** HS256 token with the claim shape issued by /auth/cliente/login (type=cliente). */
export function signCustomerToken(customerId: string, empresaId: string): string {
  const b64url = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const header = b64url({ alg: 'HS256', typ: 'JWT' });
  const payload = b64url({
    sub: customerId,
    email: `customer-${customerId}@example.test`,
    nombre: 'Customer',
    empresaId,
    permisos: [],
    rol: null,
    estadoLegajo: 'APROBADO',
    type: 'cliente',
    exp: Math.floor(Date.now() / 1000) + 3600,
  });
  const signature = createHmac('sha256', process.env.JWT_SECRET as string)
    .update(`${header}.${payload}`)
    .digest('base64url');
  return `${header}.${payload}.${signature}`;
}
