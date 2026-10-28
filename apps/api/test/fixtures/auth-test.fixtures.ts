/**
 * Auth Service Test Fixtures
 *
 * Provides:
 * - Mock data for Usuario, User, Empresa
 * - JWT token generation
 * - Test helper functions
 */

import * as jwt from 'jsonwebtoken';

export const TEST_JWT_SECRET = 'test-secret-key-do-not-use-in-production';

// Test data constants
export const TEST_USUARIO = {
  id: 'usr-001',
  nombre: 'Test Usuario',
  email: 'test@example.com',
  passwordHash: '$2a$10$test-hash', // bcrypt hash
  activo: true,
  rol: 'OWNER' as const,
  empresaId: 'emp-001',
  fotoUrl: null,
  googleId: null,
  createdAt: new Date('2026-01-01'),
};

export const TEST_USER = {
  id: 'user-001',
  email: 'test-canonical@example.com',
  nombre: 'Test User Canonical',
  usuarioId: TEST_USUARIO.id,
  createdAt: new Date('2026-01-01'),
};

export const TEST_EMPRESA = {
  id: 'emp-001',
  nombre: 'Test Empresa',
  slug: 'test-empresa',
  activa: true,
  createdAt: new Date('2026-01-01'),
};

export const TEST_USER_EMPRESA = {
  userId: TEST_USER.id,
  empresaId: TEST_EMPRESA.id,
  role: 'OWNER' as const,
  status: 'ACTIVE' as const,
  createdAt: new Date('2026-01-01'),
};

// Test JWT payload
export const TEST_JWT_PAYLOAD = {
  sub: TEST_USUARIO.id,
  email: TEST_USUARIO.email,
  nombre: TEST_USUARIO.nombre,
  empresaId: TEST_EMPRESA.id,
  permisos: [],
  rol: TEST_USUARIO.rol,
  estadoLegajo: 'APROBADO' as const,
  type: 'usuario' as const,
};

/**
 * Generate a valid JWT token for testing
 *
 * @param payload - Custom payload (merged with defaults)
 * @param expiresIn - Token expiration (default: 1h)
 * @returns Signed JWT string
 */
export function generateTestJwt(
  payload: Partial<typeof TEST_JWT_PAYLOAD> = {},
  expiresIn = '1h',
): string {
  return jwt.sign(
    { ...TEST_JWT_PAYLOAD, ...payload },
    TEST_JWT_SECRET,
    { expiresIn },
  );
}

/**
 * Generate JWT with custom expiration
 *
 * @param expiresIn - Expiration time (e.g., '1h', '30d', 0 for expired)
 * @returns Signed JWT string
 */
export function generateExpiredTestJwt(): string {
  return jwt.sign(
    TEST_JWT_PAYLOAD,
    TEST_JWT_SECRET,
    { expiresIn: '-1h' }, // Expired 1 hour ago
  );
}

/**
 * Verify JWT token (for assertions)
 *
 * @param token - JWT token string
 * @returns Decoded payload
 */
export function verifyTestJwt(token: string): any {
  try {
    return jwt.verify(token, TEST_JWT_SECRET);
  } catch (error) {
    throw new Error(`Invalid JWT: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Create a test usuario with custom overrides
 *
 * @param overrides - Partial Usuario object
 * @returns Full Usuario object
 */
export function createTestUsuario(overrides?: Partial<typeof TEST_USUARIO>) {
  return {
    ...TEST_USUARIO,
    ...overrides,
  };
}

/**
 * Create a test user with custom overrides
 *
 * @param overrides - Partial User object
 * @returns Full User object
 */
export function createTestUser(overrides?: Partial<typeof TEST_USER>) {
  return {
    ...TEST_USER,
    ...overrides,
  };
}

/**
 * Create a test empresa with custom overrides
 *
 * @param overrides - Partial Empresa object
 * @returns Full Empresa object
 */
export function createTestEmpresa(overrides?: Partial<typeof TEST_EMPRESA>) {
  return {
    ...TEST_EMPRESA,
    ...overrides,
  };
}

/**
 * Create test UserEmpresa linking
 *
 * @param userId - User ID
 * @param empresaId - Empresa ID
 * @param role - User role
 * @returns UserEmpresa object
 */
export function createTestUserEmpresa(
  userId = TEST_USER.id,
  empresaId = TEST_EMPRESA.id,
  role: 'OWNER' | 'STAFF' | 'CUSTOMER' = 'OWNER',
) {
  return {
    userId,
    empresaId,
    role,
    status: 'ACTIVE' as const,
    createdAt: new Date(),
  };
}

// Test invalid credentials
export const INVALID_CREDENTIALS = {
  email: 'nonexistent@example.com',
  password: 'wrong-password',
};

export const DUPLICATE_EMAIL = {
  email: TEST_USUARIO.email,
  password: 'new-password-123',
  nombre: 'Another Usuario',
};

// Bearer token helper
export function bearerToken(token: string): string {
  return `Bearer ${token}`;
}
