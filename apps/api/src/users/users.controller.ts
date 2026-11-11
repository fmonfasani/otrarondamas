import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CompanyScopedPrismaService } from '../prisma/company-scoped-prisma.service';
import { ExtractBusinessContext } from '../business-context/extract-business-context.decorator';
import { BusinessContextGuard } from '../business-context/business-context.guard';
import { ApprovedDossierGuard } from '../dossier/guards/approved-dossier.guard';
import { CanonicalPermission } from '../authorization/canonical-permission.decorator';

/**
 * Minimal, read-only listing, not a user management module (no
 * create/edit/deactivate). It exists only as support to select the
 * 'incoming user' in the cash count (RF-09, see apps/api/src/cash-register)
 * — any authenticated user of the company can see the list of their
 * colleagues, with no additional permission, because it exposes nothing
 * more sensitive than name/email (already visible internally in the
 * business).
 */
@ApiTags('usuarios')
@ApiBearerAuth()
@Controller('usuarios')
@UseGuards(BusinessContextGuard, ApprovedDossierGuard) // RF-17: cash count support, see cash-register.controller.ts
export class UsersController {
  constructor(private readonly prismaFactory: CompanyScopedPrismaService) {}

  @CanonicalPermission('USERS_VIEW')
  @Get()
  async findAll(@ExtractBusinessContext() businessId: string) {
    const db = this.prismaFactory.forCompany(businessId);
    return db.usuario.findMany({
      where: { activo: true },
      select: { id: true, nombre: true, email: true },
      orderBy: { nombre: 'asc' },
    });
  }
}
