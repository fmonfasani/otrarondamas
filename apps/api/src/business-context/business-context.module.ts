import { forwardRef, Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MembershipModule } from '../membership/membership.module';
import { BusinessContextService } from './business-context.service';
import { BusinessContextGuard } from './business-context.guard';

// S-V1-02 — Context resolution + adapter. No controllers: it will be
// consumed by new surfaces (first Conversation); the legacy ERP keeps
// using AuthenticatedUser/empresaId unchanged.
@Module({
  imports: [PrismaModule, forwardRef(() => MembershipModule)],
  providers: [BusinessContextService, BusinessContextGuard],
  exports: [BusinessContextService, BusinessContextGuard],
})
export class BusinessContextModule {}
