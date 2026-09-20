import { Module } from '@nestjs/common';
import { CatalogoController } from './catalogo.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CatalogoController],
})
export class CatalogoModule {}
