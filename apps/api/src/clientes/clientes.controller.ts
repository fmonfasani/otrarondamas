import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ClientesService } from './clientes.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequierePermiso } from '../auth/decorators/requiere-permiso.decorator';
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
 */
@ApiTags('clientes')
@ApiBearerAuth()
@Controller('clientes')
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

  @Get()
  listar(@CurrentUser() user: AuthenticatedUser, @Query('search') search?: string) {
    return this.clientesService.listar(user.empresaId, search);
  }

  @Get(':id')
  obtener(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.clientesService.obtener(user.empresaId, id);
  }

  @RequierePermiso('clientes.gestionar')
  @Post()
  crear(@Body() dto: CreateClienteDto, @CurrentUser() user: AuthenticatedUser) {
    return this.clientesService.crear(user.empresaId, dto);
  }

  @RequierePermiso('clientes.gestionar')
  @Patch(':id')
  actualizar(
    @Param('id') id: string,
    @Body() dto: UpdateClienteDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.clientesService.actualizar(user.empresaId, id, dto);
  }
}
