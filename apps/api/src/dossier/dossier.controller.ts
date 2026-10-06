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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { DossierService } from './dossier.service';
import { UpdateDossierDto } from './dto/update-dossier.dto';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';

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

  @Get('mi-legajo')
  myDossier(@CurrentUser() user: AuthenticatedUser) {
    return this.dossierService.getOrCreateForUser(user.id);
  }

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
  @Get('pendientes')
  async listPending(@CurrentUser() user: AuthenticatedUser) {
    const users = await this.prisma.usuario.findMany({
      where: { empresaId: user.empresaId, estadoLegajo: 'PENDIENTE' },
      include: { legajo: { include: { documentos: true } } },
    });
    return users.map((u) => ({
      id: u.id,
      nombre: u.nombre,
      email: u.email,
      rol: u.rol,
      legajo: u.legajo,
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
  @Patch(':usuarioId/aprobar')
  async approve(@Param('usuarioId') userId: string, @CurrentUser() user: AuthenticatedUser) {
    const userRecord = await this.prisma.usuario.findFirst({
      where: { id: userId, empresaId: user.empresaId },
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

    await this.prisma.usuario.update({
      where: { id: userId },
      data: { estadoLegajo: 'APROBADO' },
    });
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
  @Get('documentos/:documentoId/descargar')
  async downloadDocument(
    @Param('documentoId') documentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const document = await this.prisma.documentoLegajo.findUnique({
      where: { id: documentId },
      include: { legajo: { include: { usuario: true } } },
    });
    if (!document || document.legajo.usuario?.empresaId !== user.empresaId) {
      throw new NotFoundException('Documento no encontrado');
    }

    const { ruta: filePath, nombre: name } =
      await this.dossierService.absoluteDocumentPath(documentId);
    res.download(filePath, name);
  }
}
