import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EmpresaScopedPrismaService } from '../prisma/empresa-scoped-prisma.service';
import { CreatePagoDto } from './dto/create-pago.dto';

/**
 * RF-08 (pagos), alcance acotado a este incremento: registrar cobros
 * manuales (efectivo/transferencia/QR) sobre una venta ya confirmada.
 * NO implementa: Mercado Pago (D-03 sin modalidad definida), pagos sobre
 * Deuda/cuenta corriente (RF-10, incremento aparte), reembolsos,
 * conciliación.
 *
 * SÍ conecta con Caja/MovimientoCaja (RF-09) desde el módulo `caja`: un
 * pago en efectivo, cuando hay una apertura de caja vigente para la
 * empresa, genera un MovimientoCaja tipo 'Venta' — así el arqueo puede
 * calcular el efectivo esperado sumando movimientos reales del sistema,
 * no un número declarado a mano. Transferencia y QR no generan
 * movimiento de caja (no son efectivo físico en el cajón).
 */
@Injectable()
export class PagosService {
  constructor(private readonly prismaFactory: EmpresaScopedPrismaService) {}

  async create(ventaId: string, dto: CreatePagoDto, empresaId: string, usuarioId: string) {
    const db = this.prismaFactory.forEmpresa(empresaId);

    // INV-04 (el total de pagos aplicados no puede exceder el importe
    // correspondiente sin una regla explícita de saldo a favor):
    // resolver la venta y sumar sus pagos existentes DENTRO de la misma
    // transacción que crea el nuevo pago, para que dos pagos concurrentes
    // sobre la misma venta no puedan superar el total entre los dos sin
    // que ninguno vea al otro.
    return db.$transaction(async (tx) => {
      const venta = await tx.venta.findUnique({
        where: { id: ventaId },
        include: { pagos: true },
      });
      if (!venta) {
        throw new NotFoundException('Venta no encontrada');
      }

      const pagosAprobados = venta.pagos.filter((p) => p.estado === 'APROBADO');
      const totalPagado = pagosAprobados.reduce((acc, p) => acc + Number(p.monto), 0);
      const saldoPendiente = Number(venta.total) - totalPagado;

      if (dto.monto > saldoPendiente) {
        throw new BadRequestException(
          `El pago (${dto.monto}) excede el saldo pendiente de la venta (${saldoPendiente}). Total: ${venta.total}, ya pagado: ${totalPagado}.`,
        );
      }

      // Medios manuales (efectivo/transferencia/QR): se consideran
      // confirmados al registrarse — no hay una pasarela externa que
      // notifique de forma asíncrona, a diferencia de lo que exigiría
      // Mercado Pago (D-03, fuera de alcance de este incremento).
      const pago = await tx.pago.create({
        data: {
          empresaId,
          usuarioId,
          ventaId,
          monto: dto.monto,
          medio: dto.medio,
          estado: 'APROBADO',
        },
      });

      if (dto.medio === 'efectivo') {
        // Caja/AperturaCaja/MovimientoCaja no tienen empresaId directo
        // (no están cubiertos por empresaScopeExtension, ver
        // empresa-scope.extension.ts) — el filtro por empresa se hace
        // acá explícitamente vía la relación Caja.empresaId.
        const caja = await tx.caja.findUnique({ where: { empresaId } });
        /* eslint-disable indent -- falso positivo conocido de la regla
           `indent` base con un ternario que devuelve un objeto anidado
           (mismo patrón que en dto/login.dto.ts) */
        const aperturaVigente = caja
          ? await tx.aperturaCaja.findFirst({
              where: { cajaId: caja.id, fechaCierre: null },
              orderBy: { fechaApertura: 'desc' },
            })
          : null;
        /* eslint-enable indent */

        if (aperturaVigente) {
          await tx.movimientoCaja.create({
            data: {
              cajaId: caja!.id,
              aperturaCajaId: aperturaVigente.id,
              usuarioId,
              tipo: 'Venta',
              monto: dto.monto,
              descripcion: `Cobro en efectivo de venta ${ventaId}`,
              referenciaId: pago.id,
            },
          });
        }
        // Si no hay apertura vigente, el pago en efectivo se registra
        // igual (no se bloquea la venta por un problema de caja) pero
        // sin movimiento asociado — ver docs/scaffolding-notas.md,
        // limitación explícita del módulo caja.
      }

      return pago;
    });
  }

  async findByVenta(ventaId: string, empresaId: string) {
    const db = this.prismaFactory.forEmpresa(empresaId);
    const venta = await db.venta.findUnique({ where: { id: ventaId } });
    if (!venta) {
      throw new NotFoundException('Venta no encontrada');
    }
    return db.pago.findMany({ where: { ventaId }, orderBy: { createdAt: 'asc' } });
  }
}
