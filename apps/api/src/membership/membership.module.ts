import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MembershipService } from './membership.service';

// S-V1-01 — Memberships read module. No controllers of its own: the only
// endpoint lives in AuthController (GET /auth/memberships) and uses the
// existing authenticated identity.
@Module({
  imports: [PrismaModule],
  providers: [MembershipService],
  exports: [MembershipService],
})
export class MembershipModule {}
