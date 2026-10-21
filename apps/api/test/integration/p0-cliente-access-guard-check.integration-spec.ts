/**
 * P0 SECURITY — Token Type Validation
 *
 * Minimal test to verify that cliente tokens are rejected from staff endpoints.
 * Uses real NestJS HTTP server and JWT tokens.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { DossierStatus, UserRole } from '../../src/auth/auth.types';

describe('P0 SECURITY — Cliente Token Type Validation', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwt: JwtService;

  let businessId: string;
  let usuarioId: string;
  let clienteId: string;
  let usuarioToken: string;
  let clienteToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    jwt = moduleFixture.get<JwtService>(JwtService);

    // Create test business
    const empresa = await prisma.empresa.create({
      data: {
        nombre: `P0 Test ${Date.now()}`,
        slug: `p0-${Date.now()}`,
        configuracion: {},
      },
    });
    businessId = empresa.id;

    // Create internal user (Usuario)
    const usuario = await prisma.usuario.create({
      data: {
        empresaId: businessId,
        nombre: `P0 User ${Date.now()}`,
        email: `p0-user-${Date.now()}@test.local`,
        passwordHash: 'hashed',
        activo: true,
        rol: 'OWNER',
      },
    });
    usuarioId = usuario.id;

    // Create customer (Cliente)
    const cliente = await prisma.cliente.create({
      data: {
        empresaId: businessId,
        nombre: `P0 Cliente ${Date.now()}`,
      },
    });
    clienteId = cliente.id;

    // Sign JWT tokens
    usuarioToken = jwt.sign({
      sub: usuarioId,
      email: usuario.email,
      nombre: usuario.nombre,
      empresaId: businessId,
      permisos: [],
      rol: 'OWNER' as UserRole,
      estadoLegajo: 'APROBADO' as DossierStatus,
      type: 'usuario',
    });

    clienteToken = jwt.sign({
      sub: clienteId,
      email: `${clienteId}@cliente.test`,
      nombre: cliente.nombre,
      empresaId: businessId,
      permisos: [],
      rol: 'ASISTENTE_LOCAL' as UserRole,
      estadoLegajo: 'APROBADO' as DossierStatus,
      type: 'cliente',
      esMayorista: false,
    });
  });

  afterAll(async () => {
    // Cleanup is optional for throwaway test DB
    await app.close();
  });

  describe('GET /clientes — Cliente Access Control', () => {
    it('Usuario (internal) can GET /clientes', async () => {
      const response = await request(app.getHttpServer())
        .get('/clientes')
        .set('Authorization', `Bearer ${usuarioToken}`);

      // Usuario should be able to access this endpoint
      // Status should be 200 or 400+ for other reasons, but NOT 401/403 auth rejection
      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });

    it('Cliente (customer) must be REJECTED from GET /clientes', async () => {
      const response = await request(app.getHttpServer())
        .get('/clientes')
        .set('Authorization', `Bearer ${clienteToken}`);

      // Cliente type should NOT be allowed on internal endpoint
      // Must be 401 (Unauthorized) or 403 (Forbidden)
      // If 200, that means the vulnerability is PRESENT
      if (response.status === 200) {
        // Vulnerability confirmed: cliente was accepted
        throw new Error(
          `SECURITY VULNERABILITY: Cliente token was accepted with status ${response.status}. Expected 401 or 403.`,
        );
      }

      // If guard is working correctly, status should be 401 or 403
      expect([401, 403]).toContain(response.status);
    });

    it('No token must be rejected with 401', async () => {
      const response = await request(app.getHttpServer()).get('/clientes');

      expect([401, 403]).toContain(response.status);
    });

    it('Invalid token must be rejected with 401', async () => {
      const response = await request(app.getHttpServer())
        .get('/clientes')
        .set('Authorization', 'Bearer invalid.token');

      expect([401, 403]).toContain(response.status);
    });
  });
});
