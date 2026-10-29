import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { HealthController } from './health.controller';
import { PrismaService } from '../prisma/prisma.service';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter';

describe('Health Controller (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: PrismaService,
          useValue: {
            $queryRaw: jest.fn(),
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Register global exception filter
    app.useGlobalFilters(new HttpExceptionFilter());

    // Register validation pipe
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );

    prismaService = moduleFixture.get<PrismaService>(
      PrismaService,
    );

    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /health', () => {
    it('should return 200 with ok status when database is healthy', async () => {
      jest
        .spyOn(prismaService, '$queryRaw')
        .mockResolvedValueOnce([]);

      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime_seconds');
      expect(response.body).toHaveProperty('version', '1.0.0');
      expect(response.body).toHaveProperty('checks');
      expect(response.body.checks).toHaveProperty('database', 'ok');
      expect(response.body).toHaveProperty('latencyMs');
      expect(response.headers['x-correlation-id']).toBeDefined();
    });

    it('should return 503 when database is down', async () => {
      jest
        .spyOn(prismaService, '$queryRaw')
        .mockRejectedValueOnce(
          new Error('Database connection failed'),
        );

      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(503);

      expect(response.body).toHaveProperty('status', 'unavailable');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('checks');
      expect(response.body.checks).toHaveProperty('database', 'error');
      expect(response.body).toHaveProperty('latencyMs');
    });

    it('should include timestamp in ISO format', async () => {
      jest
        .spyOn(prismaService, '$queryRaw')
        .mockResolvedValueOnce([]);

      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      const timestamp = new Date(response.body.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(
        timestamp.toISOString(),
      ).toMatch(
        /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/,
      );
    });

    it('should return uptime in seconds', async () => {
      jest
        .spyOn(prismaService, '$queryRaw')
        .mockResolvedValueOnce([]);

      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(typeof response.body.uptime_seconds).toBe(
        'number',
      );
      expect(response.body.uptime_seconds).toBeGreaterThanOrEqual(
        0,
      );
    });

    it('should return latency in milliseconds', async () => {
      jest
        .spyOn(prismaService, '$queryRaw')
        .mockResolvedValueOnce([]);

      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(typeof response.body.latencyMs).toBe('number');
      expect(response.body.latencyMs).toBeGreaterThanOrEqual(0);
      expect(response.body.latencyMs).toBeLessThan(5000);
    });

    it('should return version', async () => {
      jest
        .spyOn(prismaService, '$queryRaw')
        .mockResolvedValueOnce([]);

      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.body.version).toBe('1.0.0');
    });

    it('should be public endpoint (no authentication required)', async () => {
      jest
        .spyOn(prismaService, '$queryRaw')
        .mockResolvedValueOnce([]);

      const response = await request(app.getHttpServer())
        .get('/health')
        .set('Authorization', 'Bearer invalid-token')
        .expect(200);

      expect(response.body.status).toBe('ok');
    });

    it('should include correlation ID in response headers', async () => {
      jest
        .spyOn(prismaService, '$queryRaw')
        .mockResolvedValueOnce([]);

      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(
        response.headers['x-correlation-id'],
      ).toBeDefined();
      expect(
        response.headers['x-correlation-id'],
      ).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });
  });
});
