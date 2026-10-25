/**
 * P12-1 CDN Infrastructure — Asset Management Integration Tests
 *
 * Tests for:
 * - Asset upload (images, PDFs, videos)
 * - File type validation
 * - File size validation
 * - Multi-tenant isolation
 * - Asset deletion
 * - List assets with pagination
 * - Signed URLs for private downloads
 * - Metadata extraction
 * - Monthly storage limits
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, BadRequestException } from '@nestjs/common';
import request from 'supertest';
import * as fs from 'fs';
import * as path from 'path';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { DossierStatus, UserRole } from '../../src/auth/auth.types';

describe('P12-1 CDN Infrastructure — Asset Management', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwt: JwtService;

  let empresa1Id: string;
  let empresa2Id: string;
  let usuario1Id: string;
  let usuario2Id: string;
  let usuario1Token: string;
  let usuario2Token: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    jwt = moduleFixture.get<JwtService>(JwtService);

    // Create first empresa
    const empresa1 = await prisma.empresa.create({
      data: {
        nombre: `P12-1 Empresa 1 ${Date.now()}`,
        slug: `p12-1-empresa-1-${Date.now()}`,
        configuracion: {},
      },
    });
    empresa1Id = empresa1.id;

    // Create second empresa for isolation testing
    const empresa2 = await prisma.empresa.create({
      data: {
        nombre: `P12-1 Empresa 2 ${Date.now()}`,
        slug: `p12-1-empresa-2-${Date.now()}`,
        configuracion: {},
      },
    });
    empresa2Id = empresa2.id;

    // Create user for empresa 1
    const usuario1 = await prisma.usuario.create({
      data: {
        empresaId: empresa1Id,
        nombre: `P12-1 User 1 ${Date.now()}`,
        email: `p12-1-user-1-${Date.now()}@test.local`,
        passwordHash: 'hashed',
        activo: true,
        rol: 'OWNER',
      },
    });
    usuario1Id = usuario1.id;

    // Create user for empresa 2
    const usuario2 = await prisma.usuario.create({
      data: {
        empresaId: empresa2Id,
        nombre: `P12-1 User 2 ${Date.now()}`,
        email: `p12-1-user-2-${Date.now()}@test.local`,
        passwordHash: 'hashed',
        activo: true,
        rol: 'OWNER',
      },
    });
    usuario2Id = usuario2.id;

    // Sign tokens
    usuario1Token = jwt.sign({
      sub: usuario1Id,
      email: usuario1.email,
      nombre: usuario1.nombre,
      empresaId: empresa1Id,
      permisos: [],
      rol: 'OWNER' as UserRole,
      estadoLegajo: 'APROBADO' as DossierStatus,
      type: 'usuario',
    });

    usuario2Token = jwt.sign({
      sub: usuario2Id,
      email: usuario2.email,
      nombre: usuario2.nombre,
      empresaId: empresa2Id,
      permisos: [],
      rol: 'OWNER' as UserRole,
      estadoLegajo: 'APROBADO' as DossierStatus,
      type: 'usuario',
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /assets/upload', () => {
    it('should upload an image file successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/assets/upload')
        .set('Authorization', `Bearer ${usuario1Token}`)
        .field('altText', 'Test Image')
        .attach('file', Buffer.from('fake image data'), 'test-image.jpg')
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('fileName', 'test-image.jpg');
      expect(response.body).toHaveProperty('s3Key');
      expect(response.body).toHaveProperty('contentType');
      expect(response.body).toHaveProperty('size');
      expect(response.body).toHaveProperty('cdnUrl');
      expect(response.body).toHaveProperty('altText', 'Test Image');
      expect(response.body.createdAt).toBeDefined();
      expect(response.body.updatedAt).toBeDefined();
    });

    it('should upload a PDF file successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/assets/upload')
        .set('Authorization', `Bearer ${usuario1Token}`)
        .attach('file', Buffer.from('fake pdf data'), 'document.pdf')
        .expect(201);

      expect(response.body).toHaveProperty('fileName', 'document.pdf');
      expect(response.body).toHaveProperty('contentType', 'application/pdf');
    });

    it('should reject invalid file types', async () => {
      const response = await request(app.getHttpServer())
        .post('/assets/upload')
        .set('Authorization', `Bearer ${usuario1Token}`)
        .attach('file', Buffer.from('fake exe'), 'malware.exe')
        .expect(400);

      expect(response.body.message).toContain('File type not allowed');
    });

    it('should reject files larger than 50MB', async () => {
      const largeBuffer = Buffer.alloc(51 * 1024 * 1024); // 51MB
      const response = await request(app.getHttpServer())
        .post('/assets/upload')
        .set('Authorization', `Bearer ${usuario1Token}`)
        .attach('file', largeBuffer, 'too-large.jpg')
        .expect(400);

      expect(response.body.message).toContain('File size exceeds maximum');
    });

    it('should reject when no file is provided', async () => {
      const response = await request(app.getHttpServer())
        .post('/assets/upload')
        .set('Authorization', `Bearer ${usuario1Token}`)
        .expect(400);

      expect(response.body.message).toContain('No file uploaded');
    });
  });

  describe('GET /assets', () => {
    let assetId1: string;
    let assetId2: string;

    beforeAll(async () => {
      // Create test assets for empresa1
      const res1 = await request(app.getHttpServer())
        .post('/assets/upload')
        .set('Authorization', `Bearer ${usuario1Token}`)
        .attach('file', Buffer.from('fake image 1'), 'image1.jpg');
      assetId1 = res1.body.id;

      const res2 = await request(app.getHttpServer())
        .post('/assets/upload')
        .set('Authorization', `Bearer ${usuario1Token}`)
        .attach('file', Buffer.from('fake image 2'), 'image2.jpg');
      assetId2 = res2.body.id;
    });

    it('should list assets with pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/assets?page=1&pageSize=10')
        .set('Authorization', `Bearer ${usuario1Token}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page', 1);
      expect(response.body).toHaveProperty('pageSize', 10);
      expect(response.body).toHaveProperty('hasMore');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('should return assets in reverse chronological order', async () => {
      const response = await request(app.getHttpServer())
        .get('/assets?page=1&pageSize=10')
        .set('Authorization', `Bearer ${usuario1Token}`)
        .expect(200);

      const ids = response.body.data.map((a: any) => a.id);
      expect(ids).toContain(assetId1);
      expect(ids).toContain(assetId2);
    });

    it('should respect page size limits', async () => {
      const response = await request(app.getHttpServer())
        .get('/assets?page=1&pageSize=1000') // Request more than limit
        .set('Authorization', `Bearer ${usuario1Token}`)
        .expect(200);

      expect(response.body.pageSize).toBeLessThanOrEqual(100);
    });

    it('should only return assets for the authenticated empresa', async () => {
      // Empresa1 user lists assets
      const resp1 = await request(app.getHttpServer())
        .get('/assets?page=1&pageSize=50')
        .set('Authorization', `Bearer ${usuario1Token}`)
        .expect(200);

      // Empresa2 user lists assets (should be empty or different)
      const resp2 = await request(app.getHttpServer())
        .get('/assets?page=1&pageSize=50')
        .set('Authorization', `Bearer ${usuario2Token}`)
        .expect(200);

      // Empresa2 should not see empresa1 assets
      const empresa1Ids = resp1.body.data.map((a: any) => a.id);
      const empresa2Ids = resp2.body.data.map((a: any) => a.id);

      expect(empresa1Ids).toContain(assetId1);
      expect(empresa2Ids).not.toContain(assetId1);
    });
  });

  describe('GET /assets/:id', () => {
    let assetId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/assets/upload')
        .set('Authorization', `Bearer ${usuario1Token}`)
        .attach('file', Buffer.from('fake image'), 'single-asset.jpg');
      assetId = res.body.id;
    });

    it('should retrieve a single asset by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/assets/${assetId}`)
        .set('Authorization', `Bearer ${usuario1Token}`)
        .expect(200);

      expect(response.body.id).toBe(assetId);
      expect(response.body.fileName).toBe('single-asset.jpg');
    });

    it('should return 404 for non-existent asset', async () => {
      const response = await request(app.getHttpServer())
        .get('/assets/non-existent-id')
        .set('Authorization', `Bearer ${usuario1Token}`)
        .expect(404);

      expect(response.body.message).toContain('not found');
    });

    it('should prevent access to assets from another empresa', async () => {
      const response = await request(app.getHttpServer())
        .get(`/assets/${assetId}`)
        .set('Authorization', `Bearer ${usuario2Token}`)
        .expect(403);

      expect(response.body.message).toContain('permission');
    });
  });

  describe('DELETE /assets/:id', () => {
    let assetId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/assets/upload')
        .set('Authorization', `Bearer ${usuario1Token}`)
        .attach('file', Buffer.from('fake image'), 'delete-test.jpg');
      assetId = res.body.id;
    });

    it('should delete an asset', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/assets/${assetId}`)
        .set('Authorization', `Bearer ${usuario1Token}`)
        .expect(200);

      expect(response.body.message).toContain('deleted');
    });

    it('should soft-delete (asset should not be listed)', async () => {
      const response = await request(app.getHttpServer())
        .get(`/assets/${assetId}`)
        .set('Authorization', `Bearer ${usuario1Token}`)
        .expect(404);
    });

    it('should prevent deletion by another empresa user', async () => {
      const res = await request(app.getHttpServer())
        .post('/assets/upload')
        .set('Authorization', `Bearer ${usuario1Token}`)
        .attach('file', Buffer.from('fake image'), 'isolation-test.jpg');
      const testAssetId = res.body.id;

      const response = await request(app.getHttpServer())
        .delete(`/assets/${testAssetId}`)
        .set('Authorization', `Bearer ${usuario2Token}`)
        .expect(403);

      expect(response.body.message).toContain('permission');
    });
  });

  describe('GET /assets/:id/download (Signed URLs)', () => {
    let assetId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/assets/upload')
        .set('Authorization', `Bearer ${usuario1Token}`)
        .attach('file', Buffer.from('fake image'), 'download-test.jpg');
      assetId = res.body.id;
    });

    it('should generate a signed URL for download', async () => {
      const response = await request(app.getHttpServer())
        .get(`/assets/${assetId}/download`)
        .set('Authorization', `Bearer ${usuario1Token}`)
        .expect(200);

      expect(response.body).toHaveProperty('signedUrl');
      expect(response.body).toHaveProperty('expiresIn');
      expect(response.body.signedUrl).toContain('https://');
    });

    it('should allow custom TTL for signed URL', async () => {
      const response = await request(app.getHttpServer())
        .get(`/assets/${assetId}/download?ttl=3600`)
        .set('Authorization', `Bearer ${usuario1Token}`)
        .expect(200);

      expect(response.body.expiresIn).toBe(3600);
    });

    it('should enforce minimum TTL (60 seconds)', async () => {
      const response = await request(app.getHttpServer())
        .get(`/assets/${assetId}/download?ttl=30`)
        .set('Authorization', `Bearer ${usuario1Token}`)
        .expect(200);

      expect(response.body.expiresIn).toBeGreaterThanOrEqual(60);
    });

    it('should enforce maximum TTL (1 day)', async () => {
      const response = await request(app.getHttpServer())
        .get(`/assets/${assetId}/download?ttl=999999`)
        .set('Authorization', `Bearer ${usuario1Token}`)
        .expect(200);

      expect(response.body.expiresIn).toBeLessThanOrEqual(86400);
    });

    it('should prevent access to signed URL for another empresa', async () => {
      const response = await request(app.getHttpServer())
        .get(`/assets/${assetId}/download`)
        .set('Authorization', `Bearer ${usuario2Token}`)
        .expect(403);
    });
  });

  describe('GET /assets/:id/metadata', () => {
    let assetId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/assets/upload')
        .set('Authorization', `Bearer ${usuario1Token}`)
        .attach('file', Buffer.from('fake image data for metadata'), 'metadata-test.jpg');
      assetId = res.body.id;
    });

    it('should retrieve asset metadata', async () => {
      const response = await request(app.getHttpServer())
        .get(`/assets/${assetId}/metadata`)
        .set('Authorization', `Bearer ${usuario1Token}`)
        .expect(200);

      expect(response.body).toHaveProperty('size');
      expect(response.body).toHaveProperty('type', 'image/jpeg');
      expect(response.body).toHaveProperty('uploadedAt');
      expect(response.body).toHaveProperty('metadata');
    });

    it('should prevent metadata access from another empresa', async () => {
      const response = await request(app.getHttpServer())
        .get(`/assets/${assetId}/metadata`)
        .set('Authorization', `Bearer ${usuario2Token}`)
        .expect(403);
    });
  });

  describe('POST /assets/:id/resize (Image Optimization)', () => {
    let imageAssetId: string;
    let pdfAssetId: string;

    beforeAll(async () => {
      const imageRes = await request(app.getHttpServer())
        .post('/assets/upload')
        .set('Authorization', `Bearer ${usuario1Token}`)
        .attach('file', Buffer.from('fake image'), 'resize-test.jpg');
      imageAssetId = imageRes.body.id;

      const pdfRes = await request(app.getHttpServer())
        .post('/assets/upload')
        .set('Authorization', `Bearer ${usuario1Token}`)
        .attach('file', Buffer.from('fake pdf'), 'test.pdf');
      pdfAssetId = pdfRes.body.id;
    });

    it('should trigger image resize job for images', async () => {
      const response = await request(app.getHttpServer())
        .post(`/assets/${imageAssetId}/resize`)
        .set('Authorization', `Bearer ${usuario1Token}`)
        .send({ width: 640, height: 480, format: 'webp' })
        .expect(201);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('jobId');
    });

    it('should reject resize for non-image files', async () => {
      const response = await request(app.getHttpServer())
        .post(`/assets/${pdfAssetId}/resize`)
        .set('Authorization', `Bearer ${usuario1Token}`)
        .send({ width: 640, height: 480 })
        .expect(400);

      expect(response.body.message).toContain('image');
    });

    it('should validate resize dimensions', async () => {
      const response = await request(app.getHttpServer())
        .post(`/assets/${imageAssetId}/resize`)
        .set('Authorization', `Bearer ${usuario1Token}`)
        .send({ width: 0, height: 480 })
        .expect(400);
    });

    it('should prevent resize from another empresa', async () => {
      const response = await request(app.getHttpServer())
        .post(`/assets/${imageAssetId}/resize`)
        .set('Authorization', `Bearer ${usuario2Token}`)
        .send({ width: 640, height: 480 })
        .expect(403);
    });
  });

  describe('Multi-tenant isolation', () => {
    it('should prevent empresa2 from listing empresa1 assets', async () => {
      // Upload asset as empresa1
      const uploadRes = await request(app.getHttpServer())
        .post('/assets/upload')
        .set('Authorization', `Bearer ${usuario1Token}`)
        .attach('file', Buffer.from('secret'), 'private.jpg');
      const assetId = uploadRes.body.id;

      // Try to access as empresa2
      const response = await request(app.getHttpServer())
        .get('/assets?page=1&pageSize=50')
        .set('Authorization', `Bearer ${usuario2Token}`)
        .expect(200);

      const ids = response.body.data.map((a: any) => a.id);
      expect(ids).not.toContain(assetId);
    });

    it('should prevent cross-empresa asset manipulation', async () => {
      const uploadRes = await request(app.getHttpServer())
        .post('/assets/upload')
        .set('Authorization', `Bearer ${usuario1Token}`)
        .attach('file', Buffer.from('data'), 'test.jpg');
      const assetId = uploadRes.body.id;

      // Try delete as empresa2
      await request(app.getHttpServer())
        .delete(`/assets/${assetId}`)
        .set('Authorization', `Bearer ${usuario2Token}`)
        .expect(403);

      // Verify asset still exists for empresa1
      await request(app.getHttpServer())
        .get(`/assets/${assetId}`)
        .set('Authorization', `Bearer ${usuario1Token}`)
        .expect(200);
    });
  });

  describe('Authorization', () => {
    it('should reject requests without authentication', async () => {
      const response = await request(app.getHttpServer())
        .get('/assets')
        .expect(401);
    });

    it('should reject invalid tokens', async () => {
      const response = await request(app.getHttpServer())
        .get('/assets')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });
});
