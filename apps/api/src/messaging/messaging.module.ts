import { Module } from '@nestjs/common';
import { BusinessContextModule } from '../business-context/business-context.module';
import { MembershipRevocationModule } from '../membership/membership-revocation.module';
import { PrismaModule } from '../prisma/prisma.module';
import { MessagingController } from './messaging.controller';
import { MessagingService } from './messaging.service';
import { MessagingRealtimeEventBus } from './messaging-realtime-event-bus';
import { MessagingRealtimeGateway } from './messaging-realtime.gateway';

@Module({
  imports: [BusinessContextModule, MembershipRevocationModule, PrismaModule],
  controllers: [MessagingController],
  providers: [MessagingService, MessagingRealtimeEventBus, MessagingRealtimeGateway],
})
export class MessagingModule {}