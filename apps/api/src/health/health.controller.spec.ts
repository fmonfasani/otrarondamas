import { Test } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { PrismaService } from '../prisma/prisma.service';

describe('HealthController', () => {
  it('reports API and database as healthy when Prisma responds', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: PrismaService,
          useValue: {
            $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
          },
        },
      ],
    }).compile();

    const controller = moduleRef.get(HealthController);
    const result = await controller.check();

    expect(result.status).toBe('ok');
    expect(result.service).toBe('api');
    expect(result.database).toBe('ok');
    expect(result.timestamp).toEqual(expect.any(String));
    expect(result.latencyMs).toEqual(expect.any(Number));
  });

  it('fails with 503 when the database check fails', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: PrismaService,
          useValue: {
            $queryRaw: jest.fn().mockRejectedValue(new Error('database unavailable')),
          },
        },
      ],
    }).compile();

    const controller = moduleRef.get(HealthController);

    await expect(controller.check()).rejects.toMatchObject({
      status: 503,
      response: expect.objectContaining({
        status: 'error',
        service: 'api',
        database: 'unavailable',
      }),
    });
  });
});
