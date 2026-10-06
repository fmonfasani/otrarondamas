import { Module } from '@nestjs/common';
import { CashRegisterController } from './cash-register.controller';
import { CashRegisterService } from './cash-register.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthorizationsModule } from '../authorizations/authorizations.module';

@Module({
  imports: [PrismaModule, AuthorizationsModule],
  controllers: [CashRegisterController],
  providers: [CashRegisterService],
})
export class CashRegisterModule {}
