import {
  Controller,
  Get,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../auth/decorators/public.decorator';

/**
 * Health Check Controller
 * Monitors the health of the API and its dependencies
 *
 * Response (200):
 * {
 *   status: "ok",
 *   timestamp: ISO string,
 *   uptime_seconds: number,
 *   version: "1.0.0",
 *   checks: {
 *     database: "ok" | "error"
 *   }
 * }
 *
 * Response (503):
 * {
 *   status: "unavailable",
 *   timestamp: ISO string,
 *   checks: {
 *     database: "error"
 *   }
 * }
 */
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);
  private readonly startTime = Date.now();

  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Health check endpoint',
    description:
      'Returns API health status including database connectivity',
  })
  @ApiResponse({
    status: 200,
    description: 'API and all dependencies are healthy',
    schema: {
      example: {
        status: 'ok',
        timestamp: '2024-01-01T12:00:00.000Z',
        uptime_seconds: 3600,
        version: '1.0.0',
        checks: {
          database: 'ok',
        },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'One or more dependencies are unavailable',
    schema: {
      example: {
        status: 'unavailable',
        timestamp: '2024-01-01T12:00:00.000Z',
        checks: {
          database: 'error',
        },
      },
    },
  })
  async check() {
    const startedAt = Date.now();
    const checks: {
      database: 'ok' | 'error';
    } = {
      database: 'ok',
    };

    // Check database connectivity
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      this.logger.error(
        'Database health check failed',
        error instanceof Error ? error.message : String(error),
      );
      checks.database = 'error';
    }

    const allHealthy =
      Object.values(checks).every(
        (check) => check === 'ok',
      );

    if (!allHealthy) {
      this.logger.warn(
        'Health check failed',
        JSON.stringify(checks),
      );
      throw new ServiceUnavailableException({
        statusCode: 503,
        status: 'unavailable',
        timestamp: new Date().toISOString(),
        checks,
        latencyMs: Date.now() - startedAt,
      });
    }

    const uptime = Math.floor(
      (Date.now() - this.startTime) / 1000,
    );

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime_seconds: uptime,
      version: '1.0.0',
      checks,
      latencyMs: Date.now() - startedAt,
    };
  }
}
