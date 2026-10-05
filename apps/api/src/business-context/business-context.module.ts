import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MembershipModule } from '../membership/membership.module';
import { BusinessContextService } from './business-context.service';

// S-V1-02 — Resolución de contexto + adapter. Sin controllers: lo
// consumirán superficies nuevas (primero Conversation); el ERP legacy
// sigue usando AuthenticatedUser/empresaId sin cambios.
@Module({
  imports: [PrismaModule, MembershipModule],
  providers: [BusinessContextService],
  exports: [BusinessContextService],
})
export class BusinessContextModule {}
