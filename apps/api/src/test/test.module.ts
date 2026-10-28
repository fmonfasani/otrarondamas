import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TestController } from './test.controller';
import { TestService } from './test.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'test-secret',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [TestController],
  providers: [TestService],
})
export class TestModule {}
