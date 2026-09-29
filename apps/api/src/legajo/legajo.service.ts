import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ActualizarLegajoDto } from './dto/actualizar-legajo.dto';
import { SubirDocumentoDto } from './dto/subir-documento.dto';

type RolUsuario = 'OWNER' | 'ASISTENTE_LOCAL' | 'PROVEEDOR' | 'REPARTIDOR';

// Campos obligatorios por rol (docs/spec-login-roles.md, sección 3) —
// único lugar del código que conoce esta tabla, para no duplicarla ni
// dejarla implícita en varios sitios. `null` en la tabla = ese rol no
// tiene legajo (hoy ningún rol de Usuario cae en ese caso, pero el tipo
// queda preparado; Cliente mayorista se valida aparte, ver
// verificarCompletoCliente()).
const CAMPOS_OBLIGATORIOS_POR_ROL: Record<RolUsuario, (keyof ActualizarLegajoDto)[]> = {
  OWNER: ['cuit', 'razonSocial', 'condicionIva'],
  ASISTENTE_LOCAL: ['dni', 'telefono', 'direccion'],
  PROVEEDOR: ['cuit', 'razonSocial', 'tipoFactura'],
  REPARTIDOR: ['dni', 'telefono', 'direccion', 'vehiculoDatos', 'licenciaConducir'],
};

// Solo estos dos roles suben documentos sensibles (antecedentes
// penales, constancia de CUIL) — Owner y Proveedor no.
const ROLES_CON_DOCUMENTOS: RolUsuario[] = ['ASISTENTE_LOCAL', 'REPARTIDOR'];
const DOCUMENTOS_REQUERIDOS: SubirDocumentoDto['tipo'][] = [
  'ANTECEDENTES_PENALES',
  'CONSTANCIA_CUIL',
];

/**
 * RF-17 (docs/spec-login-roles.md): legajo de una cuenta del lado
 * "Negocio" (Usuario no-OWNER) o de un Cliente mayorista — campos +
 * documentos según el rol, con aprobación manual del dueño antes de
 * poder operar.
 *
 * Storage de documentos: decisión resuelta en la sesión de definición
 * — disco del VPS, en una carpeta FUERA del webroot (nunca servida
 * directo por nginx), nunca cloud storage externo. `LEGAJO_STORAGE_DIR`
 * falla explícito si falta (mismo patrón que el resto de env vars
 * críticas del proyecto, ver GOOGLE_SIGNUP_EMPRESA_ID) — no se asume
 * una ruta por defecto para datos sensibles.
 */
@Injectable()
export class LegajoService {
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
   * Legajo propio del usuario autenticado — crea el registro vacío en
   * el primer acceso (un Usuario ASISTENTE_LOCAL/PROVEEDOR/REPARTIDOR
   * recién activado desde una invitación no tiene Legajo todavía, ver
   * InvitacionesService.activar()).
   */
  async obtenerOCrearDeUsuario(usuarioId: string) {
    const existente = await this.prisma.legajo.findUnique({
      where: { usuarioId },
      include: { documentos: true },
    });
    if (existente) return existente;
    return this.prisma.legajo.create({
      data: { usuarioId },
      include: { documentos: true },
    });
  }

  async obtenerOCrearDeCliente(clienteId: string) {
    const existente = await this.prisma.legajo.findUnique({
      where: { clienteId },
      include: { documentos: true },
    });
    if (existente) return existente;
    return this.prisma.legajo.create({
      data: { clienteId },
      include: { documentos: true },
    });
  }

  async actualizarDeUsuario(usuarioId: string, dto: ActualizarLegajoDto) {
    const legajo = await this.obtenerOCrearDeUsuario(usuarioId);
    return this.prisma.legajo.update({
      where: { id: legajo.id },
      data: dto,
      include: { documentos: true },
    });
  }

  async actualizarDeCliente(clienteId: string, dto: ActualizarLegajoDto) {
    const legajo = await this.obtenerOCrearDeCliente(clienteId);
    return this.prisma.legajo.update({
      where: { id: legajo.id },
      data: dto,
      include: { documentos: true },
    });
  }

  /**
   * Guarda el archivo en disco (fuera del webroot) con un nombre
   * generado (nunca el nombre original — evita colisiones y cualquier
   * intento de path traversal vía el nombre del archivo subido) y
   * registra el documento. Reemplaza un documento previo del mismo
   * `tipo` si ya existía (re-subir el mismo certificado renovado).
   */
  async subirDocumento(
    legajoId: string,
    dto: SubirDocumentoDto,
    archivo: { buffer: Buffer; originalname: string; mimetype: string },
  ) {
    const ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!ALLOWED_MIME.includes(archivo.mimetype)) {
      throw new BadRequestException('Formato de archivo no permitido — solo PDF, JPG o PNG.');
    }

