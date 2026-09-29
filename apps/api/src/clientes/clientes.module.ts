import { Module } from '@nestjs/common';
import { ClientesController } from './clientes.controller';
import { ClientesService } from './clientes.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ClientesController],
  providers: [ClientesService],
  // Fase 2 del roadmap de Fidelización (cliente opcional en el POS) y
  // Fase 3 (niveles) van a necesitar reusar ClientesService desde otros
  // módulos — se exporta ya de entrada, mismo criterio que
  // InventarioModule exportando InventarioService para TiendaModule.
  exports: [ClientesService],
})
export class ClientesModule {}
