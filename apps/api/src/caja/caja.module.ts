import { Module } from '@nestjs/common';
import { CajaController } from './caja.controller';
import { CajaService } from './caja.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AutorizacionesModule } from '../autorizaciones/autorizaciones.module';

@Module({
  imports: [PrismaModule, AutorizacionesModule],
  controllers: [CajaController],
  providers: [CajaService],
})
export class CajaModule {}
