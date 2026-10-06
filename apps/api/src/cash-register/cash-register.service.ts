import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CompanyScopedPrismaService } from '../prisma/company-scoped-prisma.service';
import { AuthorizationsService } from '../authorizations/authorizations.service';
import { OpenCashRegisterDto } from './dto/open-cash-register.dto';
import { RegisterMovementDto } from './dto/register-movement.dto';
import { RegisterCashCountDto } from './dto/register-cash-count.dto';
import { AuthorizeCashCountDto } from './dto/authorize-cash-count.dto';

// D-05 of the SDD: '$5,000 is an initial reference. The exact condition
// (greater than / greater or equal than) and the treatment of differences
// below the threshold must be confirmed' — still unconfirmed. It is used
// as a documented reference value, with strict comparison '>' (not '>='),
// but it is NOT treated as a closed decision: see the TODO(D-05) in
// countCash() about what exactly happens at the limit.
const REFERENCE_DIFFERENCE_THRESHOLD = 5000;

/**
 * RF-09 (cash register and cash counts). The AperturaCaja/MovimientoCaja/
 * ArqueoCaja/CierreCaja models have NO direct empresaId (they are not
 * covered by companyScopeExtension) — isolation is done here explicitly
 * through the relation with Caja.empresaId, as was already done for
 * Categoria in catalog.controller.ts.
 */
@Injectable()
export class CashRegisterService {
  constructor(
    private readonly prismaFactory: CompanyScopedPrismaService,
    private readonly authorizationsService: AuthorizationsService,
  ) {}

  private async getCashRegisterForCompany(companyId: string) {
    const db = this.prismaFactory.forCompany(companyId);
    const cashRegister = await db.caja.findUnique({ where: { empresaId: companyId } });
    if (!cashRegister) {
      throw new NotFoundException(
        'La empresa no tiene una caja configurada. Debe crearse desde el seed o un endpoint de configuración (no implementado en este incremento).',
      );
    }
    return cashRegister;
  }

  private async getCurrentOpening(companyId: string, cashRegisterId: string) {
    const db = this.prismaFactory.forCompany(companyId);
    return db.aperturaCaja.findFirst({
      where: { cajaId: cashRegisterId, fechaCierre: null },
      orderBy: { fechaApertura: 'desc' },
    });
  }

  async status(companyId: string) {
    const cashRegister = await this.getCashRegisterForCompany(companyId);
    const opening = await this.getCurrentOpening(companyId, cashRegister.id);
    return { caja: cashRegister, aperturaVigente: opening };
  }

  async open(dto: OpenCashRegisterDto, companyId: string, userId: string) {
    const cashRegister = await this.getCashRegisterForCompany(companyId);
    const existing = await this.getCurrentOpening(companyId, cashRegister.id);
    if (existing) {
      throw new ConflictException('Ya hay una apertura de caja vigente para esta empresa');
    }

    const db = this.prismaFactory.forCompany(companyId);
    return db.$transaction(async (tx) => {
      const opening = await tx.aperturaCaja.create({
        data: { cajaId: cashRegister.id, usuarioId: userId, montoInicial: dto.montoInicial },
      });
      await tx.caja.update({ where: { id: cashRegister.id }, data: { estado: 'ABIERTA' } });
      return opening;
    });
  }

  async registerMovement(dto: RegisterMovementDto, companyId: string, userId: string) {
    const cashRegister = await this.getCashRegisterForCompany(companyId);
    const opening = await this.getCurrentOpening(companyId, cashRegister.id);
    if (!opening) {
      throw new BadRequestException(
        'No hay una apertura de caja vigente para registrar movimientos',
      );
    }

    const db = this.prismaFactory.forCompany(companyId);
    return db.movimientoCaja.create({
      data: {
        cajaId: cashRegister.id,
        aperturaCajaId: opening.id,
        usuarioId: userId,
        tipo: dto.tipo,
        monto: dto.monto,
        descripcion: dto.descripcion,
      },
    });
  }

