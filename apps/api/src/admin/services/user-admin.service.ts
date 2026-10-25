import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateuserAdminDto } from '../dto/create-user-admin.dto';
import { UpdateuserAdminDto } from '../dto/update-user-admin.dto';
import { userAdminResponseDto, ListusersAdminDto, ListusersAdminResponseDto } from '../dto/user-admin-response.dto';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class userAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async listusers(
    businessId: string,
    page: number = 1,
    limit: number = 25,
    role?: string,
    status?: string,
  ): Promise<ListusersAdminDto> {
    if (page < 1 || limit < 1 || limit > 100) {
      throw new BadRequestException('Invalid pagination parameters');
    }

    const skip = (page - 1) * limit;
    const where: Prisma.MembershipWhereInput = {
      businessId,
      ...(role && { role: role as any }),
      ...(status && { status: status as any }),
    };

    const [memberships, total] = await Promise.all([
      this.prisma.membership.findMany({
        where,
        include: {
          User: true,
          RoleGrant: {
            include: {
              roleTemplate: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.membership.count({ where }),
    ]);

    const data: ListusersAdminResponseDto[] = memberships.map((m) => ({
      id: m.User.id,
      email: m.User.email,
      nombre: m.User.nombre,
      fotoUrl: m.User.fotoUrl,
      membership: {
        businessId: m.businessId,
        role: m.role,
        status: m.status,
      },
      roleTemplateId: m.RoleGrant?.roleTemplateId,
      createdAt: m.createdAt,
    }));

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getuserDetail(businessId: string, userId: string): Promise<userAdminResponseDto> {
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_businessId: { userId, businessId },
      },
      include: {
        User: true,
        RoleGrant: {
          include: {
            roleTemplate: {
              include: {
                RoleCapability: {
                  include: {
                    capabilityDefinition: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!membership) {
      throw new NotFoundException('user not found in this business');
    }

    const empresa = await this.prisma.empresa.findUnique({
      where: { id: businessId },
    });

    const capabilities = membership.RoleGrant?.roleTemplate?.RoleCapability?.map((rc) => ({
      id: rc.capabilityDefinition.id,
      code: rc.capabilityDefinition.code,
      description: rc.capabilityDefinition.description,
      category: rc.capabilityDefinition.category,
    })) || [];

    return {
      id: membership.User.id,
      email: membership.User.email,
      nombre: membership.User.nombre,
      fotoUrl: membership.User.fotoUrl,
      membership: {
        businessId: membership.businessId,
        businessName: empresa?.nombre || 'Unknown',
        role: membership.role,
        status: membership.status,
        createdAt: membership.createdAt,
      },
      roleGrant: membership.RoleGrant
        ? {
            id: membership.RoleGrant.id,
            roleTemplateId: membership.RoleGrant.roleTemplateId,
            roleName: membership.RoleGrant.roleTemplate.name,
            capabilities,
          }
        : undefined,
      createdAt: membership.User.createdAt,
      updatedAt: membership.User.updatedAt,
    };
  }

  async createuser(businessId: string, dto: CreateuserAdminDto): Promise<userAdminResponseDto> {
    // Verify business exists
    const business = await this.prisma.empresa.findUnique({
      where: { id: businessId },
    });
    if (!business) {
      throw new NotFoundException('Business not found');
    }

    // Verify role template exists
    const roleTemplate = await this.prisma.roleTemplate.findUnique({
      where: { id: dto.roleTemplateId },
    });
    if (!roleTemplate) {
      throw new NotFoundException('Role template not found');
    }

    // Check if email is already used
    const existinguser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existinguser) {
      throw new BadRequestException('Email already in use');
    }

    // Check if user already has membership in this business
    if (existinguser) {
      const existingMembership = await this.prisma.membership.findUnique({
        where: {
          userId_businessId: { userId: existinguser.id, businessId },
        },
      });
      if (existingMembership) {
        throw new BadRequestException('user already has membership in this business');
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Create user and membership in a transaction
    const user = await this.prisma.$transaction(async (tx) => {
      const newuser = await tx.user.create({
        data: {
          email: dto.email,
          nombre: dto.nombre,
          passwordHash,
          fotoUrl: dto.fotoUrl,
        },
      });

      const membership = await tx.membership.create({
        data: {
          userId: newuser.id,
          businessId,
          role: 'ASISTENTE_LOCAL', // Default role
          status: 'ACTIVE',
        },
      });

      // Create role grant
      await tx.roleGrant.create({
        data: {
          membershipId: membership.id,
          roleTemplateId: dto.roleTemplateId,
        },
      });

      return newuser;
    });

    return this.getuserDetail(businessId, user.id);
  }

  async updateuser(businessId: string, userId: string, dto: UpdateuserAdminDto): Promise<userAdminResponseDto> {
    // Verify membership exists
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_businessId: { userId, businessId },
      },
    });
    if (!membership) {
      throw new NotFoundException('user not found in this business');
    }

    // Check email uniqueness if changing email
    if (dto.email) {
      const existinguser = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (existinguser && existinguser.id !== userId) {
        throw new BadRequestException('Email already in use');
      }
    }

    // Update user and membership
    await this.prisma.$transaction(async (tx) => {
      if (dto.nombre || dto.email || dto.fotoUrl) {
        await tx.user.update({
          where: { id: userId },
          data: {
            ...(dto.nombre && { nombre: dto.nombre }),
            ...(dto.email && { email: dto.email }),
            ...(dto.fotoUrl && { fotoUrl: dto.fotoUrl }),
          },
        });
      }

      if (dto.status) {
        await tx.membership.update({
          where: {
            userId_businessId: { userId, businessId },
          },
          data: { status: dto.status },
        });
      }
    });

    return this.getuserDetail(businessId, userId);
  }

  async deactivateuser(businessId: string, userId: string): Promise<void> {
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_businessId: { userId, businessId },
      },
    });
    if (!membership) {
      throw new NotFoundException('user not found in this business');
    }

    await this.prisma.membership.update({
      where: {
        userId_businessId: { userId, businessId },
      },
      data: { status: 'SUSPENDED' },
    });
  }

  async resetPassword(businessId: string, userId: string): Promise<{ tempPassword: string }> {
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_businessId: { userId, businessId },
      },
      include: { User: true },
    });
    if (!membership) {
      throw new NotFoundException('user not found in this business');
    }

    // Generate temporary password
    const tempPassword = this.generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { tempPassword };
  }

  async getRolesByBusiness(businessId: string): Promise<any[]> {
    const roles = await this.prisma.roleTemplate.findMany({
      where: {
        OR: [{ empresaId: businessId }, { empresaId: null }],
      },
      include: {
        RoleCapability: {
          include: {
            capabilityDefinition: true,
          },
        },
      },
    });

    return roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      isGlobal: role.empresaId === null,
      capabilities: role.RoleCapability.map((rc) => ({
        id: rc.capabilityDefinition.id,
        code: rc.capabilityDefinition.code,
        description: rc.capabilityDefinition.description,
        category: rc.capabilityDefinition.category,
      })),
    }));
  }

  async assignRoleTouser(businessId: string, userId: string, roleTemplateId: string): Promise<void> {
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_businessId: { userId, businessId },
      },
      include: { RoleGrant: true },
    });
    if (!membership) {
      throw new NotFoundException('user not found in this business');
    }

    const roleTemplate = await this.prisma.roleTemplate.findUnique({
      where: { id: roleTemplateId },
    });
    if (!roleTemplate) {
      throw new NotFoundException('Role template not found');
    }

    if (membership.RoleGrant) {
      // Update existing role grant
      await this.prisma.roleGrant.update({
        where: { id: membership.RoleGrant.id },
        data: { roleTemplateId },
      });
    } else {
      // Create new role grant
      await this.prisma.roleGrant.create({
        data: {
          membershipId: membership.id,
          roleTemplateId,
        },
      });
    }
  }

  async removeRoleFromuser(businessId: string, userId: string): Promise<void> {
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_businessId: { userId, businessId },
      },
      include: { RoleGrant: true },
    });
    if (!membership) {
      throw new NotFoundException('user not found in this business');
    }

    if (membership.RoleGrant) {
      await this.prisma.roleGrant.delete({
        where: { id: membership.RoleGrant.id },
      });
    }
  }

  private generateTemporaryPassword(): string {
    const length = 12;
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }
}
