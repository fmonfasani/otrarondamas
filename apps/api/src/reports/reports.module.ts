import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { BusinessContextModule } from '../business-context/business-context.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

/* eslint-disable indent */

@Module({
  imports: [PrismaModule, AuthModule, BusinessContextModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
