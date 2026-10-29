import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../app.module';

/**
 * E2E tests for JWT auth endpoints:
 * - POST /auth/register
 * - POST /auth/login
 * - POST /auth/logout
 * - GET /auth/me
 *
 * These tests verify the complete flow: registration, login, profile fetch, logout.
 */
describe('Auth Endpoints (JWT) - E2E', () => {
  let app: INestApplication;
  let accessToken: string;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/register', () => {
    it('should register a new user and return JWT tokens', async () => {
      const registerPayload = {
        email: `test-${Date.now()}@example.com`,
        password: 'SecurePass123',
        nombre: 'Test User',
        companyName: 'Test Company Inc',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerPayload)
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('usuario');
      expect(response.body.usuario.email).toBe(registerPayload.email);
      expect(response.body.usuario.nombre).toBe(registerPayload.nombre);
      expect(response.body.usuario.empresaNombre).toBe(registerPayload.companyName);
      expect(response.body.usuario.type).toBe('usuario');
      expect(response.body.usuario.rol).toBe('OWNER');

      // Store for later tests
      accessToken = response.body.accessToken;
      userId = response.body.usuario.id;
    });

    it('should reject registration with duplicate email', async () => {
      const email = `dup-${Date.now()}@example.com`;
      const payload = {
        email,
        password: 'SecurePass123',
        nombre: 'User',
        companyName: 'Company',
      };

      // First registration
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(payload)
        .expect(201);

      // Duplicate attempt
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(payload)
        .expect(409);

      expect(response.body.message).toContain('already exists');
    });

    it('should reject password shorter than 8 characters', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `short-pwd-${Date.now()}@example.com`,
          password: 'Short1',
          nombre: 'User',
          companyName: 'Company',
        })
        .expect(400);

      expect(response.body.message).toContain('8 characters');
    });

    it('should reject password without uppercase letter', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `no-upper-${Date.now()}@example.com`,
          password: 'lowercase123',
          nombre: 'User',
          companyName: 'Company',
        })
        .expect(400);

      expect(response.body.message).toContain('uppercase');
    });

    it('should reject password without lowercase letter', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `no-lower-${Date.now()}@example.com`,
          password: 'UPPERCASE123',
          nombre: 'User',
          companyName: 'Company',
        })
        .expect(400);

      expect(response.body.message).toContain('lowercase');
    });

    it('should reject password without number', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `no-num-${Date.now()}@example.com`,
          password: 'NoNumbers',
          nombre: 'User',
          companyName: 'Company',
        })
        .expect(400);

      expect(response.body.message).toContain('number');
    });

    it('should reject invalid email format', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'not-an-email',
          password: 'ValidPass123',
          nombre: 'User',
          companyName: 'Company',
        })
        .expect(400);

      expect(response.body.message).toContain('email');
    });
  });

  describe('POST /auth/login', () => {
    let testEmail: string;
    let testPassword: string;

    beforeAll(async () => {
      testEmail = `login-test-${Date.now()}@example.com`;
      testPassword = 'LoginTest123';

      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: testEmail,
          password: testPassword,
          nombre: 'Login Tester',
          companyName: 'Login Test Co',
        })
        .expect(201);
    });

    it('should login with valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body.usuario.email).toBe(testEmail);
      expect(response.body.usuario.nombre).toBe('Login Tester');
    });

    it('should reject login with invalid email', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: testPassword,
        })
        .expect(401);
    });

    it('should reject login with invalid password', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testEmail,
          password: 'WrongPassword123',
        })
        .expect(401);
    });
  });

  describe('GET /auth/me', () => {
    let testToken: string;

    beforeAll(async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `me-test-${Date.now()}@example.com`,
          password: 'MeTest123',
          nombre: 'Me Tester',
          companyName: 'Me Test Co',
        })
        .expect(201);

      testToken = response.body.accessToken;
    });

    it('should return user profile with valid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('email');
      expect(response.body).toHaveProperty('nombre');
      expect(response.body).toHaveProperty('empresaId');
      expect(response.body).toHaveProperty('rol');
      expect(response.body.type).toBe('usuario');
    });

    it('should reject request without token', async () => {
      await request(app.getHttpServer())
        .get('/auth/me')
        .expect(401);
    });

    it('should reject request with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('POST /auth/logout', () => {
    let testToken: string;

    beforeAll(async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `logout-test-${Date.now()}@example.com`,
          password: 'LogoutTest123',
          nombre: 'Logout Tester',
          companyName: 'Logout Test Co',
        })
        .expect(201);

      testToken = response.body.accessToken;
    });

    it('should logout with valid token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('success');
    });

    it('should reject logout without token', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .expect(401);
    });

    it('should reject logout with invalid token format', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', 'InvalidFormat')
        .expect(400);
    });
  });

  describe('Complete Auth Flow', () => {
    it('should handle full registration -> login -> profile fetch -> logout flow', async () => {
      const email = `flow-test-${Date.now()}@example.com`;
      const password = 'FlowTest123';

      // Step 1: Register
      const registerRes = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email,
          password,
          nombre: 'Flow Tester',
          companyName: 'Flow Test Co',
        })
        .expect(201);

      const registerToken = registerRes.body.accessToken;
      expect(registerRes.body.usuario.email).toBe(email);

      // Step 2: Fetch profile with register token
      const profileRes = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${registerToken}`)
        .expect(200);

      expect(profileRes.body.email).toBe(email);
      expect(profileRes.body.nombre).toBe('Flow Tester');

      // Step 3: Login with credentials
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password })
        .expect(200);

      const loginToken = loginRes.body.accessToken;
      expect(loginToken).toBeDefined();

      // Step 4: Fetch profile with login token
      const profileRes2 = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${loginToken}`)
        .expect(200);

      expect(profileRes2.body.email).toBe(email);

      // Step 5: Logout
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${loginToken}`)
        .expect(200);
    });
  });
});
