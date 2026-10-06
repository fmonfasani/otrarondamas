import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DossierService } from './dossier.service';
import { UpdateDossierDto } from './dto/update-dossier.dto';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';

/**
 * RF-17 (docs/spec-login-roles.md): self-service dossier for the wholesale
 * Cliente. Route separate from /legajo (which is for Usuario) so as not to
 * mix the two flows — the auth is the same JWT, but `user.type`
 * discriminates whether the sub is a Usuario.id or a Cliente.id.
 *
 * Self-service endpoints (mi-legajo) are called with a Cliente token.
 * Owner management endpoints (pending, approve) are called with a Usuario
 * token (the owner).
 *
 * No ApprovedDossierGuard here (same as /legajo) — the wholesaler has to be
 * able to complete their dossier before being approved.
 */
@ApiTags('legajo-cliente')
@ApiBearerAuth()
@Controller('legajo/cliente')
export class CustomerDossierController {
  constructor(
    private readonly dossierService: DossierService,
    private readonly prisma: PrismaService,
  ) {}

  private requireWholesale(user: AuthenticatedUser) {
    if (user.type !== 'cliente') {
      throw new ForbiddenException('Endpoint solo para clientes');
    }
    if (!user.esMayorista) {
      throw new ForbiddenException(
        'Solo los clientes mayoristas tienen legajo — contactá al dueño si creés que esto es un error.',
      );
    }
  }

  @Get('mi-legajo')
  myDossier(@CurrentUser() user: AuthenticatedUser) {
    this.requireWholesale(user);
    return this.dossierService.getOrCreateForCustomer(user.id);
  }

  @Patch('mi-legajo')
  updateMyDossier(@Body() dto: UpdateDossierDto, @CurrentUser() user: AuthenticatedUser) {
    this.requireWholesale(user);
    return this.dossierService.updateForCustomer(user.id, dto);
  }

  // The wholesale Cliente does not upload sensitive documents (only fills in
  // fiscal fields — see the dossier-by-role table in spec-login-roles.md).
  // This endpoint is left prepared for future extension without impact on
  // the verifyCustomerComplete() flow (which requires no documents).
  @Post('mi-legajo/documentos')
  @UseInterceptors(FileInterceptor('archivo', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async uploadDocument(
    @Body() dto: UploadDocumentDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    this.requireWholesale(user);
    const dossier = await this.dossierService.getOrCreateForCustomer(user.id);
    return this.dossierService.uploadDocument(dossier.id, dto, file);
  }

  @Get('mi-legajo/estado')
  async myStatus(@CurrentUser() user: AuthenticatedUser) {
    this.requireWholesale(user);
    const verification = await this.dossierService.verifyCustomerComplete(user.id);
    return { estadoLegajo: user.estadoLegajo, ...verification };
  }

  /**
   * Inbox of wholesale customers with a pending dossier — for the owner.
   * It is called by a USUARIO (token type='usuario'), not by a customer.
   */
  @Get('pendientes')
  async listPending(@CurrentUser() user: AuthenticatedUser) {
    if (user.type !== 'usuario') {
      throw new ForbiddenException('Solo el dueño puede ver los legajos pendientes');
    }
    const customers = await this.prisma.cliente.findMany({
      where: { empresaId: user.empresaId, esMayorista: true, estadoLegajo: 'PENDIENTE' },
      include: { legajo: true },
    });
    return customers.map((c) => ({
      id: c.id,
      nombre: c.nombre,
      email: c.email,
      legajo: c.legajo,
    }));
  }

  /**
   * Approval of the wholesaler's dossier by the owner.
   * The owner calls this endpoint with their own token (type='usuario').
   * Verifies that the dossier is complete (cuit, razonSocial, condicionIva)
   * before approving.
   */
  @Patch(':clienteId/aprobar')
  async approve(@Param('clienteId') customerId: string, @CurrentUser() user: AuthenticatedUser) {
    if (user.type !== 'usuario') {
      throw new ForbiddenException('Solo el dueño puede aprobar legajos');
    }

    const customer = await this.prisma.cliente.findFirst({
      where: { id: customerId, empresaId: user.empresaId, esMayorista: true },
    });
    if (!customer) {
      throw new NotFoundException('Cliente mayorista no encontrado');
    }

    const { completo: complete, faltantes: missing } =
      await this.dossierService.verifyCustomerComplete(customerId);
    if (!complete) {
      return { aprobado: false, faltantes: missing };
    }

    await this.prisma.cliente.update({
      where: { id: customerId },
      data: { estadoLegajo: 'APROBADO' },
    });
    return { aprobado: true, faltantes: [] };
  }
}
