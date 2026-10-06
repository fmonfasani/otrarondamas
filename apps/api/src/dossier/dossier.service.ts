import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateDossierDto } from './dto/update-dossier.dto';
import { UploadDocumentDto } from './dto/upload-document.dto';

type UserRole = 'OWNER' | 'ASISTENTE_LOCAL' | 'PROVEEDOR' | 'REPARTIDOR';

// Required fields by role (docs/spec-login-roles.md, section 3) — the only
// place in the code that knows this table, so as not to duplicate it nor
// leave it implicit in several places. `null` in the table = that role has
// no dossier (today no Usuario role falls in that case, but the type is
// prepared; wholesale Cliente is validated separately, see
// verifyCustomerComplete()).
const REQUIRED_FIELDS_BY_ROLE: Record<UserRole, (keyof UpdateDossierDto)[]> = {
  OWNER: ['cuit', 'razonSocial', 'condicionIva'],
  ASISTENTE_LOCAL: ['dni', 'telefono', 'direccion'],
  PROVEEDOR: ['cuit', 'razonSocial', 'tipoFactura'],
  REPARTIDOR: ['dni', 'telefono', 'direccion', 'vehiculoDatos', 'licenciaConducir'],
};

// Only these two roles upload sensitive documents (criminal record, CUIL
// certificate) — Owner and Proveedor do not.
const ROLES_WITH_DOCUMENTS: UserRole[] = ['ASISTENTE_LOCAL', 'REPARTIDOR'];
const REQUIRED_DOCUMENTS: UploadDocumentDto['tipo'][] = ['ANTECEDENTES_PENALES', 'CONSTANCIA_CUIL'];

/**
 * RF-17 (docs/spec-login-roles.md): dossier of an account on the
 * 'Business' side (non-OWNER Usuario) or of a wholesale Cliente — fields +
 * documents according to the role, with manual approval by the owner
 * before being able to operate.
 *
 * Document storage: decision resolved in the definition session — VPS
 * disk, in a folder OUTSIDE the webroot (never served directly by nginx),
 * never external cloud storage. `LEGAJO_STORAGE_DIR` fails explicitly if
 * missing (same pattern as the rest of the project's critical env vars,
 * see GOOGLE_SIGNUP_EMPRESA_ID) — no default path is assumed for
 * sensitive data.
 */
@Injectable()
export class DossierService {
  constructor(private readonly prisma: PrismaService) {}

  private storageDir(): string {
    const dir = process.env.LEGAJO_STORAGE_DIR;
    if (!dir) {
      throw new Error(
        'LEGAJO_STORAGE_DIR no configurado (ver apps/api/.env) — no se puede guardar documentación sensible sin una ruta explícita.',
      );
    }
    return dir;
  }

  /**
   * Own dossier of the authenticated user — creates the empty record on the
   * first access (a Usuario ASISTENTE_LOCAL/PROVEEDOR/REPARTIDOR just
   * activated from an invitation has no Legajo yet, see
   * InvitationsService.activate()).
   */
  async getOrCreateForUser(userId: string) {
    const existing = await this.prisma.legajo.findUnique({
      where: { usuarioId: userId },
      include: { documentos: true },
    });
    if (existing) return existing;
    return this.prisma.legajo.create({
      data: { usuarioId: userId },
      include: { documentos: true },
    });
  }

  async getOrCreateForCustomer(customerId: string) {
    const existing = await this.prisma.legajo.findUnique({
      where: { clienteId: customerId },
      include: { documentos: true },
    });
    if (existing) return existing;
    return this.prisma.legajo.create({
      data: { clienteId: customerId },
      include: { documentos: true },
    });
  }

  async updateForUser(userId: string, dto: UpdateDossierDto) {
    const dossier = await this.getOrCreateForUser(userId);
    return this.prisma.legajo.update({
      where: { id: dossier.id },
      data: dto,
      include: { documentos: true },
    });
  }

  async updateForCustomer(customerId: string, dto: UpdateDossierDto) {
    const dossier = await this.getOrCreateForCustomer(customerId);
    return this.prisma.legajo.update({
      where: { id: dossier.id },
      data: dto,
      include: { documentos: true },
    });
  }

