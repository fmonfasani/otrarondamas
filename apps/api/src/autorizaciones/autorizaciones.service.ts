import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthService } from '../auth/auth.service';
import { EmpresaScopedPrismaService } from '../prisma/empresa-scoped-prisma.service';
import { SolicitarAutorizacionDto } from './dto/solicitar-autorizacion.dto';

/**
 * D-06 del SDD: "mecanismo centralizado de autorización para
 * operaciones restringidas, con registro de quién autorizó, cuándo,
 * para qué operación y con qué resultado". Restricciones explícitas del
 * SDD: no almacenar PIN en texto plano (no aplica acá — se eligió login
 * del dueño, no PIN, ver docs/scaffolding-notas.md); ningún agente o
 * proceso automático puede autorizarse a sí mismo.
 *
 * Mecanismo elegido (decisión del dueño, no inventada): login del
 * autorizador (email+password) en el momento del bloqueo, reusando
 * AuthService.verificarCredenciales() — sin PIN nuevo que gestionar,
 * rotar o resetear. Quién puede autorizar: cualquiera que tenga
 * asignado el permiso que esa operación ya exige (ver
 * OPERACION_PERMISO_REQUERIDO), no una cuenta "dueño" hardcodeada ni un
 * permiso nuevo de "autorizar.excepciones".
 */

// Mapeo cerrado operación -> permiso que el AUTORIZADOR debe tener.
// No confiar en que el caller declare el permiso: si mañana se agrega
// una operación acá sin su entrada correspondiente, TypeScript avisa
// (Record<..., string> exhaustivo sobre OPERACIONES_AUTORIZABLES).
import { OPERACIONES_AUTORIZABLES } from './dto/solicitar-autorizacion.dto';

const OPERACION_PERMISO_REQUERIDO: Record<(typeof OPERACIONES_AUTORIZABLES)[number], string> = {
  // RF-09/INV-08: cerrar caja con un arqueo que superó el umbral de
  // diferencia sin autorización previa. Mismo permiso que ya protege
  // los movimientos manuales de caja (caja.gastos) — no se inventa uno
  // nuevo solo para esta excepción.
  'caja.cierreConDiferencia': 'caja.gastos',
};

@Injectable()
export class AutorizacionesService {
  constructor(
    private readonly authService: AuthService,
    private readonly prismaFactory: EmpresaScopedPrismaService,
  ) {}

  /**
   * `solicitanteId` es el usuario de la sesión que está PIDIENDO la
   * autorización (ej. el vendedor cerrando caja) — nunca las
   * credenciales del propio dto, que son las de quien la CONCEDE. Si
   * coinciden, es autoautorización y D-06 lo prohíbe explícitamente.
   */
  async autorizar(empresaId: string, dto: SolicitarAutorizacionDto, solicitanteId: string) {
    const autorizador = await this.authService.verificarCredenciales(dto.email, dto.password);

    if (autorizador.id === solicitanteId) {
      throw new ForbiddenException(
        'No podés autorizar tu propia operación (D-06: ningún usuario puede autorizarse a sí mismo).',
      );
    }

    if (autorizador.empresaId !== empresaId) {
      // Las credenciales eran válidas, pero de un usuario de OTRA
      // empresa — no alcanza con que el login funcione, tiene que ser
      // alguien de la misma empresa que la operación que se autoriza.
      throw new ForbiddenException('El autorizador debe pertenecer a la misma empresa.');
    }

    const permisoRequerido = OPERACION_PERMISO_REQUERIDO[dto.operacion];
    const db = this.prismaFactory.forEmpresa(empresaId);
    const tienePermiso = await db.usuarioPermiso.findFirst({
      where: { usuarioId: autorizador.id, permiso: { nombre: permisoRequerido } },
    });
    if (!tienePermiso) {
      throw new ForbiddenException(
        `El usuario autorizador no tiene el permiso requerido ('${permisoRequerido}') para autorizar '${dto.operacion}'.`,
      );
    }

    // Prisma.AutorizacionUncheckedCreateInput explícito: mismo problema
    // ya documentado en catalogo.controller.ts — sin la anotación, a
    // través del tipo genérico que devuelve empresaScopeExtension,
    // TypeScript no resuelve el Exact<XOR<...>> que Prisma exige.
    const data: Prisma.AutorizacionUncheckedCreateInput = {
      empresaId,
      autorizadorId: autorizador.id,
      operacion: dto.operacion,
      entidadAfectada: dto.entidadAfectada,
      entidadId: dto.entidadId,
      motivo: dto.motivo,
    };
    return db.autorizacion.create({
      data,
    });
  }
}
