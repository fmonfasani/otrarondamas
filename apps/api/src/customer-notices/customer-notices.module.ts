import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CustomerNoticeService } from './customer-notice.service';
import { OrderNoticeService } from './order-notice.service';

/* eslint-disable indent */

/** Notices from the Business in the customer's chat (OR-B4-035, OR-B4-037). */
@Module({
  imports: [PrismaModule],
  providers: [CustomerNoticeService, OrderNoticeService],
  exports: [CustomerNoticeService, OrderNoticeService],
})
export class CustomerNoticesModule {}
