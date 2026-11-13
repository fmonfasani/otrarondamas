import { Module } from '@nestjs/common';
import { DevolucionClienteController } from './devoluciones.controller';
import { DevolucionesCoreModule } from './devoluciones-core.module';
import { AuthModule } from '../auth/auth.module';
import { BusinessContextModule } from '../business-context/business-context.module';

/* eslint-disable indent */

@Module({
  imports: [DevolucionesCoreModule, AuthModule, BusinessContextModule],
  controllers: [DevolucionClienteController],
})
export class DevolucionesModule {}
