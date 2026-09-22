import { Module } from '@nestjs/common';
import { VentasController } from './ventas.controller';
import { VentasService } from './ventas.service';
import { PrismaModule } from '../prisma/prisma.module';
import { InventarioModule } from '../inventario/inventario.module';

@Module({
  // InventarioModule: VentasService usa InventarioService.descontarStock()
  // (movido ahí en la Fase 4 de Tienda Online — mismo método que usa
  // PedidosService, nunca dos caminos de descuento en paralelo).
  imports: [PrismaModule, InventarioModule],
  controllers: [VentasController],
  providers: [VentasService],
})
export class VentasModule {}
