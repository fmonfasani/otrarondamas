import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { EmpresaScopedPrismaService } from '../prisma/empresa-scoped-prisma.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';

/**
 * Listado mínimo, de solo lectura, no un módulo de gestión de usuarios
 * (sin crear/editar/desactivar). Existe únicamente como apoyo para
 * seleccionar el "usuario entrante" en el arqueo de caja (RF-09, ver
 * apps/api/src/caja) — cualquier usuario autenticado de la empresa
 * puede ver la lista de sus compañeros, sin permiso adicional, porque
 * no expone nada más sensible que nombre/email (ya visibles
 * internamente en el negocio).
 */
@ApiTags('usuarios')
@ApiBearerAuth()
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly prismaFactory: EmpresaScopedPrismaService) {}

  @Get()
  async findAll(@CurrentUser() user: AuthenticatedUser) {
    const db = this.prismaFactory.forEmpresa(user.empresaId);
    return db.usuario.findMany({
      where: { activo: true },
      select: { id: true, nombre: true, email: true },
      orderBy: { nombre: 'asc' },
    });
  }
}
