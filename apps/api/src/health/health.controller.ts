import {
  Controller,
  Get,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../auth/decorators/public.decorator';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  async check() {
    const startedAt = Date.now();

    try {
      await this.prisma.$queryRaw`SELECT 1`;

      return {
        status: 'ok',
        service: 'api',
        database: 'ok',
        timestamp: new Date().toISOString(),
        latencyMs: Date.now() - startedAt,
      };
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        service: 'api',
        database: 'unavailable',
        timestamp: new Date().toISOString(),
      });
    }
  }
}
