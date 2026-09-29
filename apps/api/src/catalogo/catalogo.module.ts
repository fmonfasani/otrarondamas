import { Module } from '@nestjs/common';
import { CatalogoController } from './catalogo.controller';
import { JerarquiaCatalogoController } from './jerarquia-catalogo.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CatalogoController, JerarquiaCatalogoController],
})
export class CatalogoModule {}
