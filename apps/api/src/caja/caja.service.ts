import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EmpresaScopedPrismaService } from '../prisma/empresa-scoped-prisma.service';
import { AutorizacionesService } from '../autorizaciones/autorizaciones.service';
import { AbrirCajaDto } from './dto/abrir-caja.dto';
import { RegistrarMovimientoDto } from './dto/registrar-movimiento.dto';
import { RegistrarArqueoDto } from './dto/registrar-arqueo.dto';
import { AutorizarArqueoDto } from './dto/autorizar-arqueo.dto';

// D-05 del SDD: "$5.000 es una referencia inicial. Se debe confirmar la
// condición exacta (mayor que / mayor o igual que) y el tratamiento de
// diferencias menores al umbral" — sigue sin confirmar. Se usa como
// valor de referencia documentado, con comparación estricta ">" (no
// ">="), pero NO se trata como una decisión cerrada: ver el TODO(D-05)
// en arquear() sobre qué pasa exactamente en el límite.
const UMBRAL_DIFERENCIA_REFERENCIA = 5000;

/**
 * RF-09 (caja y arqueos). Modelos AperturaCaja/MovimientoCaja/
 * ArqueoCaja/CierreCaja NO tienen empresaId directo (no están cubiertos
 * por empresaScopeExtension) — el aislamiento se hace acá explícitamente
 * vía la relación con Caja.empresaId, igual que ya se hizo para
 * Categoria en catalogo.controller.ts.
 */
@Injectable()
export class CajaService {
  constructor(
    private readonly prismaFactory: EmpresaScopedPrismaService,
    private readonly autorizacionesService: AutorizacionesService,
  ) {}

  private async getCajaDeEmpresa(empresaId: string) {
    const db = this.prismaFactory.forEmpresa(empresaId);
    const caja = await db.caja.findUnique({ where: { empresaId } });
    if (!caja) {
      throw new NotFoundException(
        'La empresa no tiene una caja configurada. Debe crearse desde el seed o un endpoint de configuración (no implementado en este incremento).',
      );
    }
    return caja;
  }

  private async getAperturaVigente(empresaId: string, cajaId: string) {
    const db = this.prismaFactory.forEmpresa(empresaId);
    return db.aperturaCaja.findFirst({
      where: { cajaId, fechaCierre: null },
      orderBy: { fechaApertura: 'desc' },
    });
  }

  async estado(empresaId: string) {
    const caja = await this.getCajaDeEmpresa(empresaId);
    const apertura = await this.getAperturaVigente(empresaId, caja.id);
    return { caja, aperturaVigente: apertura };
  }

  async abrir(dto: AbrirCajaDto, empresaId: string, usuarioId: string) {
    const caja = await this.getCajaDeEmpresa(empresaId);
    const existente = await this.getAperturaVigente(empresaId, caja.id);
    if (existente) {
      throw new ConflictException('Ya hay una apertura de caja vigente para esta empresa');
    }

    const db = this.prismaFactory.forEmpresa(empresaId);
    return db.$transaction(async (tx) => {
      const apertura = await tx.aperturaCaja.create({
        data: { cajaId: caja.id, usuarioId, montoInicial: dto.montoInicial },
      });
      await tx.caja.update({ where: { id: caja.id }, data: { estado: 'ABIERTA' } });
      return apertura;
    });
  }

  async registrarMovimiento(dto: RegistrarMovimientoDto, empresaId: string, usuarioId: string) {
    const caja = await this.getCajaDeEmpresa(empresaId);
    const apertura = await this.getAperturaVigente(empresaId, caja.id);
    if (!apertura) {
      throw new BadRequestException(
        'No hay una apertura de caja vigente para registrar movimientos',
      );
    }

    const db = this.prismaFactory.forEmpresa(empresaId);
    return db.movimientoCaja.create({
      data: {
        cajaId: caja.id,
        aperturaCajaId: apertura.id,
        usuarioId,
        tipo: dto.tipo,
        monto: dto.monto,
        descripcion: dto.descripcion,
      },
    });
  }

