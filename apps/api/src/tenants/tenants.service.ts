import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all empresas for a user, including their role in each.
   * Useful for populating a dropdown or list of available businesses.
   */
  async getMyEmpresas(usuarioId: string) {
    const userEmpresas = await this.prisma.userEmpresa.findMany({
      where: { usuarioId },
      include: { Empresa: true },
      orderBy: { createdAt: 'asc' },
    });

    if (userEmpresas.length === 0) {
      // If user has no UserEmpresa records, fallback to their current empresaId
      const user = await this.prisma.usuario.findUnique({
        where: { id: usuarioId },
        include: { Empresa: true },
      });

      if (!user) {
        throw new NotFoundException('Usuario no encontrado');
      }

      return [
        {
          id: user.empresaId,
          nombre: user.Empresa.nombre,
          role: 'owner',
          createdAt: user.createdAt,
        },
      ];
    }

    return userEmpresas.map((ue) => ({
      id: ue.Empresa.id,
      nombre: ue.Empresa.nombre,
      role: ue.role,
      createdAt: ue.createdAt,
    }));
  }

  /**
   * Validate that a user has access to a specific empresa.
   * Throws ForbiddenException if not.
   */
  async validateUserAccess(usuarioId: string, empresaId: string) {
    const userEmpresa = await this.prisma.userEmpresa.findUnique({
      where: {
        usuarioId_empresaId: {
          usuarioId,
          empresaId,
        },
      },
    });

    if (!userEmpresa) {
      // Fallback: check if it's the user's current empresaId
      const user = await this.prisma.usuario.findUnique({
        where: { id: usuarioId },
        select: { empresaId: true, activo: true },
      });

      if (!user || !user.activo || user.empresaId !== empresaId) {
        throw new ForbiddenException(
          'No tienes acceso a esta empresa',
        );
      }
    }
  }

  /**
   * Seed UserEmpresa records for users who don't have any yet.
   * This is useful after adding the UserEmpresa table to ensure
   * existing users can still access their current empresa.
   */
  async seedUserEmpresas() {
    // Get all users
    const users = await this.prisma.usuario.findMany();

    for (const user of users) {
      // Check if user already has UserEmpresa records
      const existing = await this.prisma.userEmpresa.findUnique({
        where: {
          usuarioId_empresaId: {
            usuarioId: user.id,
            empresaId: user.empresaId,
          },
        },
      });

      // If not, create one
      if (!existing) {
        await this.prisma.userEmpresa.create({
          data: {
            usuarioId: user.id,
            empresaId: user.empresaId,
            role: 'owner', // Existing users get owner role by default
          },
        });
      }
    }
  }
}
