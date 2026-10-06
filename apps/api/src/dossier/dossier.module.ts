import { Module } from '@nestjs/common';
import { DossierController } from './dossier.controller';
import { CustomerDossierController } from './dossier.customer.controller';
import { DossierService } from './dossier.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DossierController, CustomerDossierController],
  providers: [DossierService],
  // InvitationsModule needs verifyRoleComplete() when activating an invited
  // account; UsersController (if in the future it exposes an approval
  // endpoint outside this module) could too.
  exports: [DossierService],
})
export class DossierModule {}