  async listMovements(companyId: string) {
    const cashRegister = await this.getCashRegisterForCompany(companyId);
    const opening = await this.getCurrentOpening(companyId, cashRegister.id);
    if (!opening) {
      return [];
    }
    const db = this.prismaFactory.forCompany(companyId);
    return db.movimientoCaja.findMany({
      where: { aperturaCajaId: opening.id },
      orderBy: { createdAt: 'asc' },
    });
  }

  async countCash(dto: RegisterCashCountDto, companyId: string, outgoingUserId: string) {
    if (dto.usuarioEntranteId === outgoingUserId) {
      // RF-09: 'confirmed by outgoing and incoming seller' — two different
      // people. A user cannot self-confirm the cash count (same principle that
      // D-06 applies to Autorizacion: no agent/user authorizes themselves).
      throw new BadRequestException('El usuario entrante debe ser distinto del usuario saliente');
    }

    const cashRegister = await this.getCashRegisterForCompany(companyId);
    const opening = await this.getCurrentOpening(companyId, cashRegister.id);
    if (!opening) {
      throw new BadRequestException('No hay una apertura de caja vigente para arquear');
    }

    const db = this.prismaFactory.forCompany(companyId);

    // Verify that the incoming user exists and belongs to the same company
    // (Usuario is indeed covered by companyScopeExtension).
    const incomingUser = await db.usuario.findUnique({ where: { id: dto.usuarioEntranteId } });
    if (!incomingUser) {
      throw new NotFoundException('Usuario entrante no encontrado');
    }

    const movements = await db.movimientoCaja.findMany({
      where: { aperturaCajaId: opening.id },
    });

    // Expected cash computed from real system movements, not a number
    // declared by the operator (see the payments -> MovimientoCaja connection
    // in payments.service.ts): opening float + cash sale collections -
    // expenses/withdrawals. 'DeudaCobro' is in the schema (RF-10) but there is
    // no debt collection module yet — efectivoDeudasContado stays at 0, no
    // value is invented.
    const cashSales = sumByType(movements, ['Venta']);
    const debtsCash = sumByType(movements, ['DeudaCobro']); // TODO: no debts module yet, always 0
    const expensesAndWithdrawals = sumByType(movements, ['Gasto', 'Retiro']);
    const manualIncome = sumByType(movements, ['Ingreso']);

    const expectedCash =
      Number(opening.montoInicial) + cashSales + debtsCash + manualIncome - expensesAndWithdrawals;
    const difference = dto.efectivoContado - expectedCash;

    // D-05: reference threshold $5,000, strict '>' condition — NOT confirmed
    // as a final decision (see the constant above). A cash count with a
    // difference above the threshold is recorded with autorizacionId=null
    // (blocked) instead of inventing an automatic authorization: that would
    // explicitly violate D-06 ('no agent or automatic process can authorize
    // itself'). No owner authorization mechanism is implemented yet (D-06
    // still pending) — the cash count is created but marked as requiring that
    // future authorization.
    const requiresAuthorization = Math.abs(difference) > REFERENCE_DIFFERENCE_THRESHOLD;

    return db.$transaction(async (tx) => {
      const cashCount = await tx.arqueoCaja.create({
        data: {
          cajaId: cashRegister.id,
          aperturaCajaId: opening.id,
          usuarioId: outgoingUserId,
          usuarioEntranteId: dto.usuarioEntranteId,
          fondoFijoContado: opening.montoInicial,
          efectivoVentasContado: cashSales,
          efectivoDeudasContado: debtsCash,
          gastosRetirosRegistrados: expensesAndWithdrawals,
          efectivoEsperado: expectedCash,
          efectivoContado: dto.efectivoContado,
          diferencia: difference,
          // autorizacionId queda null: no se genera ninguna
          // Autorizacion automática. Si requiereAutorizacion es true,
          // esto se refleja en la respuesta del endpoint, no en el
          // registro en sí (el schema no tiene un campo booleano para
          // eso — se calcula al leer).
        },
      });
      await tx.caja.update({ where: { id: cashRegister.id }, data: { estado: 'EN_ARQUEO' } });
      return { arqueo: cashCount, requiereAutorizacion: requiresAuthorization };
    });
  }

