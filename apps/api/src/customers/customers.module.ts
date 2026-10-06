import { Module } from '@nestjs/common';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { PrismaModule } from '../prisma/prisma.module';
import { BusinessContextModule } from '../business-context/business-context.module';

// S-V1-03: imports BusinessContextModule so that CustomersController can
// resolve the actor's context at the boundary. BusinessContextModule also
// brings transitive MembershipModule + PrismaModule; PrismaModule is still
// imported explicitly because CustomersService uses it directly.
@Module({
  imports: [PrismaModule, BusinessContextModule],
  controllers: [CustomersController],
  providers: [CustomersService],
  // Phase 2 of the Loyalty roadmap (optional customer in the POS) and
  // Phase 3 (levels) will need to reuse CustomersService from other modules
  // — it is exported from the start, same criterion as InventoryModule
  // exporting InventoryService for StoreModule.
  exports: [CustomersService],
})
export class CustomersModule {}
