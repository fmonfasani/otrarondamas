import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CompanyScopedPrismaService } from '../prisma/company-scoped-prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

/**
 * RF-08 (payments), scope limited to this increment: record manual
 * collections (cash/transfer/QR) on an already confirmed sale.
 * It does NOT implement: Mercado Pago (D-03 without a defined modality),
 * payments on Deuda/current account (RF-10, separate increment), refunds,
 * reconciliation.
 *
 * It DOES connect with Caja/MovimientoCaja (RF-09) from the `cash-register`
 * module: a cash payment, when there is a current cash register opening
 * for the company, generates a 'Venta' type MovimientoCaja — so the cash
 * count can compute the expected cash by summing real system movements,
 * not a hand-declared number. Transfer and QR do not generate a cash
 * register movement (they are not physical cash in the drawer).
 */
@Injectable()
export class PaymentsService {
  constructor(private readonly prismaFactory: CompanyScopedPrismaService) {}

  async create(saleId: string, dto: CreatePaymentDto, companyId: string, userId: string) {
    const db = this.prismaFactory.forCompany(companyId);

    // INV-04 (the total of applied payments cannot exceed the corresponding
    // amount without an explicit credit-balance rule): resolve the sale and
    // sum its existing payments INSIDE the same transaction that creates the
    // new payment, so that two concurrent payments on the same sale cannot
    // together exceed the total with neither seeing the other.
    return db.$transaction(async (tx) => {
      const sale = await tx.venta.findUnique({
        where: { id: saleId },
        include: { pagos: true },
      });
      if (!sale) {
        throw new NotFoundException('Venta no encontrada');
      }

      const approvedPayments = sale.pagos.filter((p) => p.estado === 'APROBADO');
      const totalPaid = approvedPayments.reduce((acc, p) => acc + Number(p.monto), 0);
      const pendingBalance = Number(sale.total) - totalPaid;
      if (pendingBalance <= 0) throw new BadRequestException('PAGO_EXCEDE_SALDO');

      if (dto.monto > pendingBalance) {
        throw new BadRequestException(
          `El pago (${dto.monto}) excede el saldo pendiente de la venta (${pendingBalance}). Total: ${sale.total}, ya pagado: ${totalPaid}.`,
        );
      }

      let cashRegister: { id: string } | null = null;
      let currentOpening: { id: string } | null = null;
      if (dto.medio === 'efectivo') {
        cashRegister = await tx.caja.findUnique({ where: { empresaId: companyId } });
        currentOpening = cashRegister
          ? await tx.aperturaCaja.findFirst({
              where: { cajaId: cashRegister.id, fechaCierre: null },
              orderBy: { fechaApertura: 'desc' },
            })
          : null;
        if (!cashRegister || !currentOpening) throw new ConflictException('CAJA_CERRADA');
        if ((dto.montoRecibido ?? dto.monto) < dto.monto) {
          throw new BadRequestException('MONTO_RECIBIDO_INSUFICIENTE');
        }
      }

      // Manual methods (cash/transfer/QR): they are considered confirmed when
      // registered — there is no external gateway that notifies asynchronously,
      // unlike what Mercado Pago would require (D-03, out of scope for this
      // increment).
      const payment = await tx.pago.create({
        data: {
          empresaId: companyId,
          usuarioId: userId,
          ventaId: saleId,
          monto: dto.monto,
          medio: dto.medio,
          estado: 'APROBADO',
          montoRecibido: dto.medio === 'efectivo' ? (dto.montoRecibido ?? dto.monto) : null,
          vuelto: dto.medio === 'efectivo' ? (dto.montoRecibido ?? dto.monto) - dto.monto : null,
          referencia: dto.referencia ?? null,
        },
      });

      if (dto.medio === 'efectivo' && cashRegister && currentOpening) {
        await tx.movimientoCaja.create({
          data: {
            cajaId: cashRegister.id,
            aperturaCajaId: currentOpening.id,
            usuarioId: userId,
            tipo: 'Venta',
            monto: dto.monto,
            descripcion: `Cobro en efectivo de venta ${saleId}`,
            referenciaId: payment.id,
          },
        });
      }

      const newBalance = pendingBalance - dto.monto;
      return { pago: payment, saldo: newBalance.toFixed(2) };
    });
  }

  async findBySale(saleId: string, companyId: string) {
    const db = this.prismaFactory.forCompany(companyId);
    const sale = await db.venta.findUnique({ where: { id: saleId } });
    if (!sale) {
      throw new NotFoundException('Venta no encontrada');
    }
    return db.pago.findMany({ where: { ventaId: saleId }, orderBy: { createdAt: 'asc' } });
  }
}
