import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { TestService } from './test.service';

/**
 * E2E Test Helper Controller
 *
 * Provides endpoints to setup test data for E2E testing.
 * Only available in test/development environments.
 */
@Controller('api/test')
export class TestController {
  constructor(private readonly testService: TestService) {}

  @Post('setup-user')
  async setupUser(
    @Body()
    data: {
      email: string;
      password: string;
      fullName?: string;
    }
  ) {
    return await this.testService.setupUser(data);
  }

  @Post('setup-user-with-multiple-businesses')
  async setupUserWithMultipleBusinesses(
    @Body()
    data: {
      email: string;
      password: string;
      businessCount?: number;
    }
  ) {
    return await this.testService.setupUserWithMultipleBusinesses(
      data.email,
      data.password,
      data.businessCount || 2
    );
  }

  @Get('get-reset-token')
  async getResetToken(@Query('email') email: string) {
    return await this.testService.getResetToken(email);
  }

  @Post('cleanup')
  async cleanup() {
    return await this.testService.cleanup();
  }

  @Get('health')
  async health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
