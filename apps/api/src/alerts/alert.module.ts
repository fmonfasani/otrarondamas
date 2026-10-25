import { Module } from '@nestjs/common';
import { AlertService } from './alert.service';

/**
 * AlertModule: Provides AlertService for refund notifications.
 */
@Module({
  providers: [AlertService],
  exports: [AlertService],
})
export class AlertModule {}
