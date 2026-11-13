import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DevolucionesService } from './devoluciones.service';
import { ReturnNotifierService } from './return-notifier.service';

/* eslint-disable indent */

/**
 * The returns logic without its HTTP surface, so other modules (the store's «Mis compras»,
 * OR-B4-035 rule 1) can use it without pulling in the auth module graph.
 */
@Module({
  imports: [PrismaModule],
  providers: [DevolucionesService, ReturnNotifierService],
  exports: [DevolucionesService],
})
export class DevolucionesCoreModule {}
