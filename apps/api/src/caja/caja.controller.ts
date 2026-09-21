import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CajaService } from './caja.service';
import { AbrirCajaDto } from './dto/abrir-caja.dto';
import { RegistrarMovimientoDto } from './dto/registrar-movimiento.dto';
import { RegistrarArqueoDto } from './dto/registrar-arqueo.dto';
import { AutorizarArqueoDto } from './dto/autorizar-arqueo.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequierePermiso } from '../auth/decorators/requiere-permiso.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';

/**
 * RF-09 (caja y arqueos). Ver caja.service.ts para el detalle de cada
 * regla (D-05 sin confirmar, doble confirmación de arqueo). D-06
 * (mecanismo de autorización) conectado — ver autorizarArqueo() y
 * autorizaciones.service.ts.
 *
 * Permisos (auditoría 21/09/2026, ver docs/scaffolding-notas.md): el
 * SDD (RF-09) solo restringe explícitamente "gastos y retiros" —
 * cubierto por @RequierePermiso('caja.gastos') en registrarMovimiento.
 * No pide restringir ver estado, abrir turno, ver movimientos del
 * turno propio, ni arquear: son operaciones normales de cualquier
 * vendedor logueado durante su turno, sin permiso adicional (mismo
 * criterio que usuarios.controller.ts sobre GET /usuarios). cerrar()
 * SÍ requiere caja.gastos: consolida el turno de forma irreversible
 * (sin endpoint de reapertura) — decisión explícita del dueño de
 * tratarlo con el mismo peso que gastos/retiros, aunque el SDD no lo
 * pida en esos términos exactos.
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

  // D-06: sin @RequierePermiso propio — la restricción real está en
  // las credenciales del body (quién autoriza), no en quién solicita.
  // Ver autorizaciones.service.ts.
  @Patch('arqueo/:id/autorizar')
  autorizarArqueo(
    @Param('id') id: string,
    @Body() dto: AutorizarArqueoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.cajaService.autorizarArqueo(user.empresaId, id, dto, user.id);
  }

  // Cierra el turno de forma irreversible (no hay endpoint de
  // reapertura) — mismo permiso que gastos/retiros, ver comentario del
  // controller.
  @RequierePermiso('caja.gastos')
  @Post('cierre')
  cerrar(@CurrentUser() user: AuthenticatedUser) {
    return this.cajaService.cerrar(user.empresaId, user.id);
  }
}