  async listarMovimientos(empresaId: string) {
    const caja = await this.getCajaDeEmpresa(empresaId);
    const apertura = await this.getAperturaVigente(empresaId, caja.id);
    if (!apertura) {
      return [];
    }
    const db = this.prismaFactory.forEmpresa(empresaId);
    return db.movimientoCaja.findMany({
      where: { aperturaCajaId: apertura.id },
      orderBy: { createdAt: 'asc' },
    });
  }

  async arquear(dto: RegistrarArqueoDto, empresaId: string, usuarioSalienteId: string) {
    if (dto.usuarioEntranteId === usuarioSalienteId) {
      // RF-09: "confirmado por vendedor saliente y entrante" — dos
      // personas distintas. Un usuario no puede autoconfirmarse el
      // arqueo (mismo principio que D-06 aplica a Autorizacion: ningún
      // agente/usuario se autoriza a sí mismo).
      throw new BadRequestException('El usuario entrante debe ser distinto del usuario saliente');
    }

    const caja = await this.getCajaDeEmpresa(empresaId);
    const apertura = await this.getAperturaVigente(empresaId, caja.id);
    if (!apertura) {
      throw new BadRequestException('No hay una apertura de caja vigente para arquear');
    }

    const db = this.prismaFactory.forEmpresa(empresaId);

    // Verificar que el usuario entrante exista y pertenezca a la misma
    // empresa (Usuario sí está cubierto por empresaScopeExtension).
    const usuarioEntrante = await db.usuario.findUnique({ where: { id: dto.usuarioEntranteId } });
    if (!usuarioEntrante) {
      throw new NotFoundException('Usuario entrante no encontrado');
    }

    const movimientos = await db.movimientoCaja.findMany({
      where: { aperturaCajaId: apertura.id },
    });

    // Efectivo esperado calculado a partir de movimientos reales del
    // sistema, no un número declarado por el operador (ver conexión
    // pagos -> MovimientoCaja en pagos.service.ts): fondo fijo con el
    // que se abrió + cobros de ventas en efectivo - gastos/retiros.
    // 'DeudaCobro' está en el schema (RF-10) pero no hay módulo de
    // cobro de deudas todavía — efectivoDeudasContado queda en 0, no
    // se inventa un valor.
    const efectivoVentas = sumaPorTipo(movimientos, ['Venta']);
    const efectivoDeudas = sumaPorTipo(movimientos, ['DeudaCobro']); // TODO: sin módulo de deudas todavía, siempre 0
    const gastosRetiros = sumaPorTipo(movimientos, ['Gasto', 'Retiro']);
    const ingresosManuales = sumaPorTipo(movimientos, ['Ingreso']);

    const efectivoEsperado =
      Number(apertura.montoInicial) +
      efectivoVentas +
      efectivoDeudas +
      ingresosManuales -
      gastosRetiros;
    const diferencia = dto.efectivoContado - efectivoEsperado;

    // D-05: umbral de referencia $5.000, condición ">" estricta — NO
    // confirmado como decisión final (ver constante arriba). Un arqueo
    // con diferencia superior al umbral queda registrado con
    // autorizacionId=null (bloqueado) en vez de inventar una
    // autorización automática: eso violaría D-06 explícitamente
    // ("ningún agente o proceso automático puede autorizarse a sí
    // mismo"). No hay mecanismo de autorización del dueño implementado
    // todavía (D-06 sigue pendiente) — el arqueo queda creado pero
    // marcado como requiriendo esa autorización futura.
    const requiereAutorizacion = Math.abs(diferencia) > UMBRAL_DIFERENCIA_REFERENCIA;

    return db.$transaction(async (tx) => {
      const arqueo = await tx.arqueoCaja.create({
        data: {
          cajaId: caja.id,
          aperturaCajaId: apertura.id,
          usuarioId: usuarioSalienteId,
          usuarioEntranteId: dto.usuarioEntranteId,
          fondoFijoContado: apertura.montoInicial,
          efectivoVentasContado: efectivoVentas,
          efectivoDeudasContado: efectivoDeudas,
          gastosRetirosRegistrados: gastosRetiros,
          efectivoEsperado,
          efectivoContado: dto.efectivoContado,
          diferencia,
          // autorizacionId queda null: no se genera ninguna
          // Autorizacion automática. Si requiereAutorizacion es true,
          // esto se refleja en la respuesta del endpoint, no en el
          // registro en sí (el schema no tiene un campo booleano para
          // eso — se calcula al leer).
        },
      });
      await tx.caja.update({ where: { id: caja.id }, data: { estado: 'EN_ARQUEO' } });
      return { arqueo, requiereAutorizacion };
    });
  }

