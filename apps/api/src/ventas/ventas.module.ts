import { Module } from '@nestjs/common';
import { VentasController } from './ventas.controller';
import { VentasService } from './ventas.service';
import { PrismaModule } from '../prisma/prisma.module';
import { InventarioModule } from '../inventario/inventario.module';
import { FidelizacionModule } from '../fidelizacion/fidelizacion.module';
import { ClientesModule } from '../clientes/clientes.module';

@Module({
  // InventarioModule: VentasService usa InventarioService.descontarStock()
  // (movido ahí en la Fase 4 de Tienda Online — mismo método que usa
  // PedidosService, nunca dos caminos de descuento en paralelo).
  // FidelizacionModule/ClientesModule: Fase 5 del roadmap de
  // Fidelización — calcular el nivel del cliente y el descuento
  // automático aplicable a cada ítem, ver ventas.service.ts.
  imports: [PrismaModule, InventarioModule, FidelizacionModule, ClientesModule],
  controllers: [VentasController],
  providers: [VentasService],
})
export class VentasModule {}
