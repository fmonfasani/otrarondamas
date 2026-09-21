import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CajaService } from './caja.service';
import { AbrirCajaDto } from './dto/abrir-caja.dto';
import { RegistrarMovimientoDto } from './dto/registrar-movimiento.dto';
import { RegistrarArqueoDto } from './dto/registrar-arqueo.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequierePermiso } from '../auth/decorators/requiere-permiso.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';

/**
 * RF-09 (caja y arqueos). Ver caja.service.ts para el detalle de cada
 * regla (D-05 sin confirmar, D-06 sin implementar, doble confirmación
 * de arqueo).
 */
@ApiTags('caja')
@ApiBearerAuth()
@Controller('caja')
export class CajaController {
  constructor(private readonly cajaService: CajaService) {}

  @Get('estado')
  estado(@CurrentUser() user: AuthenticatedUser) {
    return this.cajaService.estado(user.empresaId);
  }

  @Post('apertura')
  abrir(@Body() dto: AbrirCajaDto, @CurrentUser() user: AuthenticatedUser) {
    return this.cajaService.abrir(dto, user.empresaId, user.id);
  }

  // RF-09: "gastos y retiros solo por el dueño o usuarios autorizados"
  // — se reutiliza el permiso 'caja.gastos' ya existente en el catálogo
  // de permisos del seed para TODOS los tipos de movimiento manual
  // (Ingreso/Egreso/Gasto/Retiro), no solo gastos: no hay en el seed un
  // permiso más granular por tipo, y crear uno nuevo sin una decisión
  // de qué rol lo tiene sería una regla de negocio no autorizada.
  @RequierePermiso('caja.gastos')
  @Post('movimientos')
  registrarMovimiento(@Body() dto: RegistrarMovimientoDto, @CurrentUser() user: AuthenticatedUser) {
    return this.cajaService.registrarMovimiento(dto, user.empresaId, user.id);
  }

  @Get('movimientos')
  listarMovimientos(@CurrentUser() user: AuthenticatedUser) {
    return this.cajaService.listarMovimientos(user.empresaId);
  }

  @Post('arqueo')
  arquear(@Body() dto: RegistrarArqueoDto, @CurrentUser() user: AuthenticatedUser) {
    return this.cajaService.arquear(dto, user.empresaId, user.id);
  }

  @Post('cierre')
  cerrar(@CurrentUser() user: AuthenticatedUser) {
    return this.cajaService.cerrar(user.empresaId, user.id);
  }
}
