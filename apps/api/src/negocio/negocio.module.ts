import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { BusinessContextModule } from '../business-context/business-context.module';
import { NegocioController } from './negocio.controller';
import { NegocioService } from './negocio.service';
import { UbicacionController } from './ubicacion.controller';
import { GeorefService } from './georef.service';

/* eslint-disable indent */

@Module({
  imports: [PrismaModule, AuthModule, BusinessContextModule],
  controllers: [NegocioController, UbicacionController],
  providers: [NegocioService, GeorefService],
})
export class NegocioModule {}
