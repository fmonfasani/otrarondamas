/**
 * Multi-Business E2E Tests
 * Tests for JWT with empresas[], switch-empresa endpoint, and tenants API
 *
 * Flow:
 * 1. Login: JWT includes empresas[]
 * 2. Switch: POST /auth/switch-empresa/:id generates new JWT
 * 3. Tenants: GET /tenants/my-empresas lists all accessible companies
 */

const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:8600';

describe('Multi-Business Flows', () => {
  let accessToken;
  let usuarioId;
  let empresa1Id;
  let empresa2Id;

  before(async () => {
    // Assuming seeded test data exists with a user who has access to multiple empresas
    // For now, we'll test with the default seeded user
    console.log('Testing Multi-Business API at', API_URL);
  });

  describe('POST /auth/login - JWT includes empresas[]', () => {
    it('should return JWT with empresas array', async () => {
      const res = await axios.post(`${API_URL}/auth/login`, {
        email: 'owner@otrarondamas.test',
        password: 'Test123!@#',
      });

      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('accessToken');
      expect(res.data).toHaveProperty('empresas');
      expect(res.data).toHaveProperty('empresaId');
      expect(res.data).toHaveProperty('empresa');
      expect(res.data.empresa).toHaveProperty('id');
      expect(res.data.empresa).toHaveProperty('nombre');
      expect(res.data.empresa).toHaveProperty('role');

      // JWT should contain empresas
      const base64Url = res.data.accessToken.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(Buffer.from(base64, 'base64').toString());

      expect(payload).toHaveProperty('empresas');
      expect(Array.isArray(payload.empresas)).toBe(true);

      accessToken = res.data.accessToken;
      usuarioId = res.data.usuario.id;
    });

    it('should return response shape compatible with frontend', async () => {
      const res = await axios.post(`${API_URL}/auth/login`, {
        email: 'owner@otrarondamas.test',
        password: 'Test123!@#',
      });

      // Check LoginResponseDto shape
      expect(res.data).toMatchObject({
        accessToken: expect.any(String),
        empresaId: expect.any(String),
        empresa: {
          id: expect.any(String),
          nombre: expect.any(String),
          role: expect.any(String),
        },
        empresas: expect.any(Array),
        usuario: {
          id: expect.any(String),
          email: expect.any(String),
          nombre: expect.any(String),
          empresaNombre: expect.any(String),
          permisos: expect.any(Array),
          fotoUrl: expect.any([String, null]),
          metodoLogin: expect.stringMatching(/google|password/),
          createdAt: expect.any(String),
          rol: expect.any(String),
          estadoLegajo: expect.any(String),
        },
      });
    });
  });

  describe('GET /tenants/my-empresas', () => {
    it('should list all empresas the user has access to', async () => {
      const res = await axios.get(`${API_URL}/tenants/my-empresas`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('empresas');
      expect(res.data).toHaveProperty('current');
      expect(Array.isArray(res.data.empresas)).toBe(true);
      expect(res.data.empresas.length).toBeGreaterThan(0);

      // Each empresa should have required fields
      res.data.empresas.forEach((empresa) => {
        expect(empresa).toHaveProperty('id');
        expect(empresa).toHaveProperty('nombre');
        expect(empresa).toHaveProperty('role');
        expect(empresa).toHaveProperty('createdAt');
      });

      empresa1Id = res.data.empresas[0].id;
      empresa2Id = res.data.empresas[1]?.id;
    });

    it('should require authentication', async () => {
      try {
        await axios.get(`${API_URL}/tenants/my-empresas`);
        throw new Error('Should have failed without auth');
      } catch (err) {
        expect(err.response.status).toBe(401);
      }
    });
  });

  describe('POST /auth/switch-empresa/:empresaId', () => {
    it('should switch to another empresa and return new JWT', async () => {
      if (!empresa2Id) {
        console.log('Skipping: User only has access to one empresa');
        return;
      }

      const res = await axios.post(
        `${API_URL}/auth/switch-empresa/${empresa2Id}`,
        {},
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );

      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('accessToken');
      expect(res.data.empresaId).toBe(empresa2Id);

      // New JWT should have updated empresaId
      const base64Url = res.data.accessToken.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(Buffer.from(base64, 'base64').toString());

      expect(payload.empresaId).toBe(empresa2Id);
    });

    it('should reject switching to unauthorized empresa', async () => {
      try {
        await axios.post(
          `${API_URL}/auth/switch-empresa/unauthorized-empresa-id`,
          {},
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          },
        );
        throw new Error('Should have failed');
      } catch (err) {
        expect(err.response.status).toBe(401);
        expect(err.response.data.message).toContain('No tienes acceso');
      }
    });

    it('should require authentication', async () => {
      try {
        await axios.post(`${API_URL}/auth/switch-empresa/${empresa1Id}`);
        throw new Error('Should have failed without auth');
      } catch (err) {
        expect(err.response.status).toBe(401);
      }
    });
  });

  describe('GET /auth/me - includes empresasDetail', () => {
    it('should return fresh empresa list in profile', async () => {
      const res = await axios.get(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('empresasDetail');
      expect(Array.isArray(res.data.empresasDetail)).toBe(true);
    });
  });
});
