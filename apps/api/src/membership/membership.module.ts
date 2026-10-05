import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MembershipService } from './membership.service';

// S-V1-01 — Módulo de lectura de pertenencias. Sin controllers propios:
// el único endpoint vive en AuthController (GET /auth/memberships) y usa
// la identidad autenticada existente.
@Module({
  imports: [PrismaModule],
  providers: [MembershipService],
  exports: [MembershipService],
})
export class MembershipModule {}
