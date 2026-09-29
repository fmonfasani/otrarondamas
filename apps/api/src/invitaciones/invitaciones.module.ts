import { Module } from '@nestjs/common';
import { InvitacionesController } from './invitaciones.controller';
import { InvitacionesService } from './invitaciones.service';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, EmailModule, AuthModule],
  controllers: [InvitacionesController],
  providers: [InvitacionesService],
})
export class InvitacionesModule {}
