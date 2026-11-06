import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { BusinessContextModule } from '../business-context/business-context.module';

@Module({
  imports: [PrismaModule, BusinessContextModule],
  controllers: [UsersController],
})
export class UsersModule {}
