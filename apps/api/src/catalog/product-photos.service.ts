import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';
import { CompanyScopedPrismaService } from '../prisma/company-scoped-prisma.service';
import { recordAudit } from '../auditoria/product-audit';
import {
  MAX_PHOTOS,
  PHOTO_MAX_BYTES,
  photoPath,
  photoStorageDir,
  reorder,
  sniffPhoto,
} from './product-photos';

type ScopedClient = ReturnType<CompanyScopedPrismaService['forCompany']>;

const PHOTO_SELECT = { id: true, orden: true, mimeType: true, sizeBytes: true } as const;

/** The folder of the photos; without one, photos are off (like chat files). */
export function requirePhotoDir(): string {
  const dir = photoStorageDir();
  if (!dir) {
    throw new ServiceUnavailableException('Las fotos de productos todavía no están habilitadas.');
  }
  return dir;
}

/**
 * Sends a product photo: its stored type (checked on upload), no sniffing, shown inline. A photo
 * never changes (a new one gets a new id), so it can be cached for long: privately in the panel,
 * publicly in the store.
 */
export function sendPhoto(
  res: Response,
  file: { path: string; mimeType: string },
  audience: 'private' | 'public',
) {
  res.setHeader('Content-Type', file.mimeType);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Disposition', 'inline');
  res.setHeader(
    'Cache-Control',
    audience === 'public' ? 'public, max-age=31536000, immutable' : 'private, max-age=86400',
  );
  res.sendFile(file.path);
}

/**
 * OR-B4-046 rule 12 — up to 5 photos per product, managed from Mercadería. The files go to the
 * server's volume, outside any web root, named by the Business and a random id; the rows go through
 * the Business's scoped client, so a product of another Business is simply not found. Adding,
 * removing and reordering photos are product edits in the audit trail.
 */
@Injectable()
export class ProductPhotosService {
  constructor(private readonly prismaFactory: CompanyScopedPrismaService) {}

  private async productOf(db: ScopedClient, productId: string) {
    const product = await db.producto.findFirst({
      where: { id: productId },
      select: { id: true, nombre: true },
    });
    if (!product) throw new NotFoundException('Producto no encontrado');
    return product;
  }

  private audit(
    tx: Parameters<typeof recordAudit>[0],
    companyId: string,
    userId: string,
    product: { id: string; nombre: string },
    before: number,
    after: number,
  ) {
    return recordAudit(tx, companyId, userId, {
      accion: 'PRODUCTO_EDITADO',
      entidad: 'Producto',
      entidadId: product.id,
      antes: { nombre: product.nombre, fotos: before },
      despues: { nombre: product.nombre, fotos: after },
    });
  }

  /** The photos of a product, in order. */
  async list(companyId: string, productId: string) {
    const db = this.prismaFactory.forCompany(companyId);
    await this.productOf(db, productId);
    return db.productoFoto.findMany({
      where: { productoId: productId },
      orderBy: { orden: 'asc' },
      select: PHOTO_SELECT,
    });
  }

