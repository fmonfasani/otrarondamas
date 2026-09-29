import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { EmpresaScopedPrismaService } from '../prisma/empresa-scoped-prisma.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';

/**
 * Solo lectura de las 4 tablas de la jerarquía de catálogo (Familia →
 * Subfamilia → Tipo → Subtipo, ver schema.prisma). Sin alta/edición
 * desde acá todavía — hoy las 11 Familias y 187 Subfamilias se cargan
 * únicamente desde prisma/seed.ts (ver seed-data-jerarquia-catalogo.json);
 * un CRUD de jerarquía es un incremento aparte, no bloquea poder elegir
 * un nivel al crear un Producto o una ReglaFidelizacion.
 *
 * Devuelve las 4 tablas completas en un solo request (11+187+187+187 ≈
 * 570 filas, liviano) en vez de un árbol anidado o 4 endpoints separados
 * — arma el árbol en el cliente por *Id, igual que un join. Abierto a
 * cualquier usuario logueado (mismo criterio que GET /catalogo/productos):
 * elegir dónde categorizar un producto o el alcance de una regla no es
 * información sensible del negocio.
 */
@ApiTags('catalogo')
@ApiBearerAuth()
@Controller('catalogo/jerarquia')
export class JerarquiaCatalogoController {
  constructor(private readonly prismaFactory: EmpresaScopedPrismaService) {}

  @Get()
  async listar(@CurrentUser() user: AuthenticatedUser) {
    const db = this.prismaFactory.forEmpresa(user.empresaId);
    const [familias, subfamilias, tipos, subtipos] = await Promise.all([
      db.familia.findMany({ where: { activo: true }, orderBy: { nombre: 'asc' } }),
      db.subfamilia.findMany({ where: { activo: true }, orderBy: { nombre: 'asc' } }),
      db.tipo.findMany({ where: { activo: true }, orderBy: { nombre: 'asc' } }),
      db.subtipo.findMany({ where: { activo: true }, orderBy: { nombre: 'asc' } }),
    ]);
    return { familias, subfamilias, tipos, subtipos };
  }
}
