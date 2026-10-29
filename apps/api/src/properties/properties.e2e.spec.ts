import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { PropertiesModule } from './properties.module';
import { PrismaService } from '../prisma/prisma.service';

/**
 * E2E tests for Properties endpoints
 * Tests: GET /properties, GET /properties/:id, POST /properties/demo/contact, GET /properties/demo/verify
 */
describe('Properties E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const mockProperty = {
    id: 'prop-1',
    title: 'Modern Apartment',
    description: 'Beautiful apartment in the city center',
    type: 'apartment',
    price: 250000,
    bedrooms: 2,
    bathrooms: 1,
    location: 'Buenos Aires',
    address: 'Av. Corrientes 1234',
    latitude: -34.6037,
    longitude: -58.3816,
    images: [],
    amenities: ['pool', 'gym'],
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [PropertiesModule],
      providers: [
        {
          provide: PrismaService,
          useValue: {
            property: {
              count: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
            },
            lead: {
              create: jest.fn(),
              findFirst: jest.fn(),
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /properties', () => {
    it('should return list of properties', async () => {
      const mockCount = jest.fn().mockResolvedValue(1);
      const mockFindMany = jest.fn().mockResolvedValue([mockProperty]);

      (prisma.property.count as jest.Mock) = mockCount;
      (prisma.property.findMany as jest.Mock) = mockFindMany;

      const response = await request(app.getHttpServer())
        .get('/properties')
        .expect(200);

      expect(response.body).toHaveProperty('properties');
      expect(response.body).toHaveProperty('total_count');
      expect(response.body).toHaveProperty('has_more');
    });

    it('should filter properties by location', async () => {
      const mockCount = jest.fn().mockResolvedValue(1);
      const mockFindMany = jest.fn().mockResolvedValue([mockProperty]);

      (prisma.property.count as jest.Mock) = mockCount;
      (prisma.property.findMany as jest.Mock) = mockFindMany;

      await request(app.getHttpServer())
        .get('/properties?location=Buenos%20Aires')
        .expect(200);

      expect(mockCount).toHaveBeenCalled();
    });

    it('should filter properties by price range', async () => {
      const mockCount = jest.fn().mockResolvedValue(1);
      const mockFindMany = jest.fn().mockResolvedValue([mockProperty]);

      (prisma.property.count as jest.Mock) = mockCount;
      (prisma.property.findMany as jest.Mock) = mockFindMany;

      await request(app.getHttpServer())
        .get('/properties?minPrice=200000&maxPrice=300000')
        .expect(200);

      expect(mockCount).toHaveBeenCalled();
    });

    it('should search properties by keyword', async () => {
      const mockCount = jest.fn().mockResolvedValue(1);
      const mockFindMany = jest.fn().mockResolvedValue([mockProperty]);

      (prisma.property.count as jest.Mock) = mockCount;
      (prisma.property.findMany as jest.Mock) = mockFindMany;

      await request(app.getHttpServer())
        .get('/properties?search=Modern')
        .expect(200);

      expect(mockCount).toHaveBeenCalled();
    });

    it('should handle invalid minPrice parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/properties?minPrice=not-a-number')
        .expect(400);

      expect(response.body.message).toContain('minPrice');
    });

    it('should support pagination', async () => {
      const mockCount = jest.fn().mockResolvedValue(100);
      const mockFindMany = jest.fn().mockResolvedValue([mockProperty]);

      (prisma.property.count as jest.Mock) = mockCount;
      (prisma.property.findMany as jest.Mock) = mockFindMany;

      await request(app.getHttpServer())
        .get('/properties?limit=10&offset=20')
        .expect(200);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 10,
        }),
      );
    });
  });

  describe('GET /properties/:id', () => {
    it('should return property details', async () => {
      const mockFindUnique = jest.fn().mockResolvedValue(mockProperty);

      (prisma.property.findUnique as jest.Mock) = mockFindUnique;

      const response = await request(app.getHttpServer())
        .get('/properties/prop-1')
        .expect(200);

      expect(response.body).toEqual(mockProperty);
    });

    it('should return 404 for nonexistent property', async () => {
      const mockFindUnique = jest.fn().mockResolvedValue(null);

      (prisma.property.findUnique as jest.Mock) = mockFindUnique;

      await request(app.getHttpServer())
        .get('/properties/nonexistent')
        .expect(404);
    });
  });

  describe('POST /properties/demo/contact', () => {
    it('should save valid contact form', async () => {
      const mockCreate = jest.fn().mockResolvedValue({
        id: 'lead-1',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+54 9 11 2345-6789',
        message: 'Interested in viewing',
        propertyId: null,
        verifiedAt: null,
        verificationToken: 'token-hash',
        tokenExpiresAt: new Date(),
        ipAddress: '127.0.0.1',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      (prisma.lead.create as jest.Mock) = mockCreate;

      const response = await request(app.getHttpServer())
        .post('/properties/demo/contact')
        .send({
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+54 9 11 2345-6789',
          message: 'Interested in viewing',
        })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('lead_id');
    });

    it('should reject invalid email', async () => {
      const response = await request(app.getHttpServer())
        .post('/properties/demo/contact')
        .send({
          name: 'John Doe',
          email: 'not-an-email',
          phone: '+54 9 11 2345-6789',
          message: 'Interested',
        })
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('should reject missing required fields', async () => {
      await request(app.getHttpServer())
        .post('/properties/demo/contact')
        .send({
          name: 'John Doe',
          // missing email, phone, message
        })
        .expect(400);
    });

    it('should enforce rate limit: 5 requests per hour per IP', async () => {
      const mockCreate = jest.fn().mockResolvedValue({
        id: 'lead-1',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+54 9 11 2345-6789',
        message: 'Test',
        propertyId: null,
        verifiedAt: null,
        verificationToken: 'token-hash',
        tokenExpiresAt: new Date(),
        ipAddress: '127.0.0.1',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      (prisma.lead.create as jest.Mock) = mockCreate;

      const contactData = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+54 9 11 2345-6789',
        message: 'Test',
      };

      // Make 5 successful requests
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/properties/demo/contact')
          .send({
            ...contactData,
            email: `john${i}@example.com`,
          })
          .expect(200);
      }

      // 6th request should be rate limited
      const response = await request(app.getHttpServer())
        .post('/properties/demo/contact')
        .send({
          ...contactData,
          email: 'john5@example.com',
        })
        .expect(429);

      expect(response.body.message).toContain('rate limit');
    });
  });

  describe('GET /properties/demo/verify', () => {
    it('should verify email with valid token', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue({
        id: 'lead-1',
        email: 'john@example.com',
        verifiedAt: null,
        tokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      const mockUpdate = jest.fn().mockResolvedValue({
        id: 'lead-1',
        verifiedAt: new Date(),
      });

      (prisma.lead.findFirst as jest.Mock) = mockFindFirst;
      (prisma.lead.update as jest.Mock) = mockUpdate;

      // Get a valid token first
      const tokenResponse = await request(app.getHttpServer())
        .get('/properties/demo/token?email=john@example.com')
        .expect(200);

      const { token } = tokenResponse.body;

      const response = await request(app.getHttpServer())
        .get(`/properties/demo/verify?token=${encodeURIComponent(token)}`)
        .expect(200);

      expect(response.body).toHaveProperty('verified');
      expect(response.body.verified).toBe(true);
    });

    it('should reject missing token', async () => {
      await request(app.getHttpServer())
        .get('/properties/demo/verify')
        .expect(400);
    });

    it('should reject invalid token', async () => {
      await request(app.getHttpServer())
        .get('/properties/demo/verify?token=invalid-token')
        .expect(400);
    });

    it('should be idempotent: multiple calls with same token succeed', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue({
        id: 'lead-1',
        email: 'john@example.com',
        verifiedAt: new Date(), // Already verified
        tokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      (prisma.lead.findFirst as jest.Mock) = mockFindFirst;

      const token = await (
        await Test.createTestingModule({
          providers: [
            {
              provide: PrismaService,
              useValue: prisma,
            },
          ],
        }).compile()
      )
        .get(PrismaService);

      // First call
      const response1 = await request(app.getHttpServer())
        .get(`/properties/demo/verify?token=test-token`)
        .expect(200);

      // Second call with same token
      const response2 = await request(app.getHttpServer())
        .get(`/properties/demo/verify?token=test-token`)
        .expect(200);

      expect(response1.body.verified).toBe(true);
      expect(response2.body.verified).toBe(true);
    });
  });
});
