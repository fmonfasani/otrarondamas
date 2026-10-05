import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ClientesService } from './clientes.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequierePermiso } from '../auth/decorators/requiere-permiso.decorator';
import { LegajoAprobadoGuard } from '../legajo/guards/legajo-aprobado.guard';
import { BusinessContextService } from '../business-context/business-context.service';
import type { AuthenticatedUser } from '../auth/auth.types';

/**
 * Fase 1 del roadmap de Fidelización: CRUD mínimo de Cliente.
 *
 * GET sin @RequierePermiso — mismo criterio que catalogo.controller.ts
 * y compras.controller.ts (listarProveedores): cualquier vendedor
 * logueado puede buscar/ver un cliente para asociarlo a una venta
 * (Fase 2 del roadmap), igual que ya puede buscar productos. Las
 * mutaciones (crear/editar datos del cliente) sí requieren
 * clientes.gestionar — permiso que ya existía en el seed desde el
 * scaffolding inicial, sin uso real hasta este módulo.
 *
 * S-V1-03: BusinessContext entra por EL BOUNDARY DE ENTRADA de esta
 * superficie. El controller resuelve el contexto del actor
 * autenticado (User → Membership ACTIVE → businessId) y entrega el
 * empresaId derivado a ClientesService, que sigue siendo el servicio
 * legacy con `forEmpresa(empresaId)`.
 *
 * Cambio de comportamiento deliberado: los cuatro handlers ya NO leen
 * `user.empresaId` del JWT. Ese campo sigue existiendo (no se toca el
 * JWT en esta slice, la deuda se acepta durante la transición) pero
 * para Clientes el tenant efectivo sale de la Membership del actor. Si
 * el token dijera una empresa y la Membership dijera otra, gana la
 * Membership: es imposible cambiar el tenant efectivo desde el caller.
 *
 * NO es un segundo mecanismo de aislamiento ni de autorización: los
 * guards globales (JwtAuthGuard + PermissionsGuard) y
 * LegajoAprobadoGuard siguen igual, y el enforcement final de tenancy
 * sigue siendo EmpresaScopedPrismaService + empresaScopeExtension.
 */
@ApiTags('clientes')
@ApiBearerAuth()
@Controller('clientes')
@UseGuards(LegajoAprobadoGuard) // RF-17: operación de negocio real, ver caja.controller.ts
export class ClientesController {
  constructor(
    private readonly clientesService: ClientesService,
    private readonly businessContext: BusinessContextService,
  ) {}

  /**
   * Único punto de traducción contexto → empresaId para esta superficie.
   * Falla cerrado (Forbidden/NotFound/Conflict) sin Membership ACTIVE
   * válida, antes de tocar el dominio: el error viene de
   * BusinessContextService, no de una comparación aquí.
   */
  private async empresaIdDelContexto(user: AuthenticatedUser): Promise<string> {
    const context = await this.businessContext.resolveForAuthenticatedUser(user);
    return this.businessContext.resolveEmpresaId(context.businessId);
  }

  @Get()
  async listar(@CurrentUser() user: AuthenticatedUser, @Query('search') search?: string) {
    return this.clientesService.listar(await this.empresaIdDelContexto(user), search);
  }

  @Get(':id')
  async obtener(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.clientesService.obtener(await this.empresaIdDelContexto(user), id);
  }

  @RequierePermiso('clientes.gestionar')
  @Post()
  async crear(@Body() dto: CreateClienteDto, @CurrentUser() user: AuthenticatedUser) {
    return this.clientesService.crear(await this.empresaIdDelContexto(user), dto);
  }

  @RequierePermiso('clientes.gestionar')
  @Patch(':id')
  async actualizar(
    @Param('id') id: string,
    @Body() dto: UpdateClienteDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.clientesService.actualizar(await this.empresaIdDelContexto(user), id, dto);
  }
}
