import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MembershipModule } from '../membership/membership.module';
import { BusinessContextService } from './business-context.service';

// S-V1-02 — Context resolution + adapter. No controllers: it will be
// consumed by new surfaces (first Conversation); the legacy ERP keeps
// using AuthenticatedUser/empresaId unchanged.
@Module({
  imports: [PrismaModule, MembershipModule],
  providers: [BusinessContextService],
  exports: [BusinessContextService],
})
export class BusinessContextModule {}
