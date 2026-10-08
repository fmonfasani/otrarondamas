import { Module } from '@nestjs/common';
import { BusinessContextModule } from '../business-context/business-context.module';

/**
 * Messaging module boundary.
 *
 * M1 foundation only: the module depends on the canonical BusinessContext
 * boundary and does not introduce a parallel tenancy or authorization path.
 * Persistence, controllers, realtime, storage and domain services are
 * intentionally outside this foundation task.
 */
@Module({
  imports: [BusinessContextModule],
})
export class MessagingModule {}
