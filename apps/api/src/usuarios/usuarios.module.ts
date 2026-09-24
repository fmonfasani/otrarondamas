import { Module } from '@nestjs/common';
import { UsuariosController } from './usuarios.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [UsuariosController],
})
export class UsuariosModule {}
