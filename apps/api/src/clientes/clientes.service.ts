import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { EmpresaScopedPrismaService } from '../prisma/empresa-scoped-prisma.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';

/**
 * Fase 1 del roadmap de Fidelización: CRUD mínimo de Cliente — base
 * bloqueante para todo lo demás (niveles de fidelidad, reglas de
 * descuento). El permiso `clientes.gestionar` ya existía en el seed
 * desde el scaffolding inicial, sin uso real hasta este módulo.
 *
 * Sin tocar CuentaCorriente/Deuda (RF-10, cuenta corriente) — eso es
 * otro módulo aparte, este solo cubre los datos básicos del cliente
 * (nombre, email, teléfono, dirección).
 */
@Injectable()
export class ClientesService {
  constructor(private readonly prismaFactory: EmpresaScopedPrismaService) {}

  async listar(empresaId: string, search?: string) {
    const db = this.prismaFactory.forEmpresa(empresaId);
    const where: Prisma.ClienteWhereInput = {
      /* eslint-disable indent -- falso positivo conocido de la regla
         `indent` base con un ternario que devuelve un objeto anidado
         (mismo patrón que catalogo.controller.ts) */
      ...(search
        ? {
            OR: [
              { nombre: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
      /* eslint-enable indent */
    };
    return db.cliente.findMany({
      where,
      orderBy: { nombre: 'asc' },
      ...(search ? { take: 50 } : {}),
    });
  }

  async obtener(empresaId: string, id: string) {
    const db = this.prismaFactory.forEmpresa(empresaId);
    const cliente = await db.cliente.findUnique({ where: { id } });
    if (!cliente) {
      throw new NotFoundException('Cliente no encontrado');
    }
    return cliente;
  }

  async crear(empresaId: string, dto: CreateClienteDto) {
    const db = this.prismaFactory.forEmpresa(empresaId);
    if (dto.email) {
      await this.verificarEmailLibre(empresaId, dto.email);
    }
    // Prisma.ClienteUncheckedCreateInput explícito: sin esta anotación,
    // a través del tipo genérico que devuelve empresaScopeExtension,
    // TypeScript no logra resolver el Exact<XOR<...>> que Prisma exige
    // para `create` (mismo patrón que Proveedor/Producto).
    const data: Prisma.ClienteUncheckedCreateInput = { ...dto, empresaId };
    return db.cliente.create({ data });
  }

  async actualizar(empresaId: string, id: string, dto: UpdateClienteDto) {
    const db = this.prismaFactory.forEmpresa(empresaId);
    const existente = await db.cliente.findUnique({ where: { id } });
    if (!existente) {
      throw new NotFoundException('Cliente no encontrado');
    }
    if (dto.email && dto.email !== existente.email) {
      await this.verificarEmailLibre(empresaId, dto.email, id);
    }
    return db.cliente.update({ where: { id }, data: dto });
  }

  /**
   * Cliente.email es @@unique([empresaId, email]) — se verifica acá,
   * antes del create/update, para devolver un 400 explícito ("ya
   * existe un cliente con ese email") en vez de dejar que Postgres
   * rechace con un error de constraint menos claro para quien usa el
   * panel.
   */
  private async verificarEmailLibre(empresaId: string, email: string, excluirId?: string) {
    const db = this.prismaFactory.forEmpresa(empresaId);
    const existente = await db.cliente.findFirst({ where: { email } });
    if (existente && existente.id !== excluirId) {
      throw new BadRequestException(`Ya existe un cliente con el email ${email}`);
    }
  }
}
