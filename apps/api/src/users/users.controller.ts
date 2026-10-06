import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CompanyScopedPrismaService } from '../prisma/company-scoped-prisma.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApprovedDossierGuard } from '../dossier/guards/approved-dossier.guard';
import type { AuthenticatedUser } from '../auth/auth.types';

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
@UseGuards(ApprovedDossierGuard) // RF-17: cash count support, see cash-register.controller.ts
export class UsersController {
  constructor(private readonly prismaFactory: CompanyScopedPrismaService) {}

  @Get()
  async findAll(@CurrentUser() user: AuthenticatedUser) {
    const db = this.prismaFactory.forCompany(user.empresaId);
    return db.usuario.findMany({
      where: { activo: true },
      select: { id: true, nombre: true, email: true },
      orderBy: { nombre: 'asc' },
    });
  }
}
