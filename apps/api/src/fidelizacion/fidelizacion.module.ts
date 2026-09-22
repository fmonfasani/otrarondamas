import { Module } from '@nestjs/common';
import { FidelizacionController } from './fidelizacion.controller';
import { FidelizacionService } from './fidelizacion.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FidelizacionController],
  providers: [FidelizacionService],
  // Fase 5 del roadmap (aplicación automática en ventas/pedidos) va a
  // necesitar reusar FidelizacionService desde VentasModule/TiendaModule.
  exports: [FidelizacionService],
})
export class FidelizacionModule {}