  /**
   * D-06 conectado: el arqueo que quedó bloqueado en arquear() (con
   * `requiereAutorizacion: true` y `autorizacionId: null`) recibe acá
   * las credenciales de quien lo autoriza. Delega la validación entera
   * (identidad, permiso, no-autoautorización) en AutorizacionesService
   * — este método solo vincula la Autorizacion ya creada y válida al
   * ArqueoCaja.
   */
  async autorizarArqueo(
    empresaId: string,
    arqueoId: string,
    dto: AutorizarArqueoDto,
    solicitanteId: string,
  ) {
    const caja = await this.getCajaDeEmpresa(empresaId);
    const db = this.prismaFactory.forEmpresa(empresaId);
    const arqueo = await db.arqueoCaja.findFirst({ where: { id: arqueoId, cajaId: caja.id } });
    if (!arqueo) {
      throw new NotFoundException('Arqueo no encontrado');
    }
    if (arqueo.autorizacionId) {
      throw new BadRequestException('Este arqueo ya tiene una autorización registrada.');
    }

    const autorizacion = await this.autorizacionesService.autorizar(
      empresaId,
      {
        operacion: 'caja.cierreConDiferencia',
        entidadAfectada: 'ArqueoCaja',
        entidadId: arqueoId,
        motivo: dto.motivo,
        email: dto.email,
        password: dto.password,
      },
      solicitanteId,
    );

    return db.arqueoCaja.update({
      where: { id: arqueoId },
      data: { autorizacionId: autorizacion.id },
    });
  }

  async cerrar(empresaId: string, usuarioId: string) {
    const caja = await this.getCajaDeEmpresa(empresaId);
    const apertura = await this.getAperturaVigente(empresaId, caja.id);
    if (!apertura) {
      throw new BadRequestException('No hay una apertura de caja vigente para cerrar');
    }

    const db = this.prismaFactory.forEmpresa(empresaId);
    const ultimoArqueo = await db.arqueoCaja.findFirst({
      where: { aperturaCajaId: apertura.id },
      orderBy: { fechaArqueo: 'desc' },
    });
    if (!ultimoArqueo) {
      throw new BadRequestException('No se puede cerrar la caja sin un arqueo previo del turno');
    }
    if (
      Math.abs(Number(ultimoArqueo.diferencia)) > UMBRAL_DIFERENCIA_REFERENCIA &&
      !ultimoArqueo.autorizacionId
    ) {
      // INV-08: "un cierre con diferencia superior al umbral requiere
      // autorización". Como D-06 no está implementado, esto bloquea el
      // cierre en vez de fingir que la autorización existe.
      throw new BadRequestException(
        'El último arqueo tiene una diferencia que supera el umbral y no tiene autorización registrada. No se puede cerrar la caja (D-06 pendiente: mecanismo de autorización no implementado).',
      );
    }

    return db.$transaction(async (tx) => {
      const cierre = await tx.cierreCaja.create({
        data: {
          aperturaCajaId: apertura.id,
          usuarioId,
          montoFinal: ultimoArqueo.efectivoContado,
        },
      });
      await tx.aperturaCaja.update({
        where: { id: apertura.id },
        data: { fechaCierre: new Date() },
      });
      await tx.caja.update({ where: { id: caja.id }, data: { estado: 'CERRADA' } });
      return cierre;
    });
  }
}

function sumaPorTipo(movimientos: { tipo: string; monto: unknown }[], tipos: string[]): number {
  return movimientos
    .filter((m) => tipos.includes(m.tipo))
    .reduce((acc, m) => acc + Number(m.monto), 0);
}
