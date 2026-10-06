import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { CompanyScopedPrismaService } from './company-scoped-prisma.service';

@Module({
  providers: [PrismaService, CompanyScopedPrismaService],
  exports: [PrismaService, CompanyScopedPrismaService],
})
export class PrismaModule {}
