// setupFilesAfterEnv: Jest carga variables de entorno antes de tests
// Si .env no se carga automáticamente, asegurar que al menos tenemos valores por defecto

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key';
}

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    process.env.DATABASE_URL ||
    'postgresql://user:password@localhost:5500/otrarondamas?schema=public';
}