  /**
   * D-06 connected: the cash count that was left blocked in countCash()
   * (with `requiereAutorizacion: true` and `autorizacionId: null`) receives
   * here the credentials of whoever authorizes it. It delegates the whole
   * validation (identity, permission, no self-authorization) to
   * AuthorizationsService — this method only links the already created and
   * valid Autorizacion to the ArqueoCaja.
   */
  async authorizeCashCount(
    companyId: string,
    cashCountId: string,
    dto: AuthorizeCashCountDto,
    requesterId: string,
  ) {
    const cashRegister = await this.getCashRegisterForCompany(companyId);
    const db = this.prismaFactory.forCompany(companyId);
    const cashCount = await db.arqueoCaja.findFirst({
      where: { id: cashCountId, cajaId: cashRegister.id },
    });
    if (!cashCount) {
      throw new NotFoundException('Arqueo no encontrado');
    }
    if (cashCount.autorizacionId) {
      throw new BadRequestException('Este arqueo ya tiene una autorización registrada.');
    }

    const authorization = await this.authorizationsService.authorize(
      companyId,
      {
        operacion: 'caja.cierreConDiferencia',
        entidadAfectada: 'ArqueoCaja',
        entidadId: cashCountId,
        motivo: dto.motivo,
        email: dto.email,
        password: dto.password,
      },
      requesterId,
    );

    return db.arqueoCaja.update({
      where: { id: cashCountId },
      data: { autorizacionId: authorization.id },
    });
  }

  async close(companyId: string, userId: string) {
    const cashRegister = await this.getCashRegisterForCompany(companyId);
    const opening = await this.getCurrentOpening(companyId, cashRegister.id);
    if (!opening) {
      throw new BadRequestException('No hay una apertura de caja vigente para cerrar');
    }

    const db = this.prismaFactory.forCompany(companyId);
    const lastCashCount = await db.arqueoCaja.findFirst({
      where: { aperturaCajaId: opening.id },
      orderBy: { fechaArqueo: 'desc' },
    });
    if (!lastCashCount) {
      throw new BadRequestException('No se puede cerrar la caja sin un arqueo previo del turno');
    }
    if (
      Math.abs(Number(lastCashCount.diferencia)) > REFERENCE_DIFFERENCE_THRESHOLD &&
      !lastCashCount.autorizacionId
    ) {
      // INV-08: 'a closing with a difference above the threshold requires
      // authorization'. Since D-06 is not implemented, this blocks the closing
      // instead of pretending the authorization exists.
      throw new BadRequestException(
        'El último arqueo tiene una diferencia que supera el umbral y no tiene autorización registrada. No se puede cerrar la caja (D-06 pendiente: mecanismo de autorización no implementado).',
      );
    }

    return db.$transaction(async (tx) => {
      const closing = await tx.cierreCaja.create({
        data: {
          aperturaCajaId: opening.id,
          usuarioId: userId,
          montoFinal: lastCashCount.efectivoContado,
        },
      });
      await tx.aperturaCaja.update({
        where: { id: opening.id },
        data: { fechaCierre: new Date() },
      });
      await tx.caja.update({ where: { id: cashRegister.id }, data: { estado: 'CERRADA' } });
      return closing;
    });
  }
}

function sumByType(movements: { tipo: string; monto: unknown }[], types: string[]): number {
  return movements
    .filter((m) => types.includes(m.tipo))
    .reduce((acc, m) => acc + Number(m.monto), 0);
}