    const legajo = await this.prisma.legajo.findUnique({ where: { id: legajoId } });
    if (!legajo) {
      throw new NotFoundException('Legajo no encontrado');
    }

    const extension = path.extname(archivo.originalname) || '.bin';
    const nombreGenerado = `${crypto.randomUUID()}${extension}`;
    const dirLegajo = path.join(this.storageDir(), legajoId);
    await fs.mkdir(dirLegajo, { recursive: true });
    const rutaCompleta = path.join(dirLegajo, nombreGenerado);
    await fs.writeFile(rutaCompleta, archivo.buffer);

    // Ruta relativa guardada en la base — nunca la absoluta del disco,
    // para no filtrar la estructura del filesystem del VPS si algún
    // día se expone este dato por error.
    const rutaRelativa = path.join(legajoId, nombreGenerado);

    const existente = await this.prisma.documentoLegajo.findFirst({
      where: { legajoId, tipo: dto.tipo },
    });
    if (existente) {
      // Se reemplaza el archivo viejo en disco — no queda huérfano
      // ocupando espacio ni accesible por una ruta ya desvinculada.
      await fs.unlink(path.join(this.storageDir(), existente.rutaArchivo)).catch(() => {
        // Si el archivo viejo ya no existe en disco (borrado manual,
        // migración, etc.) no bloquea el reemplazo del registro.
      });
      return this.prisma.documentoLegajo.update({
        where: { id: existente.id },
        data: {
          rutaArchivo: rutaRelativa,
          nombreArchivo: archivo.originalname,
          vencimiento: new Date(dto.vencimiento),
        },
      });
    }

    return this.prisma.documentoLegajo.create({
      data: {
        legajoId,
        tipo: dto.tipo,
        rutaArchivo: rutaRelativa,
        nombreArchivo: archivo.originalname,
        vencimiento: new Date(dto.vencimiento),
      },
    });
  }

  /** Ruta absoluta en disco de un documento — solo para servirlo autenticado. */
  async rutaAbsolutaDeDocumento(documentoId: string): Promise<{ ruta: string; nombre: string }> {
    const documento = await this.prisma.documentoLegajo.findUnique({
      where: { id: documentoId },
    });
    if (!documento) {
      throw new NotFoundException('Documento no encontrado');
    }
    return {
      ruta: path.join(this.storageDir(), documento.rutaArchivo),
      nombre: documento.nombreArchivo,
    };
  }

  /**
   * Campos + documentos completos según el rol — único lugar que decide
   * si un legajo está listo para que el dueño lo apruebe. No aprueba
   * por sí solo (eso lo hace quien invoca, ver InvitacionesService/
   * UsuariosController), solo responde sí/no y por qué.
   */
  async verificarCompletoDeRol(
    usuarioId: string,
    rol: RolUsuario,
  ): Promise<{ completo: boolean; faltantes: string[] }> {
    const legajo = await this.obtenerOCrearDeUsuario(usuarioId);
    const camposRequeridos = CAMPOS_OBLIGATORIOS_POR_ROL[rol];
    const faltantes: string[] = camposRequeridos.filter((campo) => !legajo[campo]);

    if (ROLES_CON_DOCUMENTOS.includes(rol)) {
      const tiposPresentes = new Set(legajo.documentos.map((d) => d.tipo));
      for (const tipo of DOCUMENTOS_REQUERIDOS) {
        if (!tiposPresentes.has(tipo)) {
          faltantes.push(`documento:${tipo}`);
        }
      }
    }

    return { completo: faltantes.length === 0, faltantes };
  }

  /**
   * Mismo criterio que verificarCompletoDeRol() pero para Cliente
   * mayorista — sin documentos, solo campos fiscales (ver tabla de
   * legajo por rol en spec-login-roles.md).
   */
  async verificarCompletoDeCliente(
    clienteId: string,
  ): Promise<{ completo: boolean; faltantes: string[] }> {
    const legajo = await this.obtenerOCrearDeCliente(clienteId);
    const camposRequeridos: (keyof ActualizarLegajoDto)[] = ['cuit', 'razonSocial', 'condicionIva'];
    const faltantes = camposRequeridos.filter((campo) => !legajo[campo]);
    return { completo: faltantes.length === 0, faltantes };
  }
}
