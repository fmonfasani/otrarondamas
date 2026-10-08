import { Module } from '@nestjs/common';
import { BusinessContextModule } from '../business-context/business-context.module';
import { PrismaModule } from '../prisma/prisma.module';
import { MembershipController } from './membership.controller';
import { MembershipRevocationService } from './membership-revocation.service';

@Module({
  imports: [PrismaModule, BusinessContextModule],
  controllers: [MembershipController],
  providers: [MembershipRevocationService],
  exports: [MembershipRevocationService],
})
export class MembershipRevocationModule {}
