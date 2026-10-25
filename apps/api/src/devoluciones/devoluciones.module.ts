import { Module } from '@nestjs/common';
import { DevolucionClienteController } from './devoluciones.controller';
import { DevolucionesService } from './devoluciones.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { BusinessContextModule } from '../business-context/business-context.module';

/* eslint-disable indent */

@Module({
  imports: [PrismaModule, AuthModule, BusinessContextModule],
  controllers: [DevolucionClienteController],
  providers: [DevolucionesService],
})
export class DevolucionesModule {}
