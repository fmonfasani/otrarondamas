import { Module } from '@nestjs/common';
import { NotificationPreferencesService } from './notification-preferences.service';
import { NotificationDigestService } from './notification-digest.service';
import { NotificationQueueService } from './notification-queue.service';
import { NotificationAnalyticsService } from './notification-analytics.service';
import { NotificationsController } from './notifications.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { BusinessContextModule } from '../business-context/business-context.module';

@Module({
  imports: [PrismaModule, EmailModule, BusinessContextModule],
  controllers: [NotificationsController],
  providers: [
    NotificationPreferencesService,
    NotificationDigestService,
    NotificationQueueService,
    NotificationAnalyticsService,
  ],
  exports: [
    NotificationPreferencesService,
    NotificationDigestService,
    NotificationQueueService,
    NotificationAnalyticsService,
  ],
})
export class NotificationsModule {}
