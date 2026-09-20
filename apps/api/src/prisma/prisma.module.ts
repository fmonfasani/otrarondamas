import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { EmpresaScopedPrismaService } from './empresa-scoped-prisma.service';

@Module({
  providers: [PrismaService, EmpresaScopedPrismaService],
  exports: [PrismaService, EmpresaScopedPrismaService],
})
export class PrismaModule {}