  /**
   * Saves the file on disk (outside the webroot) with a generated name
   * (never the original name — avoids collisions and any path traversal
   * attempt via the uploaded file name) and registers the document. Replaces
   * a previous document of the same `tipo` if one already existed
   * (re-uploading the same renewed certificate).
   */
  async uploadDocument(
    dossierId: string,
    dto: UploadDocumentDto,
    file: { buffer: Buffer; originalname: string; mimetype: string },
  ) {
    const ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      throw new BadRequestException('Formato de archivo no permitido — solo PDF, JPG o PNG.');
    }

    const dossier = await this.prisma.legajo.findUnique({ where: { id: dossierId } });
    if (!dossier) {
      throw new NotFoundException('Legajo no encontrado');
    }

    const extension = path.extname(file.originalname) || '.bin';
    const generatedName = `${crypto.randomUUID()}${extension}`;
    const dossierDir = path.join(this.storageDir(), dossierId);
    await fs.mkdir(dossierDir, { recursive: true });
    const fullPath = path.join(dossierDir, generatedName);
    await fs.writeFile(fullPath, file.buffer);

    // Relative path stored in the database — never the absolute one of the
    // disk, so as not to leak the VPS filesystem structure if this data is
    // ever exposed by mistake.
    const relativePath = path.join(dossierId, generatedName);

    const existing = await this.prisma.documentoLegajo.findFirst({
      where: { legajoId: dossierId, tipo: dto.tipo },
    });
    if (existing) {
      // The old file on disk is replaced — it is not left orphaned taking up
      // space nor reachable through an already unlinked path.
      await fs.unlink(path.join(this.storageDir(), existing.rutaArchivo)).catch(() => {
        // Si el archivo viejo ya no existe en disco (borrado manual,
        // migración, etc.) no bloquea el reemplazo del registro.
      });
      return this.prisma.documentoLegajo.update({
        where: { id: existing.id },
        data: {
          rutaArchivo: relativePath,
          nombreArchivo: file.originalname,
          vencimiento: new Date(dto.vencimiento),
        },
      });
    }

    return this.prisma.documentoLegajo.create({
      data: {
        legajoId: dossierId,
        tipo: dto.tipo,
        rutaArchivo: relativePath,
        nombreArchivo: file.originalname,
        vencimiento: new Date(dto.vencimiento),
      },
    });
  }

  /** Absolute path on disk of a document — only to serve it authenticated. */
  async absoluteDocumentPath(documentId: string): Promise<{ ruta: string; nombre: string }> {
    const document = await this.prisma.documentoLegajo.findUnique({
      where: { id: documentId },
    });
    if (!document) {
      throw new NotFoundException('Documento no encontrado');
    }
    return {
      ruta: path.join(this.storageDir(), document.rutaArchivo),
      nombre: document.nombreArchivo,
    };
  }

  /**
   * Complete fields + documents according to the role — the only place that
   * decides whether a dossier is ready for the owner to approve. It does
   * not approve by itself (that is done by whoever invokes it, see
   * InvitationsService/UsersController), it only answers yes/no and why.
   */
  async verifyRoleComplete(
    userId: string,
    role: UserRole,
  ): Promise<{ completo: boolean; faltantes: string[] }> {
    const dossier = await this.getOrCreateForUser(userId);
    const requiredFields = REQUIRED_FIELDS_BY_ROLE[role];
    const missing: string[] = requiredFields.filter((field) => !dossier[field]);

    if (ROLES_WITH_DOCUMENTS.includes(role)) {
      const presentTypes = new Set(dossier.documentos.map((d) => d.tipo));
      for (const type of REQUIRED_DOCUMENTS) {
        if (!presentTypes.has(type)) {
          missing.push(`documento:${type}`);
        }
      }
    }

    return { completo: missing.length === 0, faltantes: missing };
  }

  /**
   * Same criterion as verifyRoleComplete() but for wholesale Cliente —
   * without documents, only fiscal fields (see the dossier-by-role table in
   * spec-login-roles.md).
   */
  async verifyCustomerComplete(
    customerId: string,
  ): Promise<{ completo: boolean; faltantes: string[] }> {
    const dossier = await this.getOrCreateForCustomer(customerId);
    const requiredFields: (keyof UpdateDossierDto)[] = ['cuit', 'razonSocial', 'condicionIva'];
    const missing = requiredFields.filter((field) => !dossier[field]);
    return { completo: missing.length === 0, faltantes: missing };
  }
}
