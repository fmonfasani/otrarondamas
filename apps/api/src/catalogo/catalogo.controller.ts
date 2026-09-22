import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { EmpresaScopedPrismaService } from '../prisma/empresa-scoped-prisma.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequierePermiso } from '../auth/decorators/requiere-permiso.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';

/**
 * CRUD de productos sobre RF-03 + el modelo de categorización jerárquica
 * de catálogo (Familia → Subfamilia → Tipo → Subtipo, ver schema.prisma y
 * la sesión de definición de catálogo). No implementa el resto de
 * docs/spec-catalogo-productos.md (Variante/SKU de presentación separado,
 * código de origen, importación/conciliación) — ese documento sigue sin
 * aprobar en lo demás (ver docs/scaffolding-notas.md, sección 8).
 *
 * Sin DELETE físico: RF-03 solo pide desactivar (activo=false) vía
 * PATCH, igual que INV-02 para ventas. No hay endpoint que borre un
 * producto de la base.
 */
@ApiTags('catalogo')
@ApiBearerAuth()
@Controller('catalogo/productos')
export class CatalogoController {
  constructor(private readonly prismaFactory: EmpresaScopedPrismaService) {}

  @Get()
  async listProductos(
    @CurrentUser() user: AuthenticatedUser,
    @Query('activo') activo?: string,
    @Query('search') search?: string,
  ) {
    const db = this.prismaFactory.forEmpresa(user.empresaId);
    const where: Prisma.ProductoWhereInput = {
      ...(activo === undefined ? {} : { activo: activo === 'true' }),
      // Búsqueda simple por nombre o código interno, case-insensitive.
      // Con `search` se limita a 50 resultados: sin este límite, un
      // listado completo del catálogo real (4.342 productos, ver
      // docs/scaffolding-notas.md sección 10) es impracticable de
      // renderizar en un selector de venta. Sin `search`, se mantiene
      // el comportamiento anterior (listado completo, sin límite) para
      // no romper otros usos existentes del endpoint.
      /* eslint-disable indent -- falso positivo conocido de la regla
         `indent` base con un ternario que devuelve un objeto anidado
         (mismo patrón que en dto/login.dto.ts) */
      ...(search
        ? {
            OR: [
              { nombre: { contains: search, mode: 'insensitive' } },
              { codigoInterno: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
      /* eslint-enable indent */
    };
    return db.producto.findMany({
      where,
      orderBy: { nombre: 'asc' },
      ...(search ? { take: 50 } : {}),
    });
  }

  @Get(':id')
  async getProducto(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    // El cliente ya viene filtrado por la empresa del usuario
    // autenticado (ver empresa-scope.extension.ts): si el producto
    // pertenece a otra empresa, esta query simplemente no lo encuentra,
    // sin que este controller tenga que saber nada de aislamiento.
    const db = this.prismaFactory.forEmpresa(user.empresaId);
    const producto = await db.producto.findUnique({ where: { id } });
    if (!producto) {
      throw new NotFoundException('Producto no encontrado');
    }
    return producto;
  }

  @RequierePermiso('productos.gestionar')
  @Post()
  async createProducto(@Body() dto: CreateProductoDto, @CurrentUser() user: AuthenticatedUser) {
    const db = this.prismaFactory.forEmpresa(user.empresaId);
    await this.verificarJerarquia(db, {
      familiaId: dto.familiaId,
      subfamiliaId: dto.subfamiliaId,
      tipoId: dto.tipoId,
      subtipoId: dto.subtipoId,
    });
    // empresaId se inyecta automáticamente por empresaScopeExtension, no
    // hace falta (ni se debe) pasarlo acá. Se anota el tipo explícito
    // Prisma.ProductoUncheckedCreateInput (forma "unchecked": familiaId
    // etc. como string directo, no `familia: { connect: ... } }`) porque
    // sin esa anotación, a través del tipo genérico que devuelve el
    // extension, TypeScript no logra resolver el `Exact<XOR<...>>` que
    // Prisma exige para `create` y lo rechaza con un error confuso.
    const data: Prisma.ProductoUncheckedCreateInput = {
      nombre: dto.nombre,
      codigoInterno: dto.codigoInterno,
      codigoBarras: dto.codigoBarras,
      marca: dto.marca,
      familiaId: dto.familiaId,
      subfamiliaId: dto.subfamiliaId,
      tipoId: dto.tipoId,
      subtipoId: dto.subtipoId,
      unidadBase: dto.unidadBase,
      costo: dto.costo,
      precioMinorista: dto.precioMinorista,
      precioMayorista: dto.precioMayorista,
      descuentoPorcentaje: dto.descuentoPorcentaje,
      activo: dto.activo,
      empresaId: user.empresaId,
    };
    return db.producto.create({ data });
  }

  @RequierePermiso('productos.gestionar')
  @Patch(':id')
  async updateProducto(
    @Param('id') id: string,
    @Body() dto: UpdateProductoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const db = this.prismaFactory.forEmpresa(user.empresaId);
    const existente = await db.producto.findUnique({ where: { id } });
    if (!existente) {
      throw new NotFoundException('Producto no encontrado');
    }
    // Alcance parcial: si el body trae SOLO alguno de los 4 niveles
    // (ej. solo se cambia el Subtipo dentro de la misma Subfamilia), se
    // completa con lo que el producto ya tenía antes de verificar la
    // cadena — la jerarquía siempre se valida completa, nunca a medias.
    if (dto.familiaId || dto.subfamiliaId || dto.tipoId || dto.subtipoId) {
      await this.verificarJerarquia(db, {
        familiaId: dto.familiaId ?? existente.familiaId,
        subfamiliaId: dto.subfamiliaId ?? existente.subfamiliaId,
        tipoId: dto.tipoId ?? existente.tipoId,
        subtipoId: dto.subtipoId ?? existente.subtipoId,
      });
    }
    const data: Prisma.ProductoUncheckedUpdateInput = { ...dto };
    return db.producto.update({ where: { id }, data });
  }

  /**
   * Verifica que los 4 niveles existan, pertenezcan a esta empresa Y
   * encadenen entre sí (Subtipo→Tipo→Subfamilia→Familia) — ninguno de
   * los 4 tiene forma de heredar el scope automáticamente desde una FK
   * simple, y nada impide en la base que alguien mande un Subtipo real
   * pero de una Subfamilia distinta a la indicada.
   */
  private async verificarJerarquia(
    db: ReturnType<EmpresaScopedPrismaService['forEmpresa']>,
    ids: { familiaId: string; subfamiliaId: string; tipoId: string; subtipoId: string },
  ) {
    const subtipo = await db.subtipo.findUnique({
      where: { id: ids.subtipoId },
      include: { tipo: { include: { subfamilia: true } } },
    });
    if (!subtipo) {
      throw new NotFoundException('Subtipo no encontrado');
    }
    if (subtipo.tipoId !== ids.tipoId) {
      throw new NotFoundException('El Subtipo indicado no pertenece al Tipo indicado');
    }
    if (subtipo.tipo.subfamiliaId !== ids.subfamiliaId) {
      throw new NotFoundException('El Tipo indicado no pertenece a la Subfamilia indicada');
    }
    if (subtipo.tipo.subfamilia.familiaId !== ids.familiaId) {
      throw new NotFoundException('La Subfamilia indicada no pertenece a la Familia indicada');
    }
  }
}
