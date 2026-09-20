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
 * CRUD de productos sobre RF-03 tal como está modelado HOY en
 * schema.prisma (Producto simple, sin Variante/SKU separado/código de
 * origen). No implementa nada de docs/spec-catalogo-productos.md — ese
 * documento sigue sin aprobar (ver docs/scaffolding-notas.md, sección 8).
 *
 * Sin DELETE físico: RF-03 solo pide desactivar (activo=false) vía
 * PATCH, igual que INV-02 para ventas. No hay endpoint que borre un
 * producto de la base.
 *
 * Nota de schema conocida, no corregida en este incremento (ver
 * docs/scaffolding-notas.md): Producto.codigoInterno es @unique GLOBAL
 * en el schema actual, no @@unique([empresaId, codigoInterno]) como
 * pedía el prompt de scaffolding original. Dos empresas distintas NO
 * pueden usar hoy el mismo codigoInterno, aunque conceptualmente
 * deberían poder. Corregirlo requiere una migración de Prisma; queda
 * como TODO trazable, no se resuelve acá para no mezclar un cambio de
 * schema con un incremento de CRUD.
 */
@ApiTags('catalogo')
@ApiBearerAuth()
@Controller('catalogo/productos')
export class CatalogoController {
  constructor(private readonly prismaFactory: EmpresaScopedPrismaService) {}

  @Get()
  async listProductos(@CurrentUser() user: AuthenticatedUser, @Query('activo') activo?: string) {
    const db = this.prismaFactory.forEmpresa(user.empresaId);
    return db.producto.findMany({
      where: activo === undefined ? {} : { activo: activo === 'true' },
      orderBy: { nombre: 'asc' },
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
    // La categoría debe existir Y pertenecer a la misma empresa — se
    // verifica explícitamente porque Producto.categoriaId no tiene forma
    // de heredar el scope automáticamente desde una FK simple.
    const categoria = await db.categoria.findUnique({ where: { id: dto.categoriaId } });
    if (!categoria) {
      throw new NotFoundException('Categoría no encontrada');
    }
    // empresaId se inyecta automáticamente por empresaScopeExtension, no
    // hace falta (ni se debe) pasarlo acá. Se anota el tipo explícito
    // Prisma.ProductoUncheckedCreateInput (forma "unchecked": categoriaId
    // como string directo, no `categoria: { connect: ... } }`) porque sin
    // esa anotación, a través del tipo genérico que devuelve el
    // extension, TypeScript no logra resolver el `Exact<XOR<...>>` que
    // Prisma exige para `create` y lo rechaza con un error confuso.
    const data: Prisma.ProductoUncheckedCreateInput = {
      nombre: dto.nombre,
      codigoInterno: dto.codigoInterno,
      codigoBarras: dto.codigoBarras,
      marca: dto.marca,
      categoriaId: dto.categoriaId,
      unidadBase: dto.unidadBase,
      costo: dto.costo,
      precioMinorista: dto.precioMinorista,
      precioMayorista: dto.precioMayorista,
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
    if (dto.categoriaId) {
      const categoria = await db.categoria.findUnique({ where: { id: dto.categoriaId } });
      if (!categoria) {
        throw new NotFoundException('Categoría no encontrada');
      }
    }
    const data: Prisma.ProductoUncheckedUpdateInput = { ...dto };
    return db.producto.update({ where: { id }, data });
  }
}
