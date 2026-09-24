import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload, EstadoLegajo } from './auth.types';
import { RegistroClienteDto } from './dto/registro-cliente.dto';
import { LoginDto } from './dto/login.dto';
import { GooglePerfil } from './google.strategy';

/**
 * RF-17 (docs/spec-login-roles.md): autenticación del lado Cliente.
 * Separado de AuthService (que es exclusivo de Usuario) porque el modelo
 * de datos es distinto — Cliente no tiene `empresaId` propio sino que
 * hereda el scope vía Pedido/CuentaCorriente, no tiene `permisos` ni
 * `rol` (los atributos de negocio de Usuario no aplican a un comprador),
 * y el `estadoLegajo` solo existe para el mayorista.
 *
 * El JWT emitido acá lleva `type: 'cliente'` para que los guards puedan
 * distinguir entre un token de Usuario y uno de Cliente (mismo secret,
 * misma estrategia Passport — ver jwt.strategy.ts).
 */
@Injectable()
export class AuthClienteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Auto-registro público — solo para minorista (ver RegistroClienteDto).
   * No permite registrar con un email ya existente en `Cliente`; si el
   * email ya existe como `Usuario`, también falla (emails únicos en todo
   * el sistema a nivel de seguridad, aunque sean tablas separadas).
   */
  async registrar(empresaId: string, dto: RegistroClienteDto) {
    const yaExisteCliente = await this.prisma.cliente.findFirst({
      where: { empresaId, email: dto.email },
    });
    if (yaExisteCliente) {
      throw new BadRequestException(`Ya existe una cuenta con el email ${dto.email}`);
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const cliente = await this.prisma.cliente.create({
      data: {
        empresaId,
        nombre: dto.nombre,
        email: dto.email,
        passwordHash,
        esMayorista: false,
        // estadoLegajo null para minorista — no aplica (solo mayorista
        // pasa por el flujo de legajo + aprobación del dueño).
      },
      include: { empresa: true },
    });

    return this.emitirSesionCliente(cliente);
  }

  async login(empresaId: string, dto: LoginDto) {
    const cliente = await this.prisma.cliente.findFirst({
      where: { empresaId, email: dto.email },
      include: { empresa: true },
    });

    if (!cliente || !cliente.passwordHash) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordValida = await bcrypt.compare(dto.password, cliente.passwordHash);
    if (!passwordValida) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    return this.emitirSesionCliente(cliente);
  }

  /**
   * Resuelve el perfil de Google a un Cliente minorista — mismo patrón
   * que AuthGoogleService para Usuario. Si el Cliente ya existe por email,
   * vincula el googleId; si no existe, lo crea como minorista nuevo.
   *
   * El empresaId viene de TIENDA_EMPRESA_ID (misma env var que tienda.service.ts
   * para identificar de qué empresa es la tienda pública).
   */
  async loginConGoogle(perfil: GooglePerfil) {
    const empresaId = process.env.TIENDA_EMPRESA_ID;
    if (!empresaId) {
      throw new Error('TIENDA_EMPRESA_ID no configurado');
    }

    let cliente = await this.prisma.cliente.findUnique({
      where: { googleId: perfil.googleId },
      include: { empresa: true },
    });

    if (!cliente) {
      const existente = await this.prisma.cliente.findFirst({
        where: { empresaId, email: perfil.email },
        include: { empresa: true },
      });

      if (existente) {
        cliente = await this.prisma.cliente.update({
          where: { id: existente.id },
          data: { googleId: perfil.googleId },
          include: { empresa: true },
        });
      } else {
        cliente = await this.prisma.cliente.create({
          data: {
            empresaId,
            nombre: perfil.nombre,
            email: perfil.email,
            googleId: perfil.googleId,
            esMayorista: false,
          },
          include: { empresa: true },
        });
      }
    }

    return this.emitirSesionCliente(cliente);
  }

  /**
   * Shape del JWT de Cliente — paralelo a AuthService.emitirSesion() para
   * Usuario. `permisos: []` siempre (los Clientes no tienen permisos
   * granulares del sistema interno). `rol` usa 'OWNER' como placeholder
   * tipado (AuthenticatedUser.rol es RolUsuario, no-nullable); el campo
   * `type: 'cliente'` es el discriminador real para los guards.
   */
  emitirSesionCliente(cliente: {
    id: string;
    nombre: string;
    email: string;
    empresaId: string;
    esMayorista: boolean;
    estadoLegajo: EstadoLegajo | null;
    googleId: string | null;
    empresa: { nombre: string };
    createdAt: Date;
  }) {
    const estadoLegajo: EstadoLegajo = cliente.estadoLegajo ?? 'APROBADO';
    // estadoLegajo null = minorista, tratado como APROBADO para que
    // LegajoAprobadoGuard no lo bloquee (un minorista no tiene legajo que
    // aprobar; el guard solo bloquea si es explícitamente PENDIENTE).

    const payload: JwtPayload = {
      sub: cliente.id,
      email: cliente.email,
      nombre: cliente.nombre,
      empresaId: cliente.empresaId,
      permisos: [],
      rol: 'OWNER', // placeholder — `type: 'cliente'` es el discriminador real
      estadoLegajo,
      type: 'cliente',
      esMayorista: cliente.esMayorista,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      cliente: {
        id: cliente.id,
        nombre: cliente.nombre,
        email: cliente.email,
        empresaId: cliente.empresaId,
        empresaNombre: cliente.empresa.nombre,
        esMayorista: cliente.esMayorista,
        estadoLegajo,
        metodoLogin: (cliente.googleId ? 'google' : 'password') as 'google' | 'password',
        createdAt: cliente.createdAt.toISOString(),
      },
    };
  }
}
