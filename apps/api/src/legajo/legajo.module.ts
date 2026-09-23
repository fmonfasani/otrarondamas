import { Module } from '@nestjs/common';
import { LegajoController } from './legajo.controller';
import { LegajoService } from './legajo.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [LegajoController],
  providers: [LegajoService],
  // InvitacionesModule necesita verificarCompletoDeRol() al activar una
  // cuenta invitada; UsuariosController (si en el futuro expone un
  // endpoint de aprobación fuera de este módulo) también podría.
  exports: [LegajoService],
})
export class LegajoModule {}
