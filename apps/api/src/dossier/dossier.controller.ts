import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import 'multer';
import { DossierService } from './dossier.service';
import { UpdateDossierDto } from './dto/update-dossier.dto';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ExtractBusinessContext } from '../business-context/extract-business-context.decorator';
import { BusinessContextGuard } from '../business-context/business-context.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import {
  CanonicalPermission,
  AUTHENTICATED,
} from '../authorization/canonical-permission.decorator';

/**
 * RF-17 (docs/spec-login-roles.md): own dossier (self-service, without
 * @RequirePermission — any authenticated Usuario, whatever their dossier
 * status, can view/complete their own) + approval endpoints for the owner
 * (protected with usuarios.gestionar, the same permission that already
 * governs account creation/management in the panel).
 *
 * On purpose WITHOUT ApprovedDossierGuard on any endpoint here — a
 * Pending account has to be able to complete its dossier, which is exactly
 * the case this controller exists to solve.
 */
@ApiTags('legajo')
@ApiBearerAuth()
@Controller('legajo')
export class DossierController {
  constructor(
    private readonly dossierService: DossierService,
    private readonly prisma: PrismaService,
  ) {}

  @CanonicalPermission(AUTHENTICATED)
  @Get('mi-legajo')
  myDossier(@CurrentUser() user: AuthenticatedUser) {
    return this.dossierService.getOrCreateForUser(user.id);
  }

  @CanonicalPermission(AUTHENTICATED)
  @Patch('mi-legajo')
  updateMyDossier(@Body() dto: UpdateDossierDto, @CurrentUser() user: AuthenticatedUser) {
    return this.dossierService.updateForUser(user.id, dto);
  }

  // multipart/form-data: the file arrives in the field 'archivo', the rest of
  // the DTO (tipo, vencimiento) as text fields of the same form.
  // FileInterceptor in memory (no `dest`) — DossierService is the one that
  // decides where and how to persist the file on disk, never Multer
  // directly (we need the generated name + the path outside the webroot, see
  // storageDir()).
  @CanonicalPermission(AUTHENTICATED)
  @Post('mi-legajo/documentos')
  @UseInterceptors(FileInterceptor('archivo', { limits: { fileSize: 10 * 1024 * 1024 } })) // 10MB
  async uploadDocument(
    @Body() dto: UploadDocumentDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const dossier = await this.dossierService.getOrCreateForUser(user.id);
    return this.dossierService.uploadDocument(dossier.id, dto, file);
  }

  @CanonicalPermission(AUTHENTICATED)
  @Get('mi-legajo/estado')
  async myStatus(@CurrentUser() user: AuthenticatedUser) {
    const verification = await this.dossierService.verifyRoleComplete(user.id, user.rol);
    return { estadoLegajo: user.estadoLegajo, ...verification };
  }

  /**
   * Inbox of pending dossiers — the owner reviews before approving. It does
   * not list OWNER (never has a pending dossier to review) nor already
   * APROBADA accounts.
   */
  @RequirePermission('usuarios.gestionar')
  @CanonicalPermission('USERS_MANAGE')
  @Get('pendientes')
  @UseGuards(BusinessContextGuard)
  async listPending(@ExtractBusinessContext() businessId: string) {
    const users = await this.prisma.usuario.findMany({
      where: { empresaId: businessId, estadoLegajo: 'PENDIENTE' },
      include: { Legajo: { include: { DocumentoLegajo: true } } },
    });
    return users.map((u) => ({
      id: u.id,
      nombre: u.nombre,
      email: u.email,
      rol: u.rol,
      legajo: u.Legajo,
    }));
  }

  /**
   * Manual approval by the owner — the only way for an account to go from
   * Pendiente to Aprobada (RF-17: 'the system approves NOTHING
   * automatically'). Verifies that the dossier is complete before allowing
   * approval, so as not to blindly approve an account with half-filled
   * data.
   */
  @RequirePermission('usuarios.gestionar')
  @CanonicalPermission('USERS_MANAGE')
  @Patch(':usuarioId/aprobar')
  @UseGuards(BusinessContextGuard)
  async approve(
    @Param('usuarioId') userId: string,
    @ExtractBusinessContext() businessId: string,
  ) {
    const userRecord = await this.prisma.usuario.findFirst({
      where: { id: userId, empresaId: businessId },
    });
    if (!userRecord) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const { completo: complete, faltantes: missing } = await this.dossierService.verifyRoleComplete(
      userId,
      userRecord.rol,
    );
    if (!complete) {
      return { aprobado: false, faltantes: missing };
    }

    const updated = await this.prisma.usuario.updateMany({
      where: { id: userId, empresaId: businessId },
      data: { estadoLegajo: 'APROBADO' },
    });
    if (updated.count !== 1) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return { aprobado: true, faltantes: [] };
  }

  /**
   * Serves the file of a sensitive document ONLY authenticated and with
   * usuarios.gestionar — never a public URL. Verifies that the document
   * belongs to a Usuario of the SAME company before handing it over (the
   * multi-company isolation of Legajo/DocumentoLegajo is inherited through
   * Usuario, they have no direct empresaId, see company-scope.extension.ts).
   */
  @RequirePermission('usuarios.gestionar')
  @CanonicalPermission('USERS_MANAGE')
  @Get('documentos/:documentoId/descargar')
  @UseGuards(BusinessContextGuard)
  async downloadDocument(
    @Param('documentoId') documentId: string,
    @ExtractBusinessContext() businessId: string,
    @Res() res: Response,
  ) {
    const document = await this.prisma.documentoLegajo.findFirst({
      where: {
        id: documentId,
        Legajo: { Usuario: { empresaId: businessId } },
      },
      include: { Legajo: { include: { Usuario: true } } },
    });
    if (!document) {
      throw new NotFoundException('Documento no encontrado');
    }

    const { ruta: filePath, nombre: name } =
      await this.dossierService.absoluteDocumentPath(documentId);
    res.download(filePath, name);
  }
}
