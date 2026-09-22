import { Module } from '@nestjs/common';
import { TiendaController } from './tienda.controller';
import { TiendaService } from './tienda.service';
import { PrismaModule } from '../prisma/prisma.module';
import { InventarioModule } from '../inventario/inventario.module';
import { FidelizacionModule } from '../fidelizacion/fidelizacion.module';
import { ClientesModule } from '../clientes/clientes.module';

@Module({
  // FidelizacionModule/ClientesModule: Fase 5 del roadmap de
  // Fidelización, extendida a Tienda Online — calcular el nivel del
  // cliente de tienda (siempre identificado por email, nunca anónimo
  // acá) y el descuento automático aplicable, ver tienda.service.ts.
  imports: [PrismaModule, InventarioModule, FidelizacionModule, ClientesModule],
  controllers: [TiendaController],
  providers: [TiendaService],
})
export class TiendaModule {}