  /** Adds a photo at the end. The file is checked by its content; the 6th photo is refused. */
  async add(
    companyId: string,
    userId: string,
    productId: string,
    file: { buffer: Buffer; size: number } | undefined,
  ) {
    if (!file?.buffer?.length) throw new BadRequestException('Elegí una foto.');
    if (file.size > PHOTO_MAX_BYTES) {
      throw new BadRequestException('Cada foto puede pesar hasta 5 MB.');
    }
    const kind = sniffPhoto(file.buffer);
    if (!kind) throw new BadRequestException('Solo se pueden subir fotos JPG, PNG o WebP.');
    const dir = requirePhotoDir();
    const db = this.prismaFactory.forCompany(companyId);
    const product = await this.productOf(db, productId);

    const storageKey = `${companyId}/${randomUUID()}.${kind.ext}`;
    const full = photoPath(dir, storageKey) as string;
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, file.buffer);
    try {
      // Serializable: two uploads at the same time cannot both take the 5th place.
      return await db.$transaction(
        async (tx) => {
          const photos = await tx.productoFoto.findMany({
            where: { productoId: productId },
            orderBy: { orden: 'desc' },
            select: { orden: true },
          });
          if (photos.length >= MAX_PHOTOS) {
            throw new BadRequestException(`Cada producto lleva hasta ${MAX_PHOTOS} fotos.`);
          }
          const photo = await tx.productoFoto.create({
            data: {
              empresaId: companyId,
              productoId: productId,
              orden: (photos[0]?.orden ?? -1) + 1,
              storageKey,
              mimeType: kind.mimeType,
              sizeBytes: file.size,
            },
            select: PHOTO_SELECT,
          });
          await this.audit(tx, companyId, userId, product, photos.length, photos.length + 1);
          return photo;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      await fs.rm(full, { force: true });
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        throw new ConflictException('Se estaban subiendo otras fotos a la vez. Probá de nuevo.');
      }
      throw error;
    }
  }

  /** Removes a photo; the rest keep their order. */
  async remove(companyId: string, userId: string, productId: string, photoId: string) {
    const db = this.prismaFactory.forCompany(companyId);
    const product = await this.productOf(db, productId);
    const photos = await db.productoFoto.findMany({
      where: { productoId: productId },
      orderBy: { orden: 'asc' },
      select: { id: true, storageKey: true },
    });
    const gone = photos.find((p) => p.id === photoId);
    if (!gone) throw new NotFoundException('Foto no encontrada');
    const rest = photos.filter((p) => p.id !== photoId);
    await db.$transaction(async (tx) => {
      await tx.productoFoto.delete({ where: { id: photoId } });
      for (const [orden, photo] of rest.entries()) {
        await tx.productoFoto.update({ where: { id: photo.id }, data: { orden } });
      }
      await this.audit(tx, companyId, userId, product, photos.length, rest.length);
    });
    const dir = photoStorageDir();
    const full = dir ? photoPath(dir, gone.storageKey) : null;
    if (full) await fs.rm(full, { force: true });
    return this.list(companyId, productId);
  }

  /** Puts the given photos first, in that order (the first one is the store's photo). */
  async reorder(companyId: string, userId: string, productId: string, ids: string[]) {
    const db = this.prismaFactory.forCompany(companyId);
    const product = await this.productOf(db, productId);
    const photos = await db.productoFoto.findMany({
      where: { productoId: productId },
      orderBy: { orden: 'asc' },
      select: { id: true },
    });
    const order = reorder(
      photos.map((p) => p.id),
      ids,
    );
    await db.$transaction(async (tx) => {
      for (const [orden, id] of order.entries()) {
        await tx.productoFoto.update({ where: { id }, data: { orden } });
      }
      await this.audit(tx, companyId, userId, product, photos.length, photos.length);
    });
    return this.list(companyId, productId);
  }

  /**
   * The file of a photo. In the store (`publishedOnly`) only a photo of a published, active
   * product is found; in the panel, any product of the Business.
   */
  async file(
    companyId: string,
    productId: string,
    photoId: string,
    options: { publishedOnly: boolean },
  ) {
    const db = this.prismaFactory.forCompany(companyId);
    const photo = await db.productoFoto.findFirst({
      where: {
        id: photoId,
        productoId: productId,
        ...(options.publishedOnly ? { Producto: { activo: true, publicado: true } } : {}),
      },
      select: { storageKey: true, mimeType: true },
    });
    const dir = photoStorageDir();
    const full = photo && dir ? photoPath(dir, photo.storageKey) : null;
    if (!photo || !full) throw new NotFoundException('Foto no encontrada');
    try {
      await fs.access(full);
    } catch {
      throw new NotFoundException('Foto no encontrada');
    }
    return { path: full, mimeType: photo.mimeType };
  }
}
