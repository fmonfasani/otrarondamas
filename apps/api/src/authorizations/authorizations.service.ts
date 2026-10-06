import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthService } from '../auth/auth.service';
import { CompanyScopedPrismaService } from '../prisma/company-scoped-prisma.service';
import { RequestAuthorizationDto } from './dto/request-authorization.dto';

/**
 * D-06 of the SDD: 'centralized authorization mechanism for restricted
 * operations, recording who authorized, when, for which operation and
 * with what result'. Explicit SDD restrictions: do not store PINs in
 * plain text (does not apply here — owner login was chosen, not a PIN,
 * see docs/scaffolding-notas.md); no agent or automatic process can
 * authorize itself.
 *
 * Chosen mechanism (owner's decision, not invented): login of the
 * authorizer (email+password) at the moment of the block, reusing
 * AuthService.verifyCredentials() — no new PIN to manage, rotate or
 * reset. Who can authorize: anyone who has been assigned the permission
 * that operation already requires (see REQUIRED_PERMISSION_BY_OPERATION),
 * not a hardcoded 'owner' account nor a new 'authorize.exceptions'
 * permission.
 */

// Closed operation -> permission mapping that the AUTHORIZER must have.
// Do not trust the caller to declare the permission: if an operation is
// added here tomorrow without its corresponding entry, TypeScript warns
// (exhaustive Record<..., string> over AUTHORIZABLE_OPERATIONS).
import { AUTHORIZABLE_OPERATIONS } from './dto/request-authorization.dto';

const REQUIRED_PERMISSION_BY_OPERATION: Record<(typeof AUTHORIZABLE_OPERATIONS)[number], string> = {
  // RF-09/INV-08: closing the cash register with a cash count that exceeded
  // the difference threshold without prior authorization. Same permission
  // that already protects manual cash register movements (caja.gastos) —
  // no new one is invented just for this exception.
  'caja.cierreConDiferencia': 'caja.gastos',
};

@Injectable()
export class AuthorizationsService {
  constructor(
    private readonly authService: AuthService,
    private readonly prismaFactory: CompanyScopedPrismaService,
  ) {}

  /**
   * `solicitanteId` is the session user who is ASKING for the authorization
   * (e.g. the seller closing the cash register) — never the credentials in
   * the dto itself, which belong to whoever GRANTS it. If they coincide, it
   * is self-authorization and D-06 explicitly forbids it.
   */
  async authorize(companyId: string, dto: RequestAuthorizationDto, requesterId: string) {
    const authorizer = await this.authService.verifyCredentials(dto.email, dto.password);

    if (authorizer.id === requesterId) {
      throw new ForbiddenException(
        'No podés autorizar tu propia operación (D-06: ningún usuario puede autorizarse a sí mismo).',
      );
    }

    if (authorizer.empresaId !== companyId) {
      // The credentials were valid, but belong to a user of ANOTHER company —
      // a working login is not enough, it must be someone from the same company
      // as the operation being authorized.
      throw new ForbiddenException('El autorizador debe pertenecer a la misma empresa.');
    }

    const requiredPermission = REQUIRED_PERMISSION_BY_OPERATION[dto.operacion];
    const db = this.prismaFactory.forCompany(companyId);
    const hasPermission = await db.usuarioPermiso.findFirst({
      where: { usuarioId: authorizer.id, permiso: { nombre: requiredPermission } },
    });
    if (!hasPermission) {
      throw new ForbiddenException(
        `El usuario autorizador no tiene el permiso requerido ('${requiredPermission}') para autorizar '${dto.operacion}'.`,
      );
    }

    // Explicit Prisma.AutorizacionUncheckedCreateInput: same problem already
    // documented in catalog.controller.ts — without the annotation, through
    // the generic type returned by companyScopeExtension, TypeScript does not
    // resolve the Exact<XOR<...>> that Prisma requires.
    const data: Prisma.AutorizacionUncheckedCreateInput = {
      empresaId: companyId,
      autorizadorId: authorizer.id,
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
