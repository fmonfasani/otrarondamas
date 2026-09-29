import { Module } from '@nestjs/common';
import { AutorizacionesController } from './autorizaciones.controller';
import { AutorizacionesService } from './autorizaciones.service';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AutorizacionesController],
  providers: [AutorizacionesService],
  exports: [AutorizacionesService],
})
export class AutorizacionesModule {}
